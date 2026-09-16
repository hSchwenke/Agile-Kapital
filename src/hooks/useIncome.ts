import { useEffect, useState } from 'react';
import { observarRenda } from '../services/incomeService';

interface IncomeState {
  userId: string | null;
  rendaFixa: number;
}

export function useIncome(userId: string | undefined) {
  const [estado, setEstado] = useState<IncomeState>({
    userId: null,
    rendaFixa: 0,
  });

  useEffect(() => {
    if (!userId) return;

    return observarRenda(userId, (rendaFixa) => {
      setEstado({
        userId,
        rendaFixa,
      });
    });
  }, [userId]);

  const rendaFixa =
    estado.userId === userId
      ? estado.rendaFixa
      : 0;

  return { rendaFixa };
}