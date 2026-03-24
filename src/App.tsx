import { useState, useEffect, type SyntheticEvent } from 'react';
import { db, auth } from './firebase'; // Importa a configuração do Firebase e a instância do Firestore | (auth para autenticação)
import { collection, addDoc, onSnapshot, query, orderBy, doc, deleteDoc, setDoc, where } from 'firebase/firestore'; // Ferramentas do Firebase | (where para consultas condicionais)
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, type User } from 'firebase/auth'; // Ferramentas para autenticação com Firebase
import './App.css';

interface Transacao {
  id: string;
  descricao: string;
  valor: number;
  tipo: 'receita' | 'despesa';
  data?: string; // Campo para armazenar a data da transação, útil para ordenação e histórico
  userId: string; // Campo para associar a transação a um usuário específico
}

function App() {
  // 1. Estados para armazenar as transações, os inputs e a renda fixa
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [tipo, setTipo] = useState<'receita' | 'despesa'>('despesa');

  const [rendaFixa, setRendaFixa] = useState<number>(0);
  const [rendaInput, setRendaInput] = useState('');

  // Estados para controlar o usuário logado e a tela de carregamento
  const [user, setUser] = useState<User | null>(null);
  const [carregandoLogin, setCarregandoLogin] = useState(true);
  
  // 2. Lendo dados do Firebase em Tempo Real (Effects)
  
  //  Effect para monitorar o estado de autenticação do usuário
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (usuarioAtual) => {
      setUser(usuarioAtual);
      setCarregandoLogin(false); // Termina de carregar quando descobre se tem usuário ou não
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Se não tiver usuário logado, zera a tela e para por aqui
    if (!user) {
      return;
    }

    // consulta para pegar as transações do usuário logado, ordenando pela data (do mais antigo para o mais recente)
    const q = query(
      collection(db, 'transacoes'), 
      where('userId', '==', user.uid), 
      orderBy('data', 'asc')
    );
    
    const unsubscribeTransacoes = onSnapshot(q, (snapshot) => {
      const transacoesBanco: Transacao[] = [];
      snapshot.forEach((doc) => {
        transacoesBanco.push({ id: doc.id, ...doc.data() } as Transacao);
      });
      setTransacoes(transacoesBanco);
    });

    // salva a renda fixa do usuário, criando um documento específico para cada usuário dentro da coleção 'rendas'
    const docRef = doc(db, 'rendas', user.uid);
    const unsubscribeRenda = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setRendaFixa(docSnap.data().valor);
      } else {
        setRendaFixa(0); // Se for a primeira vez, a renda é zero
      }
    });

    // resetando os estados quando o usuário desloga, para evitar que dados de um usuário apareçam para outro
    return () => {
      unsubscribeTransacoes();
      unsubscribeRenda();
    };
  }, [user]); // O Effect agora recarrega se o 'user' mudar

  // 3. Funções para interagir com o Firebase (Adicionar, Deletar, Salvar Renda Fixa)

  // Função para logar com o Google
  const loginComGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Erro ao fazer login", error);
    }
  };

  // Função para deslogar
  const sair = async () => {
    await signOut(auth);
  };

  const salvarRendaFixa = async (evento: SyntheticEvent) => {
    evento.preventDefault();
    if (!user) return alert('Você precisa estar logado para salvar!');
    if (!rendaInput) return alert('Digite um valor para a receita fixa!');
    
    try {
      // Cria ou atualiza o documento do usuário dentro da coleção 'rendas'
      await setDoc(doc(db, 'rendas', user.uid), {
        valor: Number(rendaInput)
      });
      setRendaInput('');
    } catch (error) {
      console.error("Erro ao salvar renda: ", error);
    }
  };

  const salvarTransacao = async (evento: SyntheticEvent) => {
    evento.preventDefault();
    if (!user) return alert('Você precisa estar logado para salvar!');
    if (!descricao || !valor) return alert('Preencha todos os campos da transação!');
    
    try {
      // Adiciona um novo documento na coleção 'transacoes' com os dados da transação, incluindo a data e o ID do usuário
      await addDoc(collection(db, 'transacoes'), {
        descricao: descricao,
        valor: Number(valor),
        tipo: tipo,
        data: new Date().toISOString(), // Armazena a data da transação para ordenação e histórico
        userId: user.uid // Armazena de quem é essa despesa/receita
      });

      // Limpa os campos do formulário após salvar
      setDescricao('');
      setValor('');
    } catch (error) {
      console.error("Erro ao salvar transação: ", error);
    }
  };

  const deletarTransacao = async (id: string) => {
    try {
      // Deleta o documento específico lá no bd, usando o ID que pegamos do item
      await deleteDoc(doc(db, 'transacoes', id));
    } catch (error) {
      console.error("Erro ao deletar transação: ", error);
    }
  }

  // 4. Cálculo do Saldo Atual (renda fixa + receitas extras - despesas)
  const totalDespesas = transacoes
    .filter(t => t.tipo === 'despesa')
    .reduce((acc, curr) => acc + curr.valor, 0);
  
  const totalReceitasExtras = transacoes
    .filter(t => t.tipo === 'receita')
    .reduce((acc, curr) => acc + curr.valor, 0);

  const saldoAtual = rendaFixa + totalReceitasExtras - totalDespesas;

  // HTML

  // Tela de Carregamento inicial (Enquanto o Firebase checa o login)
  if (carregandoLogin) {
    return <div className="container"><h2 style={{ textAlign: 'center', marginTop: '50px' }}>Carregando Agile Kapital...</h2></div>;
  }

  // Tela de Login (Mostrada se o usuário NÃO estiver logado)
  if (!user) {
    return (
      <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <header className="header" style={{ textAlign: 'center' }}>
          <h1>Agile Kapital</h1>
          <p>Gerencie seu dinheiro de forma inteligente</p>
        </header>
        <div className="card" style={{ textAlign: 'center', maxWidth: '400px', width: '100%', marginTop: '2rem' }}>
          <h2>Acesso Privado</h2>
          <p style={{ marginBottom: '1.5rem', color: '#666' }}>Faça login com o Google para acessar.</p>
          <button onClick={loginComGoogle} className="btn-primary" style={{ width: '100%' }}>
            Entrar com o Google
          </button>
        </div>
      </div>
    );
  }

// Tela Principal do App (Mostrada se o usuário ESTIVER logado)
return (
  <div className="container" style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
    <header className="header" style={{ textAlign: 'center', marginBottom: '40px', position: 'relative' }}>
      
      {/* Botão Sair - Agora ele fica discreto no canto ou podemos centralizar depois */}
      <div style={{ position: 'absolute', right: '0', top: '0' }}>
        <button onClick={sair} className="btn-delete" style={{ padding: '6px 12px', fontSize: '12px', background: 'transparent', border: '1px solid #ff4d4f', color: '#ff4d4f', borderRadius: '4px', cursor: 'pointer' }}>
          Sair
        </button>
      </div>

      <h1 style={{ fontSize: '2.5rem', marginBottom: '10px', color: '#2563eb' }}>Agile Kapital</h1>
      <p style={{ color: '#666', fontSize: '1.1rem' }}>
        Olá, <strong style={{ color: '#2563eb' }}>{user.displayName?.split(' ')[0]}</strong>! 👋<br />
        <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>Gerencie seu dinheiro de forma inteligente.</span>
      </p>
    </header>

      <div className="grid-layout">
        <div className="coluna-esquerda">
          
          {/* LABEL 1: DEFINIR RENDA FIXA */}
          <div className="card">
            <h2>Minha Receita Mensal</h2>
            <p className="renda-atual">Receita configurada: <strong>R$ {rendaFixa.toFixed(2)}</strong></p>
            <form onSubmit={salvarRendaFixa} className="form-group">
              <input 
                type="number" 
                placeholder="Ex: 3500.00" 
                value={rendaInput}
                onChange={(e) => setRendaInput(e.target.value)}
                step="0.01"
              />
              <button type="submit" className="btn-primary">Definir</button>
            </form>
          </div>

          {/* LABEL 2: ADICIONAR DESPESA/RECEITA */}
          <div className="card">
            <h2>Nova Transação</h2>
            <form onSubmit={salvarTransacao} className="form-group-vertical">
              <input 
                type="text" 
                placeholder="Descrição (ex: Conta de Luz)" 
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
              <div className="linha-inputs">
                <input 
                  type="number" 
                  placeholder="Valor (R$)" 
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  step="0.01"
                />
                <select value={tipo} onChange={(e) => setTipo(e.target.value as 'receita' | 'despesa')}>
                  <option value="despesa">Despesa</option>
                  <option value="receita">Receita Extra</option>
                </select>
              </div>
              <button type="submit" className="btn-primary">Adicionar Transação</button>
            </form>
          </div>
          
        </div>

        <div className="coluna-direita">
          
          {/* LABEL 3: SALDO (alerta dinamico) */}
          <div className={`card destaque saldo-compacto ${saldoAtual >= 101 ? 'fundo-seguro' : 'fundo-alerta'}`}>
            <div className="saldo-header">
              <h2>Fechamento</h2>
              <small>{saldoAtual <= 100 && <strong>{'Atenção, sinal vermelho!'}</strong>}</small>
            </div>
            <div className={`resultado-saldo ${saldoAtual >= 101 ? 'positivo' : 'negativo'}`}>
              <h2>R$ {saldoAtual.toFixed(2)}</h2>
            </div>
          </div>

          {/* LABEL 4: EXTRATO (preenchimento dinamico) */}
          <div className="card card-extrato">
            <h2>Extrato de Transações</h2>
            {transacoes.length === 0 ? (
              <p className="mensagem-vazia">Nenhuma transação cadastrada ainda.</p>
            ) : (
              <ul className="lista-transacoes">
                {transacoes.map((t) => (
                  <li key={t.id} className={`item-transacao ${t.tipo}`}>
                    <div className="item-info">
                      <button 
                        onClick={() => deletarTransacao(t.id)} 
                        className="btn-delete"
                        title="Remover item"
                      >
                        <i className="fi fi-rs-circle-xmark"> </i> 
                      </button>
                      <span className="desc">{t.descricao}</span>
                    </div>
                    <span className={`valor-formatado ${t.tipo}`}>
                      {t.tipo === 'receita' ? '+' : '-'} R$ {t.valor.toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;