import { z } from 'zod';

export const memberSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome.').max(150),
  category: z.enum(['Indivíduo', 'Casal', 'Família']),
});

export const entrySchema = z.object({
  date: z.iso.date(),
  name: z.string().trim().min(2).max(150),
  reference: z.string().trim().max(250),
  amount: z.number().finite().positive().max(100000000),
  category: z.string().trim().min(1).max(100),
  payment: z.string().trim().min(1).max(100),
});

export const idSchema = z.object({
  id: z.string().uuid(),
});

export function normalizeName(input: string) {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('pt-BR');
}
