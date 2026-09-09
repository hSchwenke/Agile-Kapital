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
  Repeat2
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
  | 'assinaturas';

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
  outros: {
    id: 'outros',
    label: 'Outros',
    Icon: Package,
    colorClass: 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400',
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
    colorClass: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-40',
  }
};

export const LISTA_CATEGORIAS = Object.values(CATEGORIAS);
