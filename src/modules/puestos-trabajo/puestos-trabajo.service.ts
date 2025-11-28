import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { CreatePuestoTrabajoDto, UpdatePuestoTrabajoDto } from './puestos-trabajo.schema';

export class PuestosTrabajoService {
  async create(data: CreatePuestoTrabajoDto) {
    const existing = await prisma.catalogo_puestosTrabajo.findFirst({
      where: { PuestoTrabajo: data.PuestoTrabajo },
    });
    if (existing) throw new HttpError('El puesto de trabajo ya existe', 300);

    return await prisma.catalogo_puestosTrabajo.create({
      data: { ...data, IsActive: true },
    });
  }

  async findAll() {
    return await prisma.catalogo_puestosTrabajo.findMany({
      orderBy: { PuestoTrabajoID: 'desc' },
    });
  }

  async findOne(PuestoTrabajoID: number) {
    const puesto = await prisma.catalogo_puestosTrabajo.findUnique({ where: { PuestoTrabajoID } });
    if (!puesto) throw new HttpError('Puesto de trabajo no encontrado', 404);
    return puesto;
  }

  async update(PuestoTrabajoID: number, data: UpdatePuestoTrabajoDto) {
    const existing = await prisma.catalogo_puestosTrabajo.findUnique({ where: { PuestoTrabajoID } });
    if (!existing) throw new HttpError('No existe el puesto de trabajo', 404);

    return await prisma.catalogo_puestosTrabajo.update({ where: { PuestoTrabajoID }, data });
  }

  async baja(PuestoTrabajoID: number) {
    const puesto = await prisma.catalogo_puestosTrabajo.findUnique({ where: { PuestoTrabajoID } });
    if (!puesto) throw new HttpError('El puesto de trabajo no existe', 404);
    if (!puesto.IsActive) throw new HttpError('El puesto ya ha sido dado de baja', 300);

    return await prisma.catalogo_puestosTrabajo.update({ where: { PuestoTrabajoID }, data: { IsActive: false } });
  }

  async activar(PuestoTrabajoID: number) {
    const puesto = await prisma.catalogo_puestosTrabajo.findUnique({ where: { PuestoTrabajoID } });
    if (!puesto) throw new HttpError('El puesto de trabajo no existe', 404);
    if (puesto.IsActive) throw new HttpError('El puesto ya ha sido activado', 300);

    return await prisma.catalogo_puestosTrabajo.update({ where: { PuestoTrabajoID }, data: { IsActive: true } });
  }
}

export const puestosTrabajoService = new PuestosTrabajoService();
