import React, { useState } from 'react';
import {
  X,
  RefreshCw,
  Landmark,
  Trash2,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Building,
} from 'lucide-react';
import { PluggyConnectButton } from './PluggyConnectButton';
import type { OpenFinanceAccount } from '../../hooks/useOpenFinance';

interface OpenFinanceManagerProps {
  isOpen: boolean;
  onClose: () => void;
  contas: OpenFinanceAccount[];
  carregando: boolean;
  erro: string | null;
  onRecarregar: () => void;
  onDesconectar: (itemId: string) => Promise<boolean>;
}

function formatCurrency(value: number, currencyCode: string) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currencyCode || 'BRL',
  }).format(value);
}

export const OpenFinanceManager: React.FC<OpenFinanceManagerProps> = ({
  isOpen,
  onClose,
  contas,
  carregando,
  erro,
  onRecarregar,
  onDesconectar,
}) => {
  const [itemParaDesconectar, setItemParaDesconectar] = useState<{
    itemId: string;
    nome: string;
  } | null>(null);
  const [desconectando, setDesconectando] = useState(false);

  if (!isOpen) return null;

  // Agrupar contas por itemId se disponível, ou exibir por conta
  const contasPorItem = new Map<string, OpenFinanceAccount[]>();
  for (const conta of contas) {
    const key = conta.itemId || conta.id;
    const lista = contasPorItem.get(key) || [];
    lista.push(conta);
    contasPorItem.set(key, lista);
  }

  const handleConfirmarDesconexao = async () => {
    if (!itemParaDesconectar) return;
    setDesconectando(true);
    try {
      await onDesconectar(itemParaDesconectar.itemId);
      setItemParaDesconectar(null);
    } finally {
      setDesconectando(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm transition-opacity">
        <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-2xl shadow-2xl max-w-xl w-full flex flex-col max-h-[85vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-[#27272a]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Landmark size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-[#f4f4f5]">
                  Gerenciar Open Finance
                </h3>
                <p className="text-xs text-gray-500 dark:text-[#a1a1aa]">
                  Conexões e contas bancárias integradas
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-[#27272a] transition-colors"
              title="Fechar"
            >
              <X size={20} />
            </button>
          </div>

          {/* Barra de Ações Rápidas */}
          <div className="flex items-center justify-between px-6 py-3 bg-gray-50/70 dark:bg-[#121214] border-b border-gray-100 dark:border-[#27272a]">
            <span className="text-xs text-gray-500 dark:text-[#a1a1aa] font-medium">
              {contasPorItem.size === 1
                ? '1 conta conectada'
                : `${contasPorItem.size} contas conectadas`}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onRecarregar}
                disabled={carregando}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] hover:bg-gray-100 dark:hover:bg-[#27272a] rounded-md transition-all disabled:opacity-50"
                title="Atualizar dados"
              >
                <RefreshCw
                  size={12}
                  className={carregando ? 'animate-spin text-indigo-500' : ''}
                />
                <span>Atualizar</span>
              </button>

              <PluggyConnectButton onSuccess={onRecarregar} />
            </div>
          </div>

          {/* Conteúdo com Scroll */}
          <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-4">
            {erro && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{erro}</span>
              </div>
            )}

            {carregando && contas.length === 0 ? (
              <div className="text-center py-8">
                <RefreshCw
                  size={24}
                  className="animate-spin text-indigo-500 mx-auto mb-2"
                />
                <p className="text-sm text-gray-500 dark:text-[#a1a1aa]">
                  Carregando conexões Open Finance...
                </p>
              </div>
            ) : contas.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-gray-200 dark:border-[#27272a] rounded-xl px-4">
                <Landmark
                  size={36}
                  className="mx-auto text-gray-400 mb-2 opacity-60"
                />
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Nenhuma conta conectada
                </p>
                <p className="text-xs text-gray-400 dark:text-[#71717a] mt-1 max-w-sm mx-auto">
                  Conecte sua conta bancária para sincronizar saldos, faturas e
                  movimentações de forma 100% segura via Open Finance.
                </p>
                <div className="mt-4 flex justify-center">
                  <PluggyConnectButton onSuccess={onRecarregar} />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {Array.from(contasPorItem.entries()).map(([key, groupAccounts]) => {
                  const itemId = groupAccounts[0]?.itemId || key;
                  const contaBancaria = groupAccounts.find(
                    (a) => a.type?.toUpperCase() === 'BANK'
                  );
                  const itemNome =
                    contaBancaria?.name ||
                    groupAccounts[0]?.name ||
                    'Instituição Bancária';

                  return (
                    <div
                      key={key}
                      className="border border-gray-200 dark:border-[#27272a] bg-gray-50/50 dark:bg-[#121214] rounded-xl p-4 transition-all"
                    >
                      <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-[#27272a]">
                        <div className="flex items-center gap-2">
                          <Building
                            size={16}
                            className="text-indigo-600 dark:text-indigo-400"
                          />
                          <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                            {itemNome}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                            <CheckCircle2 size={10} />
                            Ativa
                          </span>
                        </div>

                        {itemId && (
                          <button
                            type="button"
                            onClick={() =>
                              setItemParaDesconectar({
                                itemId,
                                nome: itemNome,
                              })
                            }
                            className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 flex items-center gap-1 px-2 py-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                            title="Desconectar esta instituição"
                          >
                            <Trash2 size={12} />
                            <span>Desconectar</span>
                          </button>
                        )}
                      </div>

                      <div className="mt-3 space-y-2">
                        {groupAccounts.map((account) => (
                          <div
                            key={account.id}
                            className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-200/70 dark:border-[#27272a] bg-white dark:bg-[#18181b]"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="p-1.5 rounded-md bg-gray-100 dark:bg-[#27272a] text-gray-600 dark:text-gray-300 shrink-0">
                                {account.type === 'CREDIT' ? (
                                  <CreditCard size={15} />
                                ) : (
                                  <Landmark size={15} />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                  {account.name}
                                </p>
                                <p className="text-[11px] text-gray-500 dark:text-[#71717a]">
                                  {account.type === 'CREDIT'
                                    ? 'Cartão de Crédito'
                                    : account.subtype || account.type}
                                </p>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <p className="text-sm font-bold text-gray-900 dark:text-white">
                                {formatCurrency(
                                  account.balance,
                                  account.currencyCode
                                )}
                              </p>
                              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                                Open Finance
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Confirmação de Desconexão */}
      {itemParaDesconectar && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-xl p-5 shadow-2xl max-w-sm w-full">
            <h4 className="text-base font-bold text-gray-900 dark:text-white mb-2">
              Desconectar Conexão?
            </h4>
            <p className="text-xs text-gray-500 dark:text-[#a1a1aa] mb-5 leading-relaxed">
              Tem certeza que deseja desconectar esta instituição? As contas e
              transações vinculadas deixarão de ser sincronizadas.
            </p>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={desconectando}
                onClick={() => setItemParaDesconectar(null)}
                className="px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#27272a] rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={desconectando}
                onClick={handleConfirmarDesconexao}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-lg transition-colors shadow-sm"
              >
                {desconectando ? 'Desconectando...' : 'Sim, desconectar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
