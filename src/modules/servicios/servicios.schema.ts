import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════════════

export const TipoServicioEnum = z.enum(['INSTALACION', 'MANTENIMIENTO', 'REPARACION', 'DESINSTALACION']);
export const EstatusServicioEnum = z.enum(['POR_CONFIRMAR', 'PENDIENTE', 'CONFIRMADO', 'EN_PROCESO', 'REALIZADO', 'CANCELADO']);
export const OrigenInventarioEnum = z.enum(['TECNICO', 'BODEGA']);
export const AccionDesinstalacionEnum = z.enum(['PIEZAS_INDIVIDUALES', 'EQUIPO_COMPLETO']);
export const DestinoRefaccionEnum = z.enum(['INVENTARIO', 'DANADA', 'PERMANECE']);
export const MotivoDanoEnum = z.enum(['Defecto_Fabrica', 'Mal_Uso', 'Desgaste_Normal', 'Accidente', 'Otro']);

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMAS PARA CREAR SERVICIO
// ═══════════════════════════════════════════════════════════════════════════

export const createServicioSchema = z.object({
  ContratoID: z.number().optional().nullable(),
  ClienteEquipoID: z.number().optional().nullable(),
  TipoServicio: TipoServicioEnum,
  FechaProgramada: z.string({ required_error: 'FechaProgramada es requerida' }),
  HoraProgramada: z.string().optional(),
  TecnicoID: z.number().optional(),
  OrigenInventario: OrigenInventarioEnum.optional().default('TECNICO'),
  ObservacionesGenerales: z.string().max(1000, 'Observaciones máximo 1000 caracteres').optional(),

  // Equipos a incluir en el servicio (IDs de contratos_equipos O clientes_equipos)
  EquiposIDs: z.array(z.number()).optional(),
}).refine(
  (data) => data.ContratoID || data.ClienteEquipoID || (data.EquiposIDs && data.EquiposIDs.length > 0),
  { message: 'Debe proporcionar ContratoID, ClienteEquipoID o al menos un equipo en EquiposIDs' }
);

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMAS PARA ACTUALIZAR SERVICIO
// ═══════════════════════════════════════════════════════════════════════════

export const updateServicioSchema = z.object({
  FechaProgramada: z.string().optional(),
  HoraProgramada: z.string().optional(),
  TecnicoID: z.number().optional().nullable(),
  OrigenInventario: OrigenInventarioEnum.optional(),
  ObservacionesAntes: z.string().max(500, 'Observaciones máximo 500 caracteres').optional().nullable(),
  ObservacionesDespues: z.string().max(500, 'Observaciones máximo 500 caracteres').optional().nullable(),
  ObservacionesGenerales: z.string().max(1000, 'Observaciones máximo 1000 caracteres').optional().nullable(),
});

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMAS PARA CAMBIO DE ESTATUS
// ═══════════════════════════════════════════════════════════════════════════

export const cambiarEstatusSchema = z.object({
  Estatus: EstatusServicioEnum,
  TecnicoID: z.number().optional().nullable(),
  Observaciones: z.string().max(500, 'Observaciones máximo 500 caracteres').optional(),
});

export const cancelarServicioSchema = z.object({
  MotivoCancelacion: z.string({ required_error: 'Motivo de cancelación es requerido' }).max(255, 'Motivo máximo 255 caracteres'),
});

export const reagendarServicioSchema = z.object({
  NuevaFechaProgramada: z.string({ required_error: 'Nueva fecha es requerida' }),
  NuevaHoraProgramada: z.string().optional(),
  MotivoReagendamiento: z.string({ required_error: 'Motivo de reagendamiento es requerido' }).max(255, 'Motivo máximo 255 caracteres'),
  NuevoTecnicoID: z.number().optional(),
});

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMAS PARA GESTIÓN DE EQUIPOS EN SERVICIO
// ═══════════════════════════════════════════════════════════════════════════

export const agregarEquipoServicioSchema = z.object({
  ContratoEquipoID: z.number({ required_error: 'ContratoEquipoID es requerido' }),
  Observaciones: z.string().max(500, 'Observaciones máximo 500 caracteres').optional(),
});

export const quitarEquipoServicioSchema = z.object({
  ServicioEquipoID: z.number({ required_error: 'ServicioEquipoID es requerido' }),
});

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMAS PARA GESTIÓN DE REFACCIONES EN EQUIPO
// ═══════════════════════════════════════════════════════════════════════════

// Actualizar acciones de una refacción (cambio, limpieza, verificación)
export const actualizarRefaccionSchema = z.object({
  ServicioEquipoRefaccionID: z.number({ required_error: 'ServicioEquipoRefaccionID es requerido' }),
  CantidadTecnico: z.number().min(0, 'Cantidad mínima es 0').optional(),
  Cambio: z.boolean().optional(),
  Limpieza: z.boolean().optional(),
  Verificacion: z.boolean().optional(),
  RefaccionNuevaID: z.number().optional().nullable(),
  CantidadNueva: z.number().min(0, 'Cantidad mínima es 0').optional(),
  Observaciones: z.string().max(255, 'Observaciones máximo 255 caracteres').optional(),
});

// Agregar nueva refacción al equipo durante el servicio (MANTENIMIENTO/REPARACIÓN)
export const agregarRefaccionEquipoServicioSchema = z.object({
  ServicioEquipoID: z.number({ required_error: 'ServicioEquipoID es requerido' }),
  RefaccionID: z.number({ required_error: 'RefaccionID es requerido' }),
  CantidadTecnico: z.number({ required_error: 'Cantidad es requerida' }).min(0, 'Cantidad mínima es 0'),
  Cambio: z.boolean().optional().default(false),
  Limpieza: z.boolean().optional().default(false),
  Verificacion: z.boolean().optional().default(false),
  Observaciones: z.string().max(255, 'Observaciones máximo 255 caracteres').optional(),
});

// Eliminar refacción del equipo durante el servicio
export const eliminarRefaccionEquipoServicioSchema = z.object({
  ServicioEquipoRefaccionID: z.number({ required_error: 'ServicioEquipoRefaccionID es requerido' }),
  DestinoRefaccion: DestinoRefaccionEnum,
  MotivoDano: MotivoDanoEnum.optional(),
  ObservacionesDano: z.string().max(255, 'Observaciones máximo 255 caracteres').optional(),
});

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMAS PARA INSUMOS DEL SERVICIO
// ═══════════════════════════════════════════════════════════════════════════

export const agregarInsumoSchema = z.object({
  RefaccionID: z.number({ required_error: 'RefaccionID es requerido' }),
  Cantidad: z.number({ required_error: 'Cantidad es requerida' }).min(1, 'Cantidad mínima es 1'),
  OrigenInventario: OrigenInventarioEnum.optional(),
  CostoUnitario: z.number().min(0, 'Costo mínimo es 0').optional(),  // Costo personalizado (opcional)
  Cobrar: z.boolean().optional().default(false),  // Por default NO se cobra
  Observaciones: z.string().max(255, 'Observaciones máximo 255 caracteres').optional(),
});

export const modificarInsumoSchema = z.object({
  ServicioInsumoID: z.number({ required_error: 'ServicioInsumoID es requerido' }),
  Cantidad: z.number().min(1, 'Cantidad mínima es 1').optional(),
  Observaciones: z.string().max(255, 'Observaciones máximo 255 caracteres').optional(),
});

export const eliminarInsumoSchema = z.object({
  ServicioInsumoID: z.number({ required_error: 'ServicioInsumoID es requerido' }),
});

// Toggle Cobrar para insumo
export const toggleCobrarInsumoSchema = z.object({
  Cobrar: z.boolean({ required_error: 'Cobrar es requerido' }),
});

// Dividir insumo en registros individuales
export const dividirInsumoParamsSchema = z.object({
  ServicioID: z.string().regex(/^\d+$/, 'ServicioID debe ser un número válido').transform(Number),
  ServicioInsumoID: z.string().regex(/^\d+$/, 'ServicioInsumoID debe ser un número válido').transform(Number),
});

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMAS PARA DESINSTALACIÓN
// ═══════════════════════════════════════════════════════════════════════════

export const configurarDesinstalacionSchema = z.object({
  ServicioEquipoID: z.number({ required_error: 'ServicioEquipoID es requerido' }),
  AccionDesinstalacion: AccionDesinstalacionEnum,
  // Si es PIEZAS_INDIVIDUALES, se configuran los destinos de cada refacción
  Refacciones: z.array(z.object({
    ServicioEquipoRefaccionID: z.number({ required_error: 'ServicioEquipoRefaccionID es requerido' }),
    DestinoRefaccion: DestinoRefaccionEnum,
    MotivoDano: MotivoDanoEnum.optional(),
    ObservacionesDano: z.string().max(255, 'Observaciones máximo 255 caracteres').optional(),
  })).optional(),
});

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMAS PARA FINALIZAR SERVICIO
// ═══════════════════════════════════════════════════════════════════════════

export const finalizarServicioSchema = z.object({
  ObservacionesDespues: z.string().max(500, 'Observaciones máximo 500 caracteres').optional(),
  ObservacionesGenerales: z.string().max(1000, 'Observaciones máximo 1000 caracteres').optional(),
  ProximoServicioMeses: z.number().min(1, 'Mínimo 1 mes').max(24, 'Máximo 24 meses').optional(),
  // Firmas opcionales
  FirmaCliente: z.object({
    NombreFirmante: z.string({ required_error: 'Nombre del firmante es requerido' }).max(255),
    FirmaData: z.string({ required_error: 'Firma es requerida' }), // Base64
  }).optional(),
  FirmaTecnico: z.object({
    NombreFirmante: z.string({ required_error: 'Nombre del firmante es requerido' }).max(255),
    FirmaData: z.string({ required_error: 'Firma es requerida' }), // Base64
  }).optional(),
});

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMAS PARA PARÁMETROS DE RUTA
// ═══════════════════════════════════════════════════════════════════════════

export const servicioIdParamSchema = z.object({
  ServicioID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

export const contratoIdParamSchema = z.object({
  ContratoID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

export const clienteEquipoIdParamSchema = z.object({
  ClienteEquipoID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMAS PARA QUERY PARAMS
// ═══════════════════════════════════════════════════════════════════════════

export const searchServiciosQuerySchema = z.object({
  q: z.string().optional(),
  estatus: EstatusServicioEnum.optional(),
  tipo: TipoServicioEnum.optional(),
  tecnicoId: z.string().regex(/^\d+$/, 'tecnicoId debe ser un número válido').transform(Number).optional(),
  contratoId: z.string().regex(/^\d+$/, 'contratoId debe ser un número válido').transform(Number).optional(),
  clienteId: z.string().regex(/^\d+$/, 'clienteId debe ser un número válido').transform(Number).optional(),
  clienteEquipoId: z.string().regex(/^\d+$/, 'clienteEquipoId debe ser un número válido').transform(Number).optional(),
  fechaDesde: z.string().optional(),
  fechaHasta: z.string().optional(),
});

export const agendaQuerySchema = z.object({
  fechaDesde: z.string().optional(),
  fechaHasta: z.string().optional(),
  tecnicoId: z.string().regex(/^\d+$/, 'tecnicoId debe ser un número válido').transform(Number).optional(),
});

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS EXPORTADOS
// ═══════════════════════════════════════════════════════════════════════════

export type CreateServicioDto = z.infer<typeof createServicioSchema>;
export type UpdateServicioDto = z.infer<typeof updateServicioSchema>;
export type CambiarEstatusDto = z.infer<typeof cambiarEstatusSchema>;
export type CancelarServicioDto = z.infer<typeof cancelarServicioSchema>;
export type ReagendarServicioDto = z.infer<typeof reagendarServicioSchema>;
export type AgregarEquipoServicioDto = z.infer<typeof agregarEquipoServicioSchema>;
export type QuitarEquipoServicioDto = z.infer<typeof quitarEquipoServicioSchema>;
export type ActualizarRefaccionDto = z.infer<typeof actualizarRefaccionSchema>;
export type AgregarRefaccionEquipoServicioDto = z.infer<typeof agregarRefaccionEquipoServicioSchema>;
export type EliminarRefaccionEquipoServicioDto = z.infer<typeof eliminarRefaccionEquipoServicioSchema>;
export type AgregarInsumoDto = z.infer<typeof agregarInsumoSchema>;
export type ModificarInsumoDto = z.infer<typeof modificarInsumoSchema>;
export type EliminarInsumoDto = z.infer<typeof eliminarInsumoSchema>;
export type ToggleCobrarInsumoDto = z.infer<typeof toggleCobrarInsumoSchema>;
export type ConfigurarDesinstalacionDto = z.infer<typeof configurarDesinstalacionSchema>;
export type FinalizarServicioDto = z.infer<typeof finalizarServicioSchema>;
export type SearchServiciosQuery = z.infer<typeof searchServiciosQuerySchema>;
export type AgendaQuery = z.infer<typeof agendaQuerySchema>;
