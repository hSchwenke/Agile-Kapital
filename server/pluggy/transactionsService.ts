import { getUserAccounts } from './accountsService';
import {
    getPluggyTransactions,
    type PluggyTransaction,
} from './getPluggyTransactions';

export async function getUserTransactions(
    uid: string
): Promise<PluggyTransaction[]> {
    if (!uid?.trim()) {
        throw new Error('UID obrigatório.');
    }

    const accounts = await getUserAccounts(uid.trim());

    if (accounts.length === 0) {
        return [];
    }

    const results = await Promise.allSettled(
        accounts.map((account) =>
            getPluggyTransactions(account.id)
        )
    );

    const transactionsById =
        new Map<string, PluggyTransaction>();

    for (const result of results) {
        if (result.status !== 'fulfilled') {
            console.error(
                'Falha ao carregar transações de uma conta.'
            );
            continue;
        }

        for (const transaction of result.value) {
            const existing = transactionsById.get(transaction.id);
            if (!existing || (existing.status === 'PENDING' && transaction.status === 'POSTED')) {
                transactionsById.set(
                    transaction.id,
                    transaction
                );
            }
        }
    }

    return [...transactionsById.values()].sort(
        (a, b) =>
            new Date(b.date).getTime() -
            new Date(a.date).getTime()
    );
}