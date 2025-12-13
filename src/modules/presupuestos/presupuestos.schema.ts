import { z } from 'zod';

// Enums
export const TipoItemPresupuesto = z.enum(['EQUIPO_PURIFREEZE', 'EQUIPO_EXTERNO', 'REFACCION', 'SERVICIO']);
export const ModalidadPresupuesto = z.enum(['VENTA', 'RENTA', 'MANTENIMIENTO']);
export const EstatusPresupuesto = z.enum(['Pendiente', 'Enviado', 'Aprobado', 'Rechazado', 'Vencido']);

// Schema para crear detalle
export const createDetalleSchema = z.object({
  TipoItem: TipoItemPresupuesto,
  Modalidad: ModalidadPresupuesto.optional().nullable(),
  PlantillaEquipoID: z.number().optional().nullable(),
  RefaccionID: z.number().optional().nullable(),
  Descripcion: z.string().max(500).optional().nullable(),
  Cantidad: z.number().min(1).default(1),
  PeriodoRenta: z.number().min(1).optional().nullable(),
  PrecioUnitario: z.number().min(0).default(0),
  DescuentoPorcentaje: z.number().min(0).max(100).optional().nullable(),
  DescuentoEfectivo: z.number().min(0).optional().nullable(),
});

// Schema para crear presupuesto
export const createPresupuestoSchema = z.object({
  ClienteID: z.number({ required_error: 'El ClienteID es requerido' }),
  SucursalID: z.number().optional().nullable(),
  FechaVigencia: z.string({ required_error: 'La fecha de vigencia es requerida' }),
  Observaciones: z.string().max(500).optional().nullable(),
  UsuarioID: z.number({ required_error: 'El UsuarioID es requerido' }),
  DescuentoPorcentaje: z.number().min(0).max(100).optional().nullable(),
  DescuentoEfectivo: z.number().min(0).optional().nullable(),
  GastosAdicionales: z.number().min(0).optional().nullable(),
  detalles: z.array(createDetalleSchema).min(1, 'Debe incluir al menos un item'),
});

// Schema para actualizar presupuesto (encabezado)
export const updatePresupuestoSchema = z.object({
  ClienteID: z.number().optional(),
  SucursalID: z.number().optional().nullable(),
  FechaVigencia: z.string().optional(),
  Observaciones: z.string().max(500).optional().nullable(),
  DescuentoPorcentaje: z.number().min(0).max(100).optional().nullable(),
  DescuentoEfectivo: z.number().min(0).optional().nullable(),
  GastosAdicionales: z.number().min(0).optional().nullable(),
});

// Schema para cambiar estatus
export const updateEstatusSchema = z.object({
  Estatus: EstatusPresupuesto,
});

// Schema para agregar detalle a presupuesto existente
export const addDetalleSchema = createDetalleSchema;

// Schema para actualizar detalle
export const updateDetalleSchema = z.object({
  Cantidad: z.number().min(1).optional(),
  PeriodoRenta: z.number().min(1).optional().nullable(),
  PrecioUnitario: z.number().min(0).optional(),
  DescuentoPorcentaje: z.number().min(0).max(100).optional().nullable(),
  DescuentoEfectivo: z.number().min(0).optional().nullable(),
  Descripcion: z.string().max(500).optional().nullable(),
});

// Schemas de parámetros
export const presupuestoIdParamSchema = z.object({
  PresupuestoID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

export const detalleIdParamSchema = z.object({
  DetalleID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

export const clienteIdParamSchema = z.object({
  ClienteID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

// Types
export type CreatePresupuestoDto = z.infer<typeof createPresupuestoSchema>;
export type UpdatePresupuestoDto = z.infer<typeof updatePresupuestoSchema>;
export type UpdateEstatusDto = z.infer<typeof updateEstatusSchema>;
export type CreateDetalleDto = z.infer<typeof createDetalleSchema>;
export type AddDetalleDto = z.infer<typeof addDetalleSchema>;
export type UpdateDetalleDto = z.infer<typeof updateDetalleSchema>;
