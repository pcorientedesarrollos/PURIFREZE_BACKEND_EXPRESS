import { z } from 'zod';

/**
 * Query params para GET /control/pedidos
 * Todos opcionales; `pageSize=0` implica "sin paginacion" (traer todo el filtro).
 */
export const listControlPedidosQuerySchema = z.object({
  texto: z.string().optional(),
  proveedorId: z
    .string()
    .regex(/^\d+$/, 'proveedorId debe ser un entero')
    .transform(Number)
    .optional(),
  fechaDesde: z.string().optional(),
  fechaHasta: z.string().optional(),
  page: z
    .string()
    .regex(/^\d+$/, 'page debe ser un entero')
    .transform(Number)
    .optional(),
  pageSize: z
    .string()
    .regex(/^\d+$/, 'pageSize debe ser un entero')
    .transform(Number)
    .optional(),
});

export type ListControlPedidosQueryDto = z.infer<typeof listControlPedidosQuerySchema>;
