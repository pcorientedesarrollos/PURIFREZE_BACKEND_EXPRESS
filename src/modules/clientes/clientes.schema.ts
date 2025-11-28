import { z } from 'zod';

export const createClienteSchema = z.object({
  NombreComercio: z.string().min(1, 'El nombre del comercio es requerido').max(255),
  Observaciones: z.string().optional(),
  Direccion: z.string().optional(),
  Ubicacion: z.string().optional(),
});

export const updateClienteSchema = z.object({
  NombreComercio: z.string().min(1).max(255).optional(),
  Observaciones: z.string().optional(),
});

export const clienteIdParamSchema = z.object({
  ClienteID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

export type CreateClienteDto = z.infer<typeof createClienteSchema>;
export type UpdateClienteDto = z.infer<typeof updateClienteSchema>;
