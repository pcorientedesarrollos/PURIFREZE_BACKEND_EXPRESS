import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { CreateProveedorContactoDto, UpdateProveedorContactoDto } from './proveedores-contactos.schema';

class ProveedoresContactosService {
  async create(data: CreateProveedorContactoDto) {
    const { ProveedorID } = data;

    const proveedor = await prisma.catalogo_proveedores.findUnique({
      where: { ProveedorID },
    });

    if (!proveedor) {
      throw new HttpError('El proveedor no existe', 404);
    }

    const contacto = await prisma.proveedores_contactos.create({
      data: {
        ...data,
        IsActive: true,
      },
    });

    return { message: 'Contacto creado', data: contacto };
  }

  async findByProveedor(ProveedorID: number) {
    const proveedor = await prisma.catalogo_proveedores.findUnique({
      where: { ProveedorID },
    });

    if (!proveedor) {
      throw new HttpError('El proveedor no existe', 404);
    }

    const contactos = await prisma.proveedores_contactos.findMany({
      where: { ProveedorID },
      orderBy: { ContactoID: 'desc' },
    });

    return { message: 'Contactos del proveedor obtenidos', data: contactos };
  }

  async findOne(ContactoID: number) {
    const contacto = await prisma.proveedores_contactos.findUnique({
      where: { ContactoID },
    });

    if (!contacto) {
      throw new HttpError('Contacto no encontrado', 404);
    }

    return { message: 'Contacto obtenido', data: contacto };
  }

  async update(ContactoID: number, data: UpdateProveedorContactoDto) {
    const contactoExist = await prisma.proveedores_contactos.findUnique({
      where: { ContactoID },
    });

    if (!contactoExist) {
      throw new HttpError('No existe el contacto', 404);
    }

    const contactoUpdate = await prisma.proveedores_contactos.update({
      where: { ContactoID },
      data,
    });

    return { message: 'Contacto actualizado', data: contactoUpdate };
  }

  async baja(ContactoID: number) {
    const contactoValid = await prisma.proveedores_contactos.findUnique({
      where: { ContactoID },
    });

    if (!contactoValid) {
      throw new HttpError('El contacto no existe', 404);
    }

    if (!contactoValid.IsActive) {
      throw new HttpError('El contacto ya ha sido dado de baja', 300);
    }

    const contactoUpdate = await prisma.proveedores_contactos.update({
      where: { ContactoID },
      data: { IsActive: false },
    });

    return { message: 'Contacto dado de baja', data: contactoUpdate };
  }

  async activar(ContactoID: number) {
    const contactoValid = await prisma.proveedores_contactos.findUnique({
      where: { ContactoID },
    });

    if (!contactoValid) {
      throw new HttpError('El contacto no existe', 404);
    }

    if (contactoValid.IsActive) {
      throw new HttpError('El contacto ya ha sido activado', 300);
    }

    const contactoUpdate = await prisma.proveedores_contactos.update({
      where: { ContactoID },
      data: { IsActive: true },
    });

    return { message: 'Contacto activado', data: contactoUpdate };
  }
}

export const proveedoresContactosService = new ProveedoresContactosService();
