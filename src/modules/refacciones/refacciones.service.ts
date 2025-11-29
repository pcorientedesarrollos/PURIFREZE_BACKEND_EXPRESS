import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { CreateRefaccionDto, UpdateRefaccionDto } from './refacciones.schema';

class RefaccionesService {
  async create(data: CreateRefaccionDto) {
    const { NombrePieza, UnidadID, ClasificacionRefaccionID } = data;

    const findRefaccion = await prisma.catalogo_refacciones.findFirst({
      where: { NombrePieza },
    });

    if (findRefaccion) {
      throw new HttpError('El nombre de la pieza ya existe', 300);
    }

    const findClasificacion = await prisma.catalogo_clasificacion_refacciones.findUnique({
      where: { ClasificacionRefaccionID },
    });

    if (!findClasificacion) {
      throw new HttpError('La clasificación no existe', 300);
    }

    const findUnidad = await prisma.catalogo_unidades.findUnique({
      where: { UnidadID },
    });

    if (!findUnidad) {
      throw new HttpError('La unidad no existe', 300);
    }

    // Mapear ClasificacionRefaccionID a ClasificacionID (nombre en Prisma)
    const { ClasificacionRefaccionID: ClasificacionID, ...restData } = data;

    const refaccion = await prisma.catalogo_refacciones.create({
      data: {
        ...restData,
        ClasificacionID,
        IsActive: true,
      },
    });

    return { message: 'Refacción Creada', data: refaccion };
  }

  async findAll() {
    const allRefacciones = await prisma.catalogo_refacciones.findMany({
      include: {
        catalogo_unidades: true,
        catalogo_clasificacion_refacciones: true,
      },
      orderBy: {
        RefaccionID: 'desc',
      },
    });

    return { message: 'Refacciones obtenidas', data: allRefacciones };
  }

  async findOne(RefaccionID: number) {
    const refaccion = await prisma.catalogo_refacciones.findUnique({
      where: { RefaccionID },
      include: {
        catalogo_unidades: true,
        catalogo_clasificacion_refacciones: true,
      },
    });

    if (!refaccion) {
      throw new HttpError('Refacción no encontrada', 404);
    }

    return { message: 'Refacción obtenida', data: refaccion };
  }

  async update(RefaccionID: number, data: UpdateRefaccionDto) {
    const { NombrePieza, ClasificacionRefaccionID, UnidadID } = data;

    const refaccionExist = await prisma.catalogo_refacciones.findUnique({
      where: { RefaccionID },
    });

    if (!refaccionExist) {
      throw new HttpError('No existe la refacción', 404);
    }

    if (ClasificacionRefaccionID) {
      const findClasificacion = await prisma.catalogo_clasificacion_refacciones.findUnique({
        where: { ClasificacionRefaccionID },
      });

      if (!findClasificacion) {
        throw new HttpError('La clasificación no existe', 300);
      }
    }

    if (UnidadID) {
      const findUnidad = await prisma.catalogo_unidades.findUnique({
        where: { UnidadID },
      });

      if (!findUnidad) {
        throw new HttpError('La unidad no existe', 300);
      }
    }

    if (NombrePieza) {
      const nameInUse = await prisma.catalogo_refacciones.findFirst({
        where: {
          NombrePieza,
          RefaccionID: { not: RefaccionID },
        },
      });

      if (nameInUse) {
        throw new HttpError('El nombre de la pieza ya existe', 300);
      }
    }

    // Mapear ClasificacionRefaccionID a ClasificacionID (nombre en Prisma)
    const { ClasificacionRefaccionID: _, ...restData } = data;
    const updateData: any = { ...restData };
    if (ClasificacionRefaccionID !== undefined) {
      updateData.ClasificacionID = ClasificacionRefaccionID;
    }

    const refaccionUpdate = await prisma.catalogo_refacciones.update({
      where: { RefaccionID },
      data: updateData,
    });

    return { message: 'Refacción Actualizada', data: refaccionUpdate };
  }

  async baja(RefaccionID: number) {
    const refaccionValid = await prisma.catalogo_refacciones.findUnique({
      where: { RefaccionID },
    });

    if (!refaccionValid) {
      throw new HttpError('La refacción no existe', 404);
    }

    if (!refaccionValid.IsActive) {
      throw new HttpError('La refacción ya ha sido dada de baja', 300);
    }

    const refaccionUpdate = await prisma.catalogo_refacciones.update({
      where: { RefaccionID },
      data: { IsActive: false },
    });

    return { message: 'Refacción dada de baja', data: refaccionUpdate };
  }

  async activar(RefaccionID: number) {
    const refaccionValid = await prisma.catalogo_refacciones.findUnique({
      where: { RefaccionID },
    });

    if (!refaccionValid) {
      throw new HttpError('La refacción no existe', 404);
    }

    if (refaccionValid.IsActive) {
      throw new HttpError('La refacción ya ha sido activada', 300);
    }

    const refaccionUpdate = await prisma.catalogo_refacciones.update({
      where: { RefaccionID },
      data: { IsActive: true },
    });

    return { message: 'Refacción activada', data: refaccionUpdate };
  }
}

export const refaccionesService = new RefaccionesService();
