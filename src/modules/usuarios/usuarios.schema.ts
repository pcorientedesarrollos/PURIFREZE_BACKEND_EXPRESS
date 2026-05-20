import { z } from 'zod';

export const createUsuarioSchema = z.object({
  Usuario: z.string().min(1, 'El usuario es requerido'),
  Password: z.string().min(1, 'La contraseña es requerida'),
  NombreCompleto: z.string().min(1, 'El nombre completo es requerido'),
  Puesto: z.string().max(255).optional().nullable(),
  Celular: z.string().max(20).optional().nullable(),
  Direccion: z.string().max(500).optional().nullable(),
  CorreoElectronico: z.string().email('Correo electrónico inválido').optional().nullable(),
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
  Puesto: z.string().max(255).nullable().optional(),
  Celular: z.string().max(20).optional().nullable(),
  Direccion: z.string().max(500).optional().nullable(),
  CorreoElectronico: z.string().email('Correo electrónico inválido').optional().nullable(),
  IsAdmin: z.boolean().optional(),
  TipoUsuario: z.enum(['INTERNO', 'PROVEEDOR']).optional(),
  ProveedorID: z.number().optional().nullable(),
});

export const usuarioIdParamSchema = z.object({
  UsuarioID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

export type CreateUsuarioDto = z.infer<typeof createUsuarioSchema>;
export type UpdateUsuarioDto = z.infer<typeof updateUsuarioSchema>;
