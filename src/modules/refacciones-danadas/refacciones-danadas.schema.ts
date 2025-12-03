import { z } from 'zod';

const motivoDanoEnum = z.enum(['Defecto_Fabrica', 'Mal_Uso', 'Desgaste_Normal', 'Accidente', 'Otro']);

export const createRefaccionDanadaSchema = z.object({
  RefaccionID: z.number({ required_error: 'RefaccionID es requerido' }),
  TecnicoID: z.number().nullable().optional(),
  ProveedorID: z.number().nullable().optional(),
  CompraEncabezadoID: z.number().nullable().optional(),
  Cantidad: z.number({ required_error: 'Cantidad es requerida' }).min(1, 'Cantidad debe ser al menos 1'),
  MotivoDano: motivoDanoEnum,
  Observaciones: z.string().max(255, 'Observaciones máximo 255 caracteres').optional(),
  UsuarioID: z.number({ required_error: 'UsuarioID es requerido' }),
});

export const refaccionDanadaIdParamSchema = z.object({
  RefaccionDanadaID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

export const filtrosReporteSchema = z.object({
  fechaInicio: z.string().optional(),
  fechaFin: z.string().optional(),
  proveedorId: z.string().regex(/^\d+$/).transform(Number).optional(),
  refaccionId: z.string().regex(/^\d+$/).transform(Number).optional(),
  tecnicoId: z.string().regex(/^\d+$/).transform(Number).optional(),
  motivo: motivoDanoEnum.optional(),
});

export type CreateRefaccionDanadaDto = z.infer<typeof createRefaccionDanadaSchema>;
