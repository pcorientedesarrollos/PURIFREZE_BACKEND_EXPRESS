import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { CreateClasificacionRefaccionDto, UpdateClasificacionRefaccionDto } from './clasificacion-refacciones.schema';

class ClasificacionRefaccionesService {
  async create(data: CreateClasificacionRefaccionDto) {
    const { NombreClasificacion, Codigo } = data;

    // Validar que el código no esté duplicado
    const findByCodigo = await prisma.catalogo_clasificacion_refacciones.findUnique({
      where: { Codigo },
    });

    if (findByCodigo) {
      throw new HttpError('El código de clasificación ya existe', 300);
    }

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
    const { NombreClasificacion, Codigo } = data;

    const clasificacionExist = await prisma.catalogo_clasificacion_refacciones.findUnique({
      where: { ClasificacionRefaccionID },
    });

    if (!clasificacionExist) {
      throw new HttpError('No existe la clasificación', 404);
    }

    // Determinar si es primera asignación de código (antes no tenía y ahora sí)
    const esPrimeraAsignacionCodigo = !clasificacionExist.Codigo && Codigo;

    // Validar si se intenta CAMBIAR el código (ya tenía uno diferente)
    if (Codigo !== undefined && clasificacionExist.Codigo && Codigo !== clasificacionExist.Codigo) {
      // Verificar si hay refacciones asociadas con código ya asignado
      const refaccionesConCodigo = await prisma.catalogo_refacciones.count({
        where: {
          ClasificacionID: ClasificacionRefaccionID,
          Codigo: { not: null }
        },
      });

      if (refaccionesConCodigo > 0) {
        throw new HttpError('No se puede editar el código porque ya existen refacciones con folios generados', 300);
      }
    }

    // Verificar que el nuevo código no esté en uso por otra clasificación
    if (Codigo && Codigo !== clasificacionExist.Codigo) {
      const codigoInUse = await prisma.catalogo_clasificacion_refacciones.findUnique({
        where: { Codigo },
      });

      if (codigoInUse) {
        throw new HttpError('El código de clasificación ya existe', 300);
      }
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

    // Usar transacción para actualizar clasificación y generar códigos
    const resultado = await prisma.$transaction(async (tx) => {
      // Actualizar la clasificación
      const clasificacionUpdate = await tx.catalogo_clasificacion_refacciones.update({
        where: { ClasificacionRefaccionID },
        data,
      });

      // Si es primera asignación de código, generar códigos para refacciones sin código
      if (esPrimeraAsignacionCodigo && Codigo) {
        const refaccionesSinCodigo = await tx.catalogo_refacciones.findMany({
          where: {
            ClasificacionID: ClasificacionRefaccionID,
            OR: [
              { Codigo: null },
              { Codigo: '' }
            ]
          },
          orderBy: { RefaccionID: 'asc' }
        });

        // Contar refacciones que YA tienen código para continuar el consecutivo
        const refaccionesConCodigo = await tx.catalogo_refacciones.count({
          where: {
            ClasificacionID: ClasificacionRefaccionID,
            Codigo: { not: null },
            NOT: { Codigo: '' }
          }
        });

        // Generar códigos consecutivos
        for (let i = 0; i < refaccionesSinCodigo.length; i++) {
          const consecutivo = (refaccionesConCodigo + i + 1).toString().padStart(3, '0');
          const codigoRefaccion = `${Codigo}-${consecutivo}`;

          await tx.catalogo_refacciones.update({
            where: { RefaccionID: refaccionesSinCodigo[i].RefaccionID },
            data: { Codigo: codigoRefaccion }
          });
        }

        return {
          clasificacion: clasificacionUpdate,
          refaccionesActualizadas: refaccionesSinCodigo.length
        };
      }

      return { clasificacion: clasificacionUpdate, refaccionesActualizadas: 0 };
    });

    const mensaje = resultado.refaccionesActualizadas > 0
      ? `Clasificación Actualizada. Se generaron ${resultado.refaccionesActualizadas} códigos de refacciones.`
      : 'Clasificación Actualizada';

    return { message: mensaje, data: resultado.clasificacion };
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
