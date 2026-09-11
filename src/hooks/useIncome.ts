import { useEffect, useState } from 'react';
import { observarRenda } from '../services/incomeService';

export function useIncome(userId: string | undefined) {
  const [rendaFixa, setRendaFixa] = useState(0);

  useEffect(() => {
    if (!userId) {
      setRendaFixa(0);
      return;
    }

    return observarRenda(
      userId,
      setRendaFixa
    );
  }, [userId]);

  return { rendaFixa };
}
