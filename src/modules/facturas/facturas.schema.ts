import { z } from 'zod';

export const facturaIdParamSchema = z.object({
  FacturaID: z.string().regex(/^\d+$/, 'FacturaID debe ser un número').transform(Number),
});

export const emisorIdParamSchema = z.object({
  EmisorFacturaID: z.string().regex(/^\d+$/, 'EmisorFacturaID debe ser un número').transform(Number),
});

export const listFacturasQuerySchema = z.object({
  texto: z.string().optional(),
  emisorRFC: z.string().optional(),
  fechaDesde: z.string().optional(),
  fechaHasta: z.string().optional(),
  page: z
    .string()
    .regex(/^\d+$/, 'page debe ser un número entero')
    .transform(Number)
    .optional(),
  pageSize: z
    .string()
    .regex(/^\d+$/, 'pageSize debe ser un número entero')
    .transform(Number)
    .optional(),
});

export const listAgrupadasQuerySchema = z.object({
  texto: z.string().optional(),
});

export type ListFacturasQueryDto = z.infer<typeof listFacturasQuerySchema>;
