import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { CreateProveedorDto, UpdateProveedorDto } from './proveedores.schema';
import bcrypt from 'bcrypt';

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
      include: {
        contactos: {
          where: { IsActive: true },
        },
      },
    });

    return { message: 'Proveedores obtenidos', data: allProveedores };
  }

  async findOne(ProveedorID: number) {
    const proveedor = await prisma.catalogo_proveedores.findUnique({
      where: { ProveedorID },
      include: {
        contactos: true,
      },
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

  /**
   * Genera un usuario de tipo PROVEEDOR para un proveedor existente
   */
  async generarUsuario(ProveedorID: number, password?: string) {
    const proveedor = await prisma.catalogo_proveedores.findUnique({
      where: { ProveedorID },
    });

    if (!proveedor) {
      throw new HttpError('Proveedor no encontrado', 404);
    }

    if (!proveedor.IsActive) {
      throw new HttpError('El proveedor no está activo', 400);
    }

    // Verificar si ya tiene un usuario asignado
    const usuarioExistente = await prisma.usuarios.findFirst({
      where: { ProveedorID },
    });

    if (usuarioExistente) {
      throw new HttpError('El proveedor ya tiene un usuario asignado', 400);
    }

    // Generar nombre de usuario basado en el nombre del proveedor
    const nombreBase = (proveedor.NombreProveedor || 'proveedor')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 15);

    // Verificar si el nombre de usuario ya existe
    let nombreUsuario = `prov_${nombreBase}`;
    let contador = 1;
    while (await prisma.usuarios.findFirst({ where: { Usuario: nombreUsuario } })) {
      nombreUsuario = `prov_${nombreBase}${contador}`;
      contador++;
    }

    // Generar contraseña si no se proporciona
    const passwordFinal = password || this.generarPasswordAleatorio();

    // Hashear contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(passwordFinal, saltRounds);

    // Crear usuario
    const usuario = await prisma.usuarios.create({
      data: {
        Usuario: nombreUsuario,
        Password: hashedPassword,
        NombreCompleto: proveedor.NombreProveedor,
        IsActive: true,
        IsAdmin: false,
        ProveedorID: ProveedorID,
        TipoUsuario: 'PROVEEDOR',
      },
    });

    return {
      message: 'Usuario de proveedor creado correctamente',
      data: {
        UsuarioID: usuario.UsuarioID,
        Usuario: nombreUsuario,
        NombreCompleto: usuario.NombreCompleto,
        ProveedorID: ProveedorID,
        TipoUsuario: 'PROVEEDOR',
        // Solo mostrar la contraseña en texto plano si fue generada automáticamente
        PasswordTemporal: password ? null : passwordFinal,
        Mensaje: password ? 'Usuario creado con la contraseña proporcionada' : 'IMPORTANTE: Guarde esta contraseña, no se mostrará de nuevo',
      },
    };
  }

  /**
   * Obtiene el usuario asociado a un proveedor
   */
  async getUsuarioProveedor(ProveedorID: number) {
    const proveedor = await prisma.catalogo_proveedores.findUnique({
      where: { ProveedorID },
    });

    if (!proveedor) {
      throw new HttpError('Proveedor no encontrado', 404);
    }

    const usuario = await prisma.usuarios.findFirst({
      where: { ProveedorID },
      select: {
        UsuarioID: true,
        Usuario: true,
        NombreCompleto: true,
        IsActive: true,
        TipoUsuario: true,
      },
    });

    return {
      message: usuario ? 'Usuario encontrado' : 'El proveedor no tiene usuario asignado',
      data: usuario,
    };
  }

  /**
   * Restablece la contraseña del usuario de un proveedor
   */
  async restablecerPassword(ProveedorID: number, nuevaPassword?: string) {
    const proveedor = await prisma.catalogo_proveedores.findUnique({
      where: { ProveedorID },
    });

    if (!proveedor) {
      throw new HttpError('Proveedor no encontrado', 404);
    }

    const usuario = await prisma.usuarios.findFirst({
      where: { ProveedorID },
    });

    if (!usuario) {
      throw new HttpError('El proveedor no tiene usuario asignado', 404);
    }

    // Generar nueva contraseña si no se proporciona
    const passwordFinal = nuevaPassword || this.generarPasswordAleatorio();

    // Hashear contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(passwordFinal, saltRounds);

    // Actualizar contraseña
    await prisma.usuarios.update({
      where: { UsuarioID: usuario.UsuarioID },
      data: { Password: hashedPassword },
    });

    return {
      message: 'Contraseña restablecida correctamente',
      data: {
        UsuarioID: usuario.UsuarioID,
        Usuario: usuario.Usuario,
        PasswordTemporal: nuevaPassword ? null : passwordFinal,
        Mensaje: nuevaPassword ? 'Contraseña actualizada' : 'IMPORTANTE: Guarde esta contraseña, no se mostrará de nuevo',
      },
    };
  }

  /**
   * Genera una contraseña aleatoria
   */
  private generarPasswordAleatorio(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}

export const proveedoresService = new ProveedoresService();
