import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { auth } from '../firebase';
import type { Transacao } from '../domain/transaction';
import type { RawExternalTransaction } from '../domain/financialTransaction';
import { normalizePluggyTransaction } from '../services/openFinance/transactionNormalizer';
import { reconcileTransactions } from '../services/openFinance/reconciliationEngine';
import { enrichWithNavi } from '../services/navi/naviEnricher';

export interface OpenFinanceCreditData {
  creditLimit: number | null;
  availableCreditLimit: number | null;
  balanceDueDate: string | null;
  balanceCloseDate: string | null;
  brand: string | null;
  level: string | null;
  status: string | null;
}

export interface OpenFinanceAccount {
  id: string;
  itemId?: string;
  type: string;
  subtype: string;
  name: string;
  balance: number;
  currencyCode: string;
  creditData?: OpenFinanceCreditData | null;
}

export function useOpenFinance(userId: string | undefined) {
  const [contas, setContas] = useState<OpenFinanceAccount[]>([]);
  const [transacoesOpenFinance, setTransacoesOpenFinance] = useState<Transacao[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregarDados = useCallback(async () => {
    if (!userId) {
      setContas([]);
      setTransacoesOpenFinance([]);
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    try {
      setCarregando(true);
      setErro(null);

      const token = await user.getIdToken();

      // 1. Carregar contas
      const resContas = await fetch('/api/pluggy/accounts', {
        headers: { Authorization: `Bearer ${token}` },
      });

      let accountsData: OpenFinanceAccount[] = [];
      if (resContas.ok) {
        const json = await resContas.json();
        if (Array.isArray(json?.data)) {
          accountsData = json.data;
          setContas(accountsData);
        }
      } else {
        console.error('Falha ao carregar contas Open Finance:', resContas.status);
      }

      // Se houver contas, carregar transações
      if (accountsData.length > 0) {
        const resTrans = await fetch('/api/pluggy/transactions', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (resTrans.ok) {
          const json = await resTrans.json();
          if (Array.isArray(json?.data)) {
            const rawTransactions = json.data as Array<{
              id: string;
              accountId: string;
              description: string;
              amount: number;
              date: string;
              currencyCode?: string;
              type?: string | null;
              status?: string | null;
              category?: string | null;
              descriptionRaw?: string | null;
              operationType?: string | null;
              paymentData?: unknown | null;
              creditCardMetadata?: unknown | null;
            }>;

            const accountTypeMap = new Map<string, string>();
            const userAccountIds = new Set<string>();
            for (const acc of accountsData) {
              accountTypeMap.set(acc.id, acc.type);
              userAccountIds.add(acc.id);
            }

            // 1. Normalização via camada centralizada
            const normalizadas = rawTransactions
              .filter((t) => Boolean(t?.id))
              .map((t) => {
                const rawObj: RawExternalTransaction = {
                  provider: 'pluggy',
                  externalId: t.id,
                  accountId: t.accountId,
                  amount: t.amount,
                  date: t.date,
                  currencyCode: t.currencyCode,
                  type: t.type,
                  status: t.status,
                  category: t.category,
                  description: t.description,
                  descriptionRaw: t.descriptionRaw,
                  operationType: t.operationType,
                  paymentData: t.paymentData,
                  creditCardMetadata: t.creditCardMetadata,
                  raw: t,
                };

                return normalizePluggyTransaction(
                  rawObj,
                  accountTypeMap.get(t.accountId)
                );
              });

            // 2. Reconciliação (transferências entre contas próprias e pagamentos de fatura)
            const reconciliadas = reconcileTransactions(
              normalizadas,
              userAccountIds
            );

            // 2.5: O Cérebro da Navi entra em ação para salvar as transações "outros"
            const naviEnriched = await enrichWithNavi(reconciliadas);

            // 3. Mapeamento para o modelo de Transação do Agile Kapital com deduplicação por id
            const transacoesDeduplicadas = new Map<string, Transacao>();

            for (const ft of naviEnriched) {
              let tipo: 'receita' | 'despesa' = 'despesa';
              if (ft.financialType === 'INCOME') {
                tipo = 'receita';
              } else if (ft.financialType === 'EXPENSE') {
                tipo = 'despesa';
              } else {
                // Para transferências próprias e faturas, preserva o sinal do fluxo financeiro
                tipo = ft.amount > 0 ? 'receita' : 'despesa';
              }

              transacoesDeduplicadas.set(ft.id, {
                id: ft.id,
                descricao: ft.description,
                valorCentavos: ft.amountCentavos,
                tipo,
                categoria: ft.category,
                data: ft.date,
                userId: user.uid,
                competencia: ft.competencia,
                isOpenFinance: true,
                financialType: ft.financialType,
                affectsIncome: ft.affectsIncome,
                affectsExpense: ft.affectsExpense,
                transferGroupId: ft.transferGroupId,
                classificationConfidence: ft.classificationConfidence,
                classificationReason: ft.classificationReason,
                externalId: ft.externalId,
                provider: 'pluggy',
                accountId: ft.accountId,
                accountType: ft.accountType,
                rawStatus: ft.status,
              });
            }

            setTransacoesOpenFinance(
              Array.from(transacoesDeduplicadas.values())
            );
          }
        }
      } else {
        setTransacoesOpenFinance([]);
      }
    } catch (err) {
      console.error('Erro ao consultar Open Finance:', err);
      setErro('Não foi possível sincronizar o Open Finance.');
    } finally {
      setCarregando(false);
    }
  }, [userId]);

  useEffect(() => {
    void carregarDados();
  }, [carregarDados]);

  const desconectar = async (itemId: string): Promise<boolean> => {
    if (!itemId?.trim()) return false;

    const user = auth.currentUser;
    if (!user) {
      toast.error('Usuário não autenticado.');
      return false;
    }

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/pluggy/disconnect', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemId: itemId.trim() }),
      });

      if (!res.ok) {
        throw new Error('Falha ao desconectar.');
      }

      toast.success('Conexão removida com sucesso!');
      await carregarDados();
      return true;
    } catch (err) {
      console.error('Erro ao desconectar conexão Open Finance:', err);
      toast.error('Não foi possível remover a conexão.');
      return false;
    }
  };

  return {
    contas,
    transacoesOpenFinance,
    carregando,
    erro,
    recarregar: carregarDados,
    desconectar,
  };
}
