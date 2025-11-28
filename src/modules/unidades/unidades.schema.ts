import { z } from 'zod';

export const createUnidadSchema = z.object({
  DesUnidad: z.string().max(255),
  EsFraccionable: z.boolean(),
  DecUnidad: z.string().max(255),
  Observaciones: z.string().max(255),
});

export const updateUnidadSchema = createUnidadSchema.partial();

export const unidadIdParamSchema = z.object({
  UnidadID: z.string().regex(/^\d+$/).transform(Number),
});

export type CreateUnidadDto = z.infer<typeof createUnidadSchema>;
export type UpdateUnidadDto = z.infer<typeof updateUnidadSchema>;
