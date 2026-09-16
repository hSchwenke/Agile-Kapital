import { useEffect, useState } from 'react';
import type { Cartao } from '../domain/card';
import { observarCartoes } from '../services/cardService';

interface CardsState {
    userId: string | null;
    cartoes: Cartao[];
}

export function useCards(userId: string | undefined) {
    const [estado, setEstado] = useState<CardsState>({
        userId: null,
        cartoes: [],
    });

    useEffect(() => {
        if (!userId) return;

        return observarCartoes(userId, (novosCartoes) => {
            setEstado({
                userId,
                cartoes: novosCartoes,
            });
        });
    }, [userId]);

    const dadosDoUsuarioAtual = estado.userId === userId;

    const cartoes = dadosDoUsuarioAtual
        ? estado.cartoes
        : [];

    const cartoesAtivos = cartoes.filter(
        (cartao) => cartao.ativo
    );

    const carregando =
        Boolean(userId) && !dadosDoUsuarioAtual;

    return {
        cartoes,
        cartoesAtivos,
        carregando,
    };
}