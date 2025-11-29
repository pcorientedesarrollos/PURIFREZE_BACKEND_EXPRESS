import { z } from 'zod';

// Schema para params de RefaccionID
export const refaccionIdParamSchema = z.object({
  RefaccionID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

// Schema para query params de kardex
export const kardexQuerySchema = z.object({
  fechaInicio: z.string().optional(),
  fechaFin: z.string().optional(),
  tipoMovimiento: z.string().optional(),
});

// Types
export type KardexQueryDto = z.infer<typeof kardexQuerySchema>;
