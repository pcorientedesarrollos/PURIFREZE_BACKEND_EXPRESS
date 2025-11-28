import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { CreateClienteCorreoDto, UpdateClienteCorreoDto } from './clientes-correos.schema';

class ClientesCorreosService {
  async create(data: CreateClienteCorreoDto) {
    const { Correo, ClienteID, EmpleadoID } = data;

    if (!ClienteID && !EmpleadoID) {
      throw new HttpError('Debe proporcionar un ClienteID o un EmpleadoID', 400);
    }

    const findCorreo = await prisma.clientes_correos.findFirst({
      where: { Correo },
    });

    if (findCorreo) {
      throw new HttpError('El correo electrónico ya existe', 300);
    }

    const correo = await prisma.clientes_correos.create({
      data: {
        ...data,
        IsActive: true,
      },
    });

    return { message: 'Correo Creado', data: correo };
  }

  async findAll() {
    const allCorreos = await prisma.clientes_correos.findMany({
      orderBy: {
        CorreoID: 'desc',
      },
    });

    return { message: 'Correos obtenidos', data: allCorreos };
  }

  async findOne(CorreoID: number) {
    const correo = await prisma.clientes_correos.findUnique({
      where: { CorreoID },
    });

    if (!correo) {
      throw new HttpError('Correo no encontrado', 404);
    }

    return { message: 'Correo obtenido', data: correo };
  }

  async update(CorreoID: number, data: UpdateClienteCorreoDto) {
    const { Correo } = data;

    const correoExist = await prisma.clientes_correos.findUnique({
      where: { CorreoID },
    });

    if (!correoExist) {
      throw new HttpError('No existe el correo', 404);
    }

    if (Correo) {
      const nameInUse = await prisma.clientes_correos.findFirst({
        where: {
          Correo,
          CorreoID: { not: CorreoID },
        },
      });

      if (nameInUse) {
        throw new HttpError('El correo electrónico ya existe', 300);
      }
    }

    const correoUpdate = await prisma.clientes_correos.update({
      where: { CorreoID },
      data,
    });

    return { message: 'Correo Actualizado', data: correoUpdate };
  }

  async baja(CorreoID: number) {
    const correoValid = await prisma.clientes_correos.findUnique({
      where: { CorreoID },
    });

    if (!correoValid) {
      throw new HttpError('El correo no existe', 404);
    }

    if (!correoValid.IsActive) {
      throw new HttpError('El correo ya ha sido dado de baja', 300);
    }

    const correoUpdate = await prisma.clientes_correos.update({
      where: { CorreoID },
      data: { IsActive: false },
    });

    return { message: 'Correo dado de baja', data: correoUpdate };
  }

  async activar(CorreoID: number) {
    const correoValid = await prisma.clientes_correos.findUnique({
      where: { CorreoID },
    });

    if (!correoValid) {
      throw new HttpError('El correo no existe', 404);
    }

    if (correoValid.IsActive) {
      throw new HttpError('El correo ya ha sido activado', 300);
    }

    const correoUpdate = await prisma.clientes_correos.update({
      where: { CorreoID },
      data: { IsActive: true },
    });

    return { message: 'Correo activado', data: correoUpdate };
  }
}

export const clientesCorreosService = new ClientesCorreosService();
