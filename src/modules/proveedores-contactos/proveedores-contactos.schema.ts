import { z } from 'zod';

export const createProveedorContactoSchema = z.object({
  ProveedorID: z.number({ required_error: 'El ProveedorID es requerido' }),
  NombreContacto: z.string().min(1, 'El nombre del contacto es requerido').max(255),
  Celular: z.string().max(50).optional(),
  Correo: z.string().email('El correo debe ser válido').max(255).optional(),
  Observaciones: z.string().max(500).optional(),
});

export const updateProveedorContactoSchema = z.object({
  NombreContacto: z.string().min(1).max(255).optional(),
  Celular: z.string().max(50).optional(),
  Correo: z.string().email('El correo debe ser válido').max(255).optional(),
  Observaciones: z.string().max(500).optional(),
});

export const contactoIdParamSchema = z.object({
  ContactoID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

export const proveedorIdParamSchema = z.object({
  ProveedorID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

export type CreateProveedorContactoDto = z.infer<typeof createProveedorContactoSchema>;
export type UpdateProveedorContactoDto = z.infer<typeof updateProveedorContactoSchema>;
