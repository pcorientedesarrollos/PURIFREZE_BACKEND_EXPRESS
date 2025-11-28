import { z } from 'zod';

export const createPuestoTrabajoSchema = z.object({
  PuestoTrabajo: z.string().max(255),
  Observaciones: z.string().max(255).optional(),
});

export const updatePuestoTrabajoSchema = createPuestoTrabajoSchema.partial();
export const puestoTrabajoIdParamSchema = z.object({
  PuestoTrabajoID: z.string().regex(/^\d+$/).transform(Number),
});

export type CreatePuestoTrabajoDto = z.infer<typeof createPuestoTrabajoSchema>;
export type UpdatePuestoTrabajoDto = z.infer<typeof updatePuestoTrabajoSchema>;
