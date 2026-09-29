import type {
  FinancialTransaction,
  FinancialTransactionType,
  ClassificationConfidence,
  RawExternalTransaction,
} from '../../domain/financialTransaction';
import {
  CATEGORIAS,
  mapearCategoriaPluggy,
  type CategoriaId,
} from '../../utils/categorias';

/**
 * Deduz a categoria do Agile Kapital de forma resiliente.
 * Se a Pluggy fornecer a categoria (período Trial/Pro), utiliza o mapeamento oficial.
 * Se a categoria vier nula, vazia ou o Trial tiver expirado, deduz inteligentemente
 * a partir do texto da descrição por palavras-chave com fallback seguro para 'outros'.
 */
export function deduzirCategoria(
  descricao?: string,
  categoryPluggy?: string | null
): CategoriaId {
  // 1. Tenta categoria oficial Pluggy quando disponível
  if (categoryPluggy && typeof categoryPluggy === 'string') {
    const mapeada = mapearCategoriaPluggy(categoryPluggy);
    if (mapeada !== 'outros') {
      return mapeada;
    }
  }

  // 2. Fallback inteligente via regex da descrição (independência de Trial)
  if (!descricao || typeof descricao !== 'string') {
    return 'outros';
  }

  const normalizado = descricao
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (
    /food|restaurante|refeicao|lanche|padaria|supermercado|mercado|ifood|ubereats|mcdonald|burger|acougue|hortifruti|pao de acucar|carrefour|extra/i.test(
      normalizado
    )
  ) {
    return 'alimentacao';
  }

  if (
    /uber|99app|99\s*pop|taxi|combustivel|posto|gasolina|etanol|estacionamento|pedagio|sem\s*parar|veloe|auto\s*posto|ipiranga|shell|br\s*distribuidora/i.test(
      normalizado
    )
  ) {
    return 'transporte';
  }

  if (
    /farmacia|drogaria|droga\s*raia|drogasil|pague\s*menos|panvel|consulta|medico|hospital|laboratorio|dentista|odont|clinica/i.test(
      normalizado
    )
  ) {
    return 'saude';
  }

  if (/aluguel|condominio|imobiliaria|quinto\s*andar|loft/i.test(normalizado)) {
    return 'moradia';
  }

  if (
    /energia|luz|enel|cpfl|cemig|sabesp|copasa|sanepar|agua|gas|comgas|internet|claro|vivo|tim|oi|telecom|tributo|iptu|ipva|darf|simples\s*nacional/i.test(
      normalizado
    )
  ) {
    return 'contas';
  }

  if (
    /escola|colegio|faculdade|universidade|curso|udemy|alura|livraria|livro|ensino/i.test(
      normalizado
    )
  ) {
    return 'educacao';
  }

  if (
    /cinema|cinemark|ingresso|show|teatro|viagem|hotel|airbnb|booking|steam|playstation|xbox|nintendo|lazer/i.test(
      normalizado
    )
  ) {
    return 'lazer';
  }

  if (
    /spotify|netflix|disney|hbo|prime\s*video|youtube\s*premium|apple\.com|google\s*play|openai|chatgpt|assinatura|subscription/i.test(
      normalizado
    )
  ) {
    return 'assinaturas';
  }

  if (
    /loja|magazine|amazon|mercado\s*livre|shopee|shein|aliexpress|zara|renner|riachuelo|c&a|kabum|pichau|compra/i.test(
      normalizado
    )
  ) {
    return 'compras';
  }

  if (
    /salario|pagamento\s*salario|remuneracao|folha|proventos|pro-labore|dividendos|rendimento|ted\s*recebida\s*salario/i.test(
      normalizado
    )
  ) {
    return 'renda';
  }

  return 'outros';
}

/**
 * Detecta se a descrição ou operationType indicam pagamento de fatura de cartão.
 */
export function isCreditCardPaymentPattern(
  description?: string,
  operationType?: string | null
): boolean {
  if (operationType && typeof operationType === 'string') {
    const opNorm = operationType.toUpperCase();
    if (opNorm.includes('PAGAMENTO_FATURA') || opNorm.includes('FATURA')) {
      return true;
    }
  }

  if (!description || typeof description !== 'string') {
    return false;
  }

  const descNorm = description
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return (
    /(pagamento|pagto|pgto|liquidacao)\s+(de\s+|da\s+)?fatura/i.test(descNorm) ||
    /(pagamento|pagto|pgto)\s+(de\s+|do\s+)?cartao/i.test(descNorm) ||
    /fatura\s+(do\s+)?cartao/i.test(descNorm) ||
    /(fatura|cartao)\s+(nubank|itau|bradesco|santander|inter|c6|bb|banco|credito)/i.test(
      descNorm
    ) ||
    /(deb(\.|\s)+aut(\.|\s)+fatura|debito\s*automatico\s*fatura)/i.test(descNorm) ||
    /pagamento\s*recebido/i.test(descNorm)
  );
}

/**
 * Detecta se a descrição ou operationType indicam estorno ou reembolso.
 */
export function isRefundPattern(
  description?: string,
  operationType?: string | null
): boolean {
  if (operationType && typeof operationType === 'string') {
    const opNorm = operationType.toUpperCase();
    if (
      opNorm.includes('ESTORNO') ||
      opNorm.includes('REFUND') ||
      opNorm.includes('REVERSAL') ||
      opNorm.includes('DEVOLUCAO')
    ) {
      return true;
    }
  }

  if (!description || typeof description !== 'string') {
    return false;
  }

  const descNorm = description
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return (
    /estorno/i.test(descNorm) ||
    /reembolso/i.test(descNorm) ||
    /cancelamento/i.test(descNorm) ||
    /devolucao\s*pix/i.test(descNorm) ||
    /devolucao/i.test(descNorm) ||
    /cashback/i.test(descNorm)
  );
}

export interface ClassificationResult {
  financialType: FinancialTransactionType;
  affectsIncome: boolean;
  affectsExpense: boolean;
  classificationConfidence: ClassificationConfidence;
  classificationReason: string;
}

/**
 * Classifica especificamente transações associadas a contas do tipo 'CREDIT' (Cartão de Crédito).
 * 
 * Regra fundamental:
 * - Na Pluggy, compras no cartão de crédito geralmente chegam com type = 'DEBIT' e amount > 0.
 * - Isso JAMAIS pode ser classificado como receita. É sempre DESPESA (affectsExpense: true).
 * - Pagamento recebido na fatura é neutralizado (affectsIncome: false, affectsExpense: false).
 * - Estornos são REFUND/REVERSAL (affectsIncome: false, affectsExpense: false).
 */
export function classifyCreditCardTransaction(
  raw: RawExternalTransaction
): ClassificationResult {
  const desc = raw.description || raw.descriptionRaw || '';

  // 1. Pagamento de fatura refletido no cartão de crédito
  if (isCreditCardPaymentPattern(desc, raw.operationType)) {
    return {
      financialType: 'CREDIT_CARD_PAYMENT',
      affectsIncome: false,
      affectsExpense: false,
      classificationConfidence: 'HIGH',
      classificationReason: 'CREDIT_CARD_INVOICE_PAYMENT_ON_CARD',
    };
  }

  // 2. Estorno ou reembolso no cartão de crédito
  if (isRefundPattern(desc, raw.operationType)) {
    return {
      financialType: 'REFUND',
      affectsIncome: false,
      affectsExpense: false,
      classificationConfidence: 'HIGH',
      classificationReason: 'CREDIT_CARD_REFUND_OR_REVERSAL',
    };
  }

  // 3. Crédito desconhecido no cartão de crédito
  // Se for crédito (ex: type === 'CREDIT' ou amount < 0 dependendo da convenção da instituição)
  // e não for compra comum:
  if (raw.type === 'CREDIT' || (raw.type !== 'DEBIT' && raw.amount < 0)) {
    return {
      financialType: 'REFUND',
      affectsIncome: false,
      affectsExpense: false,
      classificationConfidence: 'MEDIUM',
      classificationReason: 'CREDIT_ON_CARD_TREATED_AS_ADJUSTMENT',
    };
  }

  // 4. Compra normal no cartão de crédito (DEBIT ou valor positivo de compra)
  return {
    financialType: 'EXPENSE',
    affectsIncome: false,
    affectsExpense: true,
    classificationConfidence: 'HIGH',
    classificationReason: 'CREDIT_CARD_PURCHASE',
  };
}

/**
 * Classifica transações associadas a contas bancárias (Conta Corrente, Poupança, Investimentos).
 */
export function classifyBankAccountTransaction(
  raw: RawExternalTransaction
): ClassificationResult {
  const desc = raw.description || raw.descriptionRaw || '';

  // 1. Pagamento de fatura de cartão saindo da conta corrente
  if (isCreditCardPaymentPattern(desc, raw.operationType)) {
    return {
      financialType: 'CREDIT_CARD_PAYMENT',
      affectsIncome: false,
      affectsExpense: false,
      classificationConfidence: 'HIGH',
      classificationReason: 'CREDIT_CARD_INVOICE_PAYMENT_FROM_BANK',
    };
  }

  // 2. Estorno ou devolução na conta
  if (isRefundPattern(desc, raw.operationType)) {
    return {
      financialType: 'REFUND',
      affectsIncome: false,
      affectsExpense: false,
      classificationConfidence: 'HIGH',
      classificationReason: 'BANK_REFUND_OR_REVERSAL',
    };
  }

  // 3. Débito bancário (saída de recursos)
  // No Pluggy, débito em conta corrente costuma vir com type = 'DEBIT' ou amount < 0.
  const isDebit =
    raw.type === 'DEBIT' ||
    (raw.amount < 0 && raw.type !== 'CREDIT');

  if (isDebit) {
    return {
      financialType: 'EXPENSE',
      affectsIncome: false,
      affectsExpense: true,
      classificationConfidence: 'HIGH',
      classificationReason: 'BANK_ACCOUNT_DEBIT',
    };
  }

  // 4. Crédito bancário (entrada de recursos)
  const isCredit =
    raw.type === 'CREDIT' ||
    (raw.amount > 0 && raw.type !== 'DEBIT');

  if (isCredit) {
    return {
      financialType: 'INCOME',
      affectsIncome: true,
      affectsExpense: false,
      classificationConfidence: 'HIGH',
      classificationReason: 'BANK_ACCOUNT_CREDIT',
    };
  }

  // 5. Fallback conservador para casos desconhecidos
  return {
    financialType: 'UNKNOWN',
    affectsIncome: false,
    affectsExpense: false,
    classificationConfidence: 'LOW',
    classificationReason: 'UNKNOWN_BANK_MOVEMENT',
  };
}

/**
 * Normaliza uma transação bruta externa da Pluggy para o modelo financeiro do Agile Kapital.
 */
export function normalizePluggyTransaction(
  raw: RawExternalTransaction,
  accountType?: string
): FinancialTransaction {
  const externalId = String(raw.externalId || '').trim();
  const id = `of_${externalId}`;
  const accountId = String(raw.accountId || '').trim();
  const rawAmount = typeof raw.amount === 'number' && Number.isFinite(raw.amount) ? raw.amount : 0;
  const amountCentavos = Math.round(Math.abs(rawAmount) * 100);

  const rawDate = raw.date ? String(raw.date).trim() : '';
  const dateStr = rawDate ? rawDate.split('T')[0] : new Date().toISOString().split('T')[0];
  const competencia = dateStr.substring(0, 7);

  const description = (
    raw.description ||
    raw.descriptionRaw ||
    'Transação Open Finance'
  ).trim();

  // Dedução resiliente de categoria
  const catKey = deduzirCategoria(description, raw.category);
  const category = CATEGORIAS[catKey]?.id || 'outros';

  const isCreditCard = accountType?.toUpperCase() === 'CREDIT';

  const classification = isCreditCard
    ? classifyCreditCardTransaction(raw)
    : classifyBankAccountTransaction(raw);

  return {
    id,
    provider: 'pluggy',
    externalId,
    accountId,
    accountType: accountType || 'BANK',
    amount: rawAmount,
    amountCentavos,
    date: dateStr,
    competencia,
    description,
    category,
    financialType: classification.financialType,
    affectsIncome: classification.affectsIncome,
    affectsExpense: classification.affectsExpense,
    classificationSource: 'RULE',
    classificationConfidence: classification.classificationConfidence,
    classificationReason: classification.classificationReason,
    status: raw.status || null,
    raw,
  };
}
