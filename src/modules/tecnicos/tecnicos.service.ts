import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { CreateTecnicoDto, UpdateTecnicoDto } from './tecnicos.schema';

class TecnicosService {
  async create(data: CreateTecnicoDto) {
    const { UsuarioID } = data;

    // Verificar que el usuario existe
    const usuario = await prisma.usuarios.findUnique({
      where: { UsuarioID },
    });

    if (!usuario) {
      throw new HttpError('El usuario no existe', 404);
    }

    // Verificar que el usuario no esté ya asignado como técnico
    const tecnicoExistente = await prisma.catalogo_tecnicos.findUnique({
      where: { UsuarioID },
    });

    if (tecnicoExistente) {
      throw new HttpError('El usuario ya está registrado como técnico', 300);
    }

    // Verificar código único si se proporciona
    if (data.Codigo) {
      const codigoExiste = await prisma.catalogo_tecnicos.findFirst({
        where: { Codigo: data.Codigo },
      });

      if (codigoExiste) {
        throw new HttpError('El código ya está en uso', 300);
      }
    }

    const tecnico = await prisma.catalogo_tecnicos.create({
      data: {
        ...data,
        IsActive: true,
        FechaAlta: new Date(),
      },
      include: {
        usuario: {
          select: {
            UsuarioID: true,
            Usuario: true,
            NombreCompleto: true,
            IsActive: true,
          },
        },
      },
    });

    return { message: 'Técnico creado', data: tecnico };
  }

  async findAll() {
    const tecnicos = await prisma.catalogo_tecnicos.findMany({
      include: {
        usuario: {
          select: {
            UsuarioID: true,
            Usuario: true,
            NombreCompleto: true,
            IsActive: true,
          },
        },
      },
      orderBy: {
        TecnicoID: 'desc',
      },
    });

    return { message: 'Técnicos obtenidos', data: tecnicos };
  }

  async findAllActivos() {
    const tecnicos = await prisma.catalogo_tecnicos.findMany({
      where: { IsActive: true },
      include: {
        usuario: {
          select: {
            UsuarioID: true,
            Usuario: true,
            NombreCompleto: true,
            IsActive: true,
          },
        },
      },
      orderBy: {
        TecnicoID: 'desc',
      },
    });

    return { message: 'Técnicos activos obtenidos', data: tecnicos };
  }

  async findOne(TecnicoID: number) {
    const tecnico = await prisma.catalogo_tecnicos.findUnique({
      where: { TecnicoID },
      include: {
        usuario: {
          select: {
            UsuarioID: true,
            Usuario: true,
            NombreCompleto: true,
            IsActive: true,
          },
        },
      },
    });

    if (!tecnico) {
      throw new HttpError('Técnico no encontrado', 404);
    }

    return { message: 'Técnico obtenido', data: tecnico };
  }

  async update(TecnicoID: number, data: UpdateTecnicoDto) {
    const tecnico = await prisma.catalogo_tecnicos.findUnique({
      where: { TecnicoID },
    });

    if (!tecnico) {
      throw new HttpError('Técnico no encontrado', 404);
    }

    // Verificar código único si se proporciona y es diferente al actual
    if (data.Codigo && data.Codigo !== tecnico.Codigo) {
      const codigoExiste = await prisma.catalogo_tecnicos.findFirst({
        where: {
          Codigo: data.Codigo,
          TecnicoID: { not: TecnicoID },
        },
      });

      if (codigoExiste) {
        throw new HttpError('El código ya está en uso', 300);
      }
    }

    const tecnicoActualizado = await prisma.catalogo_tecnicos.update({
      where: { TecnicoID },
      data,
      include: {
        usuario: {
          select: {
            UsuarioID: true,
            Usuario: true,
            NombreCompleto: true,
            IsActive: true,
          },
        },
      },
    });

    return { message: 'Técnico actualizado', data: tecnicoActualizado };
  }

  async baja(TecnicoID: number) {
    const tecnico = await prisma.catalogo_tecnicos.findUnique({
      where: { TecnicoID },
    });

    if (!tecnico) {
      throw new HttpError('Técnico no encontrado', 404);
    }

    if (!tecnico.IsActive) {
      throw new HttpError('El técnico ya está dado de baja', 300);
    }

    const tecnicoActualizado = await prisma.catalogo_tecnicos.update({
      where: { TecnicoID },
      data: { IsActive: false },
      include: {
        usuario: {
          select: {
            UsuarioID: true,
            Usuario: true,
            NombreCompleto: true,
            IsActive: true,
          },
        },
      },
    });

    return { message: 'Técnico dado de baja', data: tecnicoActualizado };
  }

  async activar(TecnicoID: number) {
    const tecnico = await prisma.catalogo_tecnicos.findUnique({
      where: { TecnicoID },
    });

    if (!tecnico) {
      throw new HttpError('Técnico no encontrado', 404);
    }

    if (tecnico.IsActive) {
      throw new HttpError('El técnico ya está activo', 300);
    }

    const tecnicoActualizado = await prisma.catalogo_tecnicos.update({
      where: { TecnicoID },
      data: { IsActive: true },
      include: {
        usuario: {
          select: {
            UsuarioID: true,
            Usuario: true,
            NombreCompleto: true,
            IsActive: true,
          },
        },
      },
    });

    return { message: 'Técnico activado', data: tecnicoActualizado };
  }

  // Obtener usuarios disponibles para asignar como técnicos
  async getUsuariosDisponibles() {
    const usuarios = await prisma.usuarios.findMany({
      where: {
        IsActive: true,
        catalogo_tecnicos: null, // Usuarios que no son técnicos
      },
      select: {
        UsuarioID: true,
        Usuario: true,
        NombreCompleto: true,
      },
      orderBy: {
        NombreCompleto: 'asc',
      },
    });

    return { message: 'Usuarios disponibles obtenidos', data: usuarios };
  }
}

export const tecnicosService = new TecnicosService();