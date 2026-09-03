import { useState, useEffect, type SyntheticEvent } from 'react';
import { db, auth } from './firebase'; 
import { collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc, setDoc, where } from 'firebase/firestore'; 
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, type User } from 'firebase/auth'; 
import { Toaster, toast } from 'react-hot-toast'; // Importação das notificações
import './App.css';

interface Transacao {
  id: string;
  descricao: string;
  valor: number;
  tipo: 'receita' | 'despesa';
  data?: string; 
  userId: string; 
  competencia: string;
}

// --- FUNÇÕES DE FORMATAÇÃO (BRL e Data) ---
const formatarMoeda = (valor: number) => {
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
// -------------------------------------------

function App() {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [tipo, setTipo] = useState<'receita' | 'despesa'>('despesa');

  const [rendaFixa, setRendaFixa] = useState<number>(0);
  const [rendaInput, setRendaInput] = useState('');

  const [user, setUser] = useState<User | null>(null);
  const [carregandoLogin, setCarregandoLogin] = useState(true);

  // --- LÓGICA DE COMPETÊNCIA ---
  const [mesCompetencia, setMesCompetencia] = useState(() => new Date().toISOString().slice(0, 7));

  // --- LÓGICA DO TEMA (LIGHT/DARK) ---
  const [tema, setTema] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const temaSalvo = localStorage.getItem('agile-theme');
    if (temaSalvo === 'light' || temaSalvo === 'dark') {
      setTema(temaSalvo);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTema('dark');
    } else {
      setTema('light');
    }
  }, []);

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
  // ------------------------------------
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usuarioAtual) => {
      if (!usuarioAtual) {
        // Limpa os estados sensíveis no logout
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
        data: new Date().toISOString(), 
        userId: user.uid,
        competencia: mesCompetencia
      });

      setDescricao('');
      setValor('');
      toast.success('Transação adicionada!');
    } catch (error) {
      console.error("Erro ao salvar transação: ", error);
      toast.error('Erro ao adicionar transação.');
    }
  };

  const deletarTransacao = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'transacoes', id));
      toast.success('Transação removida!');
    } catch (error) {
      console.error("Erro ao deletar transação: ", error);
      toast.error('Erro ao remover transação.');
    }
  }

  const totalDespesas = transacoes
    .filter(t => t.tipo === 'despesa')
    .reduce((acc, curr) => acc + curr.valor, 0);
  
  const totalReceitasExtras = transacoes
    .filter(t => t.tipo === 'receita')
    .reduce((acc, curr) => acc + curr.valor, 0);

  const saldoAtual = rendaFixa + totalReceitasExtras - totalDespesas;

  // 1. TELA DE CARREGAMENTO (Estilo Vercel Minimalista)
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

  // 2. TELA DE LOGIN (Estilo Vercel Premium com Glow Roxo)
  if (!user) {
    return (
      <div className="relative min-h-screen w-full bg-gray-50 dark:bg-[#09090b] text-gray-900 dark:text-[#f4f4f5] flex flex-col items-center justify-center overflow-hidden font-sans transition-colors duration-300">
        <Toaster position="bottom-center" toastOptions={{ className: 'dark:bg-[#18181b] dark:text-[#f4f4f5] dark:border dark:border-[#27272a]' }} />
        
        {/* Glow de fundo */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 dark:bg-[#8b5cf6]/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative z-10 w-full max-w-md p-8 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-xl shadow-xl dark:shadow-2xl mx-4 transition-colors duration-300">
          <div className="flex flex-col items-center text-center mb-8">
            <span className="px-2.5 py-0.5 text-xs font-medium text-indigo-600 dark:text-[#8b5cf6] bg-indigo-50 dark:bg-[#8b5cf6]/10 rounded-full border border-indigo-100 dark:border-[#8b5cf6]/20 mb-3">
              v1.0.0
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-[#f4f4f5]">
              Agile <span className="text-indigo-600 dark:text-[#8b5cf6]">Kapital</span>
            </h1>
            <p className="text-sm text-gray-500 dark:text-[#a1a1aa] mt-2">
              Gestão financeira inteligente com projeção de saldo.
            </p>
          </div>

          <button
            onClick={loginComGoogle}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-gray-900 hover:bg-gray-800 text-white dark:bg-[#f4f4f5] dark:hover:bg-[#e4e4e7] dark:text-[#09090b] font-medium rounded-lg transition-all duration-200 shadow-sm group active:scale-[0.98]"
          >
            <svg className="w-5 h-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
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

  // 3. TELA PRINCIPAL (Dashboard Completa)
  return (
    <div className="min-h-screen w-full bg-gray-50 dark:bg-[#09090b] text-gray-900 dark:text-[#f4f4f5] font-sans px-4 py-8 antialiased transition-colors duration-300">
      <Toaster position="bottom-center" toastOptions={{ className: 'dark:bg-[#18181b] dark:text-[#f4f4f5] dark:border dark:border-[#27272a]' }} />
      
      <div className="max-w-5xl mx-auto w-full">
        
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
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Seletor de Mês/Ano */}
            <input 
              type="month"
              value={mesCompetencia}
              onChange={(e) => setMesCompetencia(e.target.value)}
              className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-[#a1a1aa] focus:outline-none focus:border-indigo-500 dark:focus:border-[#8b5cf6] transition-colors shadow-sm dark:shadow-none cursor-pointer"
            />

            {/* Botão de Alternar Tema */}
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

            <button 
              onClick={sair} 
              className="px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-[#f43f5e] bg-rose-50 hover:bg-rose-100 dark:bg-[#f43f5e]/10 dark:hover:bg-[#f43f5e]/20 border border-rose-200 dark:border-[#f43f5e]/20 rounded-md transition-all active:scale-95"
            >
              Sair da conta
            </button>
          </div>
        </header>

        {/* Grid Principal Layout Vercel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Seção de Inputs (Lado Esquerdo - Ocupa 1 Coluna) */}
          <div className="md:col-span-1 space-y-6">
            
            {/* Bloco: Renda Mensal */}
            <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-xl p-5 space-y-4 shadow-sm transition-colors duration-300">
              <div>
                <h2 className="text-sm font-semibold tracking-wide text-gray-500 dark:text-[#a1a1aa] uppercase">Receita Mensal</h2>
                {/* Formatado para BRL */}
                <p className="text-xl font-bold text-gray-900 dark:text-[#f4f4f5] mt-1">{formatarMoeda(rendaFixa)}</p>
              </div>
              <form onSubmit={salvarRendaFixa} className="flex gap-2">
                <input 
                  type="number" 
                  placeholder="Ex: 3500.00" 
                  value={rendaInput}
                  onChange={(e) => setRendaInput(e.target.value)}
                  step="0.01"
                  className="flex-1 bg-gray-50 dark:bg-[#09090b] border border-gray-200 dark:border-[#27272a] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-[#f4f4f5] placeholder-gray-400 dark:placeholder-[#71717a] focus:outline-none focus:border-indigo-500 dark:focus:border-[#8b5cf6] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-[#8b5cf6] dark:hover:bg-[#7c3aed] text-white text-sm font-medium rounded-lg transition-colors active:scale-95">
                  Definir
                </button>
              </form>
            </div>

            {/* Bloco: Nova Transação */}
            <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-xl p-5 space-y-4 shadow-sm transition-colors duration-300">
              <h2 className="text-sm font-semibold tracking-wide text-gray-500 dark:text-[#a1a1aa] uppercase">Nova Transação</h2>
              <form onSubmit={salvarTransacao} className="space-y-3">
                <div className="space-y-1">
                  <input 
                    type="text" 
                    placeholder="Descrição (ex: Conta de Luz)" 
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-[#09090b] border border-gray-200 dark:border-[#27272a] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-[#f4f4f5] placeholder-gray-400 dark:placeholder-[#71717a] focus:outline-none focus:border-indigo-500 dark:focus:border-[#8b5cf6] transition-colors"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="number" 
                    placeholder="Valor (R$)" 
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    step="0.01"
                    className="w-full bg-gray-50 dark:bg-[#09090b] border border-gray-200 dark:border-[#27272a] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-[#f4f4f5] placeholder-gray-400 dark:placeholder-[#71717a] focus:outline-none focus:border-indigo-500 dark:focus:border-[#8b5cf6] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <div className="relative w-full">
                    <select 
                      value={tipo} 
                      onChange={(e) => setTipo(e.target.value as 'receita' | 'despesa')}
                      className="w-full bg-gray-50 dark:bg-[#09090b] border border-gray-200 dark:border-[#27272a] rounded-lg pl-3 pr-8 py-2 text-sm text-gray-900 dark:text-[#f4f4f5] focus:outline-none focus:border-indigo-500 dark:focus:border-[#8b5cf6] transition-colors cursor-pointer appearance-none"
                    >
                      <option value="despesa" className="bg-white text-gray-900 dark:bg-[#18181b] dark:text-[#f4f4f5]">Despesa</option>
                      <option value="receita" className="bg-white text-gray-900 dark:bg-[#18181b] dark:text-[#f4f4f5]">Receita Extra</option>
                    </select>
                    
                    {/* Nova Setinha Minimalista Injetada via SVG */}
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-gray-500 dark:text-[#71717a]">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
                <button type="submit" className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white dark:bg-[#f4f4f5] dark:hover:bg-[#e4e4e7] dark:text-[#09090b] text-sm font-medium rounded-lg transition-colors active:scale-[0.99]">
                  Adicionar Item
                </button>
              </form>
            </div>
          </div>

          {/* Seção de Dados (Lado Direito - Ocupa 2 Colunas) */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Bloco: Fechamento / Saldo Projetado Dinâmico */}
            <div className={`relative overflow-hidden border rounded-xl p-6 transition-all duration-300 ${
              saldoAtual >= 101 
                ? 'bg-white border-gray-200 dark:bg-[#18181b] dark:border-[#27272a]' 
                : 'bg-rose-50 border-rose-200 dark:bg-[#1c1016] dark:border-[#e11d48]/20'
            }`}>
              {/* Efeito Glow interno apenas no modo seguro */}
              {saldoAtual >= 101 && (
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500/10 dark:bg-[#8b5cf6]/10 blur-3xl rounded-full pointer-events-none" />
              )}
              
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-semibold tracking-wider text-gray-500 dark:text-[#a1a1aa] uppercase">Saldo Final Projetado</h2>
                  {/* Formatado para BRL */}
                  <p className={`text-4xl font-bold tracking-tight mt-2 ${
                    saldoAtual >= 101 ? 'text-indigo-600 dark:text-[#8b5cf6]' : 'text-rose-600 dark:text-[#f43f5e]'
                  }`}>
                    {formatarMoeda(saldoAtual)}
                  </p>
                </div>
                {saldoAtual <= 100 && (
                  <span className="px-2.5 py-1 text-xs font-medium text-rose-600 dark:text-[#f43f5e] bg-rose-100 dark:bg-[#f43f5e]/10 border border-rose-200 dark:border-[#f43f5e]/20 rounded-full animate-pulse">
                    Sinal Vermelho
                  </span>
                )}
              </div>
            </div>

            {/* Bloco: Extrato */}
            <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-xl p-5 shadow-sm transition-colors duration-300">
              <h2 className="text-sm font-semibold tracking-wide text-gray-500 dark:text-[#a1a1aa] uppercase mb-4">Extrato de Transações</h2>
              
              {transacoes.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-gray-300 dark:border-[#27272a] rounded-lg">
                  <p className="text-sm text-gray-400 dark:text-[#71717a]">Nenhuma movimentação lançada neste mês.</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-[#27272a]">
                  <ul className="divide-y divide-gray-200 dark:divide-[#27272a]">
                    {transacoes.map((t) => (
                      <li key={t.id} className="flex items-center justify-between p-3.5 bg-white hover:bg-gray-50 dark:bg-[#18181b] dark:hover:bg-[#202024] transition-colors group">
                        <div className="flex items-center gap-3">
                          {/* Botão X Deletar minimalista */}
                          <button 
                            onClick={() => deletarTransacao(t.id)} 
                            className="opacity-40 group-hover:opacity-100 text-gray-400 hover:text-rose-500 dark:text-[#71717a] dark:hover:text-[#f43f5e] transition-all transform active:scale-90"
                            title="Remover transação"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                          
                          {/* Descrição e Data em cinza */}
                          <div className="flex flex-col">
                            <span className="text-sm text-gray-900 dark:text-[#f4f4f5] font-medium">{t.descricao}</span>
                            {t.data && <span className="text-xs text-gray-400 dark:text-[#71717a] mt-0.5">{formatarData(t.data)}</span>}
                          </div>
                        </div>
                        
                        {/* Formatado para BRL */}
                        <span className={`text-sm font-semibold tracking-tight ${
                          t.tipo === 'receita' ? 'text-emerald-600 dark:text-[#10b981]' : 'text-rose-600 dark:text-[#f43f5e]'
                        }`}>
                          {t.tipo === 'receita' ? '+' : '-'} {formatarMoeda(t.valor)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

export default App;