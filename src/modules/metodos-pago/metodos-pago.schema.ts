import { z } from 'zod';

export const createMetodoPagoSchema = z.object({
  Descripcion: z.string().min(1).max(255),
  EsBancario: z.boolean().optional().default(false),
});

export const updateMetodoPagoSchema = createMetodoPagoSchema.partial();

export const metodoPagoIdParamSchema = z.object({
  MetodosDePagoID: z.string().regex(/^\d+$/).transform(Number),
});

export type CreateMetodoPagoDto = z.infer<typeof createMetodoPagoSchema>;
export type UpdateMetodoPagoDto = z.infer<typeof updateMetodoPagoSchema>;
