import { z } from 'zod';

// Schema para crear banco
export const createBancoSchema = z.object({
  NombreBanco: z.string().max(255, 'NombreBanco no puede exceder 255 caracteres'),
  Observaciones: z.string().max(255, 'Observaciones no puede exceder 255 caracteres'),
});

// Schema para actualizar banco
export const updateBancoSchema = z.object({
  NombreBanco: z.string().max(255).optional(),
  Observaciones: z.string().max(255).optional(),
});

// Schema para validar ID en params
export const bancoIdParamSchema = z.object({
  BancoID: z.string().regex(/^\d+$/, 'BancoID debe ser un número').transform(Number),
});

// Types inferidos de los schemas
export type CreateBancoDto = z.infer<typeof createBancoSchema>;
export type UpdateBancoDto = z.infer<typeof updateBancoSchema>;
