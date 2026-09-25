import { getPluggyApiKey } from './authenticatePluggy';

export interface PluggyAccount {
  id: string;
  itemId: string;
  type: string;
  subtype: string;
  name: string;
  balance: number;
  currencyCode: string;
  number: string;
  marketingName?: string | null;
  owner?: string | null;
  taxNumber?: string | null;
  bankData?: Record<string, unknown> | null;
  creditData?: Record<string, unknown> | null;
}

interface PluggyAccountsResponse {
  results: PluggyAccount[];
  total: number;
}

/**
 * Consulta as contas de um Item específico diretamente na API da Pluggy.
 * Usa autenticação server-side (X-API-KEY) — NUNCA expõe a API Key ao frontend.
 * Retorna array vazio se o Item não possuir contas.
 */
export async function getPluggyAccounts(itemId: string): Promise<PluggyAccount[]> {
  if (!itemId || typeof itemId !== 'string' || !itemId.trim()) {
    throw new Error('itemId é obrigatório para consultar contas.');
  }

  const apiKey = await getPluggyApiKey();

  const url = `https://api.pluggy.ai/accounts?itemId=${encodeURIComponent(itemId.trim())}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
  });

  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    console.error('Falha ao consultar contas na Pluggy. Status:', response.status);
    throw new Error('Falha na comunicação com o provedor Open Finance ao consultar contas.');
  }

  const data = (await response.json()) as PluggyAccountsResponse;

  if (!data || !Array.isArray(data.results)) {
    return [];
  }

  // Retorna apenas campos seguros — nunca inclui dados internos ou tokens
  return data.results.map((account) => ({
    id: account.id,
    itemId: account.itemId,
    type: account.type,
    subtype: account.subtype,
    name: account.name,
    balance: account.balance,
    currencyCode: account.currencyCode,
    number: account.number,
    marketingName: account.marketingName ?? null,
    owner: account.owner ?? null,
    taxNumber: account.taxNumber ?? null,
    bankData: account.bankData ?? null,
    creditData: account.creditData ?? null,
  }));
}
