import { z } from 'zod';

// Schema para crear un pago de compra
export const createCompraPagoSchema = z.object({
  CompraEncabezadoID: z.number({ required_error: 'CompraEncabezadoID es requerido' }),
  MetodoPagoID: z.number({ required_error: 'MetodoPagoID es requerido' }),
  CuentaBancariaID: z.number().optional(),
  Monto: z.number({ required_error: 'Monto es requerido' }).positive('El monto debe ser positivo'),
  Descuento: z.number().min(0, 'El descuento no puede ser negativo').default(0),
  FechaPago: z.string({ required_error: 'FechaPago es requerida' }),
  Referencia: z.string().max(100).nullish(),
  Observaciones: z.string().max(255).nullish(),
  UsuarioID: z.number({ required_error: 'UsuarioID es requerido' }),
});

// Schema para params de pago
export const compraPagoIdParamSchema = z.object({
  CompraPagoID: z.string().regex(/^\d+$/, 'ID debe ser número').transform(Number),
});

// Schema para params de compra
export const compraIdParamSchema = z.object({
  CompraEncabezadoID: z.string().regex(/^\d+$/, 'ID debe ser número').transform(Number),
});

// Types
export type CreateCompraPagoDto = z.infer<typeof createCompraPagoSchema>;
