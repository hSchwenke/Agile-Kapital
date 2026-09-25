import { getPluggyApiKey } from './authenticatePluggy';

export interface CreateConnectTokenParams {
  clientUserId: string;
}

interface PluggyConnectTokenResponse {
  accessToken: string;
}

/**
 * Gera um Connect Token temporário na Pluggy vinculado obrigatoriamente ao UID do usuário autenticado.
 * O Connect Token possui escopo restrito de inicialização do widget no frontend e validade curta (30 minutos).
 */
export async function createConnectToken({
  clientUserId,
}: CreateConnectTokenParams): Promise<string> {
  if (!clientUserId || typeof clientUserId !== 'string' || !clientUserId.trim()) {
    throw new Error('clientUserId é obrigatório para vincular o Connect Token com segurança.');
  }

  const apiKey = await getPluggyApiKey();

  const payload = {
    options: {
      clientUserId: clientUserId.trim(),
    },
  };

  const response = await fetch('https://api.pluggy.ai/connect_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    console.error('Falha na criação do Connect Token na Pluggy. HTTP Status:', response.status);
    throw new Error('Falha ao gerar sessão de conexão Open Finance.');
  }

  const data = (await response.json()) as PluggyConnectTokenResponse;

  if (!data?.accessToken) {
    throw new Error('Resposta inválida da Pluggy: accessToken ausente.');
  }

  return data.accessToken;
}
