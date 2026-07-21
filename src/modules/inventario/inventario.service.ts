import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { KardexQueryDto } from './inventario.schema';
import moment from 'moment';

class InventarioService {
  /**
   * Obtiene todo el inventario con información de refacciones
   */
  async findAll() {
    const inventario = await prisma.inventario.findMany({
      where: { IsActive: 1 },
      orderBy: { InventarioID: 'desc' },
    });

    // Obtener IDs únicos
    const refaccionIds = [...new Set(inventario.map((i) => i.RefaccionID).filter(Boolean))] as number[];
    const ubicacionIds = [...new Set(inventario.map((i) => i.UbicacionID).filter(Boolean))] as number[];

    // Consultar refacciones y ubicaciones
    const [refacciones, ubicaciones] = await Promise.all([
      prisma.catalogo_refacciones.findMany({
        where: { RefaccionID: { in: refaccionIds } },
        select: {
          RefaccionID: true,
          NombrePieza: true,
          NombreCorto: true,
          CostoPromedio: true,
          PrecioVenta: true,
        },
      }),
      prisma.ubicaciones_inventario.findMany({
        where: { UbicacionID: { in: ubicacionIds } },
      }),
    ]);

    // Crear mapas para lookup rápido
    const refaccionesMap = new Map(refacciones.map((r) => [r.RefaccionID, r]));
    const ubicacionesMap = new Map(ubicaciones.map((u) => [u.UbicacionID, u]));

    // Combinar datos
    const inventarioFormateado = inventario.map((item) => ({
      ...item,
      FechaUltimoMovimiento: item.FechaUltimoMovimiento
        ? moment.utc(item.FechaUltimoMovimiento).format('YYYY-MM-DD')
        : null,
      refaccion: item.RefaccionID ? refaccionesMap.get(item.RefaccionID) || null : null,
      ubicacion: item.UbicacionID ? ubicacionesMap.get(item.UbicacionID) || null : null,
    }));

    return { message: 'Inventario obtenido', data: inventarioFormateado };
  }

  /**
   * Obtiene inventario por RefaccionID
   */
  async findByRefaccion(refaccionID: number) {
    const inventario = await prisma.inventario.findMany({
      where: {
        RefaccionID: refaccionID,
        IsActive: 1,
      },
    });

    if (!inventario.length) {
      throw new HttpError('No se encontró inventario para esta refacción', 404);
    }

    // Obtener ubicaciones
    const ubicacionIds = [...new Set(inventario.map((i) => i.UbicacionID).filter(Boolean))] as number[];
    const [refaccion, ubicaciones] = await Promise.all([
      prisma.catalogo_refacciones.findUnique({
        where: { RefaccionID: refaccionID },
        select: {
          RefaccionID: true,
          NombrePieza: true,
          NombreCorto: true,
          CostoPromedio: true,
          PrecioVenta: true,
        },
      }),
      prisma.ubicaciones_inventario.findMany({
        where: { UbicacionID: { in: ubicacionIds } },
      }),
    ]);

    const ubicacionesMap = new Map(ubicaciones.map((u) => [u.UbicacionID, u]));

    const inventarioFormateado = inventario.map((item) => ({
      ...item,
      FechaUltimoMovimiento: item.FechaUltimoMovimiento
        ? moment.utc(item.FechaUltimoMovimiento).format('YYYY-MM-DD')
        : null,
      refaccion,
      ubicacion: item.UbicacionID ? ubicacionesMap.get(item.UbicacionID) || null : null,
    }));

    return { message: 'Inventario de refacción obtenido', data: inventarioFormateado };
  }

  /**
   * Obtiene resumen de stock por ubicación
   */
  async getResumen() {
    const inventario = await prisma.inventario.findMany({
      where: { IsActive: 1 },
    });

    // Obtener IDs únicos
    const refaccionIds = [...new Set(inventario.map((i) => i.RefaccionID).filter(Boolean))] as number[];
    const ubicacionIds = [...new Set(inventario.map((i) => i.UbicacionID).filter(Boolean))] as number[];

    const [refacciones, ubicaciones] = await Promise.all([
      prisma.catalogo_refacciones.findMany({
        where: { RefaccionID: { in: refaccionIds } },
        select: { RefaccionID: true, CostoPromedio: true },
      }),
      prisma.ubicaciones_inventario.findMany({
        where: { UbicacionID: { in: ubicacionIds } },
      }),
    ]);

    const refaccionesMap = new Map(refacciones.map((r) => [r.RefaccionID, r]));
    const ubicacionesMap = new Map(ubicaciones.map((u) => [u.UbicacionID, u]));

    // Agrupar por ubicación
    const resumenPorUbicacion = inventario.reduce(
      (acc, item) => {
        const ubicacionData = item.UbicacionID ? ubicacionesMap.get(item.UbicacionID) : null;
        // Fallback: si el registro tiene UbicacionID pero el Tipo esta NULL,
        // se asume 'Bodega' (UBICACION_BODEGA_GENERAL=1 es el default de recepciones).
        const ubicacion = ubicacionData?.Tipo || (item.UbicacionID ? 'Bodega' : 'Sin ubicación');
        const refaccionData = item.RefaccionID ? refaccionesMap.get(item.RefaccionID) : null;

        if (!acc[ubicacion]) {
          acc[ubicacion] = {
            ubicacion,
            totalItems: 0,
            totalStock: 0,
            valorTotal: 0,
          };
        }
        acc[ubicacion].totalItems += 1;
        acc[ubicacion].totalStock += item.StockActual || 0;
        acc[ubicacion].valorTotal += (item.StockActual || 0) * (refaccionData?.CostoPromedio || 0);
        return acc;
      },
      {} as Record<string, { ubicacion: string; totalItems: number; totalStock: number; valorTotal: number }>,
    );

    const valorTotal = inventario.reduce((sum, item) => {
      const refaccionData = item.RefaccionID ? refaccionesMap.get(item.RefaccionID) : null;
      return sum + (item.StockActual || 0) * (refaccionData?.CostoPromedio || 0);
    }, 0);

    return {
      message: 'Resumen de inventario obtenido',
      data: {
        resumenPorUbicacion: Object.values(resumenPorUbicacion),
        totales: {
          totalItems: inventario.length,
          totalStock: inventario.reduce((sum, i) => sum + (i.StockActual || 0), 0),
          valorTotal,
        },
      },
    };
  }

  /**
   * Obtiene todo el kardex
   */
  async findAllKardex(query: KardexQueryDto) {
    const where: any = {};

    if (query.fechaInicio && query.fechaFin) {
      where.FechaMovimiento = {
        gte: new Date(query.fechaInicio),
        lte: new Date(query.fechaFin),
      };
    } else if (query.fechaInicio) {
      where.FechaMovimiento = { gte: new Date(query.fechaInicio) };
    } else if (query.fechaFin) {
      where.FechaMovimiento = { lte: new Date(query.fechaFin) };
    }

    if (query.tipoMovimiento) {
      where.TipoMovimiento = query.tipoMovimiento;
    }

    const kardex = await prisma.kardex_inventario.findMany({
      where,
      orderBy: { KardexInventarioID: 'desc' },
    });

    // Obtener refacciones
    const refaccionIds = [...new Set(kardex.map((k) => k.RefaccionID).filter(Boolean))] as number[];
    const refacciones = await prisma.catalogo_refacciones.findMany({
      where: { RefaccionID: { in: refaccionIds } },
      select: {
        RefaccionID: true,
        NombrePieza: true,
        NombreCorto: true,
      },
    });

    const refaccionesMap = new Map(refacciones.map((r) => [r.RefaccionID, r]));

    const kardexFormateado = kardex.map((item) => ({
      ...item,
      FechaMovimiento: item.FechaMovimiento ? moment.utc(item.FechaMovimiento).format('YYYY-MM-DD') : null,
      refaccion: item.RefaccionID ? refaccionesMap.get(item.RefaccionID) || null : null,
    }));

    return { message: 'Kardex obtenido', data: kardexFormateado };
  }

  /**
   * Obtiene kardex por RefaccionID
   */
  async findKardexByRefaccion(refaccionID: number, query: KardexQueryDto) {
    const where: any = { RefaccionID: refaccionID };

    if (query.fechaInicio && query.fechaFin) {
      where.FechaMovimiento = {
        gte: new Date(query.fechaInicio),
        lte: new Date(query.fechaFin),
      };
    } else if (query.fechaInicio) {
      where.FechaMovimiento = { gte: new Date(query.fechaInicio) };
    } else if (query.fechaFin) {
      where.FechaMovimiento = { lte: new Date(query.fechaFin) };
    }

    if (query.tipoMovimiento) {
      where.TipoMovimiento = query.tipoMovimiento;
    }

    const [kardex, refaccion] = await Promise.all([
      prisma.kardex_inventario.findMany({
        where,
        orderBy: { KardexInventarioID: 'desc' },
      }),
      prisma.catalogo_refacciones.findUnique({
        where: { RefaccionID: refaccionID },
        select: {
          RefaccionID: true,
          NombrePieza: true,
          NombreCorto: true,
        },
      }),
    ]);

    const kardexFormateado = kardex.map((item) => ({
      ...item,
      FechaMovimiento: item.FechaMovimiento ? moment.utc(item.FechaMovimiento).format('YYYY-MM-DD') : null,
      refaccion,
    }));

    return { message: 'Kardex de refacción obtenido', data: kardexFormateado };
  }

  /**
   * Obtiene kardex filtrado por TecnicoID
   */
  async findKardexByTecnico(tecnicoID: number, query: KardexQueryDto) {
    const where: any = { TecnicoID: tecnicoID };

    if (query.fechaInicio && query.fechaFin) {
      where.FechaMovimiento = {
        gte: new Date(query.fechaInicio),
        lte: new Date(query.fechaFin),
      };
    } else if (query.fechaInicio) {
      where.FechaMovimiento = { gte: new Date(query.fechaInicio) };
    } else if (query.fechaFin) {
      where.FechaMovimiento = { lte: new Date(query.fechaFin) };
    }

    if (query.tipoMovimiento) {
      where.TipoMovimiento = query.tipoMovimiento;
    }

    const kardex = await prisma.kardex_inventario.findMany({
      where,
      orderBy: { KardexInventarioID: 'desc' },
    });

    const refaccionIds = [...new Set(kardex.map((k) => k.RefaccionID).filter(Boolean))] as number[];
    const refacciones = await prisma.catalogo_refacciones.findMany({
      where: { RefaccionID: { in: refaccionIds } },
      select: { RefaccionID: true, NombrePieza: true, NombreCorto: true },
    });

    const refaccionesMap = new Map(refacciones.map((r) => [r.RefaccionID, r]));

    const kardexFormateado = kardex.map((item) => ({
      ...item,
      FechaMovimiento: item.FechaMovimiento ? moment.utc(item.FechaMovimiento).format('YYYY-MM-DD') : null,
      refaccion: item.RefaccionID ? refaccionesMap.get(item.RefaccionID) || null : null,
    }));

    return { message: 'Kardex del técnico obtenido', data: kardexFormateado };
  }

  /**
   * Buscar refacciones con stock disponible en bodega (inventario general)
   * Para usar en servicios cuando se necesita agregar insumos desde bodega
   * Nota: Usa la tabla 'inventario' que es diferente de 'inventario_tecnico'
   */
  async buscarEnBodega(busqueda: string) {
    // Buscar en inventario general con stock > 0
    // La tabla 'inventario' representa el stock de bodega/almacén
    const inventario = await prisma.inventario.findMany({
      where: {
        IsActive: 1,
        StockActual: { gt: 0 },
      },
    });

    if (!inventario.length) {
      return { message: 'No hay stock en bodega', data: [] };
    }

    // Obtener IDs de refacciones
    const refaccionIds = inventario.map((i) => i.RefaccionID).filter(Boolean) as number[];

    // Buscar refacciones con filtro de búsqueda
    const refacciones = await prisma.catalogo_refacciones.findMany({
      where: {
        RefaccionID: { in: refaccionIds },
        IsActive: true,
        ...(busqueda
          ? {
              OR: [
                { NombrePieza: { contains: busqueda } },
                { NombreCorto: { contains: busqueda } },
                { Codigo: { contains: busqueda } },
              ],
            }
          : {}),
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
      ...(busqueda ? { take: 20 } : {}),
      orderBy: {
        NombrePieza: 'asc',
      },
    });

    // Combinar con stock
    const inventarioMap = new Map(inventario.map((i) => [i.RefaccionID, i.StockActual]));

    const resultado = refacciones.map((refaccion) => ({
      RefaccionID: refaccion.RefaccionID,
      NombrePieza: refaccion.NombrePieza,
      NombreCorto: refaccion.NombreCorto,
      Codigo: refaccion.Codigo,
      CostoPromedio: refaccion.CostoPromedio,
      Unidad: refaccion.catalogo_unidades?.DesUnidad,
      StockDisponible: inventarioMap.get(refaccion.RefaccionID) || 0,
    }));

    return { message: 'Stock de bodega encontrado', data: resultado };
  }

  /**
   * Obtiene tipos de movimiento disponibles
   */
  async getTiposMovimiento() {
    const tipos = [
      'Entrada_Compra',
      'Traspaso_Tecnico',
      'Traspaso_Bodega_Tecnico',
      'Traspaso_Bodega_Equipo',
      'Traspaso_Tecnico_Equipo',
      'Traspaso_Equipo',
    ];

    return { message: 'Tipos de movimiento obtenidos', data: tipos };
  }
}

export const inventarioService = new InventarioService();
