import { getPluggyApiKey } from './authenticatePluggy';

export interface PluggyTransaction {
    id: string;
    accountId: string;
    description: string;
    amount: number;
    date: string;
    currencyCode: string;
    type: string | null;
    status: string | null;
    category: string | null;
    descriptionRaw?: string | null;
    operationType?: string | null;
    paymentData?: unknown | null;
    creditCardMetadata?: unknown | null;
}

interface RawPluggyTransaction {
    id: string;
    accountId: string;
    description: string;
    amount: number;
    date: string;
    currencyCode: string;
    type?: string | null;
    status?: string | null;
    category?: string | null;
    descriptionRaw?: string | null;
    operationType?: string | null;
    paymentData?: unknown | null;
    creditCardMetadata?: unknown | null;
}

interface PluggyTransactionPage {
    results: RawPluggyTransaction[];
    next?: string | null;
}

export async function getPluggyTransactions(
    accountId: string
): Promise<PluggyTransaction[]> {
    if (!accountId?.trim()) {
        throw new Error('accountId obrigatório.');
    }

    const apiKey = await getPluggyApiKey();

    let url =
        `https://api.pluggy.ai/v2/transactions?accountId=${encodeURIComponent(
            accountId.trim()
        )}`;

    const transactionsById = new Map<string, PluggyTransaction>();

    let pages = 0;
    const MAX_PAGES = 50;

    while (url && pages < MAX_PAGES) {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-API-KEY': apiKey,
            },
        });

        if (response.status === 404) {
            break;
        }

        if (!response.ok) {
            console.error(
                'Falha ao consultar transações Pluggy. Status:',
                response.status
            );

            throw new Error('Falha ao consultar transações Open Finance.');
        }

        const data = (await response.json()) as PluggyTransactionPage;

        if (!Array.isArray(data?.results)) {
            break;
        }

        for (const transaction of data.results) {
            if (!transaction?.id) {
                continue;
            }

            transactionsById.set(transaction.id, {
                id: transaction.id,
                accountId: transaction.accountId,
                description: transaction.description,
                amount: transaction.amount,
                date: transaction.date,
                currencyCode: transaction.currencyCode,
                type: transaction.type ?? null,
                status: transaction.status ?? null,
                category: transaction.category ?? null,
                descriptionRaw: transaction.descriptionRaw ?? null,
                operationType: transaction.operationType ?? null,
                paymentData: transaction.paymentData ?? null,
                creditCardMetadata: transaction.creditCardMetadata ?? null,
            });
        }

        if (!data.next) {
            break;
        }

        if (data.next.startsWith('http://') || data.next.startsWith('https://')) {
            url = data.next;
        } else if (data.next.startsWith('/')) {
            url = `https://api.pluggy.ai${data.next}`;
        } else {
            url = `https://api.pluggy.ai/v2/transactions${data.next}`;
        }

        pages++;
    }

    return [...transactionsById.values()];
}