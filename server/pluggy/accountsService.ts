import { adminDb } from '../firebase/firebaseAdmin';
import { getPluggyAccounts, type PluggyAccount } from './getPluggyAccounts';

export interface AccountWithItem {
  itemId: string;
  accounts: PluggyAccount[];
}

/**
 * Retorna todas as contas Pluggy pertencentes aos Items registrados para o UID autenticado.
 *
 * Segurança:
 * 1. Busca Items EXCLUSIVAMENTE de users/{uid}/pluggyItems no Firestore.
 * 2. NUNCA aceita itemId enviado pelo frontend nesta rota.
 * 3. O servidor decide quais Items pertencem ao usuário.
 * 4. Consulta a Pluggy usando API Key server-side — NUNCA envia a key ao browser.
 */
export async function getUserAccounts(uid: string): Promise<AccountWithItem[]> {
  if (!uid || typeof uid !== 'string' || !uid.trim()) {
    throw new Error('UID é obrigatório.');
  }

  const cleanUid = uid.trim();

  // 1. Buscar todos os Items registrados para este usuário no Firestore
  const itemsSnapshot = await adminDb
    .collection('users')
    .doc(cleanUid)
    .collection('pluggyItems')
    .get();

  if (itemsSnapshot.empty) {
    return [];
  }

  // 2. Para cada Item, consultar contas na Pluggy (em paralelo, limitado)
  const results: AccountWithItem[] = [];
  const errors: string[] = [];

  // Executa consultas em paralelo com Promise.allSettled para resiliência
  const accountPromises = itemsSnapshot.docs.map(async (doc) => {
    const itemData = doc.data();
    const itemId = itemData?.itemId || doc.id;

    try {
      const accounts = await getPluggyAccounts(itemId);
      return { itemId, accounts };
    } catch {
      // Registra erro sem expor detalhes internos; continua processando outros Items
      console.error(`Falha ao consultar contas para item. Continuando com demais items.`);
      errors.push(itemId);
      return { itemId, accounts: [] as PluggyAccount[] };
    }
  });

  const settled = await Promise.allSettled(accountPromises);

  for (const result of settled) {
    if (result.status === 'fulfilled' && result.value.accounts.length > 0) {
      results.push(result.value);
    }
  }

  return results;
}
