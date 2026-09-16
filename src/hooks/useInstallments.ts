import { useEffect, useState } from 'react';
import type { Parcelamento } from '../domain/installment';
import {
    observarParcelamentosPorCartao,
    observarTodosParcelamentos,
} from '../services/installmentService';

interface InstallmentsState {
    userId: string | null;
    cartaoId: string | null;
    parcelamentos: Parcelamento[];
}

export function useInstallments(
    userId: string | undefined,
    cartaoId?: string
) {
    const [estado, setEstado] = useState<InstallmentsState>({
        userId: null,
        cartaoId: null,
        parcelamentos: [],
    });

    useEffect(() => {
        if (!userId) return;

        const cartaoDaConsulta = cartaoId ?? null;

        if (cartaoId) {
            return observarParcelamentosPorCartao(
                userId,
                cartaoId,
                (itens) => {
                    setEstado({
                        userId,
                        cartaoId: cartaoDaConsulta,
                        parcelamentos: itens,
                    });
                }
            );
        }

        return observarTodosParcelamentos(
            userId,
            (itens) => {
                setEstado({
                    userId,
                    cartaoId: cartaoDaConsulta,
                    parcelamentos: itens,
                });
            }
        );
    }, [userId, cartaoId]);

    const cartaoDaConsulta = cartaoId ?? null;

    const dadosDaConsultaAtual =
        estado.userId === userId &&
        estado.cartaoId === cartaoDaConsulta;

    const parcelamentos = dadosDaConsultaAtual
        ? estado.parcelamentos
        : [];

    const carregando =
        Boolean(userId) && !dadosDaConsultaAtual;

    return {
        parcelamentos,
        carregando,
    };
}