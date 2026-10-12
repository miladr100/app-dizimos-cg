export type MemberCategory = 'Indivíduo' | 'Casal' | 'Família';

export type Member = {
  id: string;
  name: string;
  category: MemberCategory;
};

export type Entry = {
  id: string;
  date: string;
  name: string;
  reference: string;
  amount: number;
  category: string;
  payment: string;
};

export const categories = ['Indivíduo', 'Casal', 'Família'] as const;
export const entryCategories = ['Dízimo', 'Oferta', 'Outros'] as const;
export const payments = ['Pix', 'Dinheiro', 'Transferência', 'Cartão', 'Depósito', 'Outros'] as const;
