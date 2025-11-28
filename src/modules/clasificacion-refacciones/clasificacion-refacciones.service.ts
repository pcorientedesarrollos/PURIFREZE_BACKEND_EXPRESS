import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { CreateClasificacionRefaccionDto, UpdateClasificacionRefaccionDto } from './clasificacion-refacciones.schema';

class ClasificacionRefaccionesService {
  async create(data: CreateClasificacionRefaccionDto) {
    const { NombreClasificacion } = data;

    const findClasificacion = await prisma.catalogo_clasificacion_refacciones.findFirst({
      where: { NombreClasificacion },
    });

    if (findClasificacion) {
      throw new HttpError('El nombre de la clasificación ya existe', 300);
    }

    const clasificacion = await prisma.catalogo_clasificacion_refacciones.create({
      data: {
        ...data,
        IsActive: 1,
      },
    });

    return { message: 'Clasificación Creada', data: clasificacion };
  }

  async findAll() {
    const allClasificaciones = await prisma.catalogo_clasificacion_refacciones.findMany({
      orderBy: {
        ClasificacionRefaccionID: 'desc',
      },
    });

    return { message: 'Clasificaciones obtenidas', data: allClasificaciones };
  }

  async findOne(ClasificacionRefaccionID: number) {
    const clasificacion = await prisma.catalogo_clasificacion_refacciones.findUnique({
      where: { ClasificacionRefaccionID },
    });

    if (!clasificacion) {
      throw new HttpError('Clasificación no encontrada', 404);
    }

    return { message: 'Clasificación obtenida', data: clasificacion };
  }

  async update(ClasificacionRefaccionID: number, data: UpdateClasificacionRefaccionDto) {
    const { NombreClasificacion } = data;

    const clasificacionExist = await prisma.catalogo_clasificacion_refacciones.findUnique({
      where: { ClasificacionRefaccionID },
    });

    if (!clasificacionExist) {
      throw new HttpError('No existe la clasificación', 404);
    }

    if (NombreClasificacion) {
      const nameInUse = await prisma.catalogo_clasificacion_refacciones.findFirst({
        where: {
          NombreClasificacion,
          ClasificacionRefaccionID: { not: ClasificacionRefaccionID },
        },
      });

      if (nameInUse) {
        throw new HttpError('El nombre de la clasificación ya existe', 300);
      }
    }

    const clasificacionUpdate = await prisma.catalogo_clasificacion_refacciones.update({
      where: { ClasificacionRefaccionID },
      data,
    });

    return { message: 'Clasificación Actualizada', data: clasificacionUpdate };
  }

  async baja(ClasificacionRefaccionID: number) {
    const clasificacionValid = await prisma.catalogo_clasificacion_refacciones.findUnique({
      where: { ClasificacionRefaccionID },
    });

    if (!clasificacionValid) {
      throw new HttpError('La clasificación no existe', 404);
    }

    if (clasificacionValid.IsActive === 0) {
      throw new HttpError('La clasificación ya ha sido dada de baja', 300);
    }

    const clasificacionUpdate = await prisma.catalogo_clasificacion_refacciones.update({
      where: { ClasificacionRefaccionID },
      data: { IsActive: 0 },
    });

    return { message: 'Clasificación dada de baja', data: clasificacionUpdate };
  }

  async activar(ClasificacionRefaccionID: number) {
    const clasificacionValid = await prisma.catalogo_clasificacion_refacciones.findUnique({
      where: { ClasificacionRefaccionID },
    });

    if (!clasificacionValid) {
      throw new HttpError('La clasificación no existe', 404);
    }

    if (clasificacionValid.IsActive === 1) {
      throw new HttpError('La clasificación ya ha sido activada', 300);
    }

    const clasificacionUpdate = await prisma.catalogo_clasificacion_refacciones.update({
      where: { ClasificacionRefaccionID },
      data: { IsActive: 1 },
    });

    return { message: 'Clasificación activada', data: clasificacionUpdate };
  }
}

export const clasificacionRefaccionesService = new ClasificacionRefaccionesService();
