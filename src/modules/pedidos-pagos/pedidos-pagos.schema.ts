import { z } from 'zod';

// Schema para crear un pago de pedido (con descuento pronto pago opcional)
export const createPedidoPagoSchema = z.object({
  PedidoID: z.number({ required_error: 'PedidoID es requerido' }),
  Monto: z.number({ required_error: 'Monto es requerido' }).positive('El monto debe ser positivo'),
  FechaPago: z.string({ required_error: 'FechaPago es requerida' }),
  MetodoPagoID: z.number().optional(),
  CuentaBancariaID: z.number().optional(),
  Referencia: z.string().max(150).nullish(),
  Observaciones: z.string().max(500).nullish(),
  UsuarioID: z.number().optional(),
  // Descuento por pronto pago (opcional, se aplica en el mismo pago)
  DescuentoPorcentaje: z.number().min(0).max(100).optional(),
  DiasProntoPago: z.number().int().min(1).optional(),
  FechaBase: z.string().optional(), // fecha desde la que corre el plazo (default: FechaPago)
  // Monto del descuento en $ (calculado por el frontend para registro histórico)
  MontoDescuento: z.number().min(0).optional(),
});

// Schema para params de pago
export const pedidoPagoIdParamSchema = z.object({
  PedidoPagoID: z.string().regex(/^\d+$/, 'ID debe ser número').transform(Number),
});

// Schema para params de pedido
export const pedidoIdParamSchema = z.object({
  PedidoID: z.string().regex(/^\d+$/, 'ID debe ser número').transform(Number),
});

// Types
export type CreatePedidoPagoDto = z.infer<typeof createPedidoPagoSchema>;
