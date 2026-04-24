import { z } from 'zod';

export const createGastoCategoriaSchema = z.object({
    Nombre: z.string().min(1, 'El nombre es requerido').max(100),
    Descripcion: z.string().max(255).optional(),
    Grupo: z.string().max(50).optional(),
});

export const updateGastoCategoriaSchema = z.object({
    Nombre: z.string().min(1).max(100).optional(),
    Descripcion: z.string().max(255).optional().nullable(),
    Grupo: z.string().max(50).optional().nullable(),
});

export const gastoCategoriaIdParamSchema = z.object({
    CategoriaGastoID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

export type CreateGastoCategoriaDto = z.infer<typeof createGastoCategoriaSchema>;
export type UpdateGastoCategoriaDto = z.infer<typeof updateGastoCategoriaSchema>;
