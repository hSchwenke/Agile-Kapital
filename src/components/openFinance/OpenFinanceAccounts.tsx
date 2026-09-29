import { useEffect, useState } from 'react';
import { auth } from '../../firebase';

interface OpenFinanceAccount {
    id: string;
    type: string;
    subtype: string;
    name: string;
    balance: number;
    currencyCode: string;
}

interface AccountsResponse {
    success: boolean;
    data: OpenFinanceAccount[];
}

function formatCurrency(value: number, currencyCode: string) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: currencyCode || 'BRL',
    }).format(value);
}

export function OpenFinanceAccounts() {
    const [accounts, setAccounts] = useState<OpenFinanceAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadAccounts = async () => {
        try {
            setLoading(true);
            setError(null);

            const user = auth.currentUser;

            if (!user) {
                setAccounts([]);
                return;
            }

            const firebaseToken = await user.getIdToken();

            const response = await fetch('/api/pluggy/accounts', {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${firebaseToken}`,
                },
            });

            if (!response.ok) {
                throw new Error('Falha ao carregar contas Open Finance.');
            }

            const data = (await response.json()) as AccountsResponse;

            setAccounts(Array.isArray(data.data) ? data.data : []);
        } catch (error) {
            console.error('Erro ao carregar contas Open Finance:', error);
            setError('Não foi possível carregar suas contas conectadas.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadAccounts();
    }, []);

    if (loading) {
        return (
            <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-xl p-5">
                <p className="text-sm text-gray-500 dark:text-[#a1a1aa]">
                    Carregando contas conectadas...
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-xl p-5">
                <p className="text-sm text-rose-600 dark:text-rose-400">
                    {error}
                </p>

                <button
                    type="button"
                    onClick={() => void loadAccounts()}
                    className="mt-3 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-md"
                >
                    Tentar novamente
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-[#27272a] rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-sm font-semibold tracking-wide text-gray-500 dark:text-[#a1a1aa] uppercase">
                        Open Finance
                    </h2>

                    <p className="text-xs text-gray-400 dark:text-[#71717a] mt-1">
                        Contas conectadas
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => void loadAccounts()}
                    className="px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 rounded-md"
                >
                    Atualizar
                </button>
            </div>

            {accounts.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-[#71717a]">
                    Nenhuma conta conectada.
                </p>
            ) : (
                <div className="space-y-3">
                    {accounts.map((account) => (
                        <div
                            key={account.id}
                            className="flex items-center justify-between gap-4 p-3 rounded-lg border border-gray-200 dark:border-[#27272a] bg-gray-50 dark:bg-[#09090b]"
                        >
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                    {account.name}
                                </p>

                                <p className="text-xs text-gray-500 dark:text-[#71717a]">
                                    {account.type} · {account.subtype}
                                </p>
                            </div>

                            <div className="text-right shrink-0">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {formatCurrency(
                                        account.balance,
                                        account.currencyCode
                                    )}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}