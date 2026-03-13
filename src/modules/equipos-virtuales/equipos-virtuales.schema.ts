import { z } from 'zod';

// Schema para detalle de equipo virtual (crear)
export const createEquipoVirtualDetalleSchema = z.object({
  RefaccionID: z.number({ required_error: 'RefaccionID es requerido' }),
  Cantidad: z.number({ required_error: 'Cantidad es requerida' }).min(1, 'Cantidad mínima es 1'),
  CostoUnitario: z.number().min(0, 'CostoUnitario debe ser mayor o igual a 0').default(0),
  Descuento: z.number().min(0).max(100, 'Descuento máximo es 100%').default(0),
  Otros: z.number().min(0, 'Otros debe ser mayor o igual a 0').default(0),
  CostoImportacion: z.number().min(0, 'CostoImportacion debe ser mayor o igual a 0').default(0),
  IVA: z.number().min(0).max(100, 'IVA máximo es 100%').default(16),
  CantidadPiezasPorEquipo: z.number().min(1, 'Mínimo 1 pieza por equipo').default(1),
  NumeroEquipos: z.number().min(1, 'Mínimo 1 equipo').default(1),
  CostoAnterior: z.number().min(0).default(0),
});

// Schema para equipo virtual (crear)
export const createEquipoVirtualSchema = z.object({
  Nombre: z.string({ required_error: 'Nombre es requerido' }).max(255, 'Nombre máximo 255 caracteres'),
  Descripcion: z.string().max(500, 'Descripción máximo 500 caracteres').optional(),
  Codigo: z.string().max(50, 'Código máximo 50 caracteres').optional(),
  Detalles: z.array(createEquipoVirtualDetalleSchema).min(1, 'Debe incluir al menos una refacción'),
});

// Schema para detalle de equipo virtual (actualizar)
export const updateEquipoVirtualDetalleSchema = z.object({
  DetalleID: z.number().optional(),
  RefaccionID: z.number({ required_error: 'RefaccionID es requerido' }),
  Cantidad: z.number({ required_error: 'Cantidad es requerida' }).min(1, 'Cantidad mínima es 1'),
  CostoUnitario: z.number().min(0, 'CostoUnitario debe ser mayor o igual a 0').default(0),
  Descuento: z.number().min(0).max(100, 'Descuento máximo es 100%').default(0),
  Otros: z.number().min(0, 'Otros debe ser mayor o igual a 0').default(0),
  CostoImportacion: z.number().min(0, 'CostoImportacion debe ser mayor o igual a 0').default(0),
  IVA: z.number().min(0).max(100, 'IVA máximo es 100%').default(16),
  CantidadPiezasPorEquipo: z.number().min(1, 'Mínimo 1 pieza por equipo').default(1),
  NumeroEquipos: z.number().min(1, 'Mínimo 1 equipo').default(1),
  CostoAnterior: z.number().min(0).default(0),
});

// Schema para equipo virtual (actualizar)
export const updateEquipoVirtualSchema = z.object({
  Nombre: z.string().max(255, 'Nombre máximo 255 caracteres').optional(),
  Descripcion: z.string().max(500, 'Descripción máximo 500 caracteres').optional().nullable(),
  Codigo: z.string().max(50, 'Código máximo 50 caracteres').optional().nullable(),
  Detalles: z.array(updateEquipoVirtualDetalleSchema).optional(),
  DetallesEliminar: z.array(z.number()).optional(),
});

// Schema para params
export const equipoVirtualIdParamSchema = z.object({
  EquipoVirtualID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

// Schema para búsqueda
export const searchEquipoVirtualQuerySchema = z.object({
  q: z.string().optional(),
});

// Types
export type CreateEquipoVirtualDetalleDto = z.infer<typeof createEquipoVirtualDetalleSchema>;
export type CreateEquipoVirtualDto = z.infer<typeof createEquipoVirtualSchema>;
export type UpdateEquipoVirtualDetalleDto = z.infer<typeof updateEquipoVirtualDetalleSchema>;
export type UpdateEquipoVirtualDto = z.infer<typeof updateEquipoVirtualSchema>;
