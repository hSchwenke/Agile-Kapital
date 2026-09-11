import { useEffect, useState } from 'react';
import type { Transacao } from '../domain/transaction';
import { observarTransacoes } from '../services/transactionService';

export function useTransactions(
  userId: string | undefined,
  competencia: string
) {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);

  useEffect(() => {
    if (!userId) {
      setTransacoes([]);
      return;
    }

    return observarTransacoes(
      userId,
      competencia,
      setTransacoes
    );
  }, [userId, competencia]);

  return { transacoes };
}
