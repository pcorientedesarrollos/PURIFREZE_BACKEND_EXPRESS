import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { GenerarPermisoInput } from './permisos.schema';

export class PermisosService {
  /**
   * Obtiene el sidebar del usuario con sus módulos y submódulos permitidos
   */
  async getSideBar(UsuarioID: number) {
    // Verificar que el usuario existe
    const usuario = await prisma.usuarios.findUnique({
      where: { UsuarioID },
    });

    if (!usuario) {
      throw new HttpError('El usuario No existe', 404);
    }

    // Obtener permisos activos con relaciones
    const permisos = await prisma.permisos.findMany({
      where: {
        UsuarioID,
        IsActive: true,
      },
      include: {
        Submodulo: {
          include: {
            Modulo: true,
          },
        },
      },
    });

    // Organizar los datos por módulos y submódulos
    const modulosMap = new Map<number, {
      ModuloID: number;
      NombreModulo: string;
      Submodulos: Array<{
        SubmoduloID: number;
        NombreSubmodulo: string;
        Ruta: string;
      }>;
    }>();

    permisos.forEach((permiso) => {
      const modulo = permiso.Submodulo.Modulo;
      const submodulo = permiso.Submodulo;

      if (!modulosMap.has(modulo.ModuloID)) {
        modulosMap.set(modulo.ModuloID, {
          ModuloID: modulo.ModuloID,
          NombreModulo: modulo.NombreModulo,
          Submodulos: [],
        });
      }

      const moduloActual = modulosMap.get(modulo.ModuloID)!;
      moduloActual.Submodulos.push({
        SubmoduloID: submodulo.SubmoduloID,
        NombreSubmodulo: submodulo.NombreSubmodulo,
        Ruta: submodulo.Ruta,
      });
    });

    return {
      UsuarioID: usuario.UsuarioID,
      Nombre: usuario.Usuario,
      Modulos: Array.from(modulosMap.values()),
    };
  }

  /**
   * Obtiene el árbol completo de permisos para administración
   */
  async getArbolPermisos(UsuarioID: number) {
    // Verificar que el usuario existe
    const usuario = await prisma.usuarios.findUnique({
      where: { UsuarioID },
    });

    if (!usuario) {
      throw new HttpError('El usuario no existe', 404);
    }

    // Traer el árbol completo de módulos y submódulos
    const modulos = await prisma.modulos.findMany({
      include: {
        Submodulos: true,
      },
    });

    // Traer los permisos activos del usuario
    const permisosUsuario = await prisma.permisos.findMany({
      where: {
        UsuarioID,
        IsActive: true,
      },
      select: {
        SubmoduloID: true,
      },
    });

    // Convertimos los permisos del usuario a un Set para lookup rápido
    const permisosSet = new Set(permisosUsuario.map((p) => p.SubmoduloID));

    // Combinar el árbol completo con los permisos del usuario
    const arbol = modulos.map((modulo) => ({
      ModuloID: modulo.ModuloID,
      NombreModulo: modulo.NombreModulo,
      Submodulos: modulo.Submodulos.map((sub) => ({
        SubmoduloID: sub.SubmoduloID,
        NombreSubmodulo: sub.NombreSubmodulo,
        IsActive: permisosSet.has(sub.SubmoduloID),
      })),
    }));

    return arbol;
  }

  /**
   * Genera o actualiza un permiso
   */
  async generarPermiso(data: GenerarPermisoInput) {
    const { UsuarioID, SubmoduloID, IsActive } = data;

    // Verificar que el submódulo existe
    const submodulo = await prisma.submodulos.findUnique({
      where: { SubmoduloID },
    });

    if (!submodulo) {
      throw new HttpError('El submodulo no existe', 404);
    }

    // Buscar si ya existe el permiso
    const permisoExistente = await prisma.permisos.findFirst({
      where: {
        UsuarioID,
        SubmoduloID,
      },
    });

    if (!permisoExistente && IsActive) {
      // Si no existe y queremos activarlo, lo creamos
      const permisoCreado = await prisma.permisos.create({
        data: {
          UsuarioID,
          SubmoduloID,
          IsActive,
        },
      });

      return { mensaje: 'Permiso Creado', permiso: permisoCreado };
    } else if (permisoExistente) {
      // Si existe, actualizamos el estado
      const permisoActualizado = await prisma.permisos.update({
        where: { PermisoID: permisoExistente.PermisoID },
        data: { IsActive },
      });

      return { mensaje: 'Permiso Actualizado', permiso: permisoActualizado };
    }

    return { mensaje: 'No se actualizó ni se creó ningún permiso', permiso: null };
  }
}

export const permisosService = new PermisosService();
