import { z } from 'zod';

// Schema para aplicar una nota de credito existente a un pedido
export const aplicarNotaCreditoSchema = z.object({
  PedidoID: z.number({ required_error: 'PedidoID es requerido' }),
  NotaCreditoID: z.number({ required_error: 'NotaCreditoID es requerido' }),
  MontoAplicado: z.number().positive().optional(), // si no viene, se aplica el total de la NC
});

// Schema para el parametro :PedidoDescuentoID
export const pedidoDescuentoIdParamSchema = z.object({
  PedidoDescuentoID: z.string().regex(/^\d+$/, 'ID debe ser número').transform(Number),
});

// Schema para el parametro :PedidoID
export const pedidoIdParamSchema = z.object({
  PedidoID: z.string().regex(/^\d+$/, 'ID debe ser número').transform(Number),
});

// Types
export type AplicarNotaCreditoDto = z.infer<typeof aplicarNotaCreditoSchema>;
