import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyFirebaseToken, AuthError } from '../../server/auth/verifyFirebaseToken';
import { createConnectToken } from '../../server/pluggy/createConnectToken';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Identidade extraída e validada exclusivamente via Firebase ID Token (Bearer)
    // NUNCA aceita 'uid' enviado no body, query ou headers customizados
    const uid = await verifyFirebaseToken(req.headers);

    // 2. Nesta primeira etapa, este endpoint cria exclusivamente novas conexões.
    // Nenhum itemId do frontend é aceito sem validação de vínculo prévio em banco.
    const accessToken = await createConnectToken({
      clientUserId: uid,
    });

    // 3. Retorna somente o token necessário para o widget do frontend inicializar
    return res.status(200).json({ accessToken });
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Registra erro no servidor de forma segura sem expor dados internos
    console.error('Falha interna ao processar /api/pluggy/connect-token');
    return res.status(500).json({ error: 'Internal server error' });
  }
}
