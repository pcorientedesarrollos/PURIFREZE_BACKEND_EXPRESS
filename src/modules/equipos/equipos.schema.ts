import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMAS PARA CREAR EQUIPOS
// ═══════════════════════════════════════════════════════════════════════════

// Schema para crear múltiples equipos desde una plantilla
export const createEquiposFromPlantillaSchema = z.object({
  PlantillaEquipoID: z.number({ required_error: 'PlantillaEquipoID es requerido' }),
  Cantidad: z.number({ required_error: 'Cantidad es requerida' }).min(1, 'Cantidad mínima es 1').max(50, 'Cantidad máxima es 50'),
  Observaciones: z.string().max(500, 'Observaciones máximo 500 caracteres').optional(),
});

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMAS PARA MODIFICAR EQUIPO (solo en estado Armado)
// ═══════════════════════════════════════════════════════════════════════════

// Schema para detalle de equipo (agregar refacción)
export const agregarRefaccionEquipoSchema = z.object({
  RefaccionID: z.number({ required_error: 'RefaccionID es requerido' }),
  Cantidad: z.number({ required_error: 'Cantidad es requerida' }).min(1, 'Cantidad mínima es 1'),
});

// Schema para modificar cantidad de refacción existente
export const modificarCantidadRefaccionSchema = z.object({
  Cantidad: z.number({ required_error: 'Cantidad es requerida' }).min(1, 'Cantidad mínima es 1'),
});

// Schema para eliminar refacción de equipo
export const eliminarRefaccionEquipoSchema = z.object({
  Destino: z.enum(['inventario', 'danada'], { required_error: 'Destino es requerido (inventario o danada)' }),
  MotivoDano: z.enum(['Defecto_Fabrica', 'Mal_Uso', 'Desgaste_Normal', 'Accidente', 'Otro']).optional(),
  Observaciones: z.string().max(255, 'Observaciones máximo 255 caracteres').optional(),
});

// Schema para actualizar observaciones del equipo
export const updateEquipoSchema = z.object({
  Observaciones: z.string().max(500, 'Observaciones máximo 500 caracteres').optional().nullable(),
});

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMAS PARA CAMBIAR ESTATUS
// ═══════════════════════════════════════════════════════════════════════════

// Schema para instalar equipo (Armado → Instalado)
export const instalarEquipoSchema = z.object({
  FechaInstalacion: z.string().optional(), // Si no se envía, usa fecha actual
});

// Schema para desmontar equipo (Instalado → Desmontado)
export const desmontarEquipoSchema = z.object({
  FechaDesmontaje: z.string().optional(), // Si no se envía, usa fecha actual
  Observaciones: z.string().max(500, 'Observaciones máximo 500 caracteres').optional(),
  Refacciones: z.array(z.object({
    RefaccionID: z.number({ required_error: 'RefaccionID es requerido' }),
    Cantidad: z.number({ required_error: 'Cantidad es requerida' }).min(1, 'Cantidad mínima es 1'),
    Destino: z.enum(['inventario', 'danada'], { required_error: 'Destino es requerido' }),
    MotivoDano: z.enum(['Defecto_Fabrica', 'Mal_Uso', 'Desgaste_Normal', 'Accidente', 'Otro']).optional(),
    ObservacionesDano: z.string().max(255, 'Observaciones máximo 255 caracteres').optional(),
  })).optional(),
});

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMAS PARA PARÁMETROS
// ═══════════════════════════════════════════════════════════════════════════

export const equipoIdParamSchema = z.object({
  EquipoID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

export const equipoDetalleIdParamSchema = z.object({
  EquipoID: z.string().regex(/^\d+$/, 'EquipoID debe ser un número válido').transform(Number),
  EquipoDetalleID: z.string().regex(/^\d+$/, 'EquipoDetalleID debe ser un número válido').transform(Number),
});

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMAS PARA BÚSQUEDA Y FILTROS
// ═══════════════════════════════════════════════════════════════════════════

export const searchEquiposQuerySchema = z.object({
  q: z.string().optional(),
  estatus: z.enum(['todos', 'Armado', 'Instalado', 'Desmontado']).optional(),
  tipo: z.enum(['todos', 'interno', 'externo']).optional(),
  plantillaId: z.string().regex(/^\d+$/, 'plantillaId debe ser un número válido').transform(Number).optional(),
});

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS EXPORTADOS
// ═══════════════════════════════════════════════════════════════════════════

export type CreateEquiposFromPlantillaDto = z.infer<typeof createEquiposFromPlantillaSchema>;
export type AgregarRefaccionEquipoDto = z.infer<typeof agregarRefaccionEquipoSchema>;
export type ModificarCantidadRefaccionDto = z.infer<typeof modificarCantidadRefaccionSchema>;
export type EliminarRefaccionEquipoDto = z.infer<typeof eliminarRefaccionEquipoSchema>;
export type UpdateEquipoDto = z.infer<typeof updateEquipoSchema>;
export type InstalarEquipoDto = z.infer<typeof instalarEquipoSchema>;
export type DesmontarEquipoDto = z.infer<typeof desmontarEquipoSchema>;
export type SearchEquiposQuery = z.infer<typeof searchEquiposQuerySchema>;
