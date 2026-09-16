export interface Cartao {
  id: string;
  userId: string;
  nome: string;
  banco: string;
  diaFechamento: number; // 1 a 31
  diaVencimento: number; // 1 a 31
  ativo: boolean;
}
