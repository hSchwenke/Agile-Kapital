import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { CATEGORIAS, type CategoriaId } from '../../utils/categorias';
import type { Transacao } from '../../domain/transaction';
import {
  calcularTotalReceitas,
  calcularTotalDespesas,
  calcularDespesasPorCategoria,
} from '../../finance/financialCore';

interface Props {
  transacoes: Transacao[];
  rendaBase: number;
  showValues: boolean;
}

const CORES_GRAFICO = [
  '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#6366f1', '#14b8a6'
];

export const PeriodInsightCard: React.FC<Props> = ({ transacoes, rendaBase, showValues }) => {
  const despesas = transacoes.filter(t => t.tipo === 'despesa');
  const totalDespesas = calcularTotalDespesas(transacoes);
  const totalReceitas = rendaBase + calcularTotalReceitas(transacoes);
  const saldo = totalReceitas - totalDespesas;

  const agrupadoPorCategoria = calcularDespesasPorCategoria(transacoes);

  const dadosGrafico = Object.entries(agrupadoPorCategoria)
    .map(([cat, valor]) => ({
      name: CATEGORIAS[cat as CategoriaId]?.label || 'Outros',
      value: valor,
      percentual: totalDespesas > 0 ? ((valor / totalDespesas) * 100).toFixed(1) : '0'
    }))
    .sort((a, b) => b.value - a.value);

  const formatarMoeda = (val: number) => {
    if (!showValues) return 'R$ •••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-xl p-5 shadow-sm flex flex-col justify-between h-full transition-colors duration-300">
      <h2 className="text-xs font-semibold tracking-wide text-gray-500 dark:text-[#a1a1aa] uppercase mb-2">
        Visão do Período
      </h2>

      {despesas.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 py-6 text-center">
          <p className="text-sm text-gray-400 dark:text-[#71717a]">Sem dados suficientes para o gráfico no período.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Gráfico Donut com Altura Controlada */}
          <div className="relative h-36 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dadosGrafico}
                  cx="50%"
                  cy="50%"
                  innerRadius={46}
                  outerRadius={62}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {dadosGrafico.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CORES_GRAFICO[index % CORES_GRAFICO.length]} stroke="transparent" />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Texto Central */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[9px] font-medium text-gray-400 uppercase tracking-wider">Saldo do Mês</span>
              <span className={`text-sm font-bold ${saldo >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {formatarMoeda(saldo)}
              </span>
              <span className="text-[9px] text-gray-500 dark:text-[#71717a]">
                {transacoes.length} lançamento{transacoes.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Legenda Vertical Compacta */}
          <div className="flex flex-col gap-1.5 pt-2 border-t border-gray-100 dark:border-[#27272a]">
            {dadosGrafico.slice(0, 3).map((item, index) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: CORES_GRAFICO[index % CORES_GRAFICO.length] }}
                  />
                  <span className="text-gray-700 dark:text-[#f4f4f5] truncate text-[11px] font-medium">{item.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 text-[11px]">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatarMoeda(item.value)}
                  </span>
                  <span className="text-[10px] text-gray-400 dark:text-[#71717a] w-8 text-right">
                    {item.percentual}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};