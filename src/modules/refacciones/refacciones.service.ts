import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { CreateRefaccionDto, UpdateRefaccionDto } from './refacciones.schema';

class RefaccionesService {
  /**
   * Genera el siguiente código único para una clasificación.
   * Usa MAX del número de secuencia existente en lugar de COUNT para evitar
   * duplicados cuando se eliminan o reclasifican refacciones.
   */
  private async generarCodigoUnico(prefixCodigo: string, excludeRefaccionID?: number): Promise<string> {
    const existentes = await prisma.catalogo_refacciones.findMany({
      where: {
        Codigo: { startsWith: `${prefixCodigo}-` },
        ...(excludeRefaccionID ? { RefaccionID: { not: excludeRefaccionID } } : {}),
      },
      select: { Codigo: true },
    });

    let maxSeq = 0;
    for (const r of existentes) {
      const m = r.Codigo?.match(/-(\d+)$/);
      if (m) {
        const seq = parseInt(m[1]);
        if (seq > maxSeq) maxSeq = seq;
      }
    }

    // Verificar unicidad iterando hasta encontrar un código libre
    let nextSeq = maxSeq + 1;
    let candidato = `${prefixCodigo}-${String(nextSeq).padStart(3, '0')}`;

    while (true) {
      const ocupado = await prisma.catalogo_refacciones.findFirst({
        where: {
          Codigo: candidato,
          ...(excludeRefaccionID ? { RefaccionID: { not: excludeRefaccionID } } : {}),
        },
      });
      if (!ocupado) break;
      nextSeq++;
      candidato = `${prefixCodigo}-${String(nextSeq).padStart(3, '0')}`;
    }

    return candidato;
  }

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

    if (!findClasificacion.Codigo) {
      throw new HttpError('La clasificación no tiene código asignado', 300);
    }

    const findUnidad = await prisma.catalogo_unidades.findUnique({
      where: { UnidadID },
    });

    if (!findUnidad) {
      throw new HttpError('La unidad no existe', 300);
    }

    // Generar código único usando MAX de secuencia existente (no COUNT)
    const codigoRefaccion = await this.generarCodigoUnico(findClasificacion.Codigo);

    // Mapear ClasificacionRefaccionID a ClasificacionID (nombre en Prisma)
    const { ClasificacionRefaccionID: ClasificacionID, ...restData } = data;

    const refaccion = await prisma.catalogo_refacciones.create({
      data: {
        ...restData,
        ClasificacionID,
        Codigo: codigoRefaccion,
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

    // Preparar datos de actualización
    const { ClasificacionRefaccionID: _, ...restData } = data;
    const updateData: any = { ...restData };

    // Si cambia la clasificación, regenerar el código
    if (ClasificacionRefaccionID !== undefined && ClasificacionRefaccionID !== refaccionExist.ClasificacionID) {
      const newClasificacion = await prisma.catalogo_clasificacion_refacciones.findUnique({
        where: { ClasificacionRefaccionID },
      });

      if (!newClasificacion) {
        throw new HttpError('La clasificación no existe', 300);
      }

      if (!newClasificacion.Codigo) {
        throw new HttpError('La clasificación no tiene código asignado', 300);
      }

      // Generar nuevo código único usando MAX de secuencia (no COUNT)
      const nuevoCodigo = await this.generarCodigoUnico(newClasificacion.Codigo!, RefaccionID);

      updateData.ClasificacionID = ClasificacionRefaccionID;
      updateData.Codigo = nuevoCodigo;
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
