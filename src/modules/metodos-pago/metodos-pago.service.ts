import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { CreateMetodoPagoDto, UpdateMetodoPagoDto } from './metodos-pago.schema';

export class MetodosPagoService {
  async create(data: CreateMetodoPagoDto) {
    const existing = await prisma.catalogo_metodos_pago.findFirst({
      where: { Descripcion: data.Descripcion },
    });
    if (existing) throw new HttpError('El método de pago ya existe', 300);

    return await prisma.catalogo_metodos_pago.create({
      data: { ...data, EsBancario: data.EsBancario ? 1 : 0, IsActive: 1 },
    });
  }

  async findAll() {
    return await prisma.catalogo_metodos_pago.findMany({
      orderBy: { MetodosDePagoID: 'desc' },
    });
  }

  async findOne(MetodosDePagoID: number) {
    const metodo = await prisma.catalogo_metodos_pago.findUnique({ where: { MetodosDePagoID } });
    if (!metodo) throw new HttpError('Método de pago no encontrado', 404);
    return metodo;
  }

  async update(MetodosDePagoID: number, data: UpdateMetodoPagoDto) {
    const existing = await prisma.catalogo_metodos_pago.findUnique({ where: { MetodosDePagoID } });
    if (!existing) throw new HttpError('No existe el método de pago', 404);

    const updateData: Record<string, unknown> = { ...data };
    if (data.EsBancario !== undefined) updateData.EsBancario = data.EsBancario ? 1 : 0;

    return await prisma.catalogo_metodos_pago.update({ where: { MetodosDePagoID }, data: updateData });
  }

  async baja(MetodosDePagoID: number) {
    const metodo = await prisma.catalogo_metodos_pago.findUnique({ where: { MetodosDePagoID } });
    if (!metodo) throw new HttpError('El método de pago no existe', 404);
    if (metodo.IsActive === 0) throw new HttpError('El método de pago ya ha sido dado de baja', 300);

    return await prisma.catalogo_metodos_pago.update({ where: { MetodosDePagoID }, data: { IsActive: 0 } });
  }

  async activar(MetodosDePagoID: number) {
    const metodo = await prisma.catalogo_metodos_pago.findUnique({ where: { MetodosDePagoID } });
    if (!metodo) throw new HttpError('El método de pago no existe', 404);
    if (metodo.IsActive === 1) throw new HttpError('El método de pago ya ha sido activado', 300);

    return await prisma.catalogo_metodos_pago.update({ where: { MetodosDePagoID }, data: { IsActive: 1 } });
  }
}

export const metodosPagoService = new MetodosPagoService();
