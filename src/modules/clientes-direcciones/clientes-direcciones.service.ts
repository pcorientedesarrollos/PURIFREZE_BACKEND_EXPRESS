import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { CreateClienteDireccionDto, UpdateClienteDireccionDto } from './clientes-direcciones.schema';

class ClientesDireccionesService {
  async create(data: CreateClienteDireccionDto) {
    const direccion = await prisma.clientes_direcciones.create({
      data: {
        ...data,
        IsActive: true,
      },
    });

    return { message: 'Dirección Creada', data: direccion };
  }

  async findAll() {
    const allDirecciones = await prisma.clientes_direcciones.findMany({
      orderBy: {
        DireccionID: 'desc',
      },
    });

    return { message: 'Direcciones obtenidas', data: allDirecciones };
  }

  async findOne(DireccionID: number) {
    const direccion = await prisma.clientes_direcciones.findUnique({
      where: { DireccionID },
    });

    if (!direccion) {
      throw new HttpError('Dirección no encontrada', 404);
    }

    return { message: 'Dirección obtenida', data: direccion };
  }

  async findByClienteID(ClienteID: number) {
    const direccion = await prisma.clientes_direcciones.findFirst({
      where: { ClienteID, IsActive: true },
    });

    return { message: direccion ? 'Encontrado' : 'No encontrado', data: direccion };
  }

  async update(DireccionID: number, data: UpdateClienteDireccionDto) {
    const direccionExist = await prisma.clientes_direcciones.findUnique({
      where: { DireccionID },
    });

    if (!direccionExist) {
      throw new HttpError('No existe la dirección', 404);
    }

    const direccionUpdate = await prisma.clientes_direcciones.update({
      where: { DireccionID },
      data,
    });

    return { message: 'Dirección Actualizada', data: direccionUpdate };
  }

  async baja(DireccionID: number) {
    const direccionValid = await prisma.clientes_direcciones.findUnique({
      where: { DireccionID },
    });

    if (!direccionValid) {
      throw new HttpError('La dirección no existe', 404);
    }

    if (!direccionValid.IsActive) {
      throw new HttpError('La dirección ya ha sido dada de baja', 300);
    }

    const direccionUpdate = await prisma.clientes_direcciones.update({
      where: { DireccionID },
      data: { IsActive: false },
    });

    return { message: 'Dirección dada de baja', data: direccionUpdate };
  }

  async activar(DireccionID: number) {
    const direccionValid = await prisma.clientes_direcciones.findUnique({
      where: { DireccionID },
    });

    if (!direccionValid) {
      throw new HttpError('La dirección no existe', 404);
    }

    if (direccionValid.IsActive) {
      throw new HttpError('La dirección ya ha sido activada', 300);
    }

    const direccionUpdate = await prisma.clientes_direcciones.update({
      where: { DireccionID },
      data: { IsActive: true },
    });

    return { message: 'Dirección activada', data: direccionUpdate };
  }
}

export const clientesDireccionesService = new ClientesDireccionesService();
