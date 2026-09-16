import type { Transacao } from '../domain/transaction';

export function calcularTotalReceitas(
    transacoes: Transacao[]
): number {
    return transacoes
        .filter((transacao) => transacao.tipo === 'receita')
        .reduce((total, transacao) => total + transacao.valorCentavos, 0);
}

export function calcularTotalDespesas(
    transacoes: Transacao[]
): number {
    return transacoes
        .filter((transacao) => transacao.tipo === 'despesa')
        .reduce((total, transacao) => total + transacao.valorCentavos, 0);
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

            acc[categoria] = (acc[categoria] || 0) + transacao.valorCentavos;

            return acc;
        }, {});
}

/**
 * Divide o valor total em centavos inteiros entre o número de parcelas.
 * O resto da divisão é distribuído centavo a centavo nas primeiras parcelas,
 * garantindo que a soma de todas as parcelas seja exatamente igual ao valor total.
 */
export function dividirParcelas(
    valorTotalCentavos: number,
    totalParcelas: number
): number[] {
    if (
        !Number.isInteger(valorTotalCentavos) ||
        valorTotalCentavos <= 0 ||
        !Number.isInteger(totalParcelas) ||
        totalParcelas < 2 ||
        totalParcelas > 72
    ) {
        throw new Error('Parâmetros inválidos para divisão de parcelas.');
    }

    const valorBase = Math.floor(valorTotalCentavos / totalParcelas);
    const restoCentavos = valorTotalCentavos % totalParcelas;

    const parcelas: number[] = [];
    for (let i = 0; i < totalParcelas; i++) {
        // As primeiras parcelas recebem +1 centavo até esgotar o resto
        const centavoAdicional = i < restoCentavos ? 1 : 0;
        parcelas.push(valorBase + centavoAdicional);
    }

    return parcelas;
}

export function obterUltimoDiaDoMes(ano: number, mes: number): number {
    return new Date(ano, mes, 0).getDate();
}

/**
 * Calcula a competência inicial (YYYY-MM) com base na data da compra e no dia de fechamento do cartão.
 * Se a compra ocorrer após o fechamento efetivo do mês, a primeira parcela cai no mês seguinte.
 */
export function calcularCompetenciaInicial(
    dataCompra: string,
    diaFechamento: number
): string {
    const [anoStr, mesStr, diaStr] = dataCompra.slice(0, 10).split('-');
    const ano = Number(anoStr);
    const mes = Number(mesStr);
    const dia = Number(diaStr);

    const ultimoDia = obterUltimoDiaDoMes(ano, mes);
    const fechamentoEfetivo = Math.min(diaFechamento, ultimoDia);

    if (dia > fechamentoEfetivo) {
        const proximoMes = mes === 12 ? 1 : mes + 1;
        const proximoAno = mes === 12 ? ano + 1 : ano;
        return `${proximoAno}-${String(proximoMes).padStart(2, '0')}`;
    }

    return `${ano}-${String(mes).padStart(2, '0')}`;
}

/**
 * Avança 'offsetMeses' a partir de uma competência inicial (YYYY-MM), tratando corretamente viradas de ano.
 */
export function calcularProximaCompetencia(
    competencia: string,
    offsetMeses: number
): string {
    const [anoStr, mesStr] = competencia.split('-');
    const ano = Number(anoStr);
    const mes = Number(mesStr);

    const totalMeses = ano * 12 + (mes - 1) + offsetMeses;
    const novoAno = Math.floor(totalMeses / 12);
    const novoMes = (totalMeses % 12) + 1;

    return `${novoAno}-${String(novoMes).padStart(2, '0')}`;
}

export interface StatusParcelamento {
    status: 'nao_iniciado' | 'em_andamento' | 'finalizado';
    texto: string;
    parcelaAtual?: number;
}

/**
 * Calcula o status de um parcelamento em tempo de execução comparando a competência inicial
 * com a competência atual do dispositivo.
 */
export function calcularStatusParcelamento(
    competenciaInicial: string,
    totalParcelas: number,
    competenciaReferencia?: string
): StatusParcelamento {
    let compRef = competenciaReferencia;
    if (!compRef) {
        const agora = new Date();
        compRef = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
    }

    const [anoIni, mesIni] = competenciaInicial.split('-').map(Number);
    const [anoRef, mesRef] = compRef.split('-').map(Number);

    const indiceIni = anoIni * 12 + mesIni;
    const indiceRef = anoRef * 12 + mesRef;
    const diferenca = indiceRef - indiceIni;

    if (diferenca < 0) {
        return {
            status: 'nao_iniciado',
            texto: 'Ainda não iniciado',
        };
    }

    const parcelaAtual = diferenca + 1;
    if (parcelaAtual > totalParcelas) {
        return {
            status: 'finalizado',
            texto: 'Finalizado',
        };
    }

    return {
        status: 'em_andamento',
        texto: `${parcelaAtual}/${totalParcelas}`,
        parcelaAtual,
    };
}