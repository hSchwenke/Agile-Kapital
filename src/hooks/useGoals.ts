import { useEffect, useState } from 'react';
import type { Meta } from '../domain/goal';
import { observarMetas } from '../services/goalService';

interface GoalsState {
    userId: string | null;
    metas: Meta[];
}

export function useGoals(userId: string | undefined) {
    const [estado, setEstado] = useState<GoalsState>({
        userId: null,
        metas: [],
    });

    useEffect(() => {
        if (!userId) return;

        return observarMetas(userId, (novasMetas) => {
            setEstado({
                userId,
                metas: novasMetas,
            });
        });
    }, [userId]);

    const dadosDoUsuarioAtual = estado.userId === userId;

    const metas = dadosDoUsuarioAtual
        ? estado.metas
        : [];

    const carregando =
        Boolean(userId) && !dadosDoUsuarioAtual;

    return {
        metas,
        carregando,
    };
}
