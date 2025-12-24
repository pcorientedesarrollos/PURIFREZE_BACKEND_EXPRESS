import { z } from 'zod';

// Enums
export const TipoItemVenta = z.enum(['EQUIPO_PURIFREEZE', 'EQUIPO_EXTERNO', 'REFACCION', 'SERVICIO']);
export const EstatusVenta = z.enum(['PENDIENTE', 'PAGADA', 'PARCIAL', 'CANCELADA']);

// Schema para crear detalle de venta
export const createDetalleVentaSchema = z.object({
  TipoItem: TipoItemVenta,
  EquipoID: z.number().optional().nullable(),
  PlantillaEquipoID: z.number().optional().nullable(),
  RefaccionID: z.number().optional().nullable(),
  PresupuestoDetalleID: z.number().optional().nullable(),
  Descripcion: z.string().max(500).optional().nullable(),
  Cantidad: z.number().min(1).default(1),
  PrecioUnitario: z.number().min(0).default(0),
  DescuentoPorcentaje: z.number().min(0).max(100).optional().nullable(),
  DescuentoEfectivo: z.number().min(0).optional().nullable(),
  NumeroSerie: z.string().max(50).optional().nullable(),
  MesesGarantia: z.number().min(0).optional().nullable(),
});

// Schema para crear venta
export const createVentaSchema = z.object({
  ClienteID: z.number({ required_error: 'El ClienteID es requerido' }),
  SucursalID: z.number().optional().nullable(),
  PresupuestoID: z.number().optional().nullable(),
  FechaVenta: z.string().optional(),
  Observaciones: z.string().max(500).optional().nullable(),
  UsuarioID: z.number({ required_error: 'El UsuarioID es requerido' }),
  DescuentoPorcentaje: z.number().min(0).max(100).optional().nullable(),
  DescuentoEfectivo: z.number().min(0).optional().nullable(),
  detalles: z.array(createDetalleVentaSchema).min(1, 'Debe incluir al menos un item'),
});

// Schema para actualizar venta (encabezado)
export const updateVentaSchema = z.object({
  SucursalID: z.number().optional().nullable(),
  FechaVenta: z.string().optional(),
  Observaciones: z.string().max(500).optional().nullable(),
  DescuentoPorcentaje: z.number().min(0).max(100).optional().nullable(),
  DescuentoEfectivo: z.number().min(0).optional().nullable(),
});

// Schema para cambiar estatus
export const updateEstatusVentaSchema = z.object({
  Estatus: EstatusVenta,
});

// Schema para agregar detalle a venta existente
export const addDetalleVentaSchema = createDetalleVentaSchema;

// Schema para actualizar detalle
export const updateDetalleVentaSchema = z.object({
  Cantidad: z.number().min(1).optional(),
  PrecioUnitario: z.number().min(0).optional(),
  DescuentoPorcentaje: z.number().min(0).max(100).optional().nullable(),
  DescuentoEfectivo: z.number().min(0).optional().nullable(),
  Descripcion: z.string().max(500).optional().nullable(),
  MesesGarantia: z.number().min(0).optional().nullable(),
});

// Schema para registrar pago
export const createPagoSchema = z.object({
  MetodoPagoID: z.number({ required_error: 'El MetodoPagoID es requerido' }),
  Monto: z.number({ required_error: 'El Monto es requerido' }).min(0.01, 'El monto debe ser mayor a 0'),
  FechaPago: z.string({ required_error: 'La FechaPago es requerida' }),
  Referencia: z.string().max(100).optional().nullable(),
  Observaciones: z.string().max(255).optional().nullable(),
  UsuarioID: z.number({ required_error: 'El UsuarioID es requerido' }),
});

// Schemas de parámetros
export const ventaIdParamSchema = z.object({
  VentaID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

export const detalleIdParamSchema = z.object({
  VentaDetalleID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

export const pagoIdParamSchema = z.object({
  VentaPagoID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

export const clienteIdParamSchema = z.object({
  ClienteID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

// Schema para query params
export const ventasQuerySchema = z.object({
  estatus: EstatusVenta.optional(),
  fechaDesde: z.string().optional(),
  fechaHasta: z.string().optional(),
}).partial();

// Types
export type CreateVentaDto = z.infer<typeof createVentaSchema>;
export type UpdateVentaDto = z.infer<typeof updateVentaSchema>;
export type UpdateEstatusVentaDto = z.infer<typeof updateEstatusVentaSchema>;
export type CreateDetalleVentaDto = z.infer<typeof createDetalleVentaSchema>;
export type AddDetalleVentaDto = z.infer<typeof addDetalleVentaSchema>;
export type UpdateDetalleVentaDto = z.infer<typeof updateDetalleVentaSchema>;
export type CreatePagoDto = z.infer<typeof createPagoSchema>;
export type VentasQueryDto = z.infer<typeof ventasQuerySchema>;
