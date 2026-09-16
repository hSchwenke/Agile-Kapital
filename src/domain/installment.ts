import type { CategoriaId } from '../utils/categorias';

export interface Parcelamento {
  id: string;
  userId: string;
  cartaoId: string;
  descricao: string;
  categoria: CategoriaId | string;
  valorTotalCentavos: number;
  totalParcelas: number;
  dataCompra: string; // YYYY-MM-DD
  competenciaInicial: string; // YYYY-MM
}
