import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { CreateRefaccionDanadaDto } from './refacciones-danadas.schema';

class RefaccionesDanadasService {
  async create(data: CreateRefaccionDanadaDto) {
    const { RefaccionID, TecnicoID, ProveedorID, Cantidad, UsuarioID } = data;

    // Verificar refacción
    const refaccion = await prisma.catalogo_refacciones.findUnique({
      where: { RefaccionID },
    });
    if (!refaccion) throw new HttpError('Refacción no encontrada', 404);

    // Verificar técnico si se proporciona
    if (TecnicoID) {
      const tecnico = await prisma.catalogo_tecnicos.findUnique({
        where: { TecnicoID },
      });
      if (!tecnico) throw new HttpError('Técnico no encontrado', 404);

      // Verificar que tenga stock de esa refacción
      const inventario = await prisma.inventario_tecnico.findUnique({
        where: {
          TecnicoID_RefaccionID: { TecnicoID, RefaccionID },
        },
      });

      if (!inventario) {
        throw new HttpError('El técnico no tiene esa refacción en su inventario', 300);
      }

      // Verificar stock suficiente (se resta de usadas primero)
      if (inventario.StockUsado + inventario.StockNuevo < Cantidad) {
        throw new HttpError(`Stock insuficiente. Disponible: ${inventario.StockUsado + inventario.StockNuevo}`, 300);
      }
    }

    // Verificar proveedor si se proporciona
    if (ProveedorID) {
      const proveedor = await prisma.catalogo_proveedores.findUnique({
        where: { ProveedorID },
      });
      if (!proveedor) throw new HttpError('Proveedor no encontrado', 404);
    }

    // Verificar usuario
    const usuario = await prisma.usuarios.findUnique({
      where: { UsuarioID },
    });
    if (!usuario) throw new HttpError('Usuario no encontrado', 404);

    // Crear registro y actualizar inventario en transacción
    const resultado = await prisma.$transaction(async (tx) => {
      // Crear registro de refacción dañada
      const registro = await tx.refacciones_danadas.create({
        data: {
          ...data,
          FechaRegistro: new Date(),
          IsActive: 1,
        },
      });

      // Si viene de un técnico, restar del inventario
      if (TecnicoID) {
        const inventario = await tx.inventario_tecnico.findUnique({
          where: {
            TecnicoID_RefaccionID: { TecnicoID, RefaccionID },
          },
        });

        if (inventario) {
          let cantidadRestante = Cantidad;
          let restarUsado = Math.min(inventario.StockUsado, cantidadRestante);
          cantidadRestante -= restarUsado;
          let restarNuevo = cantidadRestante;

          await tx.inventario_tecnico.update({
            where: {
              TecnicoID_RefaccionID: { TecnicoID, RefaccionID },
            },
            data: {
              StockUsado: { decrement: restarUsado },
              StockNuevo: { decrement: restarNuevo },
              FechaUltimoMov: new Date(),
            },
          });
        }
      }

      return registro;
    });

    // Obtener registro completo
    return this.findOne(resultado.RefaccionDanadaID);
  }

  async findAll() {
    const registros = await prisma.refacciones_danadas.findMany({
      where: { IsActive: 1 },
      include: {
        refaccion: {
          select: {
            RefaccionID: true,
            NombrePieza: true,
            Codigo: true,
            CostoPromedio: true,
          },
        },
      },
      orderBy: {
        FechaRegistro: 'desc',
      },
    });

    // Enriquecer con nombres
    const registrosEnriquecidos = await Promise.all(
      registros.map(async (r) => {
        let tecnicoNombre = null;
        let proveedorNombre = null;
        let usuarioNombre = null;

        if (r.TecnicoID) {
          const tecnico = await prisma.catalogo_tecnicos.findUnique({
            where: { TecnicoID: r.TecnicoID },
            include: { usuario: { select: { NombreCompleto: true } } },
          });
          tecnicoNombre = tecnico?.usuario.NombreCompleto;
        }

        if (r.ProveedorID) {
          const proveedor = await prisma.catalogo_proveedores.findUnique({
            where: { ProveedorID: r.ProveedorID },
          });
          proveedorNombre = proveedor?.NombreProveedor;
        }

        const usuario = await prisma.usuarios.findUnique({
          where: { UsuarioID: r.UsuarioID },
        });
        usuarioNombre = usuario?.NombreCompleto;

        return {
          ...r,
          TecnicoNombre: tecnicoNombre,
          ProveedorNombre: proveedorNombre,
          UsuarioNombre: usuarioNombre,
        };
      })
    );

    return { message: 'Refacciones dañadas obtenidas', data: registrosEnriquecidos };
  }

  async findOne(RefaccionDanadaID: number) {
    const registro = await prisma.refacciones_danadas.findUnique({
      where: { RefaccionDanadaID },
      include: {
        refaccion: {
          select: {
            RefaccionID: true,
            NombrePieza: true,
            NombreCorto: true,
            Codigo: true,
            CostoPromedio: true,
          },
        },
      },
    });

    if (!registro) {
      throw new HttpError('Registro no encontrado', 404);
    }

    // Enriquecer con nombres
    let tecnicoNombre = null;
    let proveedorNombre = null;
    let usuarioNombre = null;

    if (registro.TecnicoID) {
      const tecnico = await prisma.catalogo_tecnicos.findUnique({
        where: { TecnicoID: registro.TecnicoID },
        include: { usuario: { select: { NombreCompleto: true } } },
      });
      tecnicoNombre = tecnico?.usuario.NombreCompleto;
    }

    if (registro.ProveedorID) {
      const proveedor = await prisma.catalogo_proveedores.findUnique({
        where: { ProveedorID: registro.ProveedorID },
      });
      proveedorNombre = proveedor?.NombreProveedor;
    }

    const usuario = await prisma.usuarios.findUnique({
      where: { UsuarioID: registro.UsuarioID },
    });
    usuarioNombre = usuario?.NombreCompleto;

    return {
      message: 'Registro obtenido',
      data: {
        ...registro,
        TecnicoNombre: tecnicoNombre,
        ProveedorNombre: proveedorNombre,
        UsuarioNombre: usuarioNombre,
      },
    };
  }

  // Reporte por proveedor (calidad de proveedores)
  async reportePorProveedor(filtros: any) {
    const { fechaInicio, fechaFin, proveedorId } = filtros;

    const where: any = { IsActive: 1, ProveedorID: { not: null } };

    if (fechaInicio && fechaFin) {
      where.FechaRegistro = {
        gte: new Date(fechaInicio),
        lte: new Date(fechaFin),
      };
    }

    if (proveedorId) {
      where.ProveedorID = proveedorId;
    }

    const registros = await prisma.refacciones_danadas.groupBy({
      by: ['ProveedorID', 'MotivoDano'],
      where,
      _sum: {
        Cantidad: true,
      },
      _count: {
        RefaccionDanadaID: true,
      },
    });

    // Obtener nombres de proveedores
    const proveedorIds = [...new Set(registros.map((r) => r.ProveedorID).filter(Boolean))] as number[];
    const proveedores = await prisma.catalogo_proveedores.findMany({
      where: { ProveedorID: { in: proveedorIds } },
      select: { ProveedorID: true, NombreProveedor: true },
    });

    const proveedoresMap = new Map(proveedores.map((p) => [p.ProveedorID, p.NombreProveedor]));

    const reporte = registros.map((r) => ({
      ProveedorID: r.ProveedorID,
      ProveedorNombre: proveedoresMap.get(r.ProveedorID!) || 'Desconocido',
      MotivoDano: r.MotivoDano,
      CantidadTotal: r._sum.Cantidad,
      NumeroRegistros: r._count.RefaccionDanadaID,
    }));

    return { message: 'Reporte por proveedor obtenido', data: reporte };
  }

  // Reporte por refacción (qué piezas se dañan más)
  async reportePorRefaccion(filtros: any) {
    const { fechaInicio, fechaFin, refaccionId } = filtros;

    const where: any = { IsActive: 1 };

    if (fechaInicio && fechaFin) {
      where.FechaRegistro = {
        gte: new Date(fechaInicio),
        lte: new Date(fechaFin),
      };
    }

    if (refaccionId) {
      where.RefaccionID = refaccionId;
    }

    const registros = await prisma.refacciones_danadas.groupBy({
      by: ['RefaccionID'],
      where,
      _sum: {
        Cantidad: true,
      },
      _count: {
        RefaccionDanadaID: true,
      },
      orderBy: {
        _sum: {
          Cantidad: 'desc',
        },
      },
      take: 20,
    });

    // Obtener nombres de refacciones
    const refaccionIds = registros.map((r) => r.RefaccionID);
    const refacciones = await prisma.catalogo_refacciones.findMany({
      where: { RefaccionID: { in: refaccionIds } },
      select: { RefaccionID: true, NombrePieza: true, Codigo: true, CostoPromedio: true },
    });

    const refaccionesMap = new Map(refacciones.map((r) => [r.RefaccionID, r]));

    const reporte = registros.map((r) => {
      const ref = refaccionesMap.get(r.RefaccionID);
      return {
        RefaccionID: r.RefaccionID,
        NombrePieza: ref?.NombrePieza || 'Desconocida',
        Codigo: ref?.Codigo,
        CostoPromedio: ref?.CostoPromedio || 0,
        CantidadDanada: r._sum.Cantidad,
        PerdidaEstimada: (r._sum.Cantidad || 0) * (ref?.CostoPromedio || 0),
        NumeroRegistros: r._count.RefaccionDanadaID,
      };
    });

    return { message: 'Reporte por refacción obtenido', data: reporte };
  }

  // Reporte por técnico (quién daña más piezas)
  async reportePorTecnico(filtros: any) {
    const { fechaInicio, fechaFin, tecnicoId } = filtros;

    const where: any = { IsActive: 1, TecnicoID: { not: null } };

    if (fechaInicio && fechaFin) {
      where.FechaRegistro = {
        gte: new Date(fechaInicio),
        lte: new Date(fechaFin),
      };
    }

    if (tecnicoId) {
      where.TecnicoID = tecnicoId;
    }

    const registros = await prisma.refacciones_danadas.groupBy({
      by: ['TecnicoID', 'MotivoDano'],
      where,
      _sum: {
        Cantidad: true,
      },
      _count: {
        RefaccionDanadaID: true,
      },
    });

    // Obtener nombres de técnicos
    const tecnicoIds = [...new Set(registros.map((r) => r.TecnicoID).filter(Boolean))] as number[];
    const tecnicos = await prisma.catalogo_tecnicos.findMany({
      where: { TecnicoID: { in: tecnicoIds } },
      include: { usuario: { select: { NombreCompleto: true } } },
    });

    const tecnicosMap = new Map(tecnicos.map((t) => [t.TecnicoID, t.usuario.NombreCompleto]));

    const reporte = registros.map((r) => ({
      TecnicoID: r.TecnicoID,
      TecnicoNombre: tecnicosMap.get(r.TecnicoID!) || 'Desconocido',
      MotivoDano: r.MotivoDano,
      CantidadTotal: r._sum.Cantidad,
      NumeroRegistros: r._count.RefaccionDanadaID,
    }));

    return { message: 'Reporte por técnico obtenido', data: reporte };
  }

  // Eliminar registro (soft delete)
  async remove(RefaccionDanadaID: number) {
    const registro = await prisma.refacciones_danadas.findUnique({
      where: { RefaccionDanadaID },
    });

    if (!registro) {
      throw new HttpError('Registro no encontrado', 404);
    }

    await prisma.refacciones_danadas.update({
      where: { RefaccionDanadaID },
      data: { IsActive: 0 },
    });

    return { message: 'Registro eliminado', data: { RefaccionDanadaID } };
  }
}

export const refaccionesDanadasService = new RefaccionesDanadasService();
