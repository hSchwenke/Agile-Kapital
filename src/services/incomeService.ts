import {
    doc,
    onSnapshot,
    setDoc,
} from 'firebase/firestore';

import { db } from '../firebase';

export function observarRenda(
    userId: string,
    onChange: (valorCentavos: number) => void
): () => void {
    const docRef = doc(db, 'rendas', userId);

    return onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const dados = docSnap.data();
            if (
                typeof dados?.valorCentavos === 'number' &&
                Number.isFinite(dados.valorCentavos) &&
                Number.isInteger(dados.valorCentavos) &&
                dados.valorCentavos > 0
            ) {
                onChange(dados.valorCentavos);
            } else {
                onChange(0);
            }
        } else {
            onChange(0);
        }
    });
}

export async function salvarRenda(
    userId: string,
    valorCentavos: number
): Promise<void> {
    if (
        typeof valorCentavos !== 'number' ||
        !Number.isFinite(valorCentavos) ||
        !Number.isInteger(valorCentavos) ||
        valorCentavos <= 0
    ) {
        throw new Error('Valor inválido. A renda deve ser um valor válido.');
    }

    await setDoc(doc(db, 'rendas', userId), {
        valorCentavos,
    });
}