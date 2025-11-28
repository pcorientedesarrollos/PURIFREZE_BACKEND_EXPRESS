import { z } from 'zod';

export const createClienteDatosFiscalesSchema = z.object({
  ClienteID: z.number({ required_error: 'El ClienteID es requerido' }),
  RazonSocial: z.string().min(1, 'La razón social es requerida'),
  RFC: z.string().min(1, 'El RFC es requerido'),
  Regimen: z.string().min(1, 'El régimen es requerido'),
  DireccionFiscal: z.string().min(1, 'La dirección fiscal es requerida'),
  CodigoPostal: z.string().min(1, 'El código postal es requerido'),
  Observaciones: z.string().optional(),
});

export const updateClienteDatosFiscalesSchema = z.object({
  RazonSocial: z.string().min(1).optional(),
  RFC: z.string().min(1).optional(),
  Regimen: z.string().optional(),
  DireccionFiscal: z.string().optional(),
  CodigoPostal: z.string().optional(),
  Observaciones: z.string().optional(),
});

export const datosFiscalesIdParamSchema = z.object({
  DatosFiscalesID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

export const clienteIdParamSchema = z.object({
  ClienteID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

export type CreateClienteDatosFiscalesDto = z.infer<typeof createClienteDatosFiscalesSchema>;
export type UpdateClienteDatosFiscalesDto = z.infer<typeof updateClienteDatosFiscalesSchema>;
