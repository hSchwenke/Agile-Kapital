import type { Dispatch, SetStateAction } from 'react';
import type { Transacao } from '../App';
import { TrendingUp, TrendingDown, Pencil } from 'lucide-react';
import { TutorialPopover, getHighlightClass } from './TutorialPopover';

interface SummaryCardsProps {
  rendaBase: number;
  transacoes: Transacao[];
  showValues: boolean;
  onEditIncome: () => void;
  showTutorial: boolean;
  tutorialStep: number;
  setTutorialStep: Dispatch<SetStateAction<number>>;
  finishTutorial: () => void;
}

const formatarMoeda = (valor: number, show: boolean = true) => {
  if (!show) return 'R$ •••••';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
};

export function SummaryCards({
  rendaBase,
  transacoes,
  showValues,
  onEditIncome,
  showTutorial,
  tutorialStep,
  setTutorialStep,
  finishTutorial
}: SummaryCardsProps) {
  const receitasExtras = transacoes
    .filter((t) => t.tipo === 'receita')
    .reduce((acc, t) => acc + t.valor, 0);

  const totalReceitas = rendaBase + receitasExtras;

  const totalDespesas = transacoes
    .filter((t) => t.tipo === 'despesa')
    .reduce((acc, t) => acc + t.valor, 0);

  // Cálculo de Comprometimento de Renda
  const pctComprometido = totalReceitas > 0 ? (totalDespesas / totalReceitas) * 100 : 0;
  const pctExtras = rendaBase > 0 ? (receitasExtras / rendaBase) * 100 : 0;

  // Definição de cores dinâmicas
  const getProgressColor = (pct: number) => {
    if (pct >= 90) return 'bg-rose-500';
    if (pct >= 70) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getTextColor = (pct: number) => {
    if (pct >= 90) return 'text-rose-500 dark:text-rose-400';
    if (pct >= 70) return 'text-amber-500 dark:text-amber-400';
    return 'text-emerald-600 dark:text-emerald-400';
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full">
      {/* Card Receitas */}
      <div className="relative bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-xl p-5 shadow-sm transition-colors duration-300 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
              Receitas
            </span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg text-emerald-600 dark:text-emerald-400">
              <TrendingUp size={18} />
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-[#a1a1aa] mb-1">Total Entradas</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
            {formatarMoeda(totalReceitas, showValues)}
          </h2>
        </div>

        {/* Barra de Progresso de Entradas Extras */}
        <div className="my-4 space-y-1.5">
          <div className="flex justify-between text-xs text-gray-500 dark:text-[#a1a1aa]">
            <span>Receita extra</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              +{pctExtras.toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-[#27272a] h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(pctExtras, 100)}%` }}
            />
          </div>
        </div>

        {/* Rodapé */}
        <div className="pt-3 border-t border-gray-100 dark:border-[#27272a] flex items-center justify-between text-xs text-gray-500 dark:text-[#a1a1aa] min-h-[32px]">
          <span className="truncate">
            Alterar Renda Base
          </span>

          <div className="relative flex items-center">
            <button
              onClick={onEditIncome}
              className={`p-1.5 hover:bg-gray-100 dark:hover:bg-[#27272a] rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors ${getHighlightClass(
                showTutorial && tutorialStep === 3
              )}`}
              title="Editar renda base"
            >
              <Pencil size={14} />
            </button>

            {/* Passo 3 com posicionamento top-right para mobile */}
            <TutorialPopover
              showTutorial={showTutorial}
              tutorialStep={tutorialStep}
              setTutorialStep={setTutorialStep}
              finishTutorial={finishTutorial}
              stepIndex={3}
              text="Clique no ícone de lápis para definir ou alterar sua renda fixa mensal base."
              arrowPosition="top-right"
            />
          </div>
        </div>
      </div>

      {/* Card Despesas */}
      <div className="relative bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-xl p-5 shadow-sm transition-colors duration-300 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold tracking-wider text-rose-600 dark:text-rose-400 uppercase">
              Despesas
            </span>
            <div className="p-2 bg-rose-50 dark:bg-rose-500/10 rounded-lg text-rose-600 dark:text-rose-400">
              <TrendingDown size={18} />
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-[#a1a1aa] mb-1">Total Saídas</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-rose-600 dark:text-rose-400 tracking-tight">
            {formatarMoeda(totalDespesas, showValues)}
          </h2>
        </div>

        {/* Barra de Progresso do Comprometimento da Renda */}
        <div className="my-4 space-y-1.5">
          <div className="flex justify-between text-xs text-gray-500 dark:text-[#a1a1aa]">
            <span>Comprometimento da renda</span>
            <span className={`font-semibold ${getTextColor(pctComprometido)}`}>
              {pctComprometido.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-[#27272a] h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getProgressColor(pctComprometido)}`}
              style={{ width: `${Math.min(pctComprometido, 100)}%` }}
            />
          </div>
        </div>

        {/* Rodapé */}
        <div className="pt-3 border-t border-gray-100 dark:border-[#27272a] flex items-center justify-between text-xs text-gray-500 dark:text-[#a1a1aa] min-h-[32px]">
          <span>Gastos registrados no mês</span>
          <div className="w-[27px] h-[27px]" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}