import { z } from 'zod';

export const createUsuarioSchema = z.object({
  Usuario: z.string().min(1, 'El usuario es requerido'),
  Password: z.string().min(1, 'La contraseña es requerida'),
  NombreCompleto: z.string().min(1, 'El nombre completo es requerido'),
  IsAdmin: z.boolean({ required_error: 'IsAdmin es requerido' }),
});

export const updateUsuarioSchema = z.object({
  Usuario: z.string().min(1, 'El usuario es requerido').optional(),
  Password: z.string().min(1, 'La contraseña es requerida').optional(),
  NombreCompleto: z.string().min(1, 'El nombre completo es requerido').optional(),
  IsAdmin: z.boolean().optional(),
});

export const usuarioIdParamSchema = z.object({
  UsuarioID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

export type CreateUsuarioDto = z.infer<typeof createUsuarioSchema>;
export type UpdateUsuarioDto = z.infer<typeof updateUsuarioSchema>;
