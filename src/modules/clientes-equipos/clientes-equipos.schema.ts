import { z } from 'zod';

// Enums
export const TipoPropiedad = z.enum(['RENTA', 'COMPRA', 'EXTERNO']);
export const EstatusClienteEquipo = z.enum(['ACTIVO', 'RETIRADO', 'DEVUELTO', 'VENDIDO']);

// Schema para crear equipo de cliente
export const createClienteEquipoSchema = z.object({
  ClienteID: z.number({ required_error: 'El ClienteID es requerido' }),
  SucursalID: z.number().optional().nullable(),
  EquipoID: z.number().optional().nullable(),
  PlantillaEquipoID: z.number().optional().nullable(),
  TipoPropiedad: TipoPropiedad,
  ContratoID: z.number().optional().nullable(),
  PresupuestoDetalleID: z.number().optional().nullable(),
  VentaDetalleID: z.number().optional().nullable(),
  DescripcionEquipo: z.string().max(255).optional().nullable(),
  NumeroSerieExterno: z.string().max(100).optional().nullable(),
  MarcaEquipo: z.string().max(100).optional().nullable(),
  ModeloEquipo: z.string().max(100).optional().nullable(),
  FechaAsignacion: z.string().optional(),
  Observaciones: z.string().max(500).optional().nullable(),
  UsuarioAsignaID: z.number().optional().nullable(),
});

// Schema para actualizar equipo de cliente
export const updateClienteEquipoSchema = z.object({
  SucursalID: z.number().optional().nullable(),
  DescripcionEquipo: z.string().max(255).optional().nullable(),
  NumeroSerieExterno: z.string().max(100).optional().nullable(),
  MarcaEquipo: z.string().max(100).optional().nullable(),
  ModeloEquipo: z.string().max(100).optional().nullable(),
  Observaciones: z.string().max(500).optional().nullable(),
});

// Schema para retirar equipo
export const retirarEquipoSchema = z.object({
  MotivoRetiro: z.string().max(255, 'El motivo no puede exceder 255 caracteres'),
  Estatus: z.enum(['RETIRADO', 'DEVUELTO', 'VENDIDO']).default('RETIRADO'),
});

// Schemas de parámetros
export const clienteEquipoIdParamSchema = z.object({
  ClienteEquipoID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

export const clienteIdParamSchema = z.object({
  ClienteID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

// Query schema para filtrar
export const clientesEquiposQuerySchema = z.object({
  tipoPropiedad: TipoPropiedad.optional(),
  estatus: EstatusClienteEquipo.optional(),
  sucursalId: z.string().regex(/^\d+$/).transform(Number).optional(),
});

// Types
export type CreateClienteEquipoDto = z.infer<typeof createClienteEquipoSchema>;
export type UpdateClienteEquipoDto = z.infer<typeof updateClienteEquipoSchema>;
export type RetirarEquipoDto = z.infer<typeof retirarEquipoSchema>;
export type ClientesEquiposQueryDto = z.infer<typeof clientesEquiposQuerySchema>;
