import { z } from 'zod';

const tipoCorreoEnum = z.enum(['trabajo', 'personal', 'otros']);

export const createClienteCorreoSchema = z.object({
  ClienteID: z.number({ required_error: 'El ClienteID es requerido' }),
  EmpleadoID: z.number({ required_error: 'El EmpleadoID es requerido' }),
  Correo: z.string().email('Debe ser un correo válido').max(255),
  TipoCorreo: tipoCorreoEnum.optional(),
  Observaciones: z.string().optional(),
});

export const updateClienteCorreoSchema = z.object({
  Correo: z.string().email('Debe ser un correo válido').max(255).optional(),
  TipoCorreo: tipoCorreoEnum.optional(),
  Observaciones: z.string().optional(),
});

export const correoIdParamSchema = z.object({
  CorreoID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

export type CreateClienteCorreoDto = z.infer<typeof createClienteCorreoSchema>;
export type UpdateClienteCorreoDto = z.infer<typeof updateClienteCorreoSchema>;
