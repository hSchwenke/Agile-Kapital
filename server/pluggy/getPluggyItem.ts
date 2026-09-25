import { getPluggyApiKey } from './authenticatePluggy';

export interface PluggyItemDetails {
  id: string;
  status: string;
  clientUserId?: string | null;
}

/**
 * Consulta os detalhes de um Item diretamente na API da Pluggy.
 * Retorna null caso o Item não exista (HTTP 404).
 */
export async function getPluggyItem(itemId: string): Promise<PluggyItemDetails | null> {
  const apiKey = await getPluggyApiKey();

  const response = await fetch(`https://api.pluggy.ai/items/${encodeURIComponent(itemId)}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    console.error('Falha ao consultar item na Pluggy. Status:', response.status);
    throw new Error('Falha na comunicação com o provedor Open Finance.');
  }

  const data = (await response.json()) as Partial<PluggyItemDetails>;

  if (!data?.id || !data?.status) {
    throw new Error('Resposta incompleta da Pluggy ao consultar Item.');
  }

  return {
    id: data.id,
    status: data.status,
    clientUserId: data.clientUserId ?? null,
  };
}
