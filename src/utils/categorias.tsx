import {
  Utensils,
  Home,
  Car,
  Gamepad2,
  HeartPulse,
  GraduationCap,
  Package,
  type LucideIcon,
  ShoppingCart,
  Repeat2,
  Receipt,
  Wallet
} from 'lucide-react';

export type CategoriaId =
  | 'alimentacao'
  | 'moradia'
  | 'transporte'
  | 'lazer'
  | 'saude'
  | 'educacao'
  | 'outros'
  | 'compras'
  | 'assinaturas'
  | 'contas'
  | 'renda';

export interface CategoriaDef {
  id: CategoriaId;
  label: string;
  Icon: LucideIcon;
  colorClass: string;
}

export const CATEGORIAS: Record<CategoriaId, CategoriaDef> = {
  alimentacao: {
    id: 'alimentacao',
    label: 'Alimentação',
    Icon: Utensils,
    colorClass: 'bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400',
  },
  moradia: {
    id: 'moradia',
    label: 'Moradia',
    Icon: Home,
    colorClass: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
  },
  transporte: {
    id: 'transporte',
    label: 'Transporte',
    Icon: Car,
    colorClass: 'bg-teal-100 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400',
  },
  lazer: {
    id: 'lazer',
    label: 'Lazer',
    Icon: Gamepad2,
    colorClass: 'bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400',
  },
  saude: {
    id: 'saude',
    label: 'Saúde',
    Icon: HeartPulse,
    colorClass: 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400',
  },
  educacao: {
    id: 'educacao',
    label: 'Educação',
    Icon: GraduationCap,
    colorClass: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400',
  },
  contas: {
    id: 'contas',
    label: 'Contas & Serviços',
    Icon: Receipt,
    colorClass: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  },
  renda: {
    id: 'renda',
    label: 'Renda & Salário',
    Icon: Wallet,
    colorClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
  },
  compras: {
    id: 'compras',
    label: 'Compras',
    Icon: ShoppingCart,
    colorClass: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
  },
  assinaturas: {
    id: 'assinaturas',
    label: 'Assinaturas',
    Icon: Repeat2,
    colorClass: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400',
  },
  outros: {
    id: 'outros',
    label: 'Outros',
    Icon: Package,
    colorClass: 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400',
  },
};

export const LISTA_CATEGORIAS = Object.values(CATEGORIAS);

/**
 * Função central de mapeamento Pluggy category -> CategoriaId existente
 */
export function mapearCategoriaPluggy(category?: string | null): CategoriaId {
  if (!category || typeof category !== 'string') {
    return 'outros';
  }

  const normalizado = category
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (/food|dining|restaurant|refeicao|aliment|lanche|mercado|supermercado|padaria|ifood|ubereats|cafe/.test(normalizado)) {
    return 'alimentacao';
  }

  if (/transport|uber|taxi|combustivel|gasolina|veiculo|carro|auto|estacionamento|pedagio|99/.test(normalizado)) {
    return 'transporte';
  }

  if (/health|pharmacy|farmacia|saude|medico|hospital|drogaria|clinica|laboratorio|dentista/.test(normalizado)) {
    return 'saude';
  }

  if (/shop|compra|vestuario|loja|varejo|eletro|roupa|calcado|magazine|amazon|mercado livre/.test(normalizado)) {
    return 'compras';
  }

  if (/education|educacao|escola|faculdade|curso|universidade|livro|ensino/.test(normalizado)) {
    return 'educacao';
  }

  if (/bill|utilit|conta|energia|luz|agua|gas|internet|telecom|telefone|celular|tarifa|tributo|imposto/.test(normalizado)) {
    return 'contas';
  }

  if (/income|salary|salario|renda|deposito|pagamento|prolabore|investimento|remuneracao|beneficio/.test(normalizado)) {
    return 'renda';
  }

  if (/home|moradia|aluguel|condominio|casa|imovel/.test(normalizado)) {
    return 'moradia';
  }

  if (/assinatura|subscription|streaming|netflix|spotify|prime|youtube|apple|disney/.test(normalizado)) {
    return 'assinaturas';
  }

  if (/lazer|entertainment|cinema|jogo|game|viagem|hotel|turismo|passeio|festa|bar|show/.test(normalizado)) {
    return 'lazer';
  }

  return 'outros';
}

