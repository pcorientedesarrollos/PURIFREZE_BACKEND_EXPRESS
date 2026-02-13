import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { CreateGiroNegocioDto, UpdateGiroNegocioDto } from './giros-negocio.schema';

class GirosNegocioService {
  async create(data: CreateGiroNegocioDto) {
    const giroNegocio = await prisma.catalogo_giros_negocio.create({
      data: {
        ...data,
        IsActive: true,
      },
    });

    return { message: 'Giro de Negocio creado', data: giroNegocio };
  }

  async findAll() {
    const allData = await prisma.catalogo_giros_negocio.findMany({
      orderBy: {
        GiroNegocioID: 'desc',
      },
    });

    return { message: 'Giros de Negocio obtenidos', data: allData };
  }

  async findOne(GiroNegocioID: number) {
    const data = await prisma.catalogo_giros_negocio.findUnique({
      where: { GiroNegocioID },
    });

    if (!data) {
      throw new HttpError('Giro de Negocio no encontrado', 404);
    }

    return { message: 'Giro de Negocio obtenido', data };
  }

  async update(GiroNegocioID: number, data: UpdateGiroNegocioDto) {
    const dataExist = await prisma.catalogo_giros_negocio.findUnique({
      where: { GiroNegocioID },
    });

    if (!dataExist) {
      throw new HttpError('No existe el Giro de Negocio', 404);
    }

    const dataUpdate = await prisma.catalogo_giros_negocio.update({
      where: { GiroNegocioID },
      data,
    });

    return { message: 'Giro de Negocio actualizado', data: dataUpdate };
  }

  async baja(GiroNegocioID: number) {
    const dataValid = await prisma.catalogo_giros_negocio.findUnique({
      where: { GiroNegocioID },
    });

    if (!dataValid) {
      throw new HttpError('El Giro de Negocio no existe', 404);
    }

    if (!dataValid.IsActive) {
      throw new HttpError('El Giro de Negocio ya ha sido dado de baja', 300);
    }

    const dataUpdate = await prisma.catalogo_giros_negocio.update({
      where: { GiroNegocioID },
      data: { IsActive: false },
    });

    return { message: 'Giro de Negocio dado de baja', data: dataUpdate };
  }

  async activar(GiroNegocioID: number) {
    const dataValid = await prisma.catalogo_giros_negocio.findUnique({
      where: { GiroNegocioID },
    });

    if (!dataValid) {
      throw new HttpError('El Giro de Negocio no existe', 404);
    }

    if (dataValid.IsActive) {
      throw new HttpError('El Giro de Negocio ya está activo', 300);
    }

    const dataUpdate = await prisma.catalogo_giros_negocio.update({
      where: { GiroNegocioID },
      data: { IsActive: true },
    });

    return { message: 'Giro de Negocio activado', data: dataUpdate };
  }
}

export const girosNegocioService = new GirosNegocioService();
