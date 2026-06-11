import { z } from 'zod';

export const estadoCuentaParamSchema = z.object({
    anio: z.string().regex(/^\d{4}$/, 'El año debe tener 4 dígitos').transform(Number),
    mes: z.string().regex(/^(1[0-2]|[1-9])$/, 'El mes debe ser un número del 1 al 12').transform(Number),
});

export const estadoCuentaQuerySchema = z.object({
    meses: z.string().regex(/^\d+$/, 'Debe ser un número').transform(Number).optional(),
});

export type EstadoCuentaParamDto = z.infer<typeof estadoCuentaParamSchema>; // { anio: number, mes: number }
export type EstadoCuentaQueryDto = z.infer<typeof estadoCuentaQuerySchema>;
