import {
    collection,
    doc,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    where,
    writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Parcelamento } from '../domain/installment';
import {
    calcularProximaCompetencia,
    dividirParcelas,
} from '../finance/financialCore';

export interface CriarParcelamentoInput {
    userId: string;
    cartaoId: string;
    descricao: string;
    categoria: string;
    valorTotalCentavos: number;
    totalParcelas: number; // 2 a 72
    dataCompra: string; // YYYY-MM-DD
    competenciaInicial: string; // YYYY-MM
}

export function validarParcelamentoInput(dados: CriarParcelamentoInput): void {
    if (!dados.userId) {
        throw new Error('Usuário não identificado.');
    }
    if (!dados.cartaoId) {
        throw new Error('É necessário selecionar um cartão para a compra parcelada.');
    }
    if (!dados.descricao || !dados.descricao.trim()) {
        throw new Error('A descrição da compra é obrigatória.');
    }
    if (!dados.categoria) {
        throw new Error('A categoria da compra é obrigatória.');
    }
    if (
        !Number.isInteger(dados.valorTotalCentavos) ||
        dados.valorTotalCentavos <= 0
    ) {
        throw new Error('O valor total deve ser um número inteiro de centavos maior que zero.');
    }
    if (
        !Number.isInteger(dados.totalParcelas) ||
        dados.totalParcelas < 2 ||
        dados.totalParcelas > 72
    ) {
        throw new Error('O parcelamento deve ser entre 2 e 72 parcelas.');
    }
    if (!dados.dataCompra || !/^\d{4}-\d{2}-\d{2}/.test(dados.dataCompra)) {
        throw new Error('A data da compra deve estar no formato YYYY-MM-DD.');
    }
    if (!dados.competenciaInicial || !/^\d{4}-\d{2}$/.test(dados.competenciaInicial)) {
        throw new Error('A competência inicial deve estar no formato YYYY-MM.');
    }
}

/**
 * Cria o parcelamento e todas as suas respectivas transações de forma atômica via WriteBatch.
 */
export async function criarParcelamento(
    dados: CriarParcelamentoInput
): Promise<string> {
    validarParcelamentoInput(dados);

    const parcelasCentavos = dividirParcelas(
        dados.valorTotalCentavos,
        dados.totalParcelas
    );

    const batch = writeBatch(db);

    const parcelamentoRef = doc(collection(db, 'parcelamentos'));
    const parcelamentoId = parcelamentoRef.id;

    batch.set(parcelamentoRef, {
        userId: dados.userId,
        cartaoId: dados.cartaoId,
        descricao: dados.descricao.trim(),
        categoria: dados.categoria,
        valorTotalCentavos: dados.valorTotalCentavos,
        totalParcelas: dados.totalParcelas,
        dataCompra: dados.dataCompra,
        competenciaInicial: dados.competenciaInicial,
    });

    for (let i = 0; i < dados.totalParcelas; i++) {
        const numeroParcela = i + 1;
        const competencia = calcularProximaCompetencia(
            dados.competenciaInicial,
            i
        );

        const transacaoRef = doc(collection(db, 'transacoes'));

        batch.set(transacaoRef, {
            descricao: `${dados.descricao.trim()} (${numeroParcela}/${dados.totalParcelas})`,
            valorCentavos: parcelasCentavos[i],
            tipo: 'despesa',
            categoria: dados.categoria,
            userId: dados.userId,
            competencia,
            data: `${dados.dataCompra}T12:00:00.000Z`,
            parcelamentoId,
            cartaoId: dados.cartaoId,
            numeroParcela,
            totalParcelas: dados.totalParcelas,
        });
    }

    await batch.commit();

    return parcelamentoId;
}

export function observarParcelamentosPorCartao(
    userId: string,
    cartaoId: string,
    onChange: (items: Parcelamento[]) => void
): () => void {
    const q = query(
        collection(db, 'parcelamentos'),
        where('userId', '==', userId),
        where('cartaoId', '==', cartaoId),
        orderBy('dataCompra', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const itens: Parcelamento[] = [];
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            itens.push({
                id: docSnap.id,
                userId: data.userId,
                cartaoId: data.cartaoId,
                descricao: data.descricao,
                categoria: data.categoria,
                valorTotalCentavos: data.valorTotalCentavos,
                totalParcelas: data.totalParcelas,
                dataCompra: data.dataCompra,
                competenciaInicial: data.competenciaInicial,
            });
        });
        onChange(itens);
    });
}

export function observarTodosParcelamentos(
    userId: string,
    onChange: (items: Parcelamento[]) => void
): () => void {
    const q = query(
        collection(db, 'parcelamentos'),
        where('userId', '==', userId),
        orderBy('dataCompra', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const itens: Parcelamento[] = [];
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            itens.push({
                id: docSnap.id,
                userId: data.userId,
                cartaoId: data.cartaoId,
                descricao: data.descricao,
                categoria: data.categoria,
                valorTotalCentavos: data.valorTotalCentavos,
                totalParcelas: data.totalParcelas,
                dataCompra: data.dataCompra,
                competenciaInicial: data.competenciaInicial,
            });
        });
        onChange(itens);
    });
}

/**
 * Remove um parcelamento e todas as suas transações vinculadas de forma atômica.
 */
export async function deletarParcelamento(
    parcelamentoId: string,
    userId: string
): Promise<void> {
    const q = query(
        collection(db, 'transacoes'),
        where('userId', '==', userId),
        where('parcelamentoId', '==', parcelamentoId)
    );

    const snapshot = await getDocs(q);
    const batch = writeBatch(db);

    snapshot.forEach((docSnap) => {
        batch.delete(docSnap.ref);
    });

    batch.delete(doc(db, 'parcelamentos', parcelamentoId));

    await batch.commit();
}
