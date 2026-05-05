import { z } from 'zod';

export const proyeccionParamSchema = z.object({
    anio: z.string().regex(/^\d{4}$/, 'Año inválido').transform(Number),
    mes: z.string().regex(/^([1-9]|1[0-2])$/, 'Mes inválido (1-12)').transform(Number),
});

export const guardarProyeccionSchema = z.object({
    items: z.array(z.object({
        catalogoGastoID: z.number().int().positive(),
        ocurrencia: z.number().int().min(1).max(4),
        monto: z.number().min(0).nullable().optional(),
        aplica: z.boolean(),
    })),
});

export type ProyeccionParams = z.infer<typeof proyeccionParamSchema>;
export type GuardarProyeccionDto = z.infer<typeof guardarProyeccionSchema>;
