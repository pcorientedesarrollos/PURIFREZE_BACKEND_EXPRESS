import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { CreateClienteTelefonoDto, UpdateClienteTelefonoDto } from './clientes-telefonos.schema';

class ClientesTelefonosService {
  async create(data: CreateClienteTelefonoDto) {
    const { Telefono } = data;

    const findTelefono = await prisma.clientes_telefonos.findFirst({
      where: { Telefono },
    });

    if (findTelefono) {
      throw new HttpError('El número de teléfono ya existe', 300);
    }

    const telefono = await prisma.clientes_telefonos.create({
      data: {
        ...data,
        IsActive: true,
      },
    });

    return { message: 'Teléfono Creado', data: telefono };
  }

  async findAll() {
    const allTelefonos = await prisma.clientes_telefonos.findMany({
      orderBy: {
        TelefonoID: 'desc',
      },
    });

    return { message: 'Teléfonos obtenidos', data: allTelefonos };
  }

  async findOne(TelefonoID: number) {
    const telefono = await prisma.clientes_telefonos.findUnique({
      where: { TelefonoID },
    });

    if (!telefono) {
      throw new HttpError('Teléfono no encontrado', 404);
    }

    return { message: 'Teléfono obtenido', data: telefono };
  }

  async findByEmpleadoID(EmpleadoID: number) {
    const telefonos = await prisma.clientes_telefonos.findMany({
      where: { EmpleadoID },
      orderBy: { TelefonoID: 'desc' },
    });

    return { message: 'Teléfonos del empleado obtenidos', data: telefonos };
  }

  async update(TelefonoID: number, data: UpdateClienteTelefonoDto) {
    const { Telefono } = data;

    const telefonoExist = await prisma.clientes_telefonos.findUnique({
      where: { TelefonoID },
    });

    if (!telefonoExist) {
      throw new HttpError('No existe el teléfono', 404);
    }

    if (Telefono) {
      const nameInUse = await prisma.clientes_telefonos.findFirst({
        where: {
          Telefono,
          TelefonoID: { not: TelefonoID },
        },
      });

      if (nameInUse) {
        throw new HttpError('El número de teléfono ya existe', 300);
      }
    }

    const telefonoUpdate = await prisma.clientes_telefonos.update({
      where: { TelefonoID },
      data,
    });

    return { message: 'Teléfono Actualizado', data: telefonoUpdate };
  }

  async baja(TelefonoID: number) {
    const telefonoValid = await prisma.clientes_telefonos.findUnique({
      where: { TelefonoID },
    });

    if (!telefonoValid) {
      throw new HttpError('El teléfono no existe', 404);
    }

    if (!telefonoValid.IsActive) {
      throw new HttpError('El teléfono ya ha sido dado de baja', 300);
    }

    const telefonoUpdate = await prisma.clientes_telefonos.update({
      where: { TelefonoID },
      data: { IsActive: false },
    });

    return { message: 'Teléfono dado de baja', data: telefonoUpdate };
  }

  async activar(TelefonoID: number) {
    const telefonoValid = await prisma.clientes_telefonos.findUnique({
      where: { TelefonoID },
    });

    if (!telefonoValid) {
      throw new HttpError('El teléfono no existe', 404);
    }

    if (telefonoValid.IsActive) {
      throw new HttpError('El teléfono ya ha sido activado', 300);
    }

    const telefonoUpdate = await prisma.clientes_telefonos.update({
      where: { TelefonoID },
      data: { IsActive: true },
    });

    return { message: 'Teléfono activado', data: telefonoUpdate };
  }
}

export const clientesTelefonosService = new ClientesTelefonosService();
