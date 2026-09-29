import { adminDb } from '../firebase/firebaseAdmin';
import { getPluggyApiKey } from './authenticatePluggy';

export class DisconnectError extends Error {
  readonly statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = 'DisconnectError';
    this.statusCode = statusCode;
  }
}

export async function disconnectItem(
  uid: string,
  itemId: string
): Promise<void> {
  if (!uid || typeof uid !== 'string' || !uid.trim()) {
    throw new DisconnectError('Unauthorized', 401);
  }

  if (!itemId || typeof itemId !== 'string' || !itemId.trim()) {
    throw new DisconnectError('Invalid request', 400);
  }

  const cleanItemId = itemId.trim();

  // 1. Validar ownership antes de qualquer ação
  const ownerDocRef = adminDb.collection('pluggyItemOwners').doc(cleanItemId);
  const userItemDocRef = adminDb
    .collection('users')
    .doc(uid)
    .collection('pluggyItems')
    .doc(cleanItemId);

  const [ownerSnap, userItemSnap] = await Promise.all([
    ownerDocRef.get(),
    userItemDocRef.get(),
  ]);

  // Se não existir em nenhum dos dois, já está desconectado (operação idempotente)
  if (!ownerSnap.exists && !userItemSnap.exists) {
    return;
  }

  // Se existir registro global de propriedade, validar que pertence estritamente ao UID autenticado
  if (ownerSnap.exists) {
    const ownerData = ownerSnap.data();
    if (ownerData?.uid !== uid) {
      throw new DisconnectError('Forbidden', 403);
    }
  }

  // 2. Chamar DELETE do Item na Pluggy somente após validar ownership
  try {
    const apiKey = await getPluggyApiKey();
    const pluggyResponse = await fetch(
      `https://api.pluggy.ai/items/${encodeURIComponent(cleanItemId)}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': apiKey,
        },
      }
    );

    if (pluggyResponse.status !== 404 && !pluggyResponse.ok) {
      console.error(
        'Falha ao deletar Item na Pluggy. Status:',
        pluggyResponse.status
      );
    }
  } catch (error) {
    console.error('Erro de comunicação ao deletar Item na Pluggy:', error);
  }

  // 3. Remover registros do Firestore
  const batch = adminDb.batch();
  if (userItemSnap.exists) {
    batch.delete(userItemDocRef);
  }
  if (ownerSnap.exists) {
    batch.delete(ownerDocRef);
  }
  await batch.commit();
}
