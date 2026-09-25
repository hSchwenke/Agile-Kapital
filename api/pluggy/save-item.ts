import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyFirebaseToken, AuthError } from '../../server/auth/verifyFirebaseToken';
import {
  saveItemService,
  InvalidRequestError,
  ForbiddenError,
} from '../../server/pluggy/saveItemService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. O UID deve vir OBRIGATORIAMENTE do Firebase ID Token verificado server-side
    const uid = await verifyFirebaseToken(req.headers);

    // 2. Validação rigorosa do body
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Invalid request' });
    }

    const { itemId } = req.body as Record<string, unknown>;

    if (
      typeof itemId !== 'string' ||
      !itemId.trim() ||
      itemId.length > 128 ||
      !/^[a-zA-Z0-9_-]+$/.test(itemId.trim())
    ) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    // 3. Valida na Pluggy e salva de forma idempotente em users/{uid}/pluggyItems/{itemId}
    const result = await saveItemService({
      uid,
      itemId: itemId.trim(),
    });

    return res.status(200).json({
      success: true,
      itemId: result.itemId,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (error instanceof ForbiddenError) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (error instanceof InvalidRequestError) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    // Nunca expor detalhes internos no log ou na resposta pública
    console.error('Falha interna ao processar /api/pluggy/save-item');
    return res.status(500).json({ error: 'Internal server error' });
  }
}
