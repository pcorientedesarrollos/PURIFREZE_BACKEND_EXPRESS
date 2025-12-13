import { z } from 'zod';

// Enums
export const EstatusContrato = z.enum(['EN_REVISION', 'ACTIVO', 'VENCIDO', 'CANCELADO', 'RENOVADO']);
export const CondicionesPago = z.enum(['MENSUAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL']);
export const ModalidadContrato = z.enum(['VENTA', 'RENTA', 'COMODATO', 'MANTENIMIENTO']);
export const EstatusContratoEquipo = z.enum(['PENDIENTE', 'INSTALADO', 'RETIRADO']);
export const TipoServicioContrato = z.enum(['INSTALACION', 'MANTENIMIENTO_PREVENTIVO', 'MANTENIMIENTO_CORRECTIVO', 'REPARACION', 'DESMONTAJE']);
export const EstatusServicio = z.enum(['PROGRAMADO', 'EN_PROCESO', 'COMPLETADO', 'CANCELADO']);

// Schema para crear contrato desde presupuesto aprobado
export const createContratoSchema = z.object({
  PresupuestoID: z.number({ required_error: 'El PresupuestoID es requerido' }),
  FechaInicio: z.string({ required_error: 'La fecha de inicio es requerida' }),
  FechaFin: z.string({ required_error: 'La fecha de fin es requerida' }),
  CondicionesPago: CondicionesPago.default('MENSUAL'),
  DiaPago: z.number().min(1).max(28).default(1),
  FrecuenciaMantenimiento: z.number().min(1).optional().nullable(),
  PenalizacionCancelacion: z.number().min(0).max(100).optional().nullable(),
  Observaciones: z.string().max(500).optional().nullable(),
  UsuarioID: z.number({ required_error: 'El UsuarioID es requerido' }),
});

// Schema para actualizar contrato (solo en revisión)
export const updateContratoSchema = z.object({
  FechaInicio: z.string().optional(),
  FechaFin: z.string().optional(),
  CondicionesPago: CondicionesPago.optional(),
  DiaPago: z.number().min(1).max(28).optional(),
  FrecuenciaMantenimiento: z.number().min(1).optional().nullable(),
  PenalizacionCancelacion: z.number().min(0).max(100).optional().nullable(),
  Observaciones: z.string().max(500).optional().nullable(),
});

// Schema para agregar equipo al contrato (nuevo, no viene del presupuesto)
export const addEquipoSchema = z.object({
  EquipoID: z.number({ required_error: 'El EquipoID es requerido' }),
  Modalidad: ModalidadContrato,
  PrecioUnitario: z.number().min(0).default(0),
  PeriodoMeses: z.number().min(1).optional().nullable(),
  Observaciones: z.string().max(500).optional().nullable(),
});

// Schema para asignar equipo físico a un item pendiente del contrato
export const asignarEquipoSchema = z.object({
  EquipoID: z.number({ required_error: 'El EquipoID es requerido' }),
  Observaciones: z.string().max(500).optional().nullable(),
});

// Schema para actualizar equipo del contrato
export const updateEquipoContratoSchema = z.object({
  PrecioUnitario: z.number().min(0).optional(),
  PeriodoMeses: z.number().min(1).optional().nullable(),
  Observaciones: z.string().max(500).optional().nullable(),
});

// Schema para programar servicio
export const createServicioSchema = z.object({
  TipoServicio: TipoServicioContrato,
  FechaProgramada: z.string({ required_error: 'La fecha programada es requerida' }),
  TecnicoID: z.number().optional().nullable(),
  Costo: z.number().min(0).default(0),
  Observaciones: z.string().max(500).optional().nullable(),
  UsuarioID: z.number().optional().nullable(),
});

// Schema para actualizar servicio
export const updateServicioSchema = z.object({
  FechaProgramada: z.string().optional(),
  TecnicoID: z.number().optional().nullable(),
  Costo: z.number().min(0).optional(),
  Observaciones: z.string().max(500).optional().nullable(),
  Estatus: EstatusServicio.optional(),
});

// Schema para completar servicio
export const completarServicioSchema = z.object({
  FechaEjecucion: z.string().optional(),
  Observaciones: z.string().max(500).optional().nullable(),
  Costo: z.number().min(0).optional(),
});

// Schema para cancelar contrato
export const cancelarContratoSchema = z.object({
  MotivosCancelacion: z.string().max(500, 'El motivo no puede exceder 500 caracteres'),
  UsuarioID: z.number({ required_error: 'El UsuarioID es requerido' }),
});

// Schema para renovar contrato
export const renovarContratoSchema = z.object({
  FechaInicio: z.string({ required_error: 'La fecha de inicio es requerida' }),
  FechaFin: z.string({ required_error: 'La fecha de fin es requerida' }),
  CondicionesPago: CondicionesPago.optional(),
  DiaPago: z.number().min(1).max(28).optional(),
  FrecuenciaMantenimiento: z.number().min(1).optional().nullable(),
  PenalizacionCancelacion: z.number().min(0).max(100).optional().nullable(),
  Observaciones: z.string().max(500).optional().nullable(),
  UsuarioID: z.number({ required_error: 'El UsuarioID es requerido' }),
});

// Schema para actualizar monto
export const actualizarMontoSchema = z.object({
  MontoTotal: z.number().min(0, 'El monto debe ser mayor o igual a 0'),
  UsuarioID: z.number({ required_error: 'El UsuarioID es requerido' }),
});

// Schemas de parámetros
export const contratoIdParamSchema = z.object({
  ContratoID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

export const contratoEquipoIdParamSchema = z.object({
  ContratoEquipoID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

export const servicioIdParamSchema = z.object({
  ServicioID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

export const clienteIdParamSchema = z.object({
  ClienteID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

// Query schemas
export const contratosQuerySchema = z.object({
  estatus: EstatusContrato.optional(),
  clienteId: z.string().regex(/^\d+$/).transform(Number).optional(),
  fechaDesde: z.string().optional(),
  fechaHasta: z.string().optional(),
});

export const serviciosQuerySchema = z.object({
  estatus: EstatusServicio.optional(),
  tecnicoId: z.string().regex(/^\d+$/).transform(Number).optional(),
  fechaDesde: z.string().optional(),
  fechaHasta: z.string().optional(),
});

// Types
export type CreateContratoDto = z.infer<typeof createContratoSchema>;
export type UpdateContratoDto = z.infer<typeof updateContratoSchema>;
export type AddEquipoDto = z.infer<typeof addEquipoSchema>;
export type AsignarEquipoDto = z.infer<typeof asignarEquipoSchema>;
export type UpdateEquipoContratoDto = z.infer<typeof updateEquipoContratoSchema>;
export type CreateServicioDto = z.infer<typeof createServicioSchema>;
export type UpdateServicioDto = z.infer<typeof updateServicioSchema>;
export type CompletarServicioDto = z.infer<typeof completarServicioSchema>;
export type CancelarContratoDto = z.infer<typeof cancelarContratoSchema>;
export type RenovarContratoDto = z.infer<typeof renovarContratoSchema>;
export type ActualizarMontoDto = z.infer<typeof actualizarMontoSchema>;
export type ContratosQueryDto = z.infer<typeof contratosQuerySchema>;
export type ServiciosQueryDto = z.infer<typeof serviciosQuerySchema>;
