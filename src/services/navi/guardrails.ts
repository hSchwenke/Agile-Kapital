import { z } from 'zod';

// --- SINGLE TRANSACTION (Legacy, if needed) ---
export const TransactionInputSchema = z.object({
  id: z.string().optional(),
  description: z.string().max(200).min(1),
  amountCents: z.number().int(),
});
export type TransactionInput = z.infer<typeof TransactionInputSchema>;

export const CategoryIdEnum = z.enum([
  'alimentacao', 'moradia', 'transporte', 'lazer', 'saude', 
  'educacao', 'outros', 'compras', 'assinaturas', 'contas', 'renda'
]);

export const CategorizationOutputSchema = z.object({
  id: z.string().optional(),
  categoryId: CategoryIdEnum,
  type: z.enum(['receita', 'despesa']),
  confidence: z.number().min(0).max(100),
  reasoning: z.string().max(300)
});
export type CategorizationOutput = z.infer<typeof CategorizationOutputSchema>;

// --- BATCH TRANSACTION (MEGABRAIN) ---

export const BatchTransactionInputSchema = z.array(z.object({
  id: z.string(),
  description: z.string().max(200).min(1),
  amountCents: z.number().int(),
})).max(100, "Máximo de 100 transações por lote para evitar estourar o contexto.");

export type BatchTransactionInput = z.infer<typeof BatchTransactionInputSchema>;

export const BatchCategorizationOutputSchema = z.object({
  results: z.array(CategorizationOutputSchema)
});

export type BatchCategorizationOutput = z.infer<typeof BatchCategorizationOutputSchema>;


// --- VALIDATORS ---

export function validateLLMBatchOutput(rawJsonText: string, fallbackIds: string[]): BatchCategorizationOutput {
  try {
    const cleanJson = rawJsonText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    return BatchCategorizationOutputSchema.parse(parsed);
  } catch (error) {
    console.error("🔥 [GUARDRAIL BATCH INTERVENTION] Falha massiva de schema da IA:", error);
    // Em caso de falha completa (ex: estourou token), salvamos a pátria aplicando fallback para todas
    return {
      results: fallbackIds.map(id => ({
        id,
        categoryId: 'outros',
        type: 'despesa',
        confidence: 0,
        reasoning: "Fallback do Guardrail devido à alucinação no lote."
      }))
    };
  }
}
