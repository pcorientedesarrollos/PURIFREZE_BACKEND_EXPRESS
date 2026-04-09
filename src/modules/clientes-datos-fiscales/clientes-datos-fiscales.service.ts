import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { CreateClienteDatosFiscalesDto, UpdateClienteDatosFiscalesDto } from './clientes-datos-fiscales.schema';

class ClientesDatosFiscalesService {
  async create(data: CreateClienteDatosFiscalesDto) {
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
    const dataExist = await prisma.clientes_datosFiscales.findUnique({
      where: { DatosFiscalesID },
    });

    if (!dataExist) {
      throw new HttpError('No existen los Datos Fiscales', 404);
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

  /**
   * Obtener catálogo de RFC de un cliente con info de sucursales asignadas
   */
  async findCatalogoByCliente(ClienteID: number) {
    const datosFiscales = await prisma.clientes_datosFiscales.findMany({
      where: {
        ClienteID,
        IsActive: true,
      },
      include: {
        sucursales: {
          where: { IsActive: true },
          select: {
            SucursalID: true,
            NombreSucursal: true,
            EsMatriz: true,
          },
        },
      },
      orderBy: { DatosFiscalesID: 'desc' },
    });

    return {
      message: 'Catálogo de RFC obtenido',
      data: datosFiscales.map(df => ({
        ...df,
        sucursalesAsignadas: df.sucursales.length,
      })),
    };
  }
}

export const clientesDatosFiscalesService = new ClientesDatosFiscalesService();
