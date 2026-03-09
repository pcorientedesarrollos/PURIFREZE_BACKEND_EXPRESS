import { z } from 'zod';

// Schema para asignar proveedores a una cotización
export const asignarProveedoresSchema = z.object({
  ProveedorIDs: z.array(z.number({ required_error: 'ProveedorID es requerido' }))
    .min(1, 'Debe asignar al menos un proveedor'),
  Observaciones: z.string().max(500, 'Observaciones máximo 500 caracteres').optional(),
});

// Schema para detalle de respuesta del proveedor
export const respuestaDetalleSchema = z.object({
  CotizacionDetalleID: z.number({ required_error: 'CotizacionDetalleID es requerido' }),
  PrecioUnitario: z.number().min(0, 'PrecioUnitario debe ser mayor o igual a 0').default(0),
  Descuento: z.number().min(0).max(100, 'Descuento máximo es 100%').default(0),
  TieneStock: z.boolean().default(true),
  DiasEntrega: z.number().min(0, 'DiasEntrega debe ser mayor o igual a 0').default(0),
  Observaciones: z.string().max(255, 'Observaciones máximo 255 caracteres').optional(),
});

// Schema para respuesta del proveedor
export const respuestaProveedorSchema = z.object({
  DescuentoGlobal: z.number().min(0).max(100, 'DescuentoGlobal máximo es 100%').default(0),
  Observaciones: z.string().max(500, 'Observaciones máximo 500 caracteres').optional(),
  Detalles: z.array(respuestaDetalleSchema).min(1, 'Debe incluir al menos un detalle'),
});

// Schema para seleccionar mejor opción
export const seleccionarMejorOpcionSchema = z.object({
  RespuestaID: z.number({ required_error: 'RespuestaID es requerido' }),
  DetallesSeleccionados: z.array(z.number()).min(1, 'Debe seleccionar al menos un detalle'),
});

// Schema para params
export const cotizacionIdParamSchema = z.object({
  CotizacionCompraID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

export const respuestaIdParamSchema = z.object({
  RespuestaID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

// Types
export type AsignarProveedoresDto = z.infer<typeof asignarProveedoresSchema>;
export type RespuestaDetalleDto = z.infer<typeof respuestaDetalleSchema>;
export type RespuestaProveedorDto = z.infer<typeof respuestaProveedorSchema>;
export type SeleccionarMejorOpcionDto = z.infer<typeof seleccionarMejorOpcionSchema>;
