import { z } from 'zod';

// Enum para tipo de traspaso
const tipoTraspasoEnum = z.enum(['Bodega_Tecnico', 'Tecnico_Bodega', 'Tecnico_Tecnico']);

// Enum para tipo de origen/destino
const origenDestinoTipoEnum = z.enum(['Bodega', 'Tecnico']);

// Detalle de refacciones a traspasar
const detalleSchema = z.object({
  RefaccionID: z.number({ required_error: 'RefaccionID es requerido' }),
  CantidadNuevo: z.number().min(0, 'CantidadNuevo no puede ser negativa').default(0),
  CantidadUsado: z.number().min(0, 'CantidadUsado no puede ser negativa').default(0),
});

// Schema para crear solicitud de traspaso
export const createTraspasoSchema = z.object({
  TipoTraspaso: tipoTraspasoEnum,
  OrigenTipo: origenDestinoTipoEnum,
  OrigenID: z.number().nullable().optional(), // NULL si es Bodega
  DestinoTipo: origenDestinoTipoEnum,
  DestinoID: z.number().nullable().optional(), // NULL si es Bodega
  UsuarioSolicitaID: z.number({ required_error: 'UsuarioSolicitaID es requerido' }),
  Observaciones: z.string().max(255, 'Observaciones máximo 255 caracteres').optional(),
  Detalle: z.array(detalleSchema).min(1, 'Debe incluir al menos una refacción'),
});

// Schema para autorizar/rechazar
export const autorizarTraspasoSchema = z.object({
  UsuarioAutorizaID: z.number({ required_error: 'UsuarioAutorizaID es requerido' }),
  Autorizado: z.boolean({ required_error: 'Debe indicar si autoriza o rechaza' }),
  Observaciones: z.string().max(255).optional(),
});

// Schema para parámetros
export const traspasoIdParamSchema = z.object({
  TraspasoEncabezadoID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

export const tecnicoIdParamSchema = z.object({
  TecnicoID: z.string().regex(/^\d+$/, 'TecnicoID debe ser un número válido').transform(Number),
});

// Schema para filtros de consulta
export const filtrosTraspasoSchema = z.object({
  estatus: z.enum(['Pendiente', 'Autorizado', 'Rechazado']).optional(),
  tipo: tipoTraspasoEnum.optional(),
});

export type CreateTraspasoDto = z.infer<typeof createTraspasoSchema>;
export type AutorizarTraspasoDto = z.infer<typeof autorizarTraspasoSchema>;
