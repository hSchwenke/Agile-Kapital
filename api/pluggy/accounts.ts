import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyFirebaseToken, AuthError } from '../../server/auth/verifyFirebaseToken';
import { getUserAccounts } from '../../server/pluggy/accountsService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. UID extraído EXCLUSIVAMENTE do Firebase ID Token verificado server-side
    //    NUNCA aceita uid via query, body ou headers customizados
    const uid = await verifyFirebaseToken(req.headers);

    // 2. SEGURANÇA: Ignora completamente qualquer parâmetro de query (ex: ?itemId=...)
    //    O servidor decide quais Items pertencem ao usuário consultando Firestore
    //    PROIBIDO: aceitar itemId do browser ou permitir consulta global de contas

    // 3. Busca contas de todos os Items registrados para este UID
    const accounts = await getUserAccounts(uid);

    return res.status(200).json({
      success: true,
      data: accounts,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Nunca expor detalhes internos na resposta pública
    console.error('Falha interna ao processar /api/pluggy/accounts');
    return res.status(500).json({ error: 'Internal server error' });
  }
}
