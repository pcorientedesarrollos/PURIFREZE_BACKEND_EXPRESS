import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { CreateProveedorDto, UpdateProveedorDto } from './proveedores.schema';

class ProveedoresService {
  async create(data: CreateProveedorDto) {
    const { NombreProveedor } = data;

    const findProveedor = await prisma.catalogo_proveedores.findFirst({
      where: { NombreProveedor },
    });

    if (findProveedor) {
      throw new HttpError('El proveedor ya existe', 300);
    }

    const proveedor = await prisma.catalogo_proveedores.create({
      data: {
        ...data,
        IsActive: true,
      },
    });

    return { message: 'Proveedor Creado', data: proveedor };
  }

  async findAll() {
    const allProveedores = await prisma.catalogo_proveedores.findMany({
      orderBy: {
        ProveedorID: 'desc',
      },
    });

    return { message: 'Proveedores obtenidos', data: allProveedores };
  }

  async findOne(ProveedorID: number) {
    const proveedor = await prisma.catalogo_proveedores.findUnique({
      where: { ProveedorID },
    });

    if (!proveedor) {
      throw new HttpError('Proveedor no encontrado', 404);
    }

    return { message: 'Proveedor obtenido', data: proveedor };
  }

  async update(ProveedorID: number, data: UpdateProveedorDto) {
    const { NombreProveedor } = data;

    const proveedorExist = await prisma.catalogo_proveedores.findUnique({
      where: { ProveedorID },
    });

    if (!proveedorExist) {
      throw new HttpError('No existe el proveedor', 404);
    }

    if (NombreProveedor) {
      const nameInUse = await prisma.catalogo_proveedores.findFirst({
        where: {
          NombreProveedor,
          ProveedorID: { not: ProveedorID },
        },
      });

      if (nameInUse) {
        throw new HttpError('El nombre de proveedor ya existe', 300);
      }
    }

    const proveedorUpdate = await prisma.catalogo_proveedores.update({
      where: { ProveedorID },
      data,
    });

    return { message: 'Proveedor Actualizado', data: proveedorUpdate };
  }

  async baja(ProveedorID: number) {
    const proveedorValid = await prisma.catalogo_proveedores.findUnique({
      where: { ProveedorID },
    });

    if (!proveedorValid) {
      throw new HttpError('El proveedor no existe', 404);
    }

    if (!proveedorValid.IsActive) {
      throw new HttpError('El proveedor ya ha sido dado de baja', 300);
    }

    const proveedorUpdate = await prisma.catalogo_proveedores.update({
      where: { ProveedorID },
      data: { IsActive: false },
    });

    return { message: 'Proveedor dado de baja', data: proveedorUpdate };
  }

  async activar(ProveedorID: number) {
    const proveedorValid = await prisma.catalogo_proveedores.findUnique({
      where: { ProveedorID },
    });

    if (!proveedorValid) {
      throw new HttpError('El proveedor no existe', 404);
    }

    if (proveedorValid.IsActive) {
      throw new HttpError('El proveedor ya ha sido activado', 300);
    }

    const proveedorUpdate = await prisma.catalogo_proveedores.update({
      where: { ProveedorID },
      data: { IsActive: true },
    });

    return { message: 'Proveedor activado', data: proveedorUpdate };
  }
}

export const proveedoresService = new ProveedoresService();
