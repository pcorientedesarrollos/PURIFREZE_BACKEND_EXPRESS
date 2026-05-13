import { z } from 'zod';

export const cuentaBancariaIdParamSchema = z.object({
  CuentaBancariaID: z.string().regex(/^\d+$/, 'CuentaBancariaID debe ser un número').transform(Number),
});

export const reporteQuerySchema = z.object({
  FechaInicio: z.string().optional(),
  FechaFin:    z.string().optional(),
});

export type ReporteQueryDto = z.infer<typeof reporteQuerySchema>;
