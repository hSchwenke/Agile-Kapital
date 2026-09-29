import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  verifyFirebaseToken,
  AuthError,
} from '../../server/auth/verifyFirebaseToken.js';
import {
  disconnectItem,
  DisconnectError,
} from '../../server/pluggy/disconnectService.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST' && req.method !== 'DELETE') {
    res.setHeader('Allow', 'POST, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. UID extraído EXCLUSIVAMENTE do Firebase ID Token verificado server-side
    const uid = await verifyFirebaseToken(req.headers);

    // 2. Extrai itemId do payload
    const itemId =
      typeof req.body?.itemId === 'string'
        ? req.body.itemId
        : typeof req.query?.itemId === 'string'
        ? req.query.itemId
        : null;

    if (!itemId || !itemId.trim()) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    // 3. Valida ownership e desconecta
    await disconnectItem(uid, itemId.trim());

    return res.status(200).json({
      success: true,
      message: 'Conexão removida com sucesso.',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (error instanceof DisconnectError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    console.error('Falha interna ao processar /api/pluggy/disconnect');
    return res.status(500).json({ error: 'Internal server error' });
  }
}
