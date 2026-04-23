import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════════════

export const EstadoNotaCreditoEnum = z.enum(['DISPONIBLE', 'APLICADO']);

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMAS PARA CREAR NOTA DE CRÉDITO
// ═══════════════════════════════════════════════════════════════════════════

export const createNotaCreditoSchema = z.object({
  ProveedorID: z.number({ required_error: 'ProveedorID es requerido' }),
  Monto: z.number({ required_error: 'Monto es requerido' }).positive('El monto debe ser positivo'),
  Fecha: z.string({ required_error: 'Fecha es requerida' }),
  NumeroReferencia: z.string().max(100, 'Número de referencia máximo 100 caracteres').optional(),
  NumeroFactura: z.string().max(100, 'Número de factura máximo 100 caracteres').optional(),
  NumeroCredito: z.string().max(100, 'Número de crédito máximo 100 caracteres').optional(),
  Descripcion: z.string({ required_error: 'Descripción es requerida' }).max(500, 'Descripción máximo 500 caracteres'),
  Observaciones: z.string().max(1000, 'Observaciones máximo 1000 caracteres').optional(),
});

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMAS PARA ACTUALIZAR NOTA DE CRÉDITO
// ═══════════════════════════════════════════════════════════════════════════

export const updateNotaCreditoSchema = z.object({
  Monto: z.number().positive('El monto debe ser positivo').optional(),
  Fecha: z.string().optional(),
  NumeroReferencia: z.string().max(100, 'Número de referencia máximo 100 caracteres').optional().nullable(),
  NumeroFactura: z.string().max(100, 'Número de factura máximo 100 caracteres').optional().nullable(),
  NumeroCredito: z.string().max(100, 'Número de crédito máximo 100 caracteres').optional().nullable(),
  Descripcion: z.string().max(500, 'Descripción máximo 500 caracteres').optional(),
  Observaciones: z.string().max(1000, 'Observaciones máximo 1000 caracteres').optional().nullable(),
});

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMAS PARA APLICAR NOTA DE CRÉDITO
// ═══════════════════════════════════════════════════════════════════════════

export const aplicarNotaCreditoSchema = z.object({
  CompraEncabezadoID: z.number({ required_error: 'CompraEncabezadoID es requerido' }),
  MontoAplicado: z.number().positive('El monto debe ser positivo').optional(), // Si no se especifica, aplica el monto completo
});

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMAS PARA PARÁMETROS DE RUTA
// ═══════════════════════════════════════════════════════════════════════════

export const notaCreditoIdParamSchema = z.object({
  NotaCreditoID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

export const proveedorIdParamSchema = z.object({
  ProveedorID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMAS PARA QUERY PARAMS
// ═══════════════════════════════════════════════════════════════════════════

export const searchNotasCreditoQuerySchema = z.object({
  proveedorId: z.string().regex(/^\d+$/, 'proveedorId debe ser un número válido').transform(Number).optional(),
  estado: EstadoNotaCreditoEnum.optional(),
  fechaDesde: z.string().optional(),
  fechaHasta: z.string().optional(),
});

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS EXPORTADOS
// ═══════════════════════════════════════════════════════════════════════════

export type CreateNotaCreditoDto = z.infer<typeof createNotaCreditoSchema>;
export type UpdateNotaCreditoDto = z.infer<typeof updateNotaCreditoSchema>;
export type AplicarNotaCreditoDto = z.infer<typeof aplicarNotaCreditoSchema>;
export type SearchNotasCreditoQuery = z.infer<typeof searchNotasCreditoQuerySchema>;
