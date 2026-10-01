import type { FinancialTransaction } from '../../domain/financialTransaction';

/**
 * Filtra as transações que a regra estática não conseguiu classificar bem ('outros')
 * e envia para o Cérebro da Navi classificar EM LOTE (Batch).
 */
export async function enrichWithNavi(transactions: FinancialTransaction[]): Promise<FinancialTransaction[]> {
  const enriched = [...transactions];

  // Filtramos apenas as que precisam de ajuda da IA e que possuam um ID válido
  const toCategorize = enriched.filter(
    (t) => t.category === 'outros' && (t.financialType === 'EXPENSE' || t.financialType === 'INCOME') && t.id
  );

  if (toCategorize.length === 0) {
    return enriched; 
  }

  console.log(`[Navi] Enviando lote de ${toCategorize.length} transações obscuras para análise...`);

  try {
    // Agora fazemos apenas UMA única chamada para a API com o array inteiro
    const response = await fetch('/api/navi/categorize-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactions: toCategorize.map(tx => ({
          id: tx.id,
          description: tx.description,
          amountCents: tx.amountCentavos
        }))
      }),
    });

    if (!response.ok) {
      throw new Error(`Batch API error: ${response.status}`);
    }

    const { results } = (await response.json()) as any;

    // results é um array de { id, categoryId, type, confidence, reasoning }
    // Vamos criar um mapa para achar rápido pelo ID O(1)
    const mapResults = new Map<string, any>(results.map((r: any) => [r.id, r]));

    // Agora atualizamos as transações originais
    for (const tx of enriched) {
      if (mapResults.has(tx.id)) {
        const aiResult: any = mapResults.get(tx.id);
        tx.category = aiResult.categoryId;
        
        if (aiResult.type === 'receita') tx.financialType = 'INCOME';
        else if (aiResult.type === 'despesa') tx.financialType = 'EXPENSE';
        
        tx.classificationSource = 'SYSTEM';
        tx.classificationConfidence = aiResult.confidence > 80 ? 'HIGH' : 'MEDIUM';
        tx.classificationReason = aiResult.reasoning;
        
        console.log(`[Navi Batch] "${tx.description}" -> ${tx.category}`);
      }
    }

  } catch (err) {
    console.error(`[Navi] Erro no processamento em lote:`, err);
  }

  return enriched;
}
