import { z } from 'zod';

export const createProveedorSchema = z.object({
  NombreProveedor: z.string().min(1, 'El nombre del proveedor es requerido').max(255),
  Direccion: z.string().max(255).optional(),
  Telefono: z.string().max(50).optional(),
  Contacto: z.string().max(100).optional(),
  Pais: z.string().max(100).optional(),
  Correo: z.string().email('El correo debe ser válido').max(100).optional(),
  Observaciones: z.string().optional(),
});

export const updateProveedorSchema = z.object({
  NombreProveedor: z.string().min(1).max(255).optional(),
  Direccion: z.string().max(255).optional(),
  Telefono: z.string().max(50).optional(),
  Contacto: z.string().max(100).optional(),
  Pais: z.string().max(100).optional(),
  Correo: z.string().email('El correo debe ser válido').max(100).optional(),
  Observaciones: z.string().optional(),
});

export const proveedorIdParamSchema = z.object({
  ProveedorID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

export type CreateProveedorDto = z.infer<typeof createProveedorSchema>;
export type UpdateProveedorDto = z.infer<typeof updateProveedorSchema>;
