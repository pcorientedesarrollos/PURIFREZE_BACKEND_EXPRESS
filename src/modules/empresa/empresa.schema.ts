import { z } from 'zod';

export const updateEmpresaSchema = z.object({
    NombreEmpresa:     z.string().min(1).max(255),
    NombreComercial:   z.string().max(255).optional(),
    Propietario:       z.string().min(1).max(255),
    Celular:           z.string().min(1).max(20),
    CorreoElectronico: z.string().email().max(100),
    Direccion:         z.string().max(500).optional(),
    Slogan:            z.string().max(255).optional(),
});

export type UpdateEmpresaDto = z.infer<typeof updateEmpresaSchema>;
