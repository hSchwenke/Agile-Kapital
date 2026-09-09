import type { Transacao } from '../domain/transaction';

export function calcularTotalReceitas(
    transacoes: Transacao[]
): number {
    return transacoes
        .filter((transacao) => transacao.tipo === 'receita')
        .reduce((total, transacao) => total + transacao.valor, 0);
}

export function calcularTotalDespesas(
    transacoes: Transacao[]
): number {
    return transacoes
        .filter((transacao) => transacao.tipo === 'despesa')
        .reduce((total, transacao) => total + transacao.valor, 0);
}

export function calcularSaldo(
    transacoes: Transacao[],
    rendaBase: number
): number {
    const receitasExtras = calcularTotalReceitas(transacoes);
    const despesas = calcularTotalDespesas(transacoes);

    return rendaBase + receitasExtras - despesas;
}

export function calcularDespesasPorCategoria(
    transacoes: Transacao[]
): Record<string, number> {
    return transacoes
        .filter((transacao) => transacao.tipo === 'despesa')
        .reduce<Record<string, number>>((acc, transacao) => {
            const categoria = transacao.categoria || 'outros';

            acc[categoria] = (acc[categoria] || 0) + transacao.valor;

            return acc;
        }, {});
}