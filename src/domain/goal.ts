export interface Meta {
  id: string;
  userId: string;
  nome: string;
  valorAlvoCentavos: number;
  valorAtualCentavos: number;
  dataLimite?: string; // YYYY-MM-DD
  status: 'ativa' | 'concluida' | 'arquivada';
  criadoEm: string; // ISO 8601
}
