import { z } from 'zod';

export const facturaIdParamSchema = z.object({
  FacturaID: z.string().regex(/^\d+$/, 'FacturaID debe ser un número').transform(Number),
});

export const listFacturasQuerySchema = z.object({
  texto: z.string().optional(),
  fechaDesde: z.string().optional(),
  fechaHasta: z.string().optional(),
});

export type ListFacturasQueryDto = z.infer<typeof listFacturasQuerySchema>;
