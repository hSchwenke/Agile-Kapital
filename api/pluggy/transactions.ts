import type { VercelRequest, VercelResponse } from '@vercel/node';

import {
    verifyFirebaseToken,
    AuthError,
} from '../../server/auth/verifyFirebaseToken.js';

import { getUserTransactions } from '../../server/pluggy/transactionsService.js';

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    res.setHeader('Content-Type', 'application/json');

    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');

        return res.status(405).json({
            error: 'Method not allowed',
        });
    }

    try {
        // UID obtido somente do Firebase ID Token validado no backend.
        // O navegador NÃO informa uid, itemId ou accountId.
        const uid = await verifyFirebaseToken(req.headers);

        // O backend descobre as contas pertencentes ao usuário
        // e então carrega as transações dessas contas.
        const transactions = await getUserTransactions(uid);

        return res.status(200).json({
            success: true,
            data: transactions,
        });
    } catch (error) {
        if (error instanceof AuthError) {
            return res.status(401).json({
                error: 'Unauthorized',
            });
        }

        console.error(
            'Falha interna ao processar /api/pluggy/transactions:', error
        );

        return res.status(500).json({
            error: 'Internal server error',
        });
    }
}