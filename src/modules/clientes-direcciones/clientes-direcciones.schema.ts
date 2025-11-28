import { z } from 'zod';

export const createClienteDireccionSchema = z.object({
  ClienteID: z.number({ required_error: 'El ClienteID es requerido' }),
  Direccion: z.string().min(1, 'La dirección es requerida'),
  Ubicacion: z.string().optional(),
  Observaciones: z.string().optional(),
});

export const updateClienteDireccionSchema = z.object({
  Direccion: z.string().min(1).optional(),
  Ubicacion: z.string().optional(),
  Observaciones: z.string().optional(),
});

export const direccionIdParamSchema = z.object({
  DireccionID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

export const clienteIdParamSchema = z.object({
  ClienteID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

export type CreateClienteDireccionDto = z.infer<typeof createClienteDireccionSchema>;
export type UpdateClienteDireccionDto = z.infer<typeof updateClienteDireccionSchema>;
