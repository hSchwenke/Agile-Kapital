import { 
  validateLLMBatchOutput, 
  BatchTransactionInputSchema, 
  type BatchTransactionInput, 
  type BatchCategorizationOutput 
} from './guardrails';

const SYSTEM_PROMPT = `
Você é a Navi, o agente financeiro do aplicativo Agile Kapital.
Sua missão atual é classificar em lote várias transações financeiras.

REGRAS RÍGIDAS:
1. Responda APENAS em JSON, com a seguinte estrutura estrita:
{
  "results": [
    {
      "id": "o_mesmo_id_enviado",
      "categoryId": "...",
      "type": "receita_ou_despesa",
      "confidence": 99,
      "reasoning": "..."
    }
  ]
}
2. O "categoryId" DEVE ser EXATAMENTE um desta lista: 'alimentacao', 'moradia', 'transporte', 'lazer', 'saude', 'educacao', 'outros', 'compras', 'assinaturas', 'contas', 'renda'.
3. O campo "type" DEVE ser 'receita' ou 'despesa'.
4. Retorne todas as transações enviadas.
`;

export async function categorizeTransactionBatch(inputs: BatchTransactionInput): Promise<BatchCategorizationOutput> {
  const safeInputs = BatchTransactionInputSchema.parse(inputs);
  const fallbackIds = safeInputs.map(i => i.id);

  // Montamos o input de forma super enxuta para gastar o mínimo de tokens possível
  const prompt = `Classifique este lote de transações:\n` + JSON.stringify(
    safeInputs.map(tx => ({ id: tx.id, desc: tx.description, cents: tx.amountCents }))
  );

  const apiKey = process.env.GROQ_API_KEY?.trim();
  const url = "https://api.groq.com/openai/v1/chat/completions";

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b", // Ou o modelo atualizado que definimos via Groq!
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      })
    });

    if (!response.ok) {
      throw new Error(`Groq API failed: ${await response.text()}`);
    }

    const data = await response.json();
    const textOutput = data.choices?.[0]?.message?.content || "{}";
    
    return validateLLMBatchOutput(textOutput, fallbackIds);

  } catch (error) {
    console.error("Erro na comunicação em lote com a Groq:", error);
    return {
      results: fallbackIds.map(id => ({
        id,
        categoryId: 'outros',
        type: 'despesa',
        confidence: 0,
        reasoning: "Falha de rede ou timeout na API do LLM."
      }))
    };
  }
}
