import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { CreateClienteSucursalDto, UpdateClienteSucursalDto } from './clientes-sucursales.schema';

class ClientesSucursalesService {
  async create(data: CreateClienteSucursalDto) {
    // Validar que el cliente existe
    const clienteExists = await prisma.catalogo_clientes.findUnique({
      where: { ClienteID: data.ClienteID },
    });

    if (!clienteExists) {
      throw new HttpError('El cliente no existe', 404);
    }

    if (!clienteExists.IsActive) {
      throw new HttpError('El cliente no está activo', 300);
    }

    // Validar nombre único por cliente
    const sucursalExists = await prisma.clientes_sucursales.findFirst({
      where: {
        ClienteID: data.ClienteID,
        NombreSucursal: data.NombreSucursal,
        IsActive: true,
      },
    });

    if (sucursalExists) {
      throw new HttpError('Ya existe una sucursal con ese nombre para este cliente', 300);
    }

    const sucursal = await prisma.clientes_sucursales.create({
      data: {
        ...data,
        IsActive: true,
      },
      include: {
        cliente: {
          select: {
            ClienteID: true,
            NombreComercio: true,
          },
        },
      },
    });

    return { message: 'Sucursal creada', data: sucursal };
  }

  async findAll() {
    const sucursales = await prisma.clientes_sucursales.findMany({
      orderBy: {
        SucursalID: 'desc',
      },
      include: {
        cliente: {
          select: {
            ClienteID: true,
            NombreComercio: true,
          },
        },
      },
    });

    return { message: 'Sucursales obtenidas', data: sucursales };
  }

  async findOne(SucursalID: number) {
    const sucursal = await prisma.clientes_sucursales.findUnique({
      where: { SucursalID },
      include: {
        cliente: {
          select: {
            ClienteID: true,
            NombreComercio: true,
          },
        },
      },
    });

    if (!sucursal) {
      throw new HttpError('Sucursal no encontrada', 404);
    }

    return { message: 'Sucursal obtenida', data: sucursal };
  }

  async findByClienteID(ClienteID: number) {
    const sucursales = await prisma.clientes_sucursales.findMany({
      where: { ClienteID, IsActive: true },
      orderBy: {
        NombreSucursal: 'asc',
      },
      include: {
        cliente: {
          select: {
            ClienteID: true,
            NombreComercio: true,
          },
        },
      },
    });

    return { message: 'Sucursales del cliente obtenidas', data: sucursales };
  }

  async update(SucursalID: number, data: UpdateClienteSucursalDto) {
    const sucursalExist = await prisma.clientes_sucursales.findUnique({
      where: { SucursalID },
    });

    if (!sucursalExist) {
      throw new HttpError('La sucursal no existe', 404);
    }

    // Si se actualiza el nombre, validar que no exista otra con el mismo nombre para el mismo cliente
    if (data.NombreSucursal && data.NombreSucursal !== sucursalExist.NombreSucursal) {
      const duplicado = await prisma.clientes_sucursales.findFirst({
        where: {
          ClienteID: sucursalExist.ClienteID,
          NombreSucursal: data.NombreSucursal,
          IsActive: true,
          SucursalID: { not: SucursalID },
        },
      });

      if (duplicado) {
        throw new HttpError('Ya existe una sucursal con ese nombre para este cliente', 300);
      }
    }

    const sucursalUpdate = await prisma.clientes_sucursales.update({
      where: { SucursalID },
      data,
      include: {
        cliente: {
          select: {
            ClienteID: true,
            NombreComercio: true,
          },
        },
      },
    });

    return { message: 'Sucursal actualizada', data: sucursalUpdate };
  }

  async baja(SucursalID: number) {
    const sucursalValid = await prisma.clientes_sucursales.findUnique({
      where: { SucursalID },
    });

    if (!sucursalValid) {
      throw new HttpError('La sucursal no existe', 404);
    }

    if (!sucursalValid.IsActive) {
      throw new HttpError('La sucursal ya ha sido dada de baja', 300);
    }

    const sucursalUpdate = await prisma.clientes_sucursales.update({
      where: { SucursalID },
      data: { IsActive: false },
    });

    return { message: 'Sucursal dada de baja', data: sucursalUpdate };
  }

  async activar(SucursalID: number) {
    const sucursalValid = await prisma.clientes_sucursales.findUnique({
      where: { SucursalID },
    });

    if (!sucursalValid) {
      throw new HttpError('La sucursal no existe', 404);
    }

    if (sucursalValid.IsActive) {
      throw new HttpError('La sucursal ya está activa', 300);
    }

    const sucursalUpdate = await prisma.clientes_sucursales.update({
      where: { SucursalID },
      data: { IsActive: true },
    });

    return { message: 'Sucursal activada', data: sucursalUpdate };
  }
}

export const clientesSucursalesService = new ClientesSucursalesService();
