import { z } from 'zod';

export const createUsuarioSchema = z.object({
  Usuario: z.string().min(1, 'El usuario es requerido'),
  Password: z.string().min(1, 'La contraseña es requerida'),
  NombreCompleto: z.string().min(1, 'El nombre completo es requerido'),
  IsAdmin: z.boolean({ required_error: 'IsAdmin es requerido' }),
  TipoUsuario: z.enum(['INTERNO', 'PROVEEDOR']).optional().default('INTERNO'),
  ProveedorID: z.number().optional().nullable(),
}).refine(
  (data) => {
    // Si es PROVEEDOR, debe tener ProveedorID
    if (data.TipoUsuario === 'PROVEEDOR' && !data.ProveedorID) {
      return false;
    }
    return true;
  },
  { message: 'ProveedorID es requerido para usuarios tipo PROVEEDOR', path: ['ProveedorID'] }
);

export const updateUsuarioSchema = z.object({
  Usuario: z.string().min(1, 'El usuario es requerido').optional(),
  Password: z.string().min(1, 'La contraseña es requerida').optional(),
  NombreCompleto: z.string().min(1, 'El nombre completo es requerido').optional(),
  IsAdmin: z.boolean().optional(),
  TipoUsuario: z.enum(['INTERNO', 'PROVEEDOR']).optional(),
  ProveedorID: z.number().optional().nullable(),
});

export const usuarioIdParamSchema = z.object({
  UsuarioID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

export type CreateUsuarioDto = z.infer<typeof createUsuarioSchema>;
export type UpdateUsuarioDto = z.infer<typeof updateUsuarioSchema>;
