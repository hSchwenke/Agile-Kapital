interface PluggyAuthResponse {
  apiKey: string;
}

let cachedApiKey: string | null = null;
let cachedExpiry: number = 0;

/**
 * Autentica o servidor com a API da Pluggy usando PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET.
 * Mantém cache em memória do apiKey durante seu período de validade (2 horas),
 * com margem de segurança de 5 minutos para renovação.
 * NUNCA expõe o apiKey ou o segredo ao cliente ou nos logs.
 */
export async function getPluggyApiKey(): Promise<string> {
  const now = Date.now();

  if (cachedApiKey && now < cachedExpiry - 5 * 60 * 1000) {
    return cachedApiKey;
  }

  const clientId = process.env.PLUGGY_CLIENT_ID;
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Credenciais da Pluggy não configuradas no servidor (PLUGGY_CLIENT_ID / PLUGGY_CLIENT_SECRET).');
  }

  const response = await fetch('https://api.pluggy.ai/auth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      clientId,
      clientSecret,
    }),
  });

  if (!response.ok) {
    // Registra apenas o status HTTP, nunca o corpo com secrets
    console.error('Falha na autenticação com a API Pluggy. HTTP Status:', response.status);
    throw new Error('Falha ao autenticar com o provedor Open Finance.');
  }

  const data = (await response.json()) as PluggyAuthResponse;

  if (!data?.apiKey) {
    throw new Error('Resposta inválida do provedor Open Finance: apiKey ausente.');
  }

  cachedApiKey = data.apiKey;
  // A apiKey da Pluggy é válida por 2 horas (7200 segundos)
  cachedExpiry = now + 2 * 60 * 60 * 1000;

  return cachedApiKey;
}
