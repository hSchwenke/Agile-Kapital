import { useState, useEffect, type SyntheticEvent } from 'react';
import './App.css';

interface Transacao {
  id: string;
  descricao: string;
  valor: number;
  tipo: 'receita' | 'despesa';
}

function App() {
  // 1. States
  const [transacoes, setTransacoes] = useState<Transacao[]>(() => {
    const transacoesSalvas = localStorage.getItem('@ControleFinanceiro:transacoes');
    return transacoesSalvas ? JSON.parse(transacoesSalvas) : [];
  });
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [tipo, setTipo] = useState<'receita' | 'despesa'>('despesa');

  const [rendaFixa, setRendaFixa] = useState<number>(() => {
    const rendaSalva = localStorage.getItem('@ControleFinanceiro:renda');
    return rendaSalva ? Number(rendaSalva) : 0;
  });
  const [rendaInput, setRendaInput] = useState('');
  
  // 2. Salvar no LocalStorage (Effects)
  useEffect(() => {
    localStorage.setItem('@ControleFinanceiro:transacoes', JSON.stringify(transacoes));
  }, [transacoes]);

  useEffect(() => {
    localStorage.setItem('@ControleFinanceiro:renda', rendaFixa.toString());
  }, [rendaFixa]);

  // 3. Funções de Ação
  const salvarRendaFixa = (evento: SyntheticEvent) => {
    evento.preventDefault();
    if (!rendaInput) return alert('Digite um valor para a receita fixa!');
    setRendaFixa(Number(rendaInput));
    setRendaInput('');
  };

  const salvarTransacao = (evento: SyntheticEvent) => {
    evento.preventDefault();
    if (!descricao || !valor) return alert('Preencha todos os campos da transação!');
    
    const novaTransacao: Transacao = {
      id: String(Date.now()), // <-- O ID compatível com o celular
      descricao: descricao,
      valor: Number(valor),
      tipo: tipo
    };

    setTransacoes([...transacoes, novaTransacao]);
    setDescricao('');
    setValor('');
  };

  const deletarTransacao = (id: string) => {
    const novaLista = transacoes.filter((t) => t.id !== id);
    setTransacoes(novaLista);
  }

  // 4. Cálculos Automáticos
  const totalDespesas = transacoes
    .filter(t => t.tipo === 'despesa')
    .reduce((acc, curr) => acc + curr.valor, 0);
  
  const totalReceitasExtras = transacoes
    .filter(t => t.tipo === 'receita')
    .reduce((acc, curr) => acc + curr.valor, 0);

  const saldoAtual = rendaFixa + totalReceitasExtras - totalDespesas;

  //HTML
  return (
    <div className="container">
      <header className="header">
        <h1>Agile Kapital</h1>
        <p>Gerencie seu dinheiro de forma inteligente</p>
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
                        <i className="fi fi-rs-circle-xmark"></i> 
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