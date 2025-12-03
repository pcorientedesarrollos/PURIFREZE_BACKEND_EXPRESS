import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { UpsertInventarioTecnicoDto, UpdateStockDto } from './inventario-tecnico.schema';

class InventarioTecnicoService {
  // Asignar refacciones de bodega a un técnico (sin autorización)
  async upsert(data: UpsertInventarioTecnicoDto) {
    const { TecnicoID, RefaccionID, StockNuevo, StockUsado, UsuarioID } = data;

    // Verificar que el técnico existe y está activo
    const tecnico = await prisma.catalogo_tecnicos.findUnique({
      where: { TecnicoID },
      include: {
        usuario: {
          select: { NombreCompleto: true },
        },
      },
    });

    if (!tecnico) {
      throw new HttpError('Técnico no encontrado', 404);
    }

    if (!tecnico.IsActive) {
      throw new HttpError('El técnico está dado de baja', 300);
    }

    // Verificar que la refacción existe
    const refaccion = await prisma.catalogo_refacciones.findUnique({
      where: { RefaccionID },
    });

    if (!refaccion) {
      throw new HttpError('Refacción no encontrada', 404);
    }

    // Obtener inventario actual del técnico para esta refacción
    const inventarioActual = await prisma.inventario_tecnico.findUnique({
      where: {
        TecnicoID_RefaccionID: { TecnicoID, RefaccionID },
      },
    });

    // Calcular la diferencia (lo que se va a agregar)
    const stockActualNuevo = inventarioActual?.StockNuevo || 0;
    const stockActualUsado = inventarioActual?.StockUsado || 0;
    const diferenciaNuevo = StockNuevo - stockActualNuevo;
    const diferenciaUsado = StockUsado - stockActualUsado;
    const cantidadAAgregar = diferenciaNuevo + diferenciaUsado;

    // Si se está agregando stock (diferencia positiva), validar y descontar de bodega
    if (cantidadAAgregar > 0) {
      // Verificar stock en bodega
      const inventarioBodega = await prisma.inventario.findFirst({
        where: {
          RefaccionID,
          IsActive: 1,
        },
      });

      const stockBodega = inventarioBodega?.StockActual || 0;

      if (stockBodega < cantidadAAgregar) {
        throw new HttpError(
          `Stock insuficiente en bodega. Disponible: ${stockBodega}, Solicitado: ${cantidadAAgregar}`,
          300
        );
      }
    }

    // Ejecutar todo en transacción
    const inventario = await prisma.$transaction(async (tx) => {
      // Si se agrega stock, descontar de bodega y registrar en kardex
      if (cantidadAAgregar > 0) {
        // Descontar de bodega
        await tx.inventario.updateMany({
          where: { RefaccionID, IsActive: 1 },
          data: {
            StockActual: { decrement: cantidadAAgregar },
            FechaUltimoMovimiento: new Date(),
          },
        });

        // Registrar SALIDA de bodega en kardex
        await tx.kardex_inventario.create({
          data: {
            RefaccionID,
            FechaMovimiento: new Date(),
            TipoMovimiento: 'Traspaso_Bodega_Tecnico',
            Cantidad: -cantidadAAgregar,
            UsuarioID: UsuarioID || 0,
            Observaciones: `Salida de bodega → Técnico ${tecnico.Codigo} (${tecnico.usuario.NombreCompleto})`,
          },
        });

        // Registrar ENTRADA a técnico en kardex
        await tx.kardex_inventario.create({
          data: {
            RefaccionID,
            FechaMovimiento: new Date(),
            TipoMovimiento: 'Traspaso_Bodega_Tecnico',
            Cantidad: cantidadAAgregar,
            UsuarioID: UsuarioID || 0,
            Observaciones: `Entrada a Técnico ${tecnico.Codigo} (${tecnico.usuario.NombreCompleto}) desde Bodega`,
          },
        });
      }

      // Si se reduce stock (devuelve a bodega)
      if (cantidadAAgregar < 0) {
        const cantidadADevolver = Math.abs(cantidadAAgregar);

        // Incrementar en bodega
        await tx.inventario.updateMany({
          where: { RefaccionID, IsActive: 1 },
          data: {
            StockActual: { increment: cantidadADevolver },
            FechaUltimoMovimiento: new Date(),
          },
        });

        // Registrar SALIDA del técnico en kardex
        await tx.kardex_inventario.create({
          data: {
            RefaccionID,
            FechaMovimiento: new Date(),
            TipoMovimiento: 'Traspaso_Tecnico',
            Cantidad: -cantidadADevolver,
            UsuarioID: UsuarioID || 0,
            Observaciones: `Salida de Técnico ${tecnico.Codigo} (${tecnico.usuario.NombreCompleto}) → Bodega`,
          },
        });

        // Registrar ENTRADA a bodega en kardex
        await tx.kardex_inventario.create({
          data: {
            RefaccionID,
            FechaMovimiento: new Date(),
            TipoMovimiento: 'Traspaso_Tecnico',
            Cantidad: cantidadADevolver,
            UsuarioID: UsuarioID || 0,
            Observaciones: `Entrada a Bodega desde Técnico ${tecnico.Codigo} (${tecnico.usuario.NombreCompleto})`,
          },
        });
      }

      // Upsert: crear si no existe, actualizar si existe
      return await tx.inventario_tecnico.upsert({
        where: {
          TecnicoID_RefaccionID: { TecnicoID, RefaccionID },
        },
        update: {
          StockNuevo,
          StockUsado,
          FechaUltimoMov: new Date(),
        },
        create: {
          TecnicoID,
          RefaccionID,
          StockNuevo,
          StockUsado,
          FechaUltimoMov: new Date(),
          IsActive: 1,
        },
        include: {
          tecnico: {
            include: {
              usuario: {
                select: {
                  NombreCompleto: true,
                },
              },
            },
          },
          refaccion: {
            select: {
              RefaccionID: true,
              NombrePieza: true,
              Codigo: true,
            },
          },
        },
      });
    });

    return { message: 'Inventario actualizado', data: inventario };
  }

  // Obtener todo el inventario de un técnico
  async findByTecnico(TecnicoID: number) {
    const tecnico = await prisma.catalogo_tecnicos.findUnique({
      where: { TecnicoID },
      include: {
        usuario: {
          select: {
            NombreCompleto: true,
          },
        },
      },
    });

    if (!tecnico) {
      throw new HttpError('Técnico no encontrado', 404);
    }

    const inventario = await prisma.inventario_tecnico.findMany({
      where: {
        TecnicoID,
        IsActive: 1,
      },
      include: {
        refaccion: {
          select: {
            RefaccionID: true,
            NombrePieza: true,
            NombreCorto: true,
            Codigo: true,
            CostoPromedio: true,
            catalogo_unidades: {
              select: {
                DesUnidad: true,
              },
            },
          },
        },
      },
      orderBy: {
        refaccion: {
          NombrePieza: 'asc',
        },
      },
    });

    // Calcular totales
    const totales = {
      totalRefacciones: inventario.length,
      totalPiezasNuevas: inventario.reduce((sum, item) => sum + item.StockNuevo, 0),
      totalPiezasUsadas: inventario.reduce((sum, item) => sum + item.StockUsado, 0),
      valorEstimado: inventario.reduce((sum, item) => {
        const costo = item.refaccion.CostoPromedio || 0;
        return sum + (item.StockNuevo + item.StockUsado) * costo;
      }, 0),
    };

    return {
      message: 'Inventario del técnico obtenido',
      data: {
        tecnico: {
          TecnicoID: tecnico.TecnicoID,
          Codigo: tecnico.Codigo,
          NombreCompleto: tecnico.usuario.NombreCompleto,
        },
        totales,
        inventario,
      },
    };
  }

  // Obtener inventario de todos los técnicos (resumen)
  async findAll() {
    const tecnicos = await prisma.catalogo_tecnicos.findMany({
      where: { IsActive: true },
      include: {
        usuario: {
          select: {
            NombreCompleto: true,
          },
        },
        inventario_tecnico: {
          where: { IsActive: 1 },
          include: {
            refaccion: {
              select: {
                CostoPromedio: true,
              },
            },
          },
        },
      },
      orderBy: {
        TecnicoID: 'asc',
      },
    });

    const resumen = tecnicos.map((tecnico) => {
      const totalNuevo = tecnico.inventario_tecnico.reduce((sum, item) => sum + item.StockNuevo, 0);
      const totalUsado = tecnico.inventario_tecnico.reduce((sum, item) => sum + item.StockUsado, 0);
      const valorEstimado = tecnico.inventario_tecnico.reduce((sum, item) => {
        const costo = item.refaccion.CostoPromedio || 0;
        return sum + (item.StockNuevo + item.StockUsado) * costo;
      }, 0);

      return {
        TecnicoID: tecnico.TecnicoID,
        Codigo: tecnico.Codigo,
        NombreCompleto: tecnico.usuario.NombreCompleto,
        TotalRefacciones: tecnico.inventario_tecnico.length,
        TotalPiezasNuevas: totalNuevo,
        TotalPiezasUsadas: totalUsado,
        ValorEstimado: valorEstimado,
      };
    });

    return { message: 'Resumen de inventarios obtenido', data: resumen };
  }

  // Obtener una refacción específica del inventario de un técnico
  async findOne(TecnicoID: number, RefaccionID: number) {
    const inventario = await prisma.inventario_tecnico.findUnique({
      where: {
        TecnicoID_RefaccionID: { TecnicoID, RefaccionID },
      },
      include: {
        tecnico: {
          include: {
            usuario: {
              select: {
                NombreCompleto: true,
              },
            },
          },
        },
        refaccion: {
          select: {
            RefaccionID: true,
            NombrePieza: true,
            NombreCorto: true,
            Codigo: true,
            CostoPromedio: true,
            catalogo_unidades: {
              select: {
                DesUnidad: true,
              },
            },
          },
        },
      },
    });

    if (!inventario) {
      throw new HttpError('Registro de inventario no encontrado', 404);
    }

    return { message: 'Registro de inventario obtenido', data: inventario };
  }

  // Actualizar stock de una refacción específica
  async updateStock(TecnicoID: number, RefaccionID: number, data: UpdateStockDto) {
    const inventario = await prisma.inventario_tecnico.findUnique({
      where: {
        TecnicoID_RefaccionID: { TecnicoID, RefaccionID },
      },
    });

    if (!inventario) {
      throw new HttpError('Registro de inventario no encontrado', 404);
    }

    const inventarioActualizado = await prisma.inventario_tecnico.update({
      where: {
        TecnicoID_RefaccionID: { TecnicoID, RefaccionID },
      },
      data: {
        ...data,
        FechaUltimoMov: new Date(),
      },
      include: {
        tecnico: {
          include: {
            usuario: {
              select: {
                NombreCompleto: true,
              },
            },
          },
        },
        refaccion: {
          select: {
            RefaccionID: true,
            NombrePieza: true,
            Codigo: true,
          },
        },
      },
    });

    return { message: 'Stock actualizado', data: inventarioActualizado };
  }

  // Eliminar una refacción del inventario de un técnico (soft delete)
  async remove(TecnicoID: number, RefaccionID: number) {
    const inventario = await prisma.inventario_tecnico.findUnique({
      where: {
        TecnicoID_RefaccionID: { TecnicoID, RefaccionID },
      },
    });

    if (!inventario) {
      throw new HttpError('Registro de inventario no encontrado', 404);
    }

    // Verificar que el stock esté en cero antes de eliminar
    if (inventario.StockNuevo > 0 || inventario.StockUsado > 0) {
      throw new HttpError('No se puede eliminar un registro con stock. Primero transfiera las piezas.', 300);
    }

    const inventarioEliminado = await prisma.inventario_tecnico.update({
      where: {
        TecnicoID_RefaccionID: { TecnicoID, RefaccionID },
      },
      data: { IsActive: 0 },
    });

    return { message: 'Registro de inventario eliminado', data: inventarioEliminado };
  }

  // Obtener sugerencias de refacciones para asignar a un técnico
  // Basado en las refacciones más asignadas a otros técnicos
  async getSugerencias(TecnicoID: number) {
    // Verificar que el técnico existe
    const tecnico = await prisma.catalogo_tecnicos.findUnique({
      where: { TecnicoID },
    });

    if (!tecnico) {
      throw new HttpError('Técnico no encontrado', 404);
    }

    // Obtener refacciones que ya tiene el técnico
    const refaccionesActuales = await prisma.inventario_tecnico.findMany({
      where: { TecnicoID, IsActive: 1 },
      select: { RefaccionID: true },
    });

    const refaccionesActualesIds = refaccionesActuales.map((r) => r.RefaccionID);

    // Obtener las refacciones más comunes en inventarios de técnicos
    const refaccionesPopulares = await prisma.inventario_tecnico.groupBy({
      by: ['RefaccionID'],
      where: {
        IsActive: 1,
        RefaccionID: { notIn: refaccionesActualesIds },
      },
      _count: {
        RefaccionID: true,
      },
      _avg: {
        StockNuevo: true,
        StockUsado: true,
      },
      orderBy: {
        _count: {
          RefaccionID: 'desc',
        },
      },
      take: 20,
    });

    // Obtener detalles de las refacciones sugeridas
    const refaccionesIds = refaccionesPopulares.map((r) => r.RefaccionID);

    const refacciones = await prisma.catalogo_refacciones.findMany({
      where: {
        RefaccionID: { in: refaccionesIds },
        IsActive: true,
      },
      select: {
        RefaccionID: true,
        NombrePieza: true,
        NombreCorto: true,
        Codigo: true,
        CostoPromedio: true,
        catalogo_unidades: {
          select: {
            DesUnidad: true,
          },
        },
      },
    });

    // Combinar datos
    const sugerencias = refaccionesPopulares.map((rp) => {
      const refaccion = refacciones.find((r) => r.RefaccionID === rp.RefaccionID);
      return {
        RefaccionID: rp.RefaccionID,
        NombrePieza: refaccion?.NombrePieza,
        NombreCorto: refaccion?.NombreCorto,
        Codigo: refaccion?.Codigo,
        Unidad: refaccion?.catalogo_unidades?.DesUnidad,
        CostoPromedio: refaccion?.CostoPromedio,
        TecnicosQueLoTienen: rp._count.RefaccionID,
        PromedioStockNuevo: Math.round(rp._avg.StockNuevo || 0),
        PromedioStockUsado: Math.round(rp._avg.StockUsado || 0),
      };
    });

    return { message: 'Sugerencias obtenidas', data: sugerencias };
  }

  // Buscar refacciones disponibles para agregar al inventario
  async buscarRefacciones(TecnicoID: number, busqueda: string) {
    // Obtener refacciones que ya tiene el técnico
    const refaccionesActuales = await prisma.inventario_tecnico.findMany({
      where: { TecnicoID, IsActive: 1 },
      select: { RefaccionID: true },
    });

    const refaccionesActualesIds = refaccionesActuales.map((r) => r.RefaccionID);

    const refacciones = await prisma.catalogo_refacciones.findMany({
      where: {
        IsActive: true,
        RefaccionID: { notIn: refaccionesActualesIds },
        OR: [
          { NombrePieza: { contains: busqueda } },
          { NombreCorto: { contains: busqueda } },
          { Codigo: { contains: busqueda } },
        ],
      },
      select: {
        RefaccionID: true,
        NombrePieza: true,
        NombreCorto: true,
        Codigo: true,
        CostoPromedio: true,
        catalogo_unidades: {
          select: {
            DesUnidad: true,
          },
        },
      },
      take: 20,
      orderBy: {
        NombrePieza: 'asc',
      },
    });

    return { message: 'Refacciones encontradas', data: refacciones };
  }
}

export const inventarioTecnicoService = new InventarioTecnicoService();
