import type { FinancialTransaction } from '../../domain/financialTransaction';

/**
 * Calcula a diferença em dias entre duas datas no formato YYYY-MM-DD.
 */
function diferencaEmDias(data1: string, data2: string): number {
  const d1 = new Date(`${data1.slice(0, 10)}T12:00:00Z`).getTime();
  const d2 = new Date(`${data2.slice(0, 10)}T12:00:00Z`).getTime();
  const diffMs = Math.abs(d1 - d2);
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Detecta se a descrição contém indícios de transferência bancária (PIX, TED, DOC, etc.).
 */
function isTransferPattern(description?: string): boolean {
  if (!description) return false;
  const desc = description
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return (
    /pix/i.test(desc) ||
    /ted/i.test(desc) ||
    /doc/i.test(desc) ||
    /transf/i.test(desc) ||
    /transferencia/i.test(desc) ||
    /tef/i.test(desc) ||
    /entre\s*contas/i.test(desc) ||
    /mesma\s*titularidade/i.test(desc) ||
    /deposito/i.test(desc)
  );
}

/**
 * Motor de Reconciliação Financeira do Agile Kapital.
 * 
 * Responsabilidades:
 * 1. Identificar pares de transferências entre contas pertencentes ao mesmo usuário (INTERNAL_TRANSFER).
 * 2. Reconciliar pagamentos de fatura de cartão com débitos correspondentes em conta corrente (CREDIT_CARD_PAYMENT).
 * 3. Garantir que transferências e pagamentos de fatura continuem visíveis no extrato,
 *    mas com affectsIncome = false e affectsExpense = false para não inflar receitas nem duplicar despesas.
 */
export function reconcileTransactions(
  transactions: FinancialTransaction[],
  userAccountIds?: Set<string>
): FinancialTransaction[] {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return [];
  }

  // Cria cópia das transações para mutação segura e isolada
  const result: FinancialTransaction[] = transactions.map((t) => ({ ...t }));
  const matchedIndices = new Set<number>();

  const accountIds =
    userAccountIds && userAccountIds.size > 0
      ? userAccountIds
      : new Set(transactions.map((t) => t.accountId).filter(Boolean));

  // 1. RECONCILIAÇÃO DE TRANSFERÊNCIAS ENTRE CONTAS PRÓPRIAS
  for (let i = 0; i < result.length; i++) {
    if (matchedIndices.has(i)) continue;
    const tOut = result[i];

    // Ignora transações que já foram marcadas como pagamento de fatura ou estorno
    if (
      tOut.financialType === 'CREDIT_CARD_PAYMENT' ||
      tOut.financialType === 'REFUND' ||
      tOut.financialType === 'REVERSAL'
    ) {
      continue;
    }

    // Procura transação que represente saída de recursos de uma conta do usuário
    const isOutCandidate =
      accountIds.has(tOut.accountId) &&
      tOut.accountType !== 'CREDIT' &&
      (tOut.financialType === 'EXPENSE' || tOut.amount < 0 || tOut.raw?.type === 'DEBIT');

    if (!isOutCandidate) continue;

    // Busca o par correspondente de entrada
    let bestMatchIndex = -1;
    let minDaysDiff = 999;

    for (let j = 0; j < result.length; j++) {
      if (i === j || matchedIndices.has(j)) continue;
      const tIn = result[j];

      // Deve ser de outra conta pertencente ao usuário
      if (tIn.accountId === tOut.accountId) continue;
      if (!accountIds.has(tIn.accountId)) continue;
      if (tIn.accountType === 'CREDIT') continue;

      // Deve ter exatamente o mesmo valor absoluto em centavos
      if (tIn.amountCentavos !== tOut.amountCentavos || tIn.amountCentavos <= 0) {
        continue;
      }

      // Deve ser uma entrada de recursos
      const isInCandidate =
        tIn.financialType === 'INCOME' || tIn.amount > 0 || tIn.raw?.type === 'CREDIT';
      if (!isInCandidate) continue;

      // Proximidade de datas (mesmo dia ou até 2 dias para fins de semana/compensação)
      const diff = diferencaEmDias(tOut.date, tIn.date);
      if (diff > 2) continue;

      // Evidências de transferência
      const outHasTransferEvidence = isTransferPattern(tOut.description);
      const inHasTransferEvidence = isTransferPattern(tIn.description);

      // Se ambos tiverem indício de transferência ou se ocorrerem em contas bancárias no mesmo dia
      if (outHasTransferEvidence || inHasTransferEvidence || diff === 0) {
        if (diff < minDaysDiff) {
          minDaysDiff = diff;
          bestMatchIndex = j;
        }
      }
    }

    // Se encontrou um par válido
    if (bestMatchIndex !== -1) {
      const tIn = result[bestMatchIndex];
      const transferGroupId = `transfer_${[tOut.id, tIn.id].sort().join('_')}`;

      // Neutraliza lado de saída
      result[i] = {
        ...tOut,
        financialType: 'INTERNAL_TRANSFER',
        affectsIncome: false,
        affectsExpense: false,
        transferGroupId,
        classificationConfidence: 'HIGH',
        classificationReason: 'MATCHED_OWN_ACCOUNTS',
      };

      // Neutraliza lado de entrada
      result[bestMatchIndex] = {
        ...tIn,
        financialType: 'INTERNAL_TRANSFER',
        affectsIncome: false,
        affectsExpense: false,
        transferGroupId,
        classificationConfidence: 'HIGH',
        classificationReason: 'MATCHED_OWN_ACCOUNTS',
      };

      matchedIndices.add(i);
      matchedIndices.add(bestMatchIndex);
    }
  }

  // 2. RECONCILIAÇÃO DE PAGAMENTO DE FATURA (CONTA CORRENTE <-> CARTÃO DE CRÉDITO)
  for (let i = 0; i < result.length; i++) {
    if (matchedIndices.has(i)) continue;
    const t = result[i];

    if (t.financialType !== 'CREDIT_CARD_PAYMENT') continue;

    // Se é saída da conta bancária
    if (t.accountType !== 'CREDIT') {
      for (let j = 0; j < result.length; j++) {
        if (i === j || matchedIndices.has(j)) continue;
        const tCard = result[j];

        if (tCard.accountType !== 'CREDIT') continue;
        if (tCard.amountCentavos !== t.amountCentavos) continue;

        const diff = diferencaEmDias(t.date, tCard.date);
        if (diff > 3) continue;

        const groupId = `cc_pay_${[t.id, tCard.id].sort().join('_')}`;
        result[i] = {
          ...t,
          transferGroupId: groupId,
          classificationConfidence: 'HIGH',
          classificationReason: 'MATCHED_INVOICE_PAYMENT_PAIR',
        };
        result[j] = {
          ...tCard,
          financialType: 'CREDIT_CARD_PAYMENT',
          affectsIncome: false,
          affectsExpense: false,
          transferGroupId: groupId,
          classificationConfidence: 'HIGH',
          classificationReason: 'MATCHED_INVOICE_PAYMENT_PAIR',
        };

        matchedIndices.add(i);
        matchedIndices.add(j);
        break;
      }
    }
  }

  return result;
}
