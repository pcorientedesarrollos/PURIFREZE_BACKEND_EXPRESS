import { z } from 'zod';

const tipoTelefonoEnum = z.enum(['Trabajo', 'Personal', 'Otros', 'Ejemplo']);

export const createClienteTelefonoSchema = z.object({
  EmpleadoID: z.number({ required_error: 'El EmpleadoID es requerido' }),
  Telefono: z.string().min(1, 'El teléfono es requerido').max(255),
  Tipo: tipoTelefonoEnum.optional(),
});

export const updateClienteTelefonoSchema = z.object({
  Telefono: z.string().max(255).optional(),
  Tipo: tipoTelefonoEnum.optional(),
});

export const telefonoIdParamSchema = z.object({
  TelefonoID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

export const empleadoIdParamSchema = z.object({
  EmpleadoID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

export type CreateClienteTelefonoDto = z.infer<typeof createClienteTelefonoSchema>;
export type UpdateClienteTelefonoDto = z.infer<typeof updateClienteTelefonoSchema>;
