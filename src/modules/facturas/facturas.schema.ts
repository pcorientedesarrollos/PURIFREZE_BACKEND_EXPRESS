import { z } from 'zod';

export const facturaIdParamSchema = z.object({
  FacturaID: z.string().regex(/^\d+$/, 'FacturaID debe ser un número').transform(Number),
});

export const listFacturasQuerySchema = z.object({
  texto: z.string().optional(),
  fechaDesde: z.string().optional(),
  fechaHasta: z.string().optional(),
});

export const listAgrupadasQuerySchema = z.object({
  texto: z.string().optional(),
});

/**
 * Body para PATCH /facturas/asignar-numero-pedido
 */
export const asignarNumeroPedidoSchema = z.object({
  NumeroPedido: z
    .string()
    .trim()
    .min(1, 'El número de pedido no puede estar vacío')
    .max(100, 'El número de pedido no puede exceder 100 caracteres'),
  FacturaIDs: z
    .array(
      z.number().int().positive('Cada FacturaID debe ser un entero positivo'),
    )
    .min(1, 'Debe seleccionar al menos una factura'),
});

export type AsignarNumeroPedidoDto = z.infer<typeof asignarNumeroPedidoSchema>;

export type ListFacturasQueryDto = z.infer<typeof listFacturasQuerySchema>;
