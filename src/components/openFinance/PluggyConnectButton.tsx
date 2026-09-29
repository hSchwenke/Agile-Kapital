import { useState } from 'react';
import { PluggyConnect } from 'react-pluggy-connect';
import { toast } from 'react-hot-toast';
import { auth } from '../../firebase';

interface PluggySuccessData {
    item: {
        id: string;
    };
}

interface PluggyConnectButtonProps {
    onSuccess?: () => void;
}

export function PluggyConnectButton({ onSuccess }: PluggyConnectButtonProps = {}) {

    const [connectToken, setConnectToken] = useState<string | null>(null);
    const [carregando, setCarregando] = useState(false);

    const iniciarConexao = async () => {
        try {
            setCarregando(true);

            const user = auth.currentUser;

            if (!user) {
                toast.error('Você precisa estar logado.');
                return;
            }

            const firebaseToken = await user.getIdToken();

            const response = await fetch('/api/pluggy/connect-token', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${firebaseToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Falha ao iniciar conexão Open Finance.');
            }

            const data = (await response.json()) as {
                accessToken?: string;
            };

            if (!data.accessToken) {
                throw new Error('Connect Token não retornado.');
            }

            setConnectToken(data.accessToken);
        } catch (error) {
            console.error('Erro ao iniciar Pluggy Connect:', error);

            toast.error(
                'Não foi possível iniciar a conexão Open Finance.'
            );
        } finally {
            setCarregando(false);
        }
    };

    const salvarItem = async (
        itemId: string
    ) => {
        const user = auth.currentUser;

        if (!user) {
            throw new Error('Usuário não autenticado.');
        }

        const firebaseToken = await user.getIdToken();

        const response = await fetch('/api/pluggy/save-item', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${firebaseToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                itemId,
            }),
        });

        if (!response.ok) {
            throw new Error('Falha ao salvar conexão.');
        }

        return response.json();
    };

    const handleSuccess = async (
        data: PluggySuccessData
    ) => {
        try {
            const itemId = data?.item?.id;

            if (!itemId) {
                throw new Error(
                    'ID não retornado.'
                );
            }

            await salvarItem(itemId);

            toast.success(
                'Conta conectada com sucesso!'
            );

            setConnectToken(null);
            onSuccess?.();
        } catch (error) {
            console.error(
                'Erro ao finalizar conexão Open Finance:',
                error
            );

            toast.error(
                'A conta foi conectada, mas não foi possível salvar a conexão.'
            );
        }
    };

    const handleError = (error: unknown) => {
        console.error(
            'Erro no Pluggy Connect:',
            error
        );

        toast.error(
            'Não foi possível concluir a conexão.'
        );

        setConnectToken(null);
    };

    if (connectToken) {
        return (
            <PluggyConnect
                connectToken={connectToken}
                onSuccess={handleSuccess}
                onError={handleError}
            />
        );
    }

    return (
        <button
            type="button"
            onClick={iniciarConexao}
            disabled={carregando}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-md active:scale-95 transition-all"
        >
            {carregando
                ? 'Conectando...'
                : 'Conectar conta'}
        </button>
    );
}