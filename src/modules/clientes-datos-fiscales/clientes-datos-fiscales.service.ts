import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { CreateClienteDatosFiscalesDto, UpdateClienteDatosFiscalesDto } from './clientes-datos-fiscales.schema';

class ClientesDatosFiscalesService {
  async create(data: CreateClienteDatosFiscalesDto) {
    const { RazonSocial, RFC } = data;

    const findRazonSocial = await prisma.clientes_datosFiscales.findFirst({
      where: { RazonSocial },
    });

    if (findRazonSocial) {
      throw new HttpError('La Razón Social ya existe', 300);
    }

    const findRFC = await prisma.clientes_datosFiscales.findFirst({
      where: { RFC },
    });

    if (findRFC) {
      throw new HttpError('El RFC ya existe', 300);
    }

    const datosFiscales = await prisma.clientes_datosFiscales.create({
      data: {
        ...data,
        IsActive: true,
      },
    });

    return { message: 'Datos Fiscales Creados', data: datosFiscales };
  }

  async findAll() {
    const allData = await prisma.clientes_datosFiscales.findMany({
      orderBy: {
        DatosFiscalesID: 'desc',
      },
    });

    return { message: 'Datos Fiscales obtenidos', data: allData };
  }

  async findByClienteID(ClienteID: number) {
    const data = await prisma.clientes_datosFiscales.findFirst({
      where: { ClienteID, IsActive: true },
    });

    if (!data) {
      return { message: 'El cliente no tiene datos fiscales registrados', data: null };
    }

    return { message: 'Datos Fiscales obtenidos', data };
  }

  async findOne(DatosFiscalesID: number) {
    const data = await prisma.clientes_datosFiscales.findUnique({
      where: { DatosFiscalesID },
    });

    if (!data) {
      throw new HttpError('Datos Fiscales no encontrados', 404);
    }

    return { message: 'Datos Fiscales obtenidos', data };
  }

  async update(DatosFiscalesID: number, data: UpdateClienteDatosFiscalesDto) {
    const { RazonSocial, RFC } = data;

    const dataExist = await prisma.clientes_datosFiscales.findUnique({
      where: { DatosFiscalesID },
    });

    if (!dataExist) {
      throw new HttpError('No existen los Datos Fiscales', 404);
    }

    if (RazonSocial) {
      const nameInUse = await prisma.clientes_datosFiscales.findFirst({
        where: {
          RazonSocial,
          DatosFiscalesID: { not: DatosFiscalesID },
        },
      });

      if (nameInUse) {
        throw new HttpError('La Razón Social ya existe', 300);
      }
    }

    if (RFC) {
      const rfcInUse = await prisma.clientes_datosFiscales.findFirst({
        where: {
          RFC,
          DatosFiscalesID: { not: DatosFiscalesID },
        },
      });

      if (rfcInUse) {
        throw new HttpError('El RFC ya existe', 300);
      }
    }

    const dataUpdate = await prisma.clientes_datosFiscales.update({
      where: { DatosFiscalesID },
      data,
    });

    return { message: 'Datos Fiscales Actualizados', data: dataUpdate };
  }

  async baja(DatosFiscalesID: number) {
    const dataValid = await prisma.clientes_datosFiscales.findUnique({
      where: { DatosFiscalesID },
    });

    if (!dataValid) {
      throw new HttpError('Los Datos Fiscales no existen', 404);
    }

    if (!dataValid.IsActive) {
      throw new HttpError('Los Datos Fiscales ya han sido dados de baja', 300);
    }

    const dataUpdate = await prisma.clientes_datosFiscales.update({
      where: { DatosFiscalesID },
      data: { IsActive: false },
    });

    return { message: 'Datos Fiscales dados de baja', data: dataUpdate };
  }

  async activar(DatosFiscalesID: number) {
    const dataValid = await prisma.clientes_datosFiscales.findUnique({
      where: { DatosFiscalesID },
    });

    if (!dataValid) {
      throw new HttpError('Los Datos Fiscales no existen', 404);
    }

    if (dataValid.IsActive) {
      throw new HttpError('Los Datos Fiscales ya han sido activados', 300);
    }

    const dataUpdate = await prisma.clientes_datosFiscales.update({
      where: { DatosFiscalesID },
      data: { IsActive: true },
    });

    return { message: 'Datos Fiscales activados', data: dataUpdate };
  }
}

export const clientesDatosFiscalesService = new ClientesDatosFiscalesService();
