import { z } from 'zod';

// Detalle de cotización
const detalleSchema = z.object({
  RefaccionID: z.number().int().positive('RefaccionID debe ser un número positivo'),
  Cantidad: z.number().int().min(1, 'La cantidad mínima es 1'),
  Observaciones: z.string().max(255).optional().nullable(),
});

// Parámetro ID de cotización
export const cotizacionIdParamSchema = z.object({
  CotizacionCompraID: z.string().regex(/^\d+$/, 'ID debe ser un número').transform(Number),
});

// Crear cotización
export const createCotizacionCompraSchema = z.object({
  FechaCotizacion: z.string().transform((val) => new Date(val)),
  Observaciones: z.string().max(500).optional().nullable(),
  UsuarioID: z.number().int().positive().optional().nullable(),
  Detalles: z.array(detalleSchema).min(1, 'Debe agregar al menos una refacción'),
});

// Actualizar cotización
export const updateCotizacionCompraSchema = z.object({
  FechaCotizacion: z.string().transform((val) => new Date(val)).optional(),
  Observaciones: z.string().max(500).optional().nullable(),
  Detalles: z.array(detalleSchema).optional(),
  DetallesEliminar: z.array(z.number().int().positive()).optional(),
});

// Registrar envío a proveedor
export const enviarCotizacionSchema = z.object({
  ProveedorID: z.number().int().positive('ProveedorID es requerido'),
  ContactoID: z.number().int().positive().optional().nullable(),
  MedioEnvio: z.enum(['WHATSAPP', 'EMAIL', 'OTRO']),
  Telefono: z.string().max(20).optional().nullable(),
});

// Convertir a compra
export const convertirACompraSchema = z.object({
  ProveedorID: z.number().int().positive('ProveedorID es requerido'),
  DetallesSeleccionados: z.array(z.number().int().positive()).min(1, 'Debe seleccionar al menos una refacción'),
});

// Generar link de WhatsApp
export const whatsappLinkSchema = z.object({
  telefono: z.string().min(10, 'Teléfono debe tener al menos 10 dígitos').max(20),
  frontendUrl: z.string().url().optional(),
});

// Types
export type CreateCotizacionCompraInput = z.infer<typeof createCotizacionCompraSchema>;
export type UpdateCotizacionCompraInput = z.infer<typeof updateCotizacionCompraSchema>;
export type EnviarCotizacionInput = z.infer<typeof enviarCotizacionSchema>;
export type ConvertirACompraInput = z.infer<typeof convertirACompraSchema>;

// Aliases para el servicio
export type CreateCotizacionCompraDto = CreateCotizacionCompraInput;
export type UpdateCotizacionCompraDto = UpdateCotizacionCompraInput;
export type EnviarCotizacionDto = EnviarCotizacionInput;
export type ConvertirACompraDto = ConvertirACompraInput;
