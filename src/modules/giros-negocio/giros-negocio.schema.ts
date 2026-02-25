import { z } from 'zod';

export const createGiroNegocioSchema = z.object({
  GiroNegocio: z.string().min(1, 'El giro de negocio es requerido').max(255),
  Observaciones: z.string().max(255).optional(),
  MesesMantenimiento: z.number().int().min(1).max(12).optional().nullable(),
});

export const updateGiroNegocioSchema = z.object({
  GiroNegocio: z.string().min(1).max(255).optional(),
  Observaciones: z.string().max(255).optional(),
  MesesMantenimiento: z.number().int().min(1).max(12).optional().nullable(),
});

export const giroNegocioIdParamSchema = z.object({
  GiroNegocioID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

export type CreateGiroNegocioDto = z.infer<typeof createGiroNegocioSchema>;
export type UpdateGiroNegocioDto = z.infer<typeof updateGiroNegocioSchema>;
