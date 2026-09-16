import { useEffect, useState } from 'react';
import type { Transacao } from '../domain/transaction';
import { observarTransacoes } from '../services/transactionService';

interface TransactionsState {
  userId: string | null;
  competencia: string | null;
  transacoes: Transacao[];
}

export function useTransactions(
  userId: string | undefined,
  competencia: string
) {
  const [estado, setEstado] = useState<TransactionsState>({
    userId: null,
    competencia: null,
    transacoes: [],
  });

  useEffect(() => {
    if (!userId) return;

    return observarTransacoes(
      userId,
      competencia,
      (transacoes) => {
        setEstado({
          userId,
          competencia,
          transacoes,
        });
      }
    );
  }, [userId, competencia]);

  const transacoes =
    estado.userId === userId &&
      estado.competencia === competencia
      ? estado.transacoes
      : [];

  return { transacoes };
}