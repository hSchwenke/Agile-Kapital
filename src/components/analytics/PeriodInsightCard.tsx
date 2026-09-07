import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, type TooltipProps } from 'recharts';
import type { Transacao } from '../../App';
import { CATEGORIAS, type CategoriaId } from '../../utils/categorias';

interface PeriodInsightCardProps {
  transacoes: Transacao[];
  rendaBase: number;
  showValues: boolean;
}

const COLORS: Record<string, string> = {
  alimentacao: '#10B981',
  moradia: '#6366F1',
  transporte: '#F59E0B',
  lazer: '#EC4899',
  saude: '#F43F5E',
  educacao: '#3B82F6',
  outros: '#A855F7',
};

const formatarMoeda = (valor: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
};

export const PeriodInsightCard: React.FC<PeriodInsightCardProps> = ({ transacoes, rendaBase, showValues }) => {
  // --- Cálculos de Saldo ---
  const totalReceitas = useMemo(() => {
    return transacoes
      .filter((t) => t.tipo === 'receita')
      .reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
  }, [transacoes]);

  const totalEntradas = (Number(rendaBase) || 0) + totalReceitas;

  const totalDespesas = useMemo(() => {
    return transacoes
      .filter((t) => t.tipo === 'despesa')
      .reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
  }, [transacoes]);

  const saldoMes = totalEntradas - totalDespesas;
  const isSaldoPositivo = saldoMes >= 0;

  // --- Dados do Donut (somente despesas) ---
  const despesas = useMemo(() => transacoes.filter((t) => t.tipo === 'despesa'), [transacoes]);

  const { data, totalGeral, maiorCategoria } = useMemo(() => {
    const somaPorCategoria = despesas.reduce((acc, t) => {
      const cat = (t.categoria as string) || 'outros';
      acc[cat] = (acc[cat] || 0) + t.valor;
      return acc;
    }, {} as Record<string, number>);

    const items = Object.keys(somaPorCategoria)
      .map(key => {
        const catId = key as CategoriaId;
        const catInfo = CATEGORIAS[catId] || CATEGORIAS.outros;
        return {
          name: catInfo.label,
          valor: somaPorCategoria[key],
          color: COLORS[catId] || COLORS.outros,
          id: catId,
        };
      })
      .sort((a, b) => b.valor - a.valor);

    const total = items.reduce((sum, item) => sum + item.valor, 0);
    const maior = items.length > 0 ? items[0] : null;

    return { data: items, totalGeral: total, maiorCategoria: maior };
  }, [despesas]);

  // --- Empty State ---
  if (despesas.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold tracking-wide text-gray-500 dark:text-zinc-400 uppercase mb-4">Visão do Período</h3>
        <div className="flex flex-col items-center justify-center py-10">
          <div className="w-20 h-20 rounded-full border-[6px] border-zinc-700/30 flex items-center justify-center mb-4">
            <span className={`text-base font-bold ${isSaldoPositivo ? 'text-emerald-400' : 'text-red-400'}`}>
              {showValues ? formatarMoeda(saldoMes) : 'R$ •••••'}
            </span>
          </div>
          <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium mb-1">Saldo do Mês</p>
          <p className="text-sm text-zinc-500 mt-2">Nenhum gasto registrado neste período</p>
          <p className="text-[11px] text-zinc-600 mt-1">{transacoes.length} lançamento{transacoes.length !== 1 ? 's' : ''}</p>
        </div>
      </div>
    );
  }

  // --- Tooltip Customizado ---
  const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      const pct = ((d.valor / totalGeral) * 100).toFixed(1);
      return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl text-xs p-2.5 text-white">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
            <span className="font-medium">{d.name}</span>
          </div>
          <div className="mt-1 ml-[18px] text-zinc-300">
            {formatarMoeda(d.valor)} <span className="text-zinc-500">({pct}%)</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-zinc-800 rounded-xl p-5">
      <h3 className="text-sm font-semibold tracking-wide text-gray-500 dark:text-zinc-400 uppercase mb-4">Visão do Período</h3>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Coluna 1: Gráfico Donut com Saldo no Centro */}
        <div className="w-full sm:w-[220px] shrink-0">
          <div className="relative h-[220px] w-full flex items-center justify-center overflow-visible">
            {/* Saldo no Centro */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
              <span className="text-[10px] tracking-wider uppercase text-zinc-400 font-medium">Saldo do Mês</span>
              <span className={`text-lg sm:text-xl font-bold ${isSaldoPositivo ? 'text-emerald-400' : 'text-red-400'}`}>
                {showValues ? formatarMoeda(saldoMes) : 'R$ •••••'}
              </span>
              <span className="text-[11px] text-zinc-500 mt-0.5">
                {transacoes.length} lançamento{transacoes.length !== 1 ? 's' : ''}
              </span>
            </div>

            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="valor"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={3}
                  stroke="none"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Coluna 2: Insight + Legenda */}
        <div className="w-full min-w-0 flex-1">
          {/* Mini-Insight */}
          {maiorCategoria && (
            <p className="text-xs text-gray-500 dark:text-zinc-400 mb-3 border-b border-gray-200 dark:border-zinc-800/50 pb-2.5">
              Maior foco de gastos em{' '}
              <span className="font-semibold text-gray-900 dark:text-white">{maiorCategoria.name}</span>{' '}
              <span className="text-gray-400 dark:text-zinc-500">
                ({((maiorCategoria.valor / totalGeral) * 100).toFixed(0)}%)
              </span>
            </p>
          )}

          {/* Legenda Customizada */}
          <div className="flex flex-col gap-1.5">
            {data.map((item, index) => {
              const percent = ((item.valor / totalGeral) * 100).toFixed(1);
              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-zinc-800/40 border border-gray-200 dark:border-zinc-800/60 rounded-lg text-xs gap-2"
                >
                  {/* Lado Esquerdo: Dot + Nome */}
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-gray-700 dark:text-zinc-200 font-medium truncate min-w-[70px]">
                      {item.name}
                    </span>
                  </div>

                  {/* Lado Direito: Valor e Porcentagem */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {showValues ? formatarMoeda(item.valor) : 'R$ •••••'}
                    </span>
                    <span className="text-gray-400 dark:text-zinc-500 text-[11px] w-10 text-right">
                      {percent}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
