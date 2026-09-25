import type { IncomingHttpHeaders } from 'http';
import { adminAuth } from '../firebase/firebaseAdmin';

export class AuthError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number = 401) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

/**
 * Valida o Firebase ID Token fornecido no header Authorization (Bearer).
 * Retorna o UID extraído e validado do decodedToken.
 * NUNCA aceita UID enviado diretamente no corpo ou query da requisição.
 */
export async function verifyFirebaseToken(headers: IncomingHttpHeaders): Promise<string> {
  const authHeader = headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthError('Autenticação necessária. Header Authorization ausente ou inválido.', 401);
  }

  const token = authHeader.split('Bearer ')[1]?.trim();

  if (!token) {
    throw new AuthError('Token de autenticação não informado.', 401);
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);

    if (!decodedToken.uid) {
      throw new AuthError('Token inválido: identificador de usuário ausente.', 401);
    }

    return decodedToken.uid;
  } catch {
    // Nunca registra o token em logs para não vazar credenciais
    console.error('Falha na validação do token Firebase ID Token.');
    throw new AuthError('Token de autenticação expirado ou inválido.', 401);
  }
}
