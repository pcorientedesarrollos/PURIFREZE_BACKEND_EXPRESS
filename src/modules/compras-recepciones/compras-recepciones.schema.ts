import { z } from 'zod';

// Schema para detalle de recepción
export const createRecepcionDetalleSchema = z.object({
  RefaccionID: z.number({ required_error: 'RefaccionID es requerido' }),
  CantidadEstablecida: z.number({ required_error: 'CantidadEstablecida es requerida' }),
});

// Schema para crear recepción de compra
export const createRecepcionSchema = z.object({
  CompraEncabezadoID: z.number({ required_error: 'CompraEncabezadoID es requerido' }),
  FechaRecepcion: z.string().optional(),
  Observaciones: z.string().optional(),
  MontoRecepcion: z.number({ required_error: 'MontoRecepcion es requerido' }),
  UsuarioID: z.number({ required_error: 'UsuarioID es requerido' }),
  MetodoPagoID: z.number({ required_error: 'MetodoPagoID es requerido' }),
  CuentaBancariaID: z.number({ required_error: 'CuentaBancariaID es requerido' }),
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
