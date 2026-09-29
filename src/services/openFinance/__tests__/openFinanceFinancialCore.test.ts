import { describe, it, expect } from 'vitest';
import type { RawExternalTransaction } from '../../../domain/financialTransaction';
import {
  normalizePluggyTransaction,
} from '../transactionNormalizer';
import { reconcileTransactions } from '../reconciliationEngine';
import {
  calcularTotalReceitas,
  calcularTotalDespesas,
  calcularSaldo,
  calcularDespesasPorCategoria,
} from '../../../finance/financialCore';
import type { Transacao } from '../../../domain/transaction';

describe('Camada Financeira Open Finance & Financial Core', () => {
  // 1. Conta Corrente: Crédito e Débito normais
  describe('Conta Corrente Bancária', () => {
    it('classifica CREDIT normal em conta corrente como INCOME', () => {
      const raw: RawExternalTransaction = {
        provider: 'pluggy',
        externalId: 'tx-cc-inc-1',
        accountId: 'acc-bank-1',
        amount: 3500,
        date: '2026-09-10T10:00:00Z',
        type: 'CREDIT',
        description: 'TED Recebida Salario Empresa XYZ',
      };

      const normalized = normalizePluggyTransaction(raw, 'BANK');
      expect(normalized.financialType).toBe('INCOME');
      expect(normalized.affectsIncome).toBe(true);
      expect(normalized.affectsExpense).toBe(false);
      expect(normalized.amountCentavos).toBe(350000);
      expect(normalized.category).toBe('renda');
    });

    it('classifica DEBIT normal em conta corrente como EXPENSE', () => {
      const raw: RawExternalTransaction = {
        provider: 'pluggy',
        externalId: 'tx-cc-exp-1',
        accountId: 'acc-bank-1',
        amount: -120.5,
        date: '2026-09-11T14:30:00Z',
        type: 'DEBIT',
        description: 'Restaurante Sabor Brasil',
      };

      const normalized = normalizePluggyTransaction(raw, 'BANK');
      expect(normalized.financialType).toBe('EXPENSE');
      expect(normalized.affectsIncome).toBe(false);
      expect(normalized.affectsExpense).toBe(true);
      expect(normalized.amountCentavos).toBe(12050);
      expect(normalized.category).toBe('alimentacao');
    });
  });

  // 2. Cartão de Crédito: Compra DEBIT com amount positivo
  describe('Cartão de Crédito', () => {
    it('corrige bug crítico: DEBIT com amount positivo no cartão DEVE ser EXPENSE e NUNCA INCOME', () => {
      const raw: RawExternalTransaction = {
        provider: 'pluggy',
        externalId: 'tx-card-supermarket',
        accountId: 'acc-card-1',
        amount: 350, // No Pluggy chega como +350 e type DEBIT
        date: '2026-09-12T18:00:00Z',
        type: 'DEBIT',
        description: 'SUPERMERCADO CARREFOUR',
      };

      const normalized = normalizePluggyTransaction(raw, 'CREDIT');
      expect(normalized.financialType).toBe('EXPENSE');
      expect(normalized.affectsExpense).toBe(true);
      expect(normalized.affectsIncome).toBe(false);
      expect(normalized.amountCentavos).toBe(35000);
      expect(normalized.category).toBe('alimentacao');
    });

    it('classifica pagamento de fatura recebido no cartão como CREDIT_CARD_PAYMENT neutro', () => {
      const raw: RawExternalTransaction = {
        provider: 'pluggy',
        externalId: 'tx-card-pay-1',
        accountId: 'acc-card-1',
        amount: -500,
        date: '2026-09-15T12:00:00Z',
        type: 'CREDIT',
        description: 'PAGAMENTO RECEBIDO FATURA',
      };

      const normalized = normalizePluggyTransaction(raw, 'CREDIT');
      expect(normalized.financialType).toBe('CREDIT_CARD_PAYMENT');
      expect(normalized.affectsIncome).toBe(false);
      expect(normalized.affectsExpense).toBe(false);
    });

    it('classifica estorno no cartão de crédito como REFUND e não como receita', () => {
      const raw: RawExternalTransaction = {
        provider: 'pluggy',
        externalId: 'tx-card-refund-1',
        accountId: 'acc-card-1',
        amount: -89.9,
        date: '2026-09-16T15:00:00Z',
        type: 'CREDIT',
        description: 'ESTORNO COMPRA CANCELADA LOJA XYZ',
        operationType: 'ESTORNO',
      };

      const normalized = normalizePluggyTransaction(raw, 'CREDIT');
      expect(normalized.financialType).toBe('REFUND');
      expect(normalized.affectsIncome).toBe(false);
      expect(normalized.affectsExpense).toBe(false);
    });
  });

  // 3. Transferências entre contas próprias (Reconciliação)
  describe('Reconciliação de Transferências entre Contas Próprias', () => {
    it('neutraliza PIX entre contas próprias do usuário (Nubank -> Inter) e preserva no extrato', () => {
      const userAccounts = new Set(['acc-nubank', 'acc-inter']);

      const txNubank: RawExternalTransaction = {
        provider: 'pluggy',
        externalId: 'tx-pix-out',
        accountId: 'acc-nubank',
        amount: -3000,
        date: '2026-09-20T10:00:00Z',
        type: 'DEBIT',
        description: 'PIX ENVIADO PARA INTER',
      };

      const txInter: RawExternalTransaction = {
        provider: 'pluggy',
        externalId: 'tx-pix-in',
        accountId: 'acc-inter',
        amount: 3000,
        date: '2026-09-20T10:01:00Z',
        type: 'CREDIT',
        description: 'PIX RECEBIDO DE NUBANK',
      };

      const normNubank = normalizePluggyTransaction(txNubank, 'BANK');
      const normInter = normalizePluggyTransaction(txInter, 'BANK');

      const reconciled = reconcileTransactions([normNubank, normInter], userAccounts);

      expect(reconciled).toHaveLength(2);

      const [outRec, inRec] = reconciled;
      expect(outRec.financialType).toBe('INTERNAL_TRANSFER');
      expect(outRec.affectsIncome).toBe(false);
      expect(outRec.affectsExpense).toBe(false);
      expect(outRec.classificationConfidence).toBe('HIGH');
      expect(outRec.transferGroupId).toBeDefined();

      expect(inRec.financialType).toBe('INTERNAL_TRANSFER');
      expect(inRec.affectsIncome).toBe(false);
      expect(inRec.affectsExpense).toBe(false);
      expect(inRec.transferGroupId).toBe(outRec.transferGroupId);

      // Verificação no Financial Core
      const transacoesApp: Transacao[] = reconciled.map((r) => ({
        id: r.id,
        descricao: r.description,
        valorCentavos: r.amountCentavos,
        tipo: r.amount > 0 ? 'receita' : 'despesa',
        userId: 'user-1',
        competencia: '2026-09',
        affectsIncome: r.affectsIncome,
        affectsExpense: r.affectsExpense,
      }));

      // R$ 3.000 de cada lado NÃO pode alterar receitas nem despesas!
      expect(calcularTotalReceitas(transacoesApp)).toBe(0);
      expect(calcularTotalDespesas(transacoesApp)).toBe(0);
      expect(calcularSaldo(transacoesApp, 0)).toBe(0);
    });

    it('processa múltiplos pares de transferência cumulativamente somando R$ 10.000 em movimentações brutas com impacto 0 no saldo', () => {
      const userAccounts = new Set(['acc-nubank', 'acc-inter', 'acc-mp']);

      const t1 = normalizePluggyTransaction(
        {
          provider: 'pluggy',
          externalId: 't1',
          accountId: 'acc-nubank',
          amount: -3000,
          date: '2026-09-01T10:00:00Z',
          type: 'DEBIT',
          description: 'PIX enviado',
        },
        'BANK'
      );

      const t2 = normalizePluggyTransaction(
        {
          provider: 'pluggy',
          externalId: 't2',
          accountId: 'acc-inter',
          amount: 3000,
          date: '2026-09-01T10:01:00Z',
          type: 'CREDIT',
          description: 'PIX recebido',
        },
        'BANK'
      );

      const t3 = normalizePluggyTransaction(
        {
          provider: 'pluggy',
          externalId: 't3',
          accountId: 'acc-inter',
          amount: -2000,
          date: '2026-09-02T11:00:00Z',
          type: 'DEBIT',
          description: 'PIX enviado',
        },
        'BANK'
      );

      const t4 = normalizePluggyTransaction(
        {
          provider: 'pluggy',
          externalId: 't4',
          accountId: 'acc-mp',
          amount: 2000,
          date: '2026-09-02T11:02:00Z',
          type: 'CREDIT',
          description: 'PIX recebido',
        },
        'BANK'
      );

      const reconciled = reconcileTransactions([t1, t2, t3, t4], userAccounts);

      const transacoesApp: Transacao[] = reconciled.map((r) => ({
        id: r.id,
        descricao: r.description,
        valorCentavos: r.amountCentavos,
        tipo: r.amount > 0 ? 'receita' : 'despesa',
        userId: 'user-1',
        competencia: '2026-09',
        affectsIncome: r.affectsIncome,
        affectsExpense: r.affectsExpense,
      }));

      expect(calcularTotalReceitas(transacoesApp)).toBe(0);
      expect(calcularTotalDespesas(transacoesApp)).toBe(0);
      expect(calcularSaldo(transacoesApp, 0)).toBe(0);
    });

    it('mantém PIX para terceiro como despesa legítima quando não há contraparte própria', () => {
      const userAccounts = new Set(['acc-nubank', 'acc-inter']);

      const pixTerceiro = normalizePluggyTransaction(
        {
          provider: 'pluggy',
          externalId: 'tx-pix-terceiro',
          accountId: 'acc-nubank',
          amount: -500,
          date: '2026-09-21T16:00:00Z',
          type: 'DEBIT',
          description: 'PIX ENVIADO JOAO DA SILVA MECANICA',
        },
        'BANK'
      );

      const reconciled = reconcileTransactions([pixTerceiro], userAccounts);
      expect(reconciled[0].financialType).toBe('EXPENSE');
      expect(reconciled[0].affectsExpense).toBe(true);
      expect(reconciled[0].affectsIncome).toBe(false);
    });
  });

  // 4. Pagamento de Fatura não duplica despesa
  describe('Pagamento de Fatura de Cartão', () => {
    it('garante que a compra no cartão de R$ 200 é a única despesa econômica, e o pagamento da fatura não a duplica', () => {
      const userAccounts = new Set(['acc-bank', 'acc-card']);

      // 01/09: Compra no restaurante no cartão
      const compraCartao = normalizePluggyTransaction(
        {
          provider: 'pluggy',
          externalId: 'tx-compra-restaurante',
          accountId: 'acc-card',
          amount: 200,
          date: '2026-09-01T20:00:00Z',
          type: 'DEBIT',
          description: 'Restaurante Bom Sabor',
        },
        'CREDIT'
      );

      // 10/10: Débito em conta corrente para pagamento da fatura
      const debitoFaturaConta = normalizePluggyTransaction(
        {
          provider: 'pluggy',
          externalId: 'tx-pagto-fatura-cc',
          accountId: 'acc-bank',
          amount: -200,
          date: '2026-10-10T10:00:00Z',
          type: 'DEBIT',
          description: 'PAGAMENTO DE FATURA CARTAO NUBANK',
          operationType: 'PAGAMENTO_FATURA',
        },
        'BANK'
      );

      const reconciled = reconcileTransactions(
        [compraCartao, debitoFaturaConta],
        userAccounts
      );

      const transacoesApp: Transacao[] = reconciled.map((r) => ({
        id: r.id,
        descricao: r.description,
        valorCentavos: r.amountCentavos,
        tipo: r.amount > 0 ? 'receita' : 'despesa',
        userId: 'user-1',
        competencia: '2026-09',
        affectsIncome: r.affectsIncome,
        affectsExpense: r.affectsExpense,
      }));

      // Despesa econômica total DEVE ser exatamente R$ 200 (20.000 centavos) e NÃO R$ 400
      expect(calcularTotalDespesas(transacoesApp)).toBe(20000);
      expect(calcularTotalReceitas(transacoesApp)).toBe(0);
    });
  });

  // 5. Independência do Trial da Pluggy
  describe('Independência do Trial/Pro da Pluggy', () => {
    it('funciona perfeitamente quando category, merchant e enrichment são completamente nulos', () => {
      const rawWithoutPremium: RawExternalTransaction = {
        provider: 'pluggy',
        externalId: 'tx-no-premium-uber',
        accountId: 'acc-bank-1',
        amount: -32.5,
        date: '2026-09-22T08:00:00Z',
        type: 'DEBIT',
        description: 'UBER *TRIP 1234 HELP.UBER.COM',
        category: null, // Sem category Pluggy
        descriptionRaw: null,
        operationType: null,
        paymentData: null,
        creditCardMetadata: null,
      };

      const normalized = normalizePluggyTransaction(rawWithoutPremium, 'BANK');
      expect(normalized.financialType).toBe('EXPENSE');
      expect(normalized.affectsExpense).toBe(true);
      // Categoria deduzida via fallback de palavras-chave da descrição!
      expect(normalized.category).toBe('transporte');
      expect(normalized.amountCentavos).toBe(3250);
    });

    it('atribui categoria outros com segurança quando descrição não tem padrão reconhecido e category é nula', () => {
      const rawUnknown: RawExternalTransaction = {
        provider: 'pluggy',
        externalId: 'tx-unknown-desc',
        accountId: 'acc-bank-1',
        amount: -50,
        date: '2026-09-22T10:00:00Z',
        type: 'DEBIT',
        description: 'DIVERSOS PAGAMENTO GENERICO',
        category: null,
      };

      const normalized = normalizePluggyTransaction(rawUnknown, 'BANK');
      expect(normalized.financialType).toBe('EXPENSE');
      expect(normalized.category).toBe('outros');
    });
  });

  // 6. Deduplicação e compras legítimas iguais
  describe('Deduplicação e integridade de transações', () => {
    it('duas compras legítimas iguais no mesmo dia (Uber 25, Uber 25) com externalIds diferentes são preservadas', () => {
      const rawUber1: RawExternalTransaction = {
        provider: 'pluggy',
        externalId: 'uber-tx-ida',
        accountId: 'acc-bank-1',
        amount: -25,
        date: '2026-09-25T08:00:00Z',
        type: 'DEBIT',
        description: 'Uber Viagem Ida',
      };

      const rawUber2: RawExternalTransaction = {
        provider: 'pluggy',
        externalId: 'uber-tx-volta',
        accountId: 'acc-bank-1',
        amount: -25,
        date: '2026-09-25T18:00:00Z',
        type: 'DEBIT',
        description: 'Uber Viagem Volta',
      };

      const n1 = normalizePluggyTransaction(rawUber1, 'BANK');
      const n2 = normalizePluggyTransaction(rawUber2, 'BANK');

      const map = new Map<string, typeof n1>();
      map.set(n1.id, n1);
      map.set(n2.id, n2);

      expect(map.size).toBe(2);

      const transacoes: Transacao[] = Array.from(map.values()).map((r) => ({
        id: r.id,
        descricao: r.description,
        valorCentavos: r.amountCentavos,
        tipo: 'despesa',
        categoria: r.category,
        userId: 'u1',
        competencia: '2026-09',
        affectsExpense: r.affectsExpense,
      }));

      expect(calcularTotalDespesas(transacoes)).toBe(5000);
      const porCat = calcularDespesasPorCategoria(transacoes);
      expect(porCat.transporte).toBe(5000);
    });
  });
});
