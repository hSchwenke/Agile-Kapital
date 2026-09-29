export type FinancialTransactionType =
  | 'INCOME'
  | 'EXPENSE'
  | 'INTERNAL_TRANSFER'
  | 'CREDIT_CARD_PAYMENT'
  | 'REFUND'
  | 'REVERSAL'
  | 'UNKNOWN';

export type ClassificationSource = 'SYSTEM' | 'USER' | 'RULE';

export type ClassificationConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface RawExternalTransaction {
  provider: 'pluggy';
  externalId: string;
  accountId: string;
  amount: number;
  date: string;
  currencyCode?: string;
  type?: string | null;
  status?: string | null;
  category?: string | null;
  description?: string;
  descriptionRaw?: string | null;
  operationType?: string | null;
  paymentData?: unknown | null;
  creditCardMetadata?: unknown | null;
  raw?: unknown;
}

export interface FinancialTransaction {
  id: string; // ex: of_${externalId}
  provider: 'pluggy' | 'manual';
  externalId: string;
  accountId: string;
  accountType?: 'CREDIT' | 'BANK' | string;
  amount: number;
  amountCentavos: number;
  date: string;
  competencia: string; // YYYY-MM
  description: string;
  category: string;
  financialType: FinancialTransactionType;
  affectsIncome: boolean;
  affectsExpense: boolean;
  classificationSource: ClassificationSource;
  classificationConfidence: ClassificationConfidence;
  classificationReason: string;
  transferGroupId?: string;
  status?: string | null; // PENDING | POSTED
  raw?: RawExternalTransaction;
}
