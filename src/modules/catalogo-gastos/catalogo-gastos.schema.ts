import { z } from 'zod';

const PERIODICIDADES = ['semanal', 'quincenal', 'mensual', 'bimestral', 'trimestral', 'semestral', 'anual', 'eventual'] as const;

export const createCatalogoGastoSchema = z.object({
    ParentID: z.number().int().positive().optional().nullable(),
    Nivel: z.number().int().min(1).max(3),
    Nombre: z.string().min(1, 'El nombre es requerido').max(150),
    Descripcion: z.string().max(255).optional().nullable(),
    Periodicidad: z.enum(PERIODICIDADES).optional().nullable(),
    EsOpcional: z.boolean().optional().default(false),
    SATCuentaID: z.number().int().positive().optional().nullable(),
});

export const updateCatalogoGastoSchema = z.object({
    Nombre: z.string().min(1).max(150).optional(),
    Descripcion: z.string().max(255).optional().nullable(),
    Periodicidad: z.enum(PERIODICIDADES).optional().nullable(),
    EsOpcional: z.boolean().optional(),
    SATCuentaID: z.number().int().positive().optional().nullable(),
});

export const catalogoGastoIdParamSchema = z.object({
    CatalogoGastoID: z
        .string()
        .regex(/^\d+$/, 'ID inválido')
        .transform(Number),
});

export const nivelParamSchema = z.object({
    nivel: z
        .string()
        .regex(/^[123]$/, 'Nivel debe ser 1, 2 o 3')
        .transform(Number),
});

export const parentIdParamSchema = z.object({
    parentId: z
        .string()
        .regex(/^\d+$/, 'ID inválido')
        .transform(Number),
});

export type CreateCatalogoGastoDto = z.infer<typeof createCatalogoGastoSchema>;
export type UpdateCatalogoGastoDto = z.infer<typeof updateCatalogoGastoSchema>;
