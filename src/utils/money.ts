export function reaisParaCentavos(valor: number): number {
    return Math.round(valor * 100);
}

export function centavosParaReais(valor: number): number {
    return valor / 100;
}