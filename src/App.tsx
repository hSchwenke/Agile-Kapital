import { useState, useEffect, type SyntheticEvent } from 'react';
import { db, auth } from './firebase';
import { collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc, setDoc, where } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, type User } from 'firebase/auth';
import { Toaster, toast } from 'react-hot-toast';
import { SummaryCards } from './components/SummaryCards';
import { PeriodInsightCard } from './components/analytics/PeriodInsightCard';
import { CATEGORIAS, LISTA_CATEGORIAS, type CategoriaId } from './utils/categorias';
import { LogOut, Eye, EyeOff, ChevronLeft, ChevronRight, Plus, X, HelpCircle } from 'lucide-react';
import { TutorialPopover } from './components/TutorialPopover';
import { getHighlightClass } from './utils/getHighlightClass';
import './App.css';

export interface Transacao {
  id: string;
  descricao: string;
  valor: number;
  tipo: 'receita' | 'despesa';
  categoria?: CategoriaId | string;
  data?: string;
  userId: string;
  competencia: string;
}

const formatarMoeda = (valor: number, show: boolean = true) => {
  if (!show) return 'R$ •••••';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
};

const formatarData = (dataISO?: string) => {
  if (!dataISO) return '';
  const data = new Date(dataISO);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(data);
};

function App() {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [tipo, setTipo] = useState<'receita' | 'despesa'>('despesa');
  const [categoria, setCategoria] = useState<CategoriaId>('outros');
  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaId | 'todas'>('todas');
  const [transacaoParaDeletar, setTransacaoParaDeletar] = useState<string | null>(null);

  const [rendaFixa, setRendaFixa] = useState<number>(0);
  const [rendaInput, setRendaInput] = useState('');

  const [user, setUser] = useState<User | null>(null);
  const [carregandoLogin, setCarregandoLogin] = useState(true);

  const [showValues, setShowValues] = useState(true);
  const [modalRendaAberto, setModalRendaAberto] = useState(false);
  const [modalTransacaoAberto, setModalTransacaoAberto] = useState(false);

  // --- TUTORIAL ONBOARDING ---
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(1);

  useEffect(() => {
    if (!localStorage.getItem('ak_tutorial_done')) {
      setShowTutorial(true);
    }
  }, []);

  const finishTutorial = () => {
    localStorage.setItem('ak_tutorial_done', 'true');
    setShowTutorial(false);
  };

  const resetTutorial = () => {
    localStorage.removeItem('ak_tutorial_done');
    setTutorialStep(1);
    setShowTutorial(true);
  };

  // --- LÓGICA DE COMPETÊNCIA ---
  const [mesCompetencia, setMesCompetencia] = useState(() => new Date().toISOString().slice(0, 7));

  const alterarMes = (delta: number) => {
    const [ano, mes] = mesCompetencia.split('-').map(Number);
    const data = new Date(ano, mes - 1 + delta, 1);
    const novoAno = data.getFullYear();
    const novoMes = String(data.getMonth() + 1).padStart(2, '0');
    setMesCompetencia(`${novoAno}-${novoMes}`);
  };

  const handleEditIncome = () => {
    setModalRendaAberto(true);
  };

  const getNomeMesAno = () => {
    const [ano, mes] = mesCompetencia.split('-').map(Number);
    const data = new Date(ano, mes - 1, 1);
    const formatadorLongo = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
    const formatadorCurto = new Intl.DateTimeFormat('pt-BR', { month: 'short' });

    const formatoLongo = formatadorLongo.format(data);
    const nomeLongo = formatoLongo.charAt(0).toUpperCase() + formatoLongo.slice(1);

    const mesCurto = formatadorCurto.format(data).replace('.', '');
    const nomeCurto = `${mesCurto.charAt(0).toUpperCase() + mesCurto.slice(1)}/${ano}`;

    return (
      <>
        <span className="hidden sm:inline">{nomeLongo}</span>
        <span className="sm:hidden">{nomeCurto}</span>
      </>
    );
  };

  // --- LÓGICA DO TEMA (LIGHT/DARK) ---
  const [tema, setTema] = useState<'light' | 'dark'>(() => {
    const temaSalvo = localStorage.getItem('agile-theme');
    if (temaSalvo === 'light' || temaSalvo === 'dark') {
      return temaSalvo;
    }
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (tema === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('agile-theme', tema);
  }, [tema]);

  const alternarTema = () => {
    setTema(temaAtual => (temaAtual === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usuarioAtual) => {
      if (!usuarioAtual) {
        setTransacoes([]);
        setRendaFixa(0);
        setDescricao('');
        setValor('');
        setRendaInput('');
        setMesCompetencia(new Date().toISOString().slice(0, 7));
      }
      setUser(usuarioAtual);
      setCarregandoLogin(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'transacoes'),
      where('userId', '==', user.uid),
      where('competencia', '==', mesCompetencia),
      orderBy('data', 'asc')
    );

    const unsubscribeTransacoes = onSnapshot(q, (snapshot) => {
      const transacoesBanco: Transacao[] = [];
      snapshot.forEach((doc) => {
        transacoesBanco.push({ id: doc.id, ...doc.data() } as Transacao);
      });
      setTransacoes(transacoesBanco);
    });

    const docRef = doc(db, 'rendas', user.uid);
    const unsubscribeRenda = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setRendaFixa(docSnap.data().valor);
      } else {
        setRendaFixa(0);
      }
    });

    return () => {
      unsubscribeTransacoes();
      unsubscribeRenda();
    };
  }, [user, mesCompetencia]);

  const loginComGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast.success('Login realizado com sucesso!');
    } catch (error) {
      console.error("Erro ao fazer login", error);
      toast.error('Erro ao conectar com o Google.');
    }
  };

  const sair = async () => {
    await signOut(auth);
    toast('Você saiu da conta', { icon: '👋' });
  };

  const salvarRendaFixa = async (evento: SyntheticEvent) => {
    evento.preventDefault();
    if (!user) return toast.error('Você precisa estar logado para salvar!');
    if (!rendaInput) return toast.error('Digite um valor para a receita!');

    try {
      await setDoc(doc(db, 'rendas', user.uid), {
        valor: Number(rendaInput)
      });
      setRendaInput('');
      setModalRendaAberto(false);
      toast.success('Receita atualizada!');
    } catch (error) {
      console.error("Erro ao salvar renda: ", error);
      toast.error('Erro ao salvar receita.');
    }
  };

  const salvarTransacao = async (evento: SyntheticEvent) => {
    evento.preventDefault();
    if (!user) return toast.error('Você precisa estar logado para salvar!');
    if (!descricao || !valor) return toast.error('Preencha todos os campos!');

    try {
      await addDoc(collection(db, 'transacoes'), {
        descricao: descricao,
        valor: Number(valor),
        tipo: tipo,
        categoria: categoria,
        data: new Date().toISOString(),
        userId: user.uid,
        competencia: mesCompetencia
      });

      setDescricao('');
      setValor('');
      setCategoria('outros');
      setTipo('despesa');
      setModalTransacaoAberto(false);
      toast.success('Transação adicionada!');
    } catch (error) {
      console.error("Erro ao salvar transação: ", error);
      toast.error('Erro ao adicionar transação.');
    }
  };

  const confirmarDelecao = async () => {
    if (!transacaoParaDeletar) return;
    try {
      await deleteDoc(doc(db, 'transacoes', transacaoParaDeletar));
      toast.success('Transação removida!');
    } catch (error) {
      console.error("Erro ao deletar transação: ", error);
      toast.error('Erro ao remover transação.');
    } finally {
      setTransacaoParaDeletar(null);
    }
  };

  if (carregandoLogin) {
    return (
      <div className="min-h-screen w-full bg-gray-50 dark:bg-[#09090b] flex items-center justify-center font-sans transition-colors duration-300">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 dark:border-[#8b5cf6] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-gray-500 dark:text-[#a1a1aa] font-medium tracking-wide">Carregando Agile Kapital...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative min-h-screen w-full bg-gray-50 dark:bg-[#09090b] text-gray-900 dark:text-[#f4f4f5] flex flex-col items-center justify-center overflow-hidden font-sans transition-colors duration-300">
        <Toaster position="bottom-center" toastOptions={{ className: 'dark:bg-[#18181b] dark:text-[#f4f4f5] dark:border dark:border-[#27272a]' }} />

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 dark:bg-[#8b5cf6]/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative z-10 w-full max-w-md p-8 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-xl shadow-xl dark:shadow-2xl mx-4 transition-colors duration-300">
          <div className="flex flex-col items-center text-center mb-8">
            <span className="px-2.5 py-0.5 text-xs font-medium text-indigo-600 dark:text-[#8b5cf6] bg-indigo-50 dark:bg-[#8b5cf6]/10 rounded-full border border-indigo-100 dark:border-[#8b5cf6]/20 mb-3">
              v1.1.0
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-[#f4f4f5]">
              Agile <span className="text-indigo-600 dark:text-[#8b5cf6]">Kapital</span>
            </h1>
            <p className="text-sm text-gray-500 dark:text-[#a1a1aa] mt-2">
              Gestão financeira inteligente.
            </p>
          </div>

          <button
            onClick={loginComGoogle}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gray-900 hover:bg-gray-800 text-white dark:bg-[#f4f4f5] dark:hover:bg-[#e4e4e7] dark:text-[#09090b] font-medium rounded-lg transition-all duration-200 shadow-sm group active:scale-[0.98]"
          >
            <svg className="w-5 h-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Entrar com o Google
          </button>

          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-[#27272a] text-center transition-colors duration-300">
            <p className="text-xs text-gray-500 dark:text-[#71717a]">
              Ambiente seguro via Firebase Authentication.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 dark:bg-[#09090b] text-gray-900 dark:text-[#f4f4f5] font-sans px-4 py-8 antialiased transition-colors duration-300">
      <Toaster position="bottom-center" toastOptions={{ className: 'dark:bg-[#18181b] dark:text-[#f4f4f5] dark:border dark:border-[#27272a]' }} />

      <div className="max-w-5xl mx-auto w-full relative">

        {/* Header da Dashboard */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-gray-200 dark:border-[#27272a] pb-6 mb-8 gap-4 transition-colors duration-300">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Agile <span className="text-indigo-600 dark:text-[#8b5cf6]">Kapital</span>
            </h1>
            <p className="text-sm text-gray-500 dark:text-[#a1a1aa] mt-1">
              Olá, <span className="font-medium text-gray-900 dark:text-white">{user.displayName?.split(' ')[0]}</span>. Bem-vindo de volta.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 w-full sm:w-auto mt-2 sm:mt-0">
            <div className="flex items-center gap-2">
              <button
                onClick={resetTutorial}
                className="p-2 rounded-md bg-white border border-gray-200 hover:bg-gray-100 text-indigo-600 dark:border-transparent dark:bg-[#18181b] dark:hover:bg-[#27272a] dark:text-[#8b5cf6] transition-colors shadow-sm dark:shadow-none"
                title="Reiniciar Tutorial"
              >
                <HelpCircle size={16} />
              </button>

              <button
                onClick={alternarTema}
                className="p-2 rounded-md bg-white border border-gray-200 hover:bg-gray-100 text-gray-600 dark:border-transparent dark:bg-[#18181b] dark:hover:bg-[#27272a] dark:text-[#a1a1aa] transition-colors shadow-sm dark:shadow-none"
                title="Alternar tema"
              >
                {tema === 'dark' ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              <div className="relative flex items-center">
                <button
                  onClick={() => setShowValues(!showValues)}
                  className={`p-2 rounded-md bg-white border border-gray-200 hover:bg-gray-100 text-gray-600 dark:border-transparent dark:bg-[#18181b] dark:hover:bg-[#27272a] dark:text-[#a1a1aa] shadow-sm dark:shadow-none ${getHighlightClass(showTutorial && tutorialStep === 2)}`}
                  title={showValues ? 'Ocultar valores' : 'Mostrar valores'}
                >
                  {showValues ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
                <TutorialPopover
                  showTutorial={showTutorial} tutorialStep={tutorialStep}
                  setTutorialStep={setTutorialStep} finishTutorial={finishTutorial}
                  stepIndex={2} text="Privacidade em um clique: Use o botão de Olho no topo para ocultar ou exibir todos os valores do seu painel financeiro."
                  arrowPosition="top"
                />
              </div>

              <button
                onClick={sair}
                className="p-2 sm:px-3 sm:py-1.5 text-xs font-medium text-rose-600 dark:text-[#f43f5e] bg-rose-50 hover:bg-rose-100 dark:bg-[#f43f5e]/10 dark:hover:bg-[#f43f5e]/20 border border-rose-200 dark:border-[#f43f5e]/20 rounded-md transition-all active:scale-95"
                title="Sair da conta"
              >
                <LogOut size={16} className="sm:inline-block sm:mr-1 align-text-bottom" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>

            <div className="relative flex items-center">
              <button
                onClick={() => setModalTransacaoAberto(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded-md active:scale-95 shadow-lg shadow-purple-500/25 ${getHighlightClass(showTutorial && tutorialStep === 4)}`}
              >
                <Plus size={14} />
                Nova Transação
              </button>
              <TutorialPopover
                showTutorial={showTutorial} tutorialStep={tutorialStep}
                setTutorialStep={setTutorialStep} finishTutorial={finishTutorial}
                stepIndex={4} text="Para registrar entradas ou saídas, basta selecionar 'Nova Transação'."
                arrowPosition="top"
              />
            </div>
          </div>
        </header>

        {/* Grid Superior: Cards de Resumo + Card de Gráfico/Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 items-stretch">
          <div className="lg:col-span-2">
            <SummaryCards
              rendaBase={rendaFixa}
              transacoes={transacoes}
              showValues={showValues}
              onEditIncome={handleEditIncome}
              showTutorial={showTutorial}
              tutorialStep={tutorialStep}
              setTutorialStep={setTutorialStep}
              finishTutorial={finishTutorial}
            />
          </div>

          <div className="lg:col-span-1">
            <PeriodInsightCard
              transacoes={transacoes}
              rendaBase={rendaFixa}
              showValues={showValues}
            />
          </div>
        </div>

        {/* Extrato de Transações */}
        <div className="w-full">
          <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-xl p-5 shadow-sm transition-colors duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <h2 className="text-sm font-semibold tracking-wide text-gray-500 dark:text-[#a1a1aa] uppercase">
                Extrato de Transações
              </h2>

              <div className={`grid grid-cols-2 sm:flex sm:flex-row items-center gap-2 relative rounded-lg w-full sm:w-auto ${getHighlightClass(showTutorial && tutorialStep === 1)}`}>
                <div className="flex items-center justify-between bg-gray-50 dark:bg-[#09090b] border border-gray-200 dark:border-[#27272a] rounded-lg px-2 py-1.5 w-full h-10 min-w-[140px]">
                  <button onClick={() => alterarMes(-1)} className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-[#27272a] text-gray-500 dark:text-[#a1a1aa] transition-colors" title="Mês anterior">
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-[#f4f4f5] px-1 text-center truncate">
                    {getNomeMesAno()}
                  </span>
                  <button onClick={() => alterarMes(1)} className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-[#27272a] text-gray-500 dark:text-[#a1a1aa] transition-colors" title="Próximo mês">
                    <ChevronRight size={16} />
                  </button>
                </div>

                <div className="relative w-full h-10 min-w-[140px]">
                  <select
                    value={filtroCategoria}
                    onChange={(e) => setFiltroCategoria(e.target.value as CategoriaId | 'todas')}
                    className="w-full h-10 py-2 pl-3 pr-8 flex items-center bg-gray-50 dark:bg-[#09090b] border border-gray-200 dark:border-[#27272a] rounded-lg text-xs sm:text-sm text-gray-900 dark:text-[#f4f4f5] focus:outline-none focus:ring-1 focus:ring-purple-500 transition-colors cursor-pointer appearance-none truncate"
                  >
                    <option value="todas">Todas as Categorias</option>
                    {LISTA_CATEGORIAS.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-gray-500 dark:text-[#71717a]">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Popover do Passo 1 do Tutorial */}
                <TutorialPopover
                  showTutorial={showTutorial}
                  tutorialStep={tutorialStep}
                  setTutorialStep={setTutorialStep}
                  finishTutorial={finishTutorial}
                  stepIndex={1}
                  text="Navegue pelos meses para acompanhar seu histórico financeiro e filtre os lançamentos por categoria."
                  arrowPosition="top-right"
                />
              </div>
            </div>

            {/* Lista de Transações */}
            {transacoes.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-gray-300 dark:border-[#27272a] rounded-lg">
                <p className="text-sm text-gray-400 dark:text-[#71717a]">Nenhuma movimentação lançada neste mês.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-[#27272a]">
                <ul className="divide-y divide-gray-200 dark:divide-[#27272a]">
                  {transacoes
                    .filter(t => filtroCategoria === 'todas' || t.categoria === filtroCategoria)
                    .map((t) => {
                      const categoriaDef = t.categoria ? CATEGORIAS[t.categoria as CategoriaId] || CATEGORIAS.outros : CATEGORIAS.outros;
                      const CategoriaIcon = categoriaDef.Icon;

                      return (
                        <li key={t.id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors group">
                          <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                            <button
                              onClick={() => setTransacaoParaDeletar(t.id)}
                              className="opacity-40 group-hover:opacity-100 text-gray-400 hover:text-rose-500 transition-all shrink-0"
                              title="Remover transação"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>

                            <div className="flex flex-col min-w-0 flex-1">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 truncate">
                                <span className="font-medium text-gray-900 dark:text-white text-sm truncate">{t.descricao}</span>
                                <span className={`whitespace-nowrap inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full shrink-0 ${categoriaDef.colorClass} w-max`}>
                                  <CategoriaIcon className="w-3 h-3" />
                                  {categoriaDef.label}
                                </span>
                              </div>
                              {t.data && <span className="text-xs text-gray-400 dark:text-[#71717a] mt-0.5">{formatarData(t.data)}</span>}
                            </div>
                          </div>

                          <div className={`text-right shrink-0 font-semibold text-sm ${t.tipo === 'receita' ? 'text-emerald-600 dark:text-[#10b981]' : 'text-rose-600 dark:text-[#f43f5e]'}`}>
                            {t.tipo === 'receita' ? '+' : '-'} {showValues ? formatarMoeda(t.valor) : 'R$ •••••'}
                          </div>
                        </li>
                      );
                    })}
                </ul>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Modal de Confirmação de Deleção */}
      {transacaoParaDeletar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity">
          <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-xl p-6 shadow-2xl max-w-sm w-full transform transition-all">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-[#f4f4f5] mb-2">Excluir Transação</h3>
            <p className="text-sm text-gray-500 dark:text-[#a1a1aa] mb-6">
              Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setTransacaoParaDeletar(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#27272a] rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarDelecao}
                className="px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600 rounded-lg transition-colors shadow-sm"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição da Renda Base */}
      {modalRendaAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity">
          <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-xl p-6 shadow-2xl max-w-sm w-full transform transition-all">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-[#f4f4f5]">Editar Renda Base</h3>
              <button onClick={() => setModalRendaAberto(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={salvarRendaFixa} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-[#a1a1aa] mb-1">Valor da Receita Mensal</label>
                <input
                  type="number"
                  placeholder="Ex: 3500.00"
                  value={rendaInput}
                  onChange={(e) => setRendaInput(e.target.value)}
                  step="0.01"
                  className="w-full bg-gray-50 dark:bg-[#09090b] border border-gray-200 dark:border-[#27272a] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-[#f4f4f5] placeholder-gray-400 dark:placeholder-[#71717a] focus:outline-none focus:border-indigo-500 dark:focus:border-[#8b5cf6] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setModalRendaAberto(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#27272a] rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-[#8b5cf6] dark:hover:bg-[#7c3aed] rounded-lg transition-colors shadow-sm"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Nova Transação */}
      {modalTransacaoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity">
          <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-xl p-6 shadow-2xl max-w-md w-full transform transition-all">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-[#f4f4f5]">Nova Transação</h3>
              <button onClick={() => setModalTransacaoAberto(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={salvarTransacao} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-[#a1a1aa]">Descrição</label>
                <input
                  type="text"
                  placeholder="Ex: Conta de Luz"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-[#09090b] border border-gray-200 dark:border-[#27272a] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-[#f4f4f5] placeholder-gray-400 dark:placeholder-[#71717a] focus:outline-none focus:border-purple-500 dark:focus:border-purple-500 transition-colors"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-[#a1a1aa]">Valor (R$)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    step="0.01"
                    className="w-full bg-gray-50 dark:bg-[#09090b] border border-gray-200 dark:border-[#27272a] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-[#f4f4f5] placeholder-gray-400 dark:placeholder-[#71717a] focus:outline-none focus:border-purple-500 dark:focus:border-purple-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-[#a1a1aa]">Tipo</label>
                  <div className="relative">
                    <select
                      value={tipo}
                      onChange={(e) => setTipo(e.target.value as 'receita' | 'despesa')}
                      className="w-full bg-gray-50 dark:bg-[#09090b] border border-gray-200 dark:border-[#27272a] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-[#f4f4f5] focus:outline-none focus:border-purple-500 dark:focus:border-purple-500 transition-colors appearance-none cursor-pointer pr-8"
                    >
                      <option value="despesa">Despesa</option>
                      <option value="receita">Receita</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-gray-500 dark:text-[#71717a]">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-[#a1a1aa]">Categoria</label>
                <div className="relative">
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value as CategoriaId)}
                    className="w-full bg-gray-50 dark:bg-[#09090b] border border-gray-200 dark:border-[#27272a] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-[#f4f4f5] focus:outline-none focus:border-purple-500 dark:focus:border-purple-500 transition-colors appearance-none cursor-pointer pr-8"
                  >
                    {LISTA_CATEGORIAS.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-gray-500 dark:text-[#71717a]">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setModalTransacaoAberto(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-[#a1a1aa] hover:bg-gray-100 dark:hover:bg-[#27272a] rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors shadow-sm"
                >
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;