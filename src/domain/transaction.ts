import type { CategoriaId } from '../utils/categorias';

export interface Transacao {
    id: string;
    descricao: string;
    valorCentavos: number;
    tipo: 'receita' | 'despesa';
    categoria?: CategoriaId | string;
    data?: string;
    userId: string;
    competencia: string;
}