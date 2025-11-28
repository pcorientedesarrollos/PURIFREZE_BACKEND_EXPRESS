import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { CreateUnidadDto, UpdateUnidadDto } from './unidades.schema';

export class UnidadesService {
  async create(data: CreateUnidadDto) {
    const existing = await prisma.catalogo_unidades.findFirst({
      where: { DesUnidad: data.DesUnidad },
    });

    if (existing) {
      throw new HttpError('La descripción de la unidad ya existe', 300);
    }

    return await prisma.catalogo_unidades.create({
      data: { ...data, EsFraccionable: data.EsFraccionable ? 1 : 0, IsActive: true },
    });
  }

  async findAll() {
    return await prisma.catalogo_unidades.findMany({
      orderBy: { UnidadID: 'desc' },
    });
  }

  async findOne(UnidadID: number) {
    const unidad = await prisma.catalogo_unidades.findUnique({ where: { UnidadID } });
    if (!unidad) throw new HttpError('Unidad no encontrada', 404);
    return unidad;
  }

  async update(UnidadID: number, data: UpdateUnidadDto) {
    const existing = await prisma.catalogo_unidades.findUnique({ where: { UnidadID } });
    if (!existing) throw new HttpError('No existe la unidad', 404);

    if (data.DesUnidad) {
      const nameInUse = await prisma.catalogo_unidades.findFirst({
        where: { DesUnidad: data.DesUnidad, UnidadID: { not: UnidadID } },
      });
      if (nameInUse) throw new HttpError('La descripción de la unidad ya existe', 300);
    }

    const updateData: Record<string, unknown> = { ...data };
    if (data.EsFraccionable !== undefined) {
      updateData.EsFraccionable = data.EsFraccionable ? 1 : 0;
    }

    return await prisma.catalogo_unidades.update({ where: { UnidadID }, data: updateData });
  }

  async baja(UnidadID: number) {
    const unidad = await prisma.catalogo_unidades.findUnique({ where: { UnidadID } });
    if (!unidad) throw new HttpError('La unidad no existe', 404);
    if (!unidad.IsActive) throw new HttpError('La unidad ya ha sido dada de baja', 300);

    return await prisma.catalogo_unidades.update({
      where: { UnidadID },
      data: { IsActive: false },
    });
  }

  async activar(UnidadID: number) {
    const unidad = await prisma.catalogo_unidades.findUnique({ where: { UnidadID } });
    if (!unidad) throw new HttpError('La unidad no existe', 404);
    if (unidad.IsActive) throw new HttpError('La unidad ya ha sido activada', 300);

    return await prisma.catalogo_unidades.update({
      where: { UnidadID },
      data: { IsActive: true },
    });
  }
}

export const unidadesService = new UnidadesService();
