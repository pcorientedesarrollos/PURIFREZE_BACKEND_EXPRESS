import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { CreateUsuarioDto, UpdateUsuarioDto } from './usuarios.schema';
import bcrypt from 'bcrypt';

class UsuariosService {
  async create(data: CreateUsuarioDto) {
    const { Password, Usuario } = data;

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(Password, saltRounds);

    const findUsuario = await prisma.usuarios.findFirst({
      where: { Usuario },
    });

    if (findUsuario) {
      throw new HttpError('El usuario ya existe', 300);
    }

    const usuario = await prisma.usuarios.create({
      data: {
        ...data,
        IsActive: true,
        Password: hashedPassword,
      },
    });

    return { message: 'Usuario Creado', data: usuario };
  }

  async findAll() {
    const allUsers = await prisma.usuarios.findMany({
      select: {
        UsuarioID: true,
        Usuario: true,
        NombreCompleto: true,
        IsActive: true,
        IsAdmin: true,
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
        IsActive: true,
        IsAdmin: true,
      },
    });

    if (!user) {
      throw new HttpError('Usuario no encontrado', 404);
    }

    return { message: 'Usuario obtenido', data: user };
  }

  async update(UsuarioID: number, data: UpdateUsuarioDto) {
    const { Usuario, Password } = data;

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

    const updateData: any = { ...data };

    // Si se envía contraseña, hashearla
    if (Password) {
      const saltRounds = 10;
      updateData.Password = await bcrypt.hash(Password, saltRounds);
    }

    const userUpdate = await prisma.usuarios.update({
      where: { UsuarioID },
      data: updateData,
    });

    return { message: 'Usuario Actualizado', data: userUpdate };
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
