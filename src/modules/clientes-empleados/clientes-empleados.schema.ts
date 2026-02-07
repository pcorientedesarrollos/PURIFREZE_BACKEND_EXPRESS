import { z } from 'zod';

// Schema para crear empleado (vinculado a múltiples sucursales)
export const createClienteEmpleadoSchema = z.object({
  ClienteID: z.number({ required_error: 'El ClienteID es requerido' }),
  NombreEmpleado: z.string().min(1, 'El nombre del empleado es requerido'),
  Observaciones: z.string().optional(),
  PuestosTrabajoIDs: z.array(z.number()).min(1, 'Debe asignar al menos un puesto de trabajo'),
  SucursalesIDs: z.array(z.number()).min(1, 'Debe asignar al menos una sucursal'),
});

// Schema para actualizar empleado
export const updateClienteEmpleadoSchema = z.object({
  NombreEmpleado: z.string().min(1).optional(),
  Observaciones: z.string().optional(),
});

// Schema para asignar puestos a un empleado
export const asignarPuestosSchema = z.object({
  PuestosTrabajoIDs: z.array(z.number()).min(1, 'Debe asignar al menos un puesto de trabajo'),
});

// Schema para agregar un puesto
export const agregarPuestoSchema = z.object({
  PuestoTrabajoID: z.number({ required_error: 'El PuestoTrabajoID es requerido' }),
});

// Schema para asignar sucursales a un empleado (reemplaza las existentes)
export const asignarSucursalesSchema = z.object({
  SucursalesIDs: z.array(z.number()).min(1, 'Debe asignar al menos una sucursal'),
});

// Schema para agregar una sucursal
export const agregarSucursalSchema = z.object({
  SucursalID: z.number({ required_error: 'El SucursalID es requerido' }),
});

// Schema para parámetro de empleado
export const empleadoIdParamSchema = z.object({
  EmpleadoID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

// Schema alternativo para compatibilidad con frontend (usa EmpleadosID en plural)
export const empleadosIdParamSchema = z.object({
  EmpleadosID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

// Schema para parámetro de empleado-puesto
export const empleadoPuestoParamSchema = z.object({
  EmpleadoID: z.string().regex(/^\d+$/, 'EmpleadoID debe ser un número válido').transform(Number),
  PuestoTrabajoID: z.string().regex(/^\d+$/, 'PuestoTrabajoID debe ser un número válido').transform(Number),
});

// Schema para parámetro de empleado-sucursal
export const empleadoSucursalParamSchema = z.object({
  EmpleadoID: z.string().regex(/^\d+$/, 'EmpleadoID debe ser un número válido').transform(Number),
  SucursalID: z.string().regex(/^\d+$/, 'SucursalID debe ser un número válido').transform(Number),
});

// Schema para parámetro de sucursal
export const sucursalIdParamSchema = z.object({
  SucursalID: z.string().regex(/^\d+$/, 'SucursalID debe ser un número válido').transform(Number),
});

// Types inferidos
export type CreateClienteEmpleadoDto = z.infer<typeof createClienteEmpleadoSchema>;
export type UpdateClienteEmpleadoDto = z.infer<typeof updateClienteEmpleadoSchema>;
export type AsignarPuestosDto = z.infer<typeof asignarPuestosSchema>;
export type AgregarPuestoDto = z.infer<typeof agregarPuestoSchema>;
export type AsignarSucursalesDto = z.infer<typeof asignarSucursalesSchema>;
export type AgregarSucursalDto = z.infer<typeof agregarSucursalSchema>;
