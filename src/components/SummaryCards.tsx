import React, { useMemo } from 'react';
import { ArrowUpRight, ArrowDownRight, DollarSign, Pencil } from 'lucide-react';
import type { Transacao } from '../App';
import { TutorialPopover, getHighlightClass, type TutorialProps } from './TutorialPopover';

export interface SummaryCardsProps extends Partial<TutorialProps> {
  rendaBase: number;
  transacoes: Transacao[];
  showValues: boolean;
  onEditIncome: () => void;
}

// Formatação oficial BRL requerida
const formatarMoeda = (valor: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
};

export const SummaryCards: React.FC<SummaryCardsProps> = ({ 
  rendaBase, 
  transacoes, 
  showValues, 
  onEditIncome,
  showTutorial,
  tutorialStep,
  setTutorialStep,
  finishTutorial
}) => {
  // Total Entradas: Soma da Renda Base (rendas/{userId}) com todas as receitas do mês selecionado
  const totalReceitas = useMemo(() => {
    return transacoes
      .filter((t) => t.tipo === 'receita')
      .reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
  }, [transacoes]);

  const totalEntradas = (Number(rendaBase) || 0) + totalReceitas;

  // Total Saídas: Soma de todas as despesas do mês selecionado
  const totalSaidas = useMemo(() => {
    return transacoes
      .filter((t) => t.tipo === 'despesa')
      .reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
  }, [transacoes]);

  // Saldo do Mês: Total Entradas - Total Saídas
  const saldoMes = totalEntradas - totalSaidas;
  const isSaldoPositivo = saldoMes >= 0;

  const exibirValor = (valor: number) => showValues ? formatarMoeda(valor) : 'R$ •••••';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mb-8">
      {/* 1. Card Receitas */}
      <div className="relative bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] border-l-4 border-l-emerald-500 rounded-xl p-5 shadow-sm transition-all duration-200 hover:shadow-md group">
        <div className="flex items-center justify-between mb-2">
          <div className="flex flex-col">
            <span className="text-xs font-bold tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
              Receitas
            </span>
            <span className="text-[11px] text-gray-400 dark:text-[#71717a]">
              Total Entradas
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            {/* Ícone de Entrada */}
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>
        <p className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
          {exibirValor(totalEntradas)}
        </p>
        <div className="mt-1.5 -ml-2 relative inline-block">
          <button 
            onClick={onEditIncome}
            className={`cursor-pointer hover:bg-gray-100 hover:text-purple-600 dark:hover:bg-zinc-800/80 dark:hover:text-purple-400 rounded-md px-2 py-1 inline-flex items-center gap-1 border border-transparent dark:hover:border-zinc-700 text-xs text-gray-500 dark:text-[#a1a1aa] ${getHighlightClass(!!showTutorial && tutorialStep === 3)}`}
            title="Clique para editar a renda base"
          >
            Renda base ({exibirValor(rendaBase)}) + extras
            <Pencil className="w-3 h-3" />
          </button>
          
          <TutorialPopover 
             showTutorial={!!showTutorial} tutorialStep={tutorialStep || 1} 
             setTutorialStep={setTutorialStep!} finishTutorial={finishTutorial!}
             stepIndex={3} text="Sua renda fixa mudou? Basta clicar em 'Renda base + extras' no card de Receitas para atualizar o valor rapidamente."
             arrowPosition="top-left" 
          />
        </div>
      </div>

      {/* 2. Card Despesas */}
      <div className="relative bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] border-l-4 border-l-rose-500 rounded-xl p-5 shadow-sm transition-all duration-200 hover:shadow-md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex flex-col">
            <span className="text-xs font-bold tracking-wider text-rose-600 dark:text-rose-400 uppercase">
              Despesas
            </span>
            <span className="text-[11px] text-gray-400 dark:text-[#71717a]">
              Total Saídas
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400">
            {/* Ícone de Saída */}
            <ArrowDownRight className="w-5 h-5" />
          </div>
        </div>
        <p className="text-2xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
          {exibirValor(totalSaidas)}
        </p>
        <p className="text-xs text-gray-500 dark:text-[#a1a1aa] mt-1.5">
          Gastos registrados no mês
        </p>
      </div>
    </div>
  );
};

export default SummaryCards;
