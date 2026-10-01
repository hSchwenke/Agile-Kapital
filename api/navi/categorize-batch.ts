import type { VercelRequest, VercelResponse } from '@vercel/node';
import { categorizeTransactionBatch } from '../../src/services/navi/naviCategorizer';
import { verifyFirebaseToken, AuthError } from '../../server/auth/verifyFirebaseToken.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    await verifyFirebaseToken(req.headers);
    const { transactions } = req.body;

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: 'Missing or empty transactions array.' });
    }

    const result = await categorizeTransactionBatch(transactions);

    return res.status(200).json(result);
    
  } catch (error: any) {
    if (error instanceof AuthError) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Input Validation Failed', details: error.errors });
    }

    console.error("Erro interno no endpoint de categorização em lote:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
