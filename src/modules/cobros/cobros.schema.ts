import { z } from 'zod';

// =============================================
// ENUMS
// =============================================

export const EstatusCobroEnum = z.enum([
  'PENDIENTE',
  'PAGADO',
  'PARCIAL',
  'VENCIDO',
  'REGALADO',
  'PROMOCION',
  'CANCELADO',
]);

export const MotivoCobroEspecialEnum = z.enum([
  'REGALO',
  'PROMOCION',
  'DESCUENTO',
  'BONIFICACION',
  'CORTESIA',
]);

export const TipoTiempoEnum = z.enum(['ANIOS', 'MESES', 'SEMANAS', 'DIAS']);

export const FrecuenciaCobroEnum = z.enum([
  'SEMANAL',
  'QUINCENAL',
  'MENSUAL',
  'BIMESTRAL',
  'TRIMESTRAL',
  'SEMESTRAL',
  'ANUAL',
]);

// =============================================
// SCHEMAS DE PARÁMETROS
// =============================================

export const cobroIdParamSchema = z.object({
  CobroID: z.string().regex(/^\d+$/, 'El CobroID debe ser un número').transform(Number),
});

export const contratoIdParamSchema = z.object({
  ContratoID: z.string().regex(/^\d+$/, 'El ContratoID debe ser un número').transform(Number),
});

// =============================================
// SCHEMAS DE QUERY
// =============================================

export const cobrosQuerySchema = z.object({
  ContratoID: z.string().regex(/^\d+$/).transform(Number).optional(),
  ClienteID: z.string().regex(/^\d+$/).transform(Number).optional(),
  Estatus: EstatusCobroEnum.optional(),
  FechaDesde: z.string().optional(),
  FechaHasta: z.string().optional(),
  Vencidos: z.string().transform((val) => val === 'true').optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});

export type CobrosQueryDto = z.infer<typeof cobrosQuerySchema>;

// =============================================
// SCHEMAS DE CONFIGURACIÓN DE COBROS
// =============================================

export const configurarCobrosSchema = z.object({
  FechaInicialCobros: z.string({ required_error: 'La fecha inicial de cobros es requerida' }),
  MontoCobro: z.number({ required_error: 'El monto del cobro es requerido' }).min(0, 'El monto debe ser mayor o igual a 0'),
  TipoTiempoContrato: TipoTiempoEnum,
  TiempoContrato: z.number({ required_error: 'El tiempo del contrato es requerido' }).min(1, 'El tiempo debe ser al menos 1'),
  FrecuenciaCobro: FrecuenciaCobroEnum,
  TiempoFrecuencia: z.number().min(1).default(1),
  Observaciones: z.string().max(500).optional().nullable(),
  UsuarioID: z.number({ required_error: 'El UsuarioID es requerido' }),
});

export type ConfigurarCobrosDto = z.infer<typeof configurarCobrosSchema>;

// =============================================
// SCHEMAS DE ACCIONES SOBRE COBROS
// =============================================

// Registrar pago completo
export const registrarPagoSchema = z.object({
  MetodoPagoID: z.number({ required_error: 'El método de pago es requerido' }),
  MontoPagado: z.number({ required_error: 'El monto pagado es requerido' }).min(0),
  FechaPago: z.string().optional(), // Si no se proporciona, se usa la fecha actual
  Referencia: z.string().max(100).optional().nullable(),
  Observaciones: z.string().max(500).optional().nullable(),
  UsuarioID: z.number({ required_error: 'El UsuarioID es requerido' }),
});

export type RegistrarPagoDto = z.infer<typeof registrarPagoSchema>;

// Registrar pago parcial
export const registrarPagoParcialSchema = z.object({
  MetodoPagoID: z.number({ required_error: 'El método de pago es requerido' }),
  MontoPagado: z.number({ required_error: 'El monto pagado es requerido' }).min(0.01, 'El monto debe ser mayor a 0'),
  FechaPago: z.string().optional(),
  Referencia: z.string().max(100).optional().nullable(),
  Observaciones: z.string().max(500).optional().nullable(),
  UsuarioID: z.number({ required_error: 'El UsuarioID es requerido' }),
});

// Aplicar regalo (cobro gratis)
export const aplicarRegaloSchema = z.object({
  MotivoEspecial: MotivoCobroEspecialEnum.default('REGALO'),
  DescripcionMotivo: z.string().max(255, 'La descripción no puede exceder 255 caracteres').optional().nullable(),
  Observaciones: z.string().max(500).optional().nullable(),
  UsuarioID: z.number({ required_error: 'El UsuarioID es requerido' }),
});

export type AplicarRegaloDto = z.infer<typeof aplicarRegaloSchema>;

// Aplicar descuento/promoción
export const aplicarDescuentoSchema = z.object({
  TipoDescuento: z.enum(['PORCENTAJE', 'MONTO']),
  ValorDescuento: z.number({ required_error: 'El valor del descuento es requerido' }).min(0.01),
  MotivoEspecial: MotivoCobroEspecialEnum.optional(),
  DescripcionMotivo: z.string().max(255).optional().nullable(),
  Observaciones: z.string().max(500).optional().nullable(),
  UsuarioID: z.number({ required_error: 'El UsuarioID es requerido' }),
});

export type AplicarDescuentoDto = z.infer<typeof aplicarDescuentoSchema>;

// Cancelar cobro
export const cancelarCobroSchema = z.object({
  MotivoCancelacion: z.string({ required_error: 'El motivo de cancelación es requerido' }).max(255),
  Observaciones: z.string().max(500).optional().nullable(),
  UsuarioID: z.number({ required_error: 'El UsuarioID es requerido' }),
});

export type CancelarCobroDto = z.infer<typeof cancelarCobroSchema>;

// Pagar con descuento (descuento + pago en una sola operación)
export const pagarConDescuentoSchema = z.object({
  TipoDescuento: z.enum(['PORCENTAJE', 'MONTO']),
  ValorDescuento: z.number({ required_error: 'El valor del descuento es requerido' }).min(0),
  MetodoPagoID: z.number({ required_error: 'El método de pago es requerido' }),
  FechaPago: z.string().optional(),
  Referencia: z.string().max(100).optional().nullable(),
  MotivoEspecial: MotivoCobroEspecialEnum.optional(),
  DescripcionMotivo: z.string().max(255).optional().nullable(),
  Observaciones: z.string().max(500).optional().nullable(),
  UsuarioID: z.number({ required_error: 'El UsuarioID es requerido' }),
});

export type PagarConDescuentoDto = z.infer<typeof pagarConDescuentoSchema>;

// Modificar monto de cobro
export const modificarMontoSchema = z.object({
  MontoNuevo: z.number({ required_error: 'El nuevo monto es requerido' }).min(0),
  Motivo: z.string().max(255).optional().nullable(),
  UsuarioID: z.number({ required_error: 'El UsuarioID es requerido' }),
});

export type ModificarMontoDto = z.infer<typeof modificarMontoSchema>;

// =============================================
// SCHEMAS DE GENERACIÓN MASIVA
// =============================================

export const generarCobrosSchema = z.object({
  UsuarioID: z.number({ required_error: 'El UsuarioID es requerido' }),
});

// =============================================
// TYPES EXPORTADOS
// =============================================

export type CobroIdParam = z.infer<typeof cobroIdParamSchema>;
export type ContratoIdParam = z.infer<typeof contratoIdParamSchema>;
