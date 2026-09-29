import { adminDb } from '../firebase/firebaseAdmin';
import {
  getPluggyAccounts,
  type PluggyAccount,
} from './getPluggyAccounts';

export async function getUserAccounts(
  uid: string
): Promise<PluggyAccount[]> {
  if (!uid?.trim()) {
    throw new Error('UID obrigatório.');
  }

  const itemsSnapshot = await adminDb
    .collection('users')
    .doc(uid.trim())
    .collection('pluggyItems')
    .get();

  if (itemsSnapshot.empty) {
    return [];
  }

  const results = await Promise.allSettled(
    itemsSnapshot.docs.map(async (doc) => {
      const itemId = doc.id;
      return getPluggyAccounts(itemId);
    })
  );

  const accountsById = new Map<string, PluggyAccount>();

  for (const result of results) {
    if (result.status !== 'fulfilled') {
      console.error('Falha ao consultar um Item Pluggy.');
      continue;
    }

    for (const account of result.value) {
      accountsById.set(account.id, account);
    }
  }

  return [...accountsById.values()];
}