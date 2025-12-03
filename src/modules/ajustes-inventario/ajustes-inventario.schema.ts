import { z } from 'zod';

const motivoAjusteEnum = z.enum(['Perdida', 'Error_Captura', 'Robo', 'Deterioro', 'Sobrante', 'Otro']);

export const createAjusteSchema = z.object({
  TecnicoID: z.number({ required_error: 'TecnicoID es requerido' }),
  RefaccionID: z.number({ required_error: 'RefaccionID es requerido' }),
  StockRealNuevo: z.number({ required_error: 'StockRealNuevo es requerido' }).min(0, 'No puede ser negativo'),
  StockRealUsado: z.number({ required_error: 'StockRealUsado es requerido' }).min(0, 'No puede ser negativo'),
  MotivoAjuste: motivoAjusteEnum,
  Observaciones: z.string().max(255, 'Observaciones máximo 255 caracteres').optional(),
  UsuarioSolicitaID: z.number({ required_error: 'UsuarioSolicitaID es requerido' }),
});

export const autorizarAjusteSchema = z.object({
  UsuarioAutorizaID: z.number({ required_error: 'UsuarioAutorizaID es requerido' }),
  Autorizado: z.boolean({ required_error: 'Debe indicar si autoriza o rechaza' }),
  Observaciones: z.string().max(255).optional(),
});

export const ajusteIdParamSchema = z.object({
  AjusteID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

export const tecnicoIdParamSchema = z.object({
  TecnicoID: z.string().regex(/^\d+$/, 'TecnicoID debe ser un número válido').transform(Number),
});

export type CreateAjusteDto = z.infer<typeof createAjusteSchema>;
export type AutorizarAjusteDto = z.infer<typeof autorizarAjusteSchema>;
