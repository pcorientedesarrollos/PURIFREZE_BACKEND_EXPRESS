import { z } from 'zod';

// Schema para crear servicio adicional
export const createServicioAdicionalSchema = z.object({
  Nombre: z.string().min(1, 'El nombre es requerido').max(255, 'Nombre no puede exceder 255 caracteres'),
  Costo: z.number().min(0, 'El costo debe ser mayor o igual a 0'),
});

// Schema para actualizar servicio adicional
export const updateServicioAdicionalSchema = z.object({
  Nombre: z.string().min(1).max(255).optional(),
  Costo: z.number().min(0).optional(),
});

// Schema para validar ID en params
export const servicioAdicionalIdParamSchema = z.object({
  ServicioAdicionalID: z.string().regex(/^\d+$/, 'ServicioAdicionalID debe ser un número').transform(Number),
});

// ═══════════════════════════════════════════════════════════════════════════
// SERVICIOS ADICIONALES APLICADOS A SERVICIOS TÉCNICOS
// ═══════════════════════════════════════════════════════════════════════════

// Agregar servicio adicional a un servicio técnico
export const agregarServicioAdicionalAplicadoSchema = z.object({
  ServicioAdicionalID: z.number({ required_error: 'ServicioAdicionalID es requerido' }),
  CostoAplicado: z.number().min(0).optional(), // Si no se especifica, usa el costo del catálogo
  Observaciones: z.string().max(500).optional().nullable(),
});

// Autorizar servicio adicional (requiere nombre del cliente)
export const autorizarServicioAdicionalSchema = z.object({
  NombreAutorizante: z.string({ required_error: 'NombreAutorizante es requerido' }).min(1).max(255),
  Observaciones: z.string().max(500).optional().nullable(),
});

// Actualizar servicio adicional aplicado
export const actualizarServicioAdicionalAplicadoSchema = z.object({
  CostoAplicado: z.number().min(0).optional(),
  Observaciones: z.string().max(500).optional().nullable(),
});

// Toggle Cobrar para servicio adicional aplicado
export const toggleCobrarAdicionalSchema = z.object({
  Cobrar: z.boolean({ required_error: 'Cobrar es requerido' }),
});

// Parámetros de ruta
export const servicioIdParamSchema = z.object({
  ServicioID: z.string().regex(/^\d+$/, 'ServicioID debe ser un número válido').transform(Number),
});

export const servicioAdicionalAplicadoIdParamSchema = z.object({
  ServicioAdicionalAplicadoID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

// Types inferidos de los schemas
export type CreateServicioAdicionalDto = z.infer<typeof createServicioAdicionalSchema>;
export type UpdateServicioAdicionalDto = z.infer<typeof updateServicioAdicionalSchema>;
export type AgregarServicioAdicionalAplicadoDto = z.infer<typeof agregarServicioAdicionalAplicadoSchema>;
export type AutorizarServicioAdicionalDto = z.infer<typeof autorizarServicioAdicionalSchema>;
export type ActualizarServicioAdicionalAplicadoDto = z.infer<typeof actualizarServicioAdicionalAplicadoSchema>;
export type ToggleCobrarAdicionalDto = z.infer<typeof toggleCobrarAdicionalSchema>;
