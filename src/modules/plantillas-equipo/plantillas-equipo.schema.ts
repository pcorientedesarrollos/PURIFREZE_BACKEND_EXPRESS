import { z } from 'zod';

// Schema para detalle de plantilla (crear)
export const createPlantillaDetalleSchema = z.object({
  RefaccionID: z.number({ required_error: 'RefaccionID es requerido' }),
  Cantidad: z.number({ required_error: 'Cantidad es requerida' }).min(1, 'Cantidad mínima es 1'),
});

// Schema para plantilla (crear)
export const createPlantillaEquipoSchema = z.object({
  Codigo: z.string().max(50, 'Código máximo 50 caracteres').optional(),
  NombreEquipo: z.string({ required_error: 'NombreEquipo es requerido' }).max(255, 'NombreEquipo máximo 255 caracteres'),
  Observaciones: z.string().max(500, 'Observaciones máximo 500 caracteres').optional(),
  EsExterno: z.boolean().default(false),
  PorcentajeVenta: z.number().min(0, 'PorcentajeVenta debe ser mayor o igual a 0').default(35),
  PorcentajeRenta: z.number().min(0, 'PorcentajeRenta debe ser mayor o igual a 0').default(15),
  Detalles: z.array(createPlantillaDetalleSchema).min(1, 'Debe incluir al menos una refacción'),
});

// Schema para detalle de plantilla (actualizar)
export const updatePlantillaDetalleSchema = z.object({
  PlantillaDetalleID: z.number().optional(),
  RefaccionID: z.number({ required_error: 'RefaccionID es requerido' }),
  Cantidad: z.number({ required_error: 'Cantidad es requerida' }).min(1, 'Cantidad mínima es 1'),
});

// Schema para plantilla (actualizar)
export const updatePlantillaEquipoSchema = z.object({
  Codigo: z.string().max(50, 'Código máximo 50 caracteres').optional().nullable(),
  NombreEquipo: z.string().max(255, 'NombreEquipo máximo 255 caracteres').optional(),
  Observaciones: z.string().max(500, 'Observaciones máximo 500 caracteres').optional().nullable(),
  EsExterno: z.boolean().optional(),
  PorcentajeVenta: z.number().min(0, 'PorcentajeVenta debe ser mayor o igual a 0').optional(),
  PorcentajeRenta: z.number().min(0, 'PorcentajeRenta debe ser mayor o igual a 0').optional(),
  Detalles: z.array(updatePlantillaDetalleSchema).optional(),
  DetallesEliminar: z.array(z.number()).optional(),
});

// Schema para params
export const plantillaEquipoIdParamSchema = z.object({
  PlantillaEquipoID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

// Schema para búsqueda
export const searchPlantillaQuerySchema = z.object({
  q: z.string().optional(),
  tipo: z.enum(['todos', 'interno', 'externo']).optional(),
});

// Types
export type CreatePlantillaDetalleDto = z.infer<typeof createPlantillaDetalleSchema>;
export type CreatePlantillaEquipoDto = z.infer<typeof createPlantillaEquipoSchema>;
export type UpdatePlantillaDetalleDto = z.infer<typeof updatePlantillaDetalleSchema>;
export type UpdatePlantillaEquipoDto = z.infer<typeof updatePlantillaEquipoSchema>;
