import { getPluggyApiKey } from './authenticatePluggy.js';

interface PluggyRawCreditData {
  creditLimit?: number | null;
  availableCreditLimit?: number | null;
  balanceDueDate?: string | Date | null;
  balanceCloseDate?: string | Date | null;
  brand?: string | null;
  level?: string | null;
  status?: string | null;
}

interface PluggyRawAccount {
  id: string;
  itemId?: string;
  type: string;
  subtype: string;
  name: string;
  balance: number;
  currencyCode: string;
  creditData?: PluggyRawCreditData | null;
}

interface PluggyAccountsResponse {
  results: PluggyRawAccount[];
}

export interface PluggyCreditData {
  creditLimit: number | null;
  availableCreditLimit: number | null;
  balanceDueDate: string | null;
  balanceCloseDate: string | null;
  brand: string | null;
  level: string | null;
  status: string | null;
}

export interface PluggyAccount {
  id: string;
  itemId?: string;
  type: string;
  subtype: string;
  name: string;
  balance: number;
  currencyCode: string;
  creditData?: PluggyCreditData | null;
}

export async function getPluggyAccounts(
  itemId: string
): Promise<PluggyAccount[]> {
  if (!itemId || typeof itemId !== 'string' || !itemId.trim()) {
    throw new Error('itemId inválido.');
  }

  const cleanItemId = itemId.trim();
  const apiKey = await getPluggyApiKey();

  const url =
    `https://api.pluggy.ai/accounts?itemId=${encodeURIComponent(cleanItemId)}`;

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
    console.error(
      'Falha ao consultar contas na Pluggy. Status:',
      response.status
    );

    throw new Error('Falha ao consultar contas Open Finance.');
  }

  const data = (await response.json()) as PluggyAccountsResponse;

  if (!Array.isArray(data?.results)) {
    return [];
  }

  const contasUnicas = new Map<string, PluggyAccount>();

  for (const account of data.results) {
    if (!account?.id) {
      continue;
    }

    let creditData: PluggyCreditData | null = null;

    if (account.creditData && typeof account.creditData === 'object') {
      creditData = {
        creditLimit:
          typeof account.creditData.creditLimit === 'number'
            ? account.creditData.creditLimit
            : null,
        availableCreditLimit:
          typeof account.creditData.availableCreditLimit === 'number'
            ? account.creditData.availableCreditLimit
            : null,
        balanceDueDate:
          account.creditData.balanceDueDate != null
            ? String(account.creditData.balanceDueDate)
            : null,
        balanceCloseDate:
          account.creditData.balanceCloseDate != null
            ? String(account.creditData.balanceCloseDate)
            : null,
        brand:
          account.creditData.brand != null
            ? String(account.creditData.brand)
            : null,
        level:
          account.creditData.level != null
            ? String(account.creditData.level)
            : null,
        status:
          account.creditData.status != null
            ? String(account.creditData.status)
            : null,
      };
    }

    contasUnicas.set(account.id, {
      id: account.id,
      itemId: account.itemId || cleanItemId,
      type: account.type,
      subtype: account.subtype,
      name: account.name,
      balance: account.balance,
      currencyCode: account.currencyCode,
      creditData,
    });
  }

  return Array.from(contasUnicas.values());
}