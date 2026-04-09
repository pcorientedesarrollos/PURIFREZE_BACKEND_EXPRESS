import { z } from 'zod';

// Detalle de cotización
const detalleSchema = z.object({
  RefaccionID: z.number().int().positive('RefaccionID debe ser un número positivo'),
  Cantidad: z.number().int().min(1, 'La cantidad mínima es 1'),
  Observaciones: z.string().max(255).optional().nullable(),
  EquipoVirtualID: z.number().int().positive().optional().nullable(),
});

// Parámetro ID de cotización
export const cotizacionIdParamSchema = z.object({
  CotizacionCompraID: z.string().regex(/^\d+$/, 'ID debe ser un número').transform(Number),
});

// Equipo virtual para agregar a cotización
const equipoVirtualItemSchema = z.object({
  EquipoVirtualID: z.number().int().positive('EquipoVirtualID es requerido'),
  Cantidad: z.number().int().min(1, 'La cantidad mínima es 1').default(1),
  PrecioFinal: z.number().min(0, 'El precio debe ser positivo'),
});

// Crear cotización
export const createCotizacionCompraSchema = z.object({
  FechaCotizacion: z.string().transform((val) => new Date(val)),
  Observaciones: z.string().max(500).optional().nullable(),
  NumeroPedido: z.string().max(100).optional().nullable(),
  UsuarioID: z.number().int().positive().optional().nullable(),
  Detalles: z.array(detalleSchema).optional().default([]),
  EquiposVirtuales: z.array(equipoVirtualItemSchema).optional().default([]),
}).refine(
  (data) => (data.Detalles?.length ?? 0) > 0 || (data.EquiposVirtuales?.length ?? 0) > 0,
  { message: 'Debe agregar al menos una refacción o un equipo virtual' }
);

// Actualizar cotización
export const updateCotizacionCompraSchema = z.object({
  FechaCotizacion: z.string().transform((val) => new Date(val)).optional(),
  Observaciones: z.string().max(500).optional().nullable(),
  NumeroPedido: z.string().max(100).optional().nullable(),
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
  DetallesSeleccionados: z.array(z.number().int().positive()).optional().default([]),
  EquiposVirtualesSeleccionados: z.array(z.number().int().positive()).optional().default([]),
}).refine(
  (data) => (data.DetallesSeleccionados?.length ?? 0) > 0 || (data.EquiposVirtualesSeleccionados?.length ?? 0) > 0,
  { message: 'Debe seleccionar al menos una refacción o un equipo virtual' }
);

// Generar link de WhatsApp
export const whatsappLinkSchema = z.object({
  telefono: z.string().min(10, 'Teléfono debe tener al menos 10 dígitos').max(20),
  frontendUrl: z.string().url().optional(),
});

// Parámetro ID de equipo virtual en cotización
export const equipoVirtualIdParamSchema = z.object({
  CotizacionCompraID: z.string().regex(/^\d+$/, 'CotizacionCompraID debe ser un número').transform(Number),
  EquipoVirtualID: z.string().regex(/^\d+$/, 'EquipoVirtualID debe ser un número').transform(Number),
});

// Agregar equipo virtual a cotización
export const agregarEquipoVirtualSchema = z.object({
  EquipoVirtualID: z.number().int().positive('EquipoVirtualID es requerido'),
  Cantidad: z.number().int().min(1, 'La cantidad mínima es 1').default(1),
  PrecioFinal: z.number().min(0, 'El precio debe ser positivo'),
});

// Actualizar equipo virtual en cotización (precio y/o cantidad)
export const actualizarPrecioEquipoVirtualSchema = z.object({
  PrecioFinal: z.number().min(0, 'El precio debe ser positivo').optional(),
  Cantidad: z.number().int().min(1, 'La cantidad mínima es 1').optional(),
});

// Actualizar cantidad de un detalle de cotización
export const actualizarDetalleCantidadSchema = z.object({
  Cantidad: z.number().int().min(1, 'La cantidad mínima es 1'),
});

// Parámetro ID de detalle
export const detalleIdParamSchema = z.object({
  CotizacionCompraID: z.string().regex(/^\d+$/, 'CotizacionCompraID debe ser un número').transform(Number),
  DetalleID: z.string().regex(/^\d+$/, 'DetalleID debe ser un número').transform(Number),
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
export type AgregarEquipoVirtualDto = z.infer<typeof agregarEquipoVirtualSchema>;
export type ActualizarPrecioEquipoVirtualDto = z.infer<typeof actualizarPrecioEquipoVirtualSchema>;
export type ActualizarDetalleCantidadDto = z.infer<typeof actualizarDetalleCantidadSchema>;
