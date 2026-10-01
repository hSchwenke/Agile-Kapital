import type { Transacao } from '../domain/transaction';
import {
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { centavosParaReais } from '../utils/money';
import {
  calcularTotalReceitas,
  calcularTotalDespesas,
} from '../finance/financialCore';

interface SummaryCardsProps {
  transacoes: Transacao[];
  showValues: boolean;
}

const formatarMoeda = (valorCentavos: number, show: boolean = true) => {
  if (!show) return 'R$ •••••';

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(centavosParaReais(valorCentavos));
};

export function SummaryCards({
  transacoes,
  showValues,
}: SummaryCardsProps) {

  const totalReceitas = calcularTotalReceitas(transacoes);

  const totalDespesas = calcularTotalDespesas(transacoes);

  const saldo = totalReceitas - totalDespesas;

  // Cálculo de Comprometimento de Receitas por Despesas
  const pctComprometido =
    totalReceitas > 0
      ? (totalDespesas / totalReceitas) * 100
      : 0;


  // Definição de cores dinâmicas
  const getProgressColor = (pct: number) => {
    if (pct >= 90) return 'bg-rose-500';
    if (pct >= 70) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getTextColor = (pct: number) => {
    if (pct >= 90) {
      return 'text-rose-500 dark:text-rose-400';
    }

    if (pct >= 70) {
      return 'text-amber-500 dark:text-amber-400';
    }

    return 'text-emerald-600 dark:text-emerald-400';
  };

  const getSaldoColor = () => {
    if (saldo < 0) {
      return 'text-rose-600 dark:text-rose-400';
    }

    return 'text-gray-900 dark:text-zinc-100';
  };

  return (
    <>
      {/* Resumo compacto - Mobile */}
      <div className="sm:hidden">
        <div className="relative bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm transition-colors duration-300">

          {/* Saldo */}
          <div className="pb-4">
            <p className="text-xs font-semibold tracking-wider text-gray-500 dark:text-zinc-400 uppercase mb-1">
              Saldo do mês
            </p>

            <h2
              className={`text-2xl font-bold tracking-tight ${getSaldoColor()}`}
            >
              {formatarMoeda(saldo, showValues)}
            </h2>
          </div>

          {/* Receitas e Despesas */}
          <div className="grid grid-cols-2 border-t border-gray-100 dark:border-zinc-800 pt-3">

            {/* Receitas */}
            <div className="pr-3 border-r border-gray-100 dark:border-zinc-800">
              <div className="flex items-center justify-between mb-2 min-h-[24px]">
                <span className="text-[11px] font-semibold tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
                  Receitas
                </span>
              </div>

              <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 truncate">
                {formatarMoeda(totalReceitas, showValues)}
              </p>
            </div>

            {/* Despesas */}
            <div className="pl-3">
              <div className="flex items-center justify-between mb-2 min-h-[24px]">
                <span className="text-[11px] font-semibold tracking-wider text-rose-600 dark:text-rose-400 uppercase">
                  Despesas
                </span>
              </div>

              <p className="text-base font-bold text-rose-600 dark:text-rose-400 truncate">
                {formatarMoeda(totalDespesas, showValues)}
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* Cards atuais - Tablet/Desktop */}
      <div className="hidden sm:grid sm:grid-cols-2 gap-4 h-full">

        {/* Card Receitas */}
        <div className="relative bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm transition-colors duration-300 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
                Receitas
              </span>

              <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg text-emerald-600 dark:text-emerald-400">
                <TrendingUp size={18} />
              </div>
            </div>

            <p className="text-xs text-gray-500 dark:text-zinc-400 mb-1">
              Total Entradas
            </p>

            <h2 className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
              {formatarMoeda(totalReceitas, showValues)}
            </h2>
          </div>

          {/* Barra de Saldo Líquido do Mês */}
          <div className="my-4 space-y-1.5">
            <div className="flex justify-between text-xs text-gray-500 dark:text-zinc-400">
              <span>Saldo líquido</span>

              <span className={`font-semibold ${saldo >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {saldo > 0 ? '+' : ''}{formatarMoeda(saldo, showValues)}
              </span>
            </div>

            <div className="w-full bg-gray-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${saldo >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                style={{
                  width: `${Math.min(
                    totalReceitas > 0 ? Math.max((Math.abs(saldo) / totalReceitas) * 100, 6) : 0,
                    100
                  )}%`
                }}
              />
            </div>
          </div>

          {/* Rodapé */}
          <div className="pt-3 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between text-xs text-gray-500 dark:text-zinc-400 min-h-[32px]">
            <span className="truncate">
              Entradas registradas no mês
            </span>
          </div>
        </div>


        {/* Card Despesas */}
        <div className="relative bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm transition-colors duration-300 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold tracking-wider text-rose-600 dark:text-rose-400 uppercase">
                Despesas
              </span>

              <div className="p-2 bg-rose-50 dark:bg-rose-500/10 rounded-lg text-rose-600 dark:text-rose-400">
                <TrendingDown size={18} />
              </div>
            </div>

            <p className="text-xs text-gray-500 dark:text-zinc-400 mb-1">
              Total Saídas
            </p>

            <h2 className="text-2xl sm:text-3xl font-bold text-rose-600 dark:text-rose-400 tracking-tight">
              {formatarMoeda(totalDespesas, showValues)}
            </h2>
          </div>

          {/* Barra de Progresso do Comprometimento da Receita */}
          <div className="my-4 space-y-1.5">
            <div className="flex justify-between text-xs text-gray-500 dark:text-zinc-400">
              <span>Comprometimento da receita</span>

              <span
                className={`font-semibold ${getTextColor(
                  pctComprometido
                )}`}
              >
                {pctComprometido.toFixed(1)}%
              </span>
            </div>

            <div className="w-full bg-gray-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${getProgressColor(
                  pctComprometido
                )}`}
                style={{
                  width: `${Math.min(
                    pctComprometido,
                    100
                  )}%`
                }}
              />
            </div>
          </div>

          {/* Rodapé */}
          <div className="pt-3 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between text-xs text-gray-500 dark:text-zinc-400 min-h-[32px]">
            <span className="truncate">
              Gastos registrados no mês
            </span>
          </div>
        </div>

      </div>
    </>
  );
}
