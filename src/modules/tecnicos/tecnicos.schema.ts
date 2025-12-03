import { z } from 'zod';

export const createTecnicoSchema = z.object({
  UsuarioID: z.number({ required_error: 'UsuarioID es requerido' }),
  Codigo: z.string().max(20, 'Código máximo 20 caracteres').optional(),
  Telefono: z.string().max(20, 'Teléfono máximo 20 caracteres').optional(),
  Observaciones: z.string().max(255, 'Observaciones máximo 255 caracteres').optional(),
});

export const updateTecnicoSchema = z.object({
  Codigo: z.string().max(20, 'Código máximo 20 caracteres').optional(),
  Telefono: z.string().max(20, 'Teléfono máximo 20 caracteres').optional(),
  Observaciones: z.string().max(255, 'Observaciones máximo 255 caracteres').optional(),
});

export const tecnicoIdParamSchema = z.object({
  TecnicoID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

export type CreateTecnicoDto = z.infer<typeof createTecnicoSchema>;
export type UpdateTecnicoDto = z.infer<typeof updateTecnicoSchema>;