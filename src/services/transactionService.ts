import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, where, } from 'firebase/firestore';
import { db } from '../firebase';
import type { Transacao } from '../domain/transaction';

interface CriarTransacaoInput {
    descricao: string;
    valor: number;
    tipo: 'receita' | 'despesa';
    categoria?: string;
    userId: string;
    competencia: string;
}

export async function criarTransacao(
    dados: CriarTransacaoInput
): Promise<void> {
    await addDoc(collection(db, 'transacoes'), {
        ...dados,
        data: new Date().toISOString(),
    });
}

export async function deletarTransacao(
    transacaoId: string
): Promise<void> {
    await deleteDoc(doc(db, 'transacoes', transacaoId));
}

export function observarTransacoes(
    userId: string,
    competencia: string,
    onChange: (transacoes: Transacao[]) => void
): () => void {
    const q = query(
        collection(db, 'transacoes'),
        where('userId', '==', userId),
        where('competencia', '==', competencia),
        orderBy('data', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
        const transacoesBanco: Transacao[] = [];

        snapshot.forEach((documento) => {
            transacoesBanco.push({
                id: documento.id,
                ...documento.data(),
            } as Transacao);
        });

        onChange(transacoesBanco);
    });
}