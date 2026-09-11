import {
    doc,
    onSnapshot,
    setDoc,
} from 'firebase/firestore';

import { db } from '../firebase';

export function observarRenda(
    userId: string,
    onChange: (valor: number) => void
): () => void {
    const docRef = doc(db, 'rendas', userId);

    return onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            onChange(docSnap.data().valor);
        } else {
            onChange(0);
        }
    });
}

export async function salvarRenda(
    userId: string,
    valor: number
): Promise<void> {
    await setDoc(doc(db, 'rendas', userId), {
        valor,
    });
}