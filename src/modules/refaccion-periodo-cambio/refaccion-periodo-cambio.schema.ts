/**
 * ============================================================================
 * SCHEMA: Refacción Periodo de Cambio
 * ============================================================================
 * Validaciones Zod para el módulo de periodos de cambio de refacciones.
 * ============================================================================
 */

import { z } from 'zod';

// ============================================================================
// SCHEMAS DE VALIDACIÓN
// ============================================================================

/**
 * Schema para crear un periodo de cambio
 */
export const createRefaccionPeriodoCambioSchema = z.object({
    RefaccionID: z.number({
        required_error: 'RefaccionID es requerido',
        invalid_type_error: 'RefaccionID debe ser un número'
    }).int().positive('RefaccionID debe ser positivo'),

    PeriodoContrato: z.number({
        required_error: 'PeriodoContrato es requerido',
        invalid_type_error: 'PeriodoContrato debe ser un número'
    }).int().positive('PeriodoContrato debe ser positivo'),

    PeriodoCambioMeses: z.number({
        required_error: 'PeriodoCambioMeses es requerido',
        invalid_type_error: 'PeriodoCambioMeses debe ser un número'
    }).int().positive('PeriodoCambioMeses debe ser positivo'),

    Observaciones: z.string().max(500, 'Observaciones máximo 500 caracteres').optional()
}).refine(
    (data) => data.PeriodoCambioMeses >= data.PeriodoContrato,
    { message: 'PeriodoCambioMeses debe ser mayor o igual a PeriodoContrato' }
).refine(
    (data) => data.PeriodoCambioMeses % data.PeriodoContrato === 0,
    { message: 'PeriodoCambioMeses debe ser múltiplo de PeriodoContrato' }
);

/**
 * Schema para actualizar un periodo de cambio
 */
export const updateRefaccionPeriodoCambioSchema = z.object({
    PeriodoCambioMeses: z.number().int().positive('PeriodoCambioMeses debe ser positivo').optional(),
    Observaciones: z.string().max(500, 'Observaciones máximo 500 caracteres').optional(),
    IsActive: z.number().int().min(0).max(1).optional()
});

/**
 * Schema para upsert de periodos (crear/actualizar múltiples)
 */
export const upsertPeriodosSchema = z.object({
    RefaccionID: z.number({
        required_error: 'RefaccionID es requerido'
    }).int().positive(),

    Periodos: z.array(z.object({
        PeriodoContrato: z.number().int().positive(),
        PeriodoCambioMeses: z.number().int().positive(),
        Observaciones: z.string().max(500).optional()
    })).min(1, 'Debe incluir al menos un periodo')
});

/**
 * Schema para ID en params
 */
export const refaccionPeriodoCambioIdParamSchema = z.object({
    id: z.string().regex(/^\d+$/, 'ID debe ser un número').transform(Number)
});

/**
 * Schema para RefaccionID en params
 */
export const refaccionIdParamSchema = z.object({
    refaccionId: z.string().regex(/^\d+$/, 'RefaccionID debe ser un número').transform(Number)
});

/**
 * Schema para filtros de búsqueda
 */
export const searchPeriodosSchema = z.object({
    search: z.string().optional(),
    refaccionId: z.string().regex(/^\d+$/).transform(Number).optional(),
    periodoContrato: z.string().regex(/^\d+$/).transform(Number).optional(),
    isActive: z.string().regex(/^[01]$/).transform(Number).optional(),
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    pageSize: z.string().regex(/^\d+$/).transform(Number).optional()
});

// ============================================================================
// TIPOS INFERIDOS
// ============================================================================

export type CreateRefaccionPeriodoCambioDto = z.infer<typeof createRefaccionPeriodoCambioSchema>;
export type UpdateRefaccionPeriodoCambioDto = z.infer<typeof updateRefaccionPeriodoCambioSchema>;
export type UpsertPeriodosDto = z.infer<typeof upsertPeriodosSchema>;
export type SearchPeriodosQuery = z.infer<typeof searchPeriodosSchema>;
