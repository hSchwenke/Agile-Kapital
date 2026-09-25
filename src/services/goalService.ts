import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    orderBy,
    query,
    updateDoc,
    where,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Meta } from '../domain/goal';

export interface CriarMetaInput {
    userId: string;
    nome: string;
    valorAlvoCentavos: number;
    valorAtualCentavos: number;
    dataLimite?: string;
}

export function validarDadosMeta(dados: {
    nome: string;
    valorAlvoCentavos: number;
    valorAtualCentavos: number;
    dataLimite?: string;
}): void {
    if (!dados.nome || !dados.nome.trim()) {
        throw new Error('O nome da meta é obrigatório.');
    }

    if (
        !Number.isInteger(dados.valorAlvoCentavos) ||
        dados.valorAlvoCentavos <= 0
    ) {
        throw new Error(
            'O valor alvo deve ser um número inteiro positivo em centavos.'
        );
    }

    if (
        !Number.isInteger(dados.valorAtualCentavos) ||
        dados.valorAtualCentavos < 0
    ) {
        throw new Error(
            'O valor atual deve ser um número inteiro não negativo em centavos.'
        );
    }

    if (dados.dataLimite !== undefined) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dados.dataLimite)) {
            throw new Error(
                'A data limite deve estar no formato YYYY-MM-DD.'
            );
        }
    }
}

export async function criarMeta(
    dados: CriarMetaInput
): Promise<string> {
    validarDadosMeta(dados);

    const status: Meta['status'] =
        dados.valorAtualCentavos >= dados.valorAlvoCentavos
            ? 'concluida'
            : 'ativa';

    const payload: Record<string, unknown> = {
        userId: dados.userId,
        nome: dados.nome.trim(),
        valorAlvoCentavos: dados.valorAlvoCentavos,
        valorAtualCentavos: dados.valorAtualCentavos,
        status,
        criadoEm: new Date().toISOString(),
    };

    if (dados.dataLimite) {
        payload.dataLimite = dados.dataLimite;
    }

    const docRef = await addDoc(
        collection(db, 'metas'),
        payload
    );

    return docRef.id;
}

export async function atualizarMeta(
    metaId: string,
    dados: Partial<
        Pick<Meta, 'nome' | 'valorAlvoCentavos' | 'dataLimite'>
    >
): Promise<void> {
    const payload: Record<string, unknown> = {};

    if (dados.nome !== undefined) {
        if (!dados.nome.trim()) {
            throw new Error('O nome da meta é obrigatório.');
        }
        payload.nome = dados.nome.trim();
    }

    if (dados.valorAlvoCentavos !== undefined) {
        if (
            !Number.isInteger(dados.valorAlvoCentavos) ||
            dados.valorAlvoCentavos <= 0
        ) {
            throw new Error(
                'O valor alvo deve ser um número inteiro positivo em centavos.'
            );
        }
        payload.valorAlvoCentavos = dados.valorAlvoCentavos;
    }

    if (dados.dataLimite !== undefined) {
        if (
            dados.dataLimite !== '' &&
            !/^\d{4}-\d{2}-\d{2}$/.test(dados.dataLimite)
        ) {
            throw new Error(
                'A data limite deve estar no formato YYYY-MM-DD.'
            );
        }
        payload.dataLimite = dados.dataLimite || null;
    }

    await updateDoc(doc(db, 'metas', metaId), payload);
}

export async function atualizarProgressoMeta(
    metaId: string,
    novoValorAtualCentavos: number,
    valorAlvoCentavos: number
): Promise<void> {
    if (
        !Number.isInteger(novoValorAtualCentavos) ||
        novoValorAtualCentavos < 0
    ) {
        throw new Error(
            'O valor atual deve ser um número inteiro não negativo em centavos.'
        );
    }

    const payload: Record<string, unknown> = {
        valorAtualCentavos: novoValorAtualCentavos,
    };

    if (novoValorAtualCentavos >= valorAlvoCentavos) {
        payload.status = 'concluida';
    }

    await updateDoc(doc(db, 'metas', metaId), payload);
}

export async function arquivarMeta(
    metaId: string
): Promise<void> {
    await updateDoc(doc(db, 'metas', metaId), {
        status: 'arquivada',
    });
}

export async function deletarMeta(
    metaId: string
): Promise<void> {
    await deleteDoc(doc(db, 'metas', metaId));
}

export function observarMetas(
    userId: string,
    onChange: (metas: Meta[]) => void
): () => void {
    const q = query(
        collection(db, 'metas'),
        where('userId', '==', userId),
        orderBy('criadoEm', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const metas: Meta[] = [];
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const meta: Meta = {
                id: docSnap.id,
                userId: data.userId,
                nome: data.nome,
                valorAlvoCentavos: data.valorAlvoCentavos,
                valorAtualCentavos: data.valorAtualCentavos,
                status: data.status || 'ativa',
                criadoEm: data.criadoEm,
            };

            if (data.dataLimite) {
                meta.dataLimite = data.dataLimite;
            }

            metas.push(meta);
        });
        onChange(metas);
    });
}
