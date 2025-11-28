import { z } from 'zod';

export const createClienteEmpleadoSchema = z.object({
  ClienteID: z.number({ required_error: 'El ClienteID es requerido' }),
  PuestoTrabajoID: z.number({ required_error: 'El PuestoTrabajoID es requerido' }),
  NombreEmpleado: z.string().min(1, 'El nombre del empleado es requerido'),
  Observaciones: z.string().optional(),
});

export const updateClienteEmpleadoSchema = z.object({
  PuestoTrabajoID: z.number().optional(),
  NombreEmpleado: z.string().min(1).optional(),
  Observaciones: z.string().optional(),
});

export const empleadoIdParamSchema = z.object({
  EmpleadoID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

export type CreateClienteEmpleadoDto = z.infer<typeof createClienteEmpleadoSchema>;
export type UpdateClienteEmpleadoDto = z.infer<typeof updateClienteEmpleadoSchema>;
