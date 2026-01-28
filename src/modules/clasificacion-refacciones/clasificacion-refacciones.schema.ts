import { z } from 'zod';

export const createClasificacionRefaccionSchema = z.object({
  Codigo: z.string().min(1, 'El código es requerido').max(10, 'El código no puede tener más de 10 caracteres'),
  NombreClasificacion: z.string().min(1, 'El nombre de la clasificación es requerido'),
  Observaciones: z.string().optional(),
});

export const updateClasificacionRefaccionSchema = z.object({
  Codigo: z.string().min(1, 'El código es requerido').max(10, 'El código no puede tener más de 10 caracteres').optional(),
  NombreClasificacion: z.string().min(1, 'El nombre de la clasificación es requerido').optional(),
  Observaciones: z.string().optional(),
});

export const clasificacionRefaccionIdParamSchema = z.object({
  ClasificacionRefaccionID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

export type CreateClasificacionRefaccionDto = z.infer<typeof createClasificacionRefaccionSchema>;
export type UpdateClasificacionRefaccionDto = z.infer<typeof updateClasificacionRefaccionSchema>;
