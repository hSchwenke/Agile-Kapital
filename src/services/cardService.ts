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
import type { Cartao } from '../domain/card';

export interface CriarCartaoInput {
    userId: string;
    nome: string;
    banco: string;
    diaFechamento: number;
    diaVencimento: number;
    ativo?: boolean;
}

export function validarDadosCartao(dados: {
    nome: string;
    banco: string;
    diaFechamento: number;
    diaVencimento: number;
}): void {
    if (!dados.nome || !dados.nome.trim()) {
        throw new Error('O nome do cartão é obrigatório.');
    }
    if (!dados.banco || !dados.banco.trim()) {
        throw new Error('O banco emissor é obrigatório.');
    }
    if (
        !Number.isInteger(dados.diaFechamento) ||
        dados.diaFechamento < 1 ||
        dados.diaFechamento > 31
    ) {
        throw new Error('O dia de fechamento deve ser um número inteiro entre 1 e 31.');
    }
    if (
        !Number.isInteger(dados.diaVencimento) ||
        dados.diaVencimento < 1 ||
        dados.diaVencimento > 31
    ) {
        throw new Error('O dia de vencimento deve ser um número inteiro entre 1 e 31.');
    }
}

export async function criarCartao(dados: CriarCartaoInput): Promise<string> {
    validarDadosCartao(dados);

    const docRef = await addDoc(collection(db, 'cartoes'), {
        userId: dados.userId,
        nome: dados.nome.trim(),
        banco: dados.banco.trim(),
        diaFechamento: dados.diaFechamento,
        diaVencimento: dados.diaVencimento,
        ativo: dados.ativo !== undefined ? dados.ativo : true,
    });

    return docRef.id;
}

export async function atualizarCartao(
    cartaoId: string,
    dados: Partial<Omit<Cartao, 'id' | 'userId'>>
): Promise<void> {
    if (dados.diaFechamento !== undefined) {
        if (
            !Number.isInteger(dados.diaFechamento) ||
            dados.diaFechamento < 1 ||
            dados.diaFechamento > 31
        ) {
            throw new Error('O dia de fechamento deve ser um número inteiro entre 1 e 31.');
        }
    }
    if (dados.diaVencimento !== undefined) {
        if (
            !Number.isInteger(dados.diaVencimento) ||
            dados.diaVencimento < 1 ||
            dados.diaVencimento > 31
        ) {
            throw new Error('O dia de vencimento deve ser um número inteiro entre 1 e 31.');
        }
    }

    const payload: Record<string, unknown> = {};
    if (dados.nome !== undefined) payload.nome = dados.nome.trim();
    if (dados.banco !== undefined) payload.banco = dados.banco.trim();
    if (dados.diaFechamento !== undefined) payload.diaFechamento = dados.diaFechamento;
    if (dados.diaVencimento !== undefined) payload.diaVencimento = dados.diaVencimento;
    if (dados.ativo !== undefined) payload.ativo = dados.ativo;

    await updateDoc(doc(db, 'cartoes', cartaoId), payload);
}

export async function deletarCartao(cartaoId: string): Promise<void> {
    await deleteDoc(doc(db, 'cartoes', cartaoId));
}

export function observarCartoes(
    userId: string,
    onChange: (cartoes: Cartao[]) => void
): () => void {
    const q = query(
        collection(db, 'cartoes'),
        where('userId', '==', userId),
        orderBy('nome', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
        const cartoes: Cartao[] = [];
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            cartoes.push({
                id: docSnap.id,
                userId: data.userId,
                nome: data.nome,
                banco: data.banco,
                diaFechamento: data.diaFechamento,
                diaVencimento: data.diaVencimento,
                ativo: data.ativo !== false,
            });
        });
        onChange(cartoes);
    });
}
