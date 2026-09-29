import type { CategoriaId } from '../utils/categorias';
import type {
    FinancialTransactionType,
    ClassificationConfidence,
} from './financialTransaction';

export interface Transacao {
    id: string;
    descricao: string;
    valorCentavos: number;
    tipo: 'receita' | 'despesa';
    categoria?: CategoriaId | string;
    data?: string;
    userId: string;
    competencia: string;
    parcelamentoId?: string;
    cartaoId?: string;
    numeroParcela?: number;
    totalParcelas?: number;
    isOpenFinance?: boolean;

    // Enriquecimento financeiro / reconciliação
    financialType?: FinancialTransactionType;
    affectsIncome?: boolean;
    affectsExpense?: boolean;
    transferGroupId?: string;
    classificationConfidence?: ClassificationConfidence;
    classificationReason?: string;
    externalId?: string;
    provider?: 'pluggy' | 'manual';
    accountId?: string;
    accountType?: string;
    rawStatus?: string | null;
}