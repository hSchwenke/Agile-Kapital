import type { VercelRequest, VercelResponse } from '@vercel/node';
import { categorizeTransactionBatch } from '../../src/services/navi/naviCategorizer';
import { verifyFirebaseToken, AuthError } from '../../server/auth/verifyFirebaseToken.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    await verifyFirebaseToken(req.headers);
    // Pegamos a requisição (geralmente virá do webhook do Pluggy ou de um import)
    const { description, amountCents } = req.body;

    // Se estiver faltando o básico, nem aciona o guardrail da IA
    if (!description || typeof amountCents !== 'number') {
      return res.status(400).json({ error: 'Missing description or amountCents in body.' });
    }

    // Chama o serviço blindado da Navi (Guardrail Input -> Gemini -> Guardrail Output)
    const batchResult = await categorizeTransactionBatch([{ id: 'req1', description, amountCents }]);
    
    // Retornar o único resultado do batch
    return res.status(200).json(batchResult.results[0]);
    
  } catch (error: any) {
    if (error instanceof AuthError) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    // Se o erro foi pego pelo Input Guardrail (ZodError), avisa que o input foi rejeitado
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Input Validation Failed', details: error.errors });
    }

    console.error("Erro interno no endpoint de categorização:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
