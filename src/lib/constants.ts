import { Member } from './types';

export const blankMember = {
  name: '',
  category: 'Indivíduo' as Member['category'],
};

export const money = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});
