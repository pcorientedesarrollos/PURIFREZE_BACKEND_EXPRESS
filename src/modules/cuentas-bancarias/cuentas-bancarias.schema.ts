import { z } from 'zod';

export const createCuentaBancariaSchema = z.object({
  BancoID: z.number({ required_error: 'El BancoID es requerido' }),
  CuentaBancaria: z.string().min(1, 'El número de cuenta es requerido'),
  NombrePropietario: z.string().min(1, 'El nombre del propietario es requerido'),
  Saldo: z.number({ required_error: 'El saldo es requerido' }),
});

export const updateCuentaBancariaSchema = z.object({
  BancoID: z.number().optional(),
  CuentaBancaria: z.string().min(1).optional(),
  NombrePropietario: z.string().optional(),
  Saldo: z.number().optional(),
});

export const cuentaBancariaIdParamSchema = z.object({
  CuentaBancariaID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

export type CreateCuentaBancariaDto = z.infer<typeof createCuentaBancariaSchema>;
export type UpdateCuentaBancariaDto = z.infer<typeof updateCuentaBancariaSchema>;
