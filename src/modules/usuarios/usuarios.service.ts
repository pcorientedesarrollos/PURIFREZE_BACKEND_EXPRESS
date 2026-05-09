import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { CreateUsuarioDto, UpdateUsuarioDto } from './usuarios.schema';
import bcrypt from 'bcrypt';

class UsuariosService {
  async create(data: CreateUsuarioDto) {
    const { Password, Usuario, TipoUsuario, ProveedorID } = data;

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(Password, saltRounds);

    const findUsuario = await prisma.usuarios.findFirst({
      where: { Usuario },
    });

    if (findUsuario) {
      throw new HttpError('El usuario ya existe', 300);
    }

    // Validar que el proveedor exista si es usuario tipo PROVEEDOR
    if (TipoUsuario === 'PROVEEDOR' && ProveedorID) {
      const proveedor = await prisma.catalogo_proveedores.findUnique({
        where: { ProveedorID },
      });

      if (!proveedor) {
        throw new HttpError('El proveedor especificado no existe', 404);
      }

      if (!proveedor.IsActive) {
        throw new HttpError('El proveedor especificado no está activo', 400);
      }

      // Verificar que el proveedor no tenga ya un usuario asignado
      const usuarioExistente = await prisma.usuarios.findFirst({
        where: { ProveedorID, IsActive: true },
      });

      if (usuarioExistente) {
        throw new HttpError(`El proveedor ya tiene un usuario asignado: ${usuarioExistente.Usuario}`, 400);
      }
    }

    const usuario = await prisma.usuarios.create({
      data: {
        ...data,
        IsActive: true,
        Password: hashedPassword,
        TipoUsuario: TipoUsuario || 'INTERNO',
        ProveedorID: ProveedorID || null,
      },
    });

    // No devolver la contraseña
    const { Password: _, ...usuarioSinPassword } = usuario;

    return { message: 'Usuario Creado', data: usuarioSinPassword };
  }

  async findAll() {
    const allUsers = await prisma.usuarios.findMany({
      select: {
        UsuarioID: true,
        Usuario: true,
        NombreCompleto: true,
        Celular: true,
        Direccion: true,
        CorreoElectronico: true,
        IsActive: true,
        IsAdmin: true,
        TipoUsuario: true,
        ProveedorID: true,
        proveedor: {
          select: {
            ProveedorID: true,
            NombreProveedor: true,
          },
        },
      },
      orderBy: {
        UsuarioID: 'desc',
      },
    });

    return { message: 'Usuarios obtenidos', data: allUsers };
  }

  async findOne(UsuarioID: number) {
    const user = await prisma.usuarios.findUnique({
      where: { UsuarioID },
      select: {
        UsuarioID: true,
        Usuario: true,
        NombreCompleto: true,
        Celular: true,
        Direccion: true,
        CorreoElectronico: true,
        IsActive: true,
        IsAdmin: true,
        TipoUsuario: true,
        ProveedorID: true,
        proveedor: {
          select: {
            ProveedorID: true,
            NombreProveedor: true,
          },
        },
      },
    });

    if (!user) {
      throw new HttpError('Usuario no encontrado', 404);
    }

    return { message: 'Usuario obtenido', data: user };
  }

  async update(UsuarioID: number, data: UpdateUsuarioDto) {
    const { Usuario, Password, TipoUsuario, ProveedorID } = data;

    const usuarioExist = await prisma.usuarios.findUnique({
      where: { UsuarioID },
    });

    if (!usuarioExist) {
      throw new HttpError('No existe el usuario', 404);
    }

    if (Usuario) {
      const nameUser = await prisma.usuarios.findFirst({
        where: {
          Usuario,
          UsuarioID: { not: UsuarioID },
        },
      });

      if (nameUser) {
        throw new HttpError('El usuario ya existe', 300);
      }
    }

    // Validar proveedor si se está cambiando a tipo PROVEEDOR
    const nuevoTipo = TipoUsuario || usuarioExist.TipoUsuario;
    const nuevoProveedorID = ProveedorID !== undefined ? ProveedorID : usuarioExist.ProveedorID;

    if (nuevoTipo === 'PROVEEDOR' && !nuevoProveedorID) {
      throw new HttpError('ProveedorID es requerido para usuarios tipo PROVEEDOR', 400);
    }

    if (nuevoTipo === 'PROVEEDOR' && nuevoProveedorID) {
      const proveedor = await prisma.catalogo_proveedores.findUnique({
        where: { ProveedorID: nuevoProveedorID },
      });

      if (!proveedor) {
        throw new HttpError('El proveedor especificado no existe', 404);
      }

      // Verificar que otro usuario no tenga ese proveedor
      const usuarioConProveedor = await prisma.usuarios.findFirst({
        where: {
          ProveedorID: nuevoProveedorID,
          IsActive: true,
          UsuarioID: { not: UsuarioID },
        },
      });

      if (usuarioConProveedor) {
        throw new HttpError(`El proveedor ya tiene un usuario asignado: ${usuarioConProveedor.Usuario}`, 400);
      }
    }

    const updateData: any = { ...data };

    // Si se envía contraseña, hashearla
    if (Password) {
      const saltRounds = 10;
      updateData.Password = await bcrypt.hash(Password, saltRounds);
    }

    // Limpiar ProveedorID si se cambia a INTERNO
    if (TipoUsuario === 'INTERNO') {
      updateData.ProveedorID = null;
    }

    const userUpdate = await prisma.usuarios.update({
      where: { UsuarioID },
      data: updateData,
    });

    // No devolver la contraseña
    const { Password: _, ...usuarioSinPassword } = userUpdate;

    return { message: 'Usuario Actualizado', data: usuarioSinPassword };
  }

  async baja(UsuarioID: number) {
    const usuarioValid = await prisma.usuarios.findUnique({
      where: { UsuarioID },
    });

    if (!usuarioValid) {
      throw new HttpError('El usuario no existe', 404);
    }

    if (!usuarioValid.IsActive) {
      throw new HttpError('El usuario ya ha sido dado de baja', 300);
    }

    const usuarioUpdate = await prisma.usuarios.update({
      where: { UsuarioID },
      data: { IsActive: false },
    });

    return { message: 'Usuario dado de baja', data: usuarioUpdate };
  }

  async activar(UsuarioID: number) {
    const usuarioValid = await prisma.usuarios.findUnique({
      where: { UsuarioID },
    });

    if (!usuarioValid) {
      throw new HttpError('El usuario no existe', 404);
    }

    if (usuarioValid.IsActive) {
      throw new HttpError('El usuario ya ha sido activado', 300);
    }

    const usuarioUpdate = await prisma.usuarios.update({
      where: { UsuarioID },
      data: { IsActive: true },
    });

    return { message: 'Usuario activado', data: usuarioUpdate };
  }
}

export const usuariosService = new UsuariosService();
