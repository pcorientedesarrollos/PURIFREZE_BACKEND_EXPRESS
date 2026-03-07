import { z } from 'zod';

// Schema para detalle de recepción
export const createRecepcionDetalleSchema = z.object({
  RefaccionID: z.number({ required_error: 'RefaccionID es requerido' }),
  CantidadEstablecida: z.number({ required_error: 'CantidadEstablecida es requerida' }),
});

// Schema para crear recepción de compra
// Nota: Con el nuevo sistema de ejes independientes, los pagos se hacen por separado
// a través del módulo compras-pagos. Los campos de pago ahora son opcionales.
export const createRecepcionSchema = z.object({
  CompraEncabezadoID: z.number({ required_error: 'CompraEncabezadoID es requerido' }),
  FechaRecepcion: z.string().optional(),
  Observaciones: z.string().optional(),
  MontoRecepcion: z.number().optional().default(0), // Ya no es requerido
  UsuarioID: z.number({ required_error: 'UsuarioID es requerido' }),
  MetodoPagoID: z.number().optional(), // Ahora opcional
  CuentaBancariaID: z.number().optional(), // Ahora opcional
  NumeroFactura: z.string().max(100).optional(), // Número de factura de la entrega
  Detalles: z.array(createRecepcionDetalleSchema).min(1, 'Debe incluir al menos un detalle'),
});

// Schema para params
export const recepcionIdParamSchema = z.object({
  ComprasRecepcionesEncabezadoID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

export const compraIdParamSchema = z.object({
  CompraEncabezadoID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

// Types
export type CreateRecepcionDetalleDto = z.infer<typeof createRecepcionDetalleSchema>;
export type CreateRecepcionDto = z.infer<typeof createRecepcionSchema>;
