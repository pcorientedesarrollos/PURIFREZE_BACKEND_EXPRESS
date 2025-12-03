import { z } from 'zod';

// Schema para agregar/actualizar stock de una refacción a un técnico
export const upsertInventarioTecnicoSchema = z.object({
  TecnicoID: z.number({ required_error: 'TecnicoID es requerido' }),
  RefaccionID: z.number({ required_error: 'RefaccionID es requerido' }),
  StockNuevo: z.number().min(0, 'StockNuevo no puede ser negativo').default(0),
  StockUsado: z.number().min(0, 'StockUsado no puede ser negativo').default(0),
  UsuarioID: z.number().optional(), // Usuario que realiza la asignación (para kardex)
});

// Schema para actualizar solo cantidades
export const updateStockSchema = z.object({
  StockNuevo: z.number().min(0, 'StockNuevo no puede ser negativo').optional(),
  StockUsado: z.number().min(0, 'StockUsado no puede ser negativo').optional(),
});

// Schema para parámetros
export const inventarioTecnicoIdParamSchema = z.object({
  InventarioTecnicoID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

export const tecnicoIdParamSchema = z.object({
  TecnicoID: z.string().regex(/^\d+$/, 'TecnicoID debe ser un número válido').transform(Number),
});

export const tecnicoRefaccionParamSchema = z.object({
  TecnicoID: z.string().regex(/^\d+$/, 'TecnicoID debe ser un número válido').transform(Number),
  RefaccionID: z.string().regex(/^\d+$/, 'RefaccionID debe ser un número válido').transform(Number),
});

export type UpsertInventarioTecnicoDto = z.infer<typeof upsertInventarioTecnicoSchema>;
export type UpdateStockDto = z.infer<typeof updateStockSchema>;
