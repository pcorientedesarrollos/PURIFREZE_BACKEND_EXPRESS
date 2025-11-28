import { z } from 'zod';

export const createRefaccionSchema = z.object({
  ClasificacionRefaccionID: z.number({ required_error: 'La clasificación es requerida' }),
  UnidadID: z.number({ required_error: 'La unidad es requerida' }),
  NombrePieza: z.string().min(1, 'El nombre de la pieza es requerido').max(255),
  NombreCorto: z.string().max(255),
  Modelo: z.string().max(255),
  Codigo: z.string().max(255),
  Observaciones: z.string().max(255).optional(),
});

export const updateRefaccionSchema = z.object({
  ClasificacionRefaccionID: z.number().optional(),
  UnidadID: z.number().optional(),
  NombrePieza: z.string().min(1).max(255).optional(),
  NombreCorto: z.string().max(255).optional(),
  Modelo: z.string().max(255).optional(),
  Codigo: z.string().max(255).optional(),
  Observaciones: z.string().max(255).optional(),
});

export const refaccionIdParamSchema = z.object({
  RefaccionID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

export type CreateRefaccionDto = z.infer<typeof createRefaccionSchema>;
export type UpdateRefaccionDto = z.infer<typeof updateRefaccionSchema>;
