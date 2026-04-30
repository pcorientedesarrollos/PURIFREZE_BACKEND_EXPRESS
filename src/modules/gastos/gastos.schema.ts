import { z } from 'zod';

const detalleSchema = z.object({
    CatalogoGastoID: z.number().int().positive().optional().nullable(),
    Concepto: z.string().min(1, 'El concepto es requerido').max(255),
    Monto: z.number().positive('El monto debe ser positivo'),
});

export const createGastoSchema = z.object({
    Fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha debe tener formato YYYY-MM-DD'),
    Descripcion: z.string().min(1, 'La descripción es requerida').max(500),
    Referencia: z.string().max(100).optional(),
    UsuarioID: z.number().int().optional(),
    Detalles: z.array(detalleSchema).min(1, 'Se requiere al menos un detalle'),
});

export const updateGastoSchema = z.object({
    Fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    Descripcion: z.string().min(1).max(500).optional(),
    Referencia: z.string().max(100).optional().nullable(),
    Detalles: z.array(detalleSchema).min(1).optional(),
});

export const gastoIdParamSchema = z.object({
    GastoID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

export const gastosQuerySchema = z.object({
    fechaDesde: z.string().optional(),
    fechaHasta: z.string().optional(),
    catalogoGastoId: z.string().regex(/^\d+$/).transform(Number).optional(),
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    pageSize: z.string().regex(/^\d+$/).transform(Number).optional(),
    search: z.string().optional(),
});

export type CreateGastoDto = z.infer<typeof createGastoSchema>;
export type UpdateGastoDto = z.infer<typeof updateGastoSchema>;
export type GastosQueryDto = z.infer<typeof gastosQuerySchema>;
