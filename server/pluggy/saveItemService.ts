import { adminDb, FieldValue } from '../firebase/firebaseAdmin';
import { getPluggyItem } from './getPluggyItem';

export class InvalidRequestError extends Error {
  readonly statusCode: number = 400;
  constructor(message: string = 'Invalid request') {
    super(message);
    this.name = 'InvalidRequestError';
  }
}

export class ForbiddenError extends Error {
  readonly statusCode: number = 403;
  constructor(message: string = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export interface SaveItemInput {
  uid: string;
  itemId: string;
}

export interface SaveItemResult {
  itemId: string;
  status: string;
}

/**
 * Valida a existência do Item na Pluggy e registra ownership e documento
 * atomicamente através de Firestore Transaction.
 * 
 * Garante:
 * 1. Um itemId só pode pertencer a UM Firebase UID no sistema (pluggyItemOwners/{itemId}).
 * 2. Idempotência estrita quando o mesmo UID salva o item novamente.
 * 3. Bloqueio imediato com 403 (Forbidden) se outro UID tentar associar o mesmo item.
 * 4. Nenhuma escrita parcial ou race condition através de transação atômica.
 */
export async function saveItemService({
  uid,
  itemId,
}: SaveItemInput): Promise<SaveItemResult> {
  if (!uid || typeof uid !== 'string' || !uid.trim()) {
    throw new ForbiddenError('Forbidden');
  }

  if (!itemId || typeof itemId !== 'string' || !itemId.trim()) {
    throw new InvalidRequestError('Invalid request');
  }

  const cleanItemId = itemId.trim();

  // 1. Valida que o Item existe na Pluggy consultando o backend da Pluggy
  const pluggyItem = await getPluggyItem(cleanItemId);

  if (!pluggyItem) {
    throw new InvalidRequestError('Invalid request');
  }

  // 2. Se a API da Pluggy retornar o clientUserId, valida que pertence ao UID autenticado
  if (pluggyItem.clientUserId && pluggyItem.clientUserId !== uid) {
    throw new ForbiddenError('Forbidden');
  }

  // 3. Execução atômica via Firestore Transaction
  const ownerDocRef = adminDb.collection('pluggyItemOwners').doc(cleanItemId);
  const userItemDocRef = adminDb
    .collection('users')
    .doc(uid)
    .collection('pluggyItems')
    .doc(cleanItemId);

  await adminDb.runTransaction(async (transaction) => {
    // Leituras obrigatórias antes de qualquer escrita na transação
    const ownerDocSnap = await transaction.get(ownerDocRef);
    const userItemDocSnap = await transaction.get(userItemDocRef);

    if (ownerDocSnap.exists) {
      const ownerData = ownerDocSnap.data();

      // Se o item já pertence a outro UID, aborta a transação imediatamente
      if (ownerData?.uid !== uid) {
        throw new ForbiddenError('Forbidden');
      }

      // Idempotência: pertence ao mesmo usuário, atualiza status e updatedAt
      if (userItemDocSnap.exists) {
        transaction.set(
          userItemDocRef,
          {
            status: pluggyItem.status,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      } else {
        transaction.set(userItemDocRef, {
          itemId: cleanItemId,
          status: pluggyItem.status,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    } else {
      // Primeira associação: registra propriedade global e salva documento na subcoleção do usuário
      transaction.set(ownerDocRef, {
        uid,
        createdAt: FieldValue.serverTimestamp(),
      });

      transaction.set(userItemDocRef, {
        itemId: cleanItemId,
        status: pluggyItem.status,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  });

  return {
    itemId: cleanItemId,
    status: pluggyItem.status,
  };
}
