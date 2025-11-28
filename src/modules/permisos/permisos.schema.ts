import { z } from 'zod';

// Schema para parámetro UsuarioID
export const usuarioParamSchema = z.object({
  UsuarioID: z.string().regex(/^\d+$/, 'Debe ser un número').transform(Number),
});

// Schema para crear/actualizar permiso
export const generarPermisoSchema = z.object({
  UsuarioID: z.number({ required_error: 'UsuarioID es requerido' }),
  SubmoduloID: z.number({ required_error: 'SubmoduloID es requerido' }),
  IsActive: z.boolean({ required_error: 'IsActive es requerido' }),
});

// Types inferidos
export type UsuarioParam = z.infer<typeof usuarioParamSchema>;
export type GenerarPermisoInput = z.infer<typeof generarPermisoSchema>;
