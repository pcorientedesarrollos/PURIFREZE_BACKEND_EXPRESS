import { z } from 'zod';

export const createClienteSucursalSchema = z.object({
  ClienteID: z.number({ required_error: 'El ClienteID es requerido' }),
  NombreSucursal: z.string().min(1, 'El nombre de la sucursal es requerido').max(255),
  Direccion: z.string().max(255).optional(),
  Ubicacion: z.string().max(255).optional(),
  Telefono: z.string().max(50).optional(),
  Contacto: z.string().max(255).optional(),
  Observaciones: z.string().max(255).optional(),
});

export const updateClienteSucursalSchema = z.object({
  NombreSucursal: z.string().min(1).max(255).optional(),
  Direccion: z.string().max(255).optional(),
  Ubicacion: z.string().max(255).optional(),
  Telefono: z.string().max(50).optional(),
  Contacto: z.string().max(255).optional(),
  Observaciones: z.string().max(255).optional(),
});

export const sucursalIdParamSchema = z.object({
  SucursalID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

export const clienteIdParamSchema = z.object({
  ClienteID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

export type CreateClienteSucursalDto = z.infer<typeof createClienteSucursalSchema>;
export type UpdateClienteSucursalDto = z.infer<typeof updateClienteSucursalSchema>;
