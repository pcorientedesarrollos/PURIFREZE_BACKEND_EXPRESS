import prisma from '../../config/database';
import { Prisma } from '@prisma/client';
import moment from 'moment';

const round2 = (v: number) => Math.round(v * 100) / 100;

interface ControlFilters {
  texto?: string;
  proveedorId?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Modulo Control: vistas agregadas read-only de pedidos.
 * Vive aparte del modulo pedidos para no acoplar el CRUD con la logica de tablero.
 */
class ControlService {
  /**
   * Lista pedidos con filtros server-side y paginacion, para el tablero de control.
   *
   * Filtros de `texto` (contains, case sensitive por el collation MySQL):
   *  - NumeroPedido, Observaciones, FormaPago
   *  - Nombre / RFC del proveedor (via join manual por ID)
   *  - Facturas asociadas: Folio, UUID, y conceptos (Descripcion, NoIdentificacion, ClaveProdServ)
   *
   * `pageSize=0` significa "sin paginacion" (usado para el export desde el frontend).
   */
  async listPedidos(filters: ControlFilters) {
    const where: Prisma.pedidos_encabezadoWhereInput = { IsActive: true };

    if (filters.proveedorId) {
      where.ProveedorID = filters.proveedorId;
    }

    if (filters.fechaDesde || filters.fechaHasta) {
      const rango: { gte?: Date; lte?: Date } = {};
      if (filters.fechaDesde) rango.gte = new Date(`${filters.fechaDesde}T00:00:00.000Z`);
      if (filters.fechaHasta) rango.lte = new Date(`${filters.fechaHasta}T23:59:59.999Z`);
      where.FechaPedido = rango;
    }

    if (filters.texto) {
      const t = filters.texto.trim();

      const [proveedoresMatch, facturasMatch] = await Promise.all([
        prisma.catalogo_proveedores.findMany({
          where: {
            OR: [
              { NombreProveedor: { contains: t } },
              { RFC: { contains: t } },
            ],
          },
          select: { ProveedorID: true },
        }),
        prisma.facturas.findMany({
          where: {
            IsActive: true,
            OR: [
              { Folio: { contains: t } },
              { UUID: { contains: t } },
              { conceptos: { some: { Descripcion: { contains: t } } } },
              { conceptos: { some: { NoIdentificacion: { contains: t } } } },
              { conceptos: { some: { ClaveProdServ: { contains: t } } } },
            ],
          },
          select: { FacturaID: true },
        }),
      ]);

      const proveedorIdsMatch = proveedoresMatch.map((p) => p.ProveedorID);

      const pedidosViaFacturas = facturasMatch.length
        ? await prisma.pedidos_facturas.findMany({
            where: { FacturaID: { in: facturasMatch.map((f) => f.FacturaID) }, IsActive: true },
            select: { PedidoID: true },
          })
        : [];
      const pedidoIdsViaFacturas = [...new Set(pedidosViaFacturas.map((pf) => pf.PedidoID))];

      where.OR = [
        { NumeroPedido: { contains: t } },
        { Observaciones: { contains: t } },
        { FormaPago: { contains: t } as Prisma.StringFilter },
        ...(proveedorIdsMatch.length ? [{ ProveedorID: { in: proveedorIdsMatch } }] : []),
        ...(pedidoIdsViaFacturas.length ? [{ PedidoID: { in: pedidoIdsViaFacturas } }] : []),
      ];
    }

    const currentPage = Math.max(1, Math.floor(filters.page ?? 1));
    const rawSize = filters.pageSize ?? 50;
    // pageSize=0 -> sin paginacion (traer todo)
    const sinPaginacion = rawSize === 0;
    const size = sinPaginacion ? 100000 : Math.min(500, Math.max(1, Math.floor(rawSize)));
    const skip = sinPaginacion ? 0 : (currentPage - 1) * size;

    const [pedidos, total, agregados] = await Promise.all([
      prisma.pedidos_encabezado.findMany({
        where,
        skip,
        take: size,
        include: {
          pedidos_descuentos: {
            where: { IsActive: true, TipoDescuento: 'PRONTO_PAGO' },
          },
        },
        orderBy: { PedidoID: 'desc' },
      }),
      prisma.pedidos_encabezado.count({ where }),
      prisma.pedidos_encabezado.aggregate({
        where,
        _sum: {
          TotalBruto: true,
          TotalIVA: true,
          TotalNeto: true,
          TotalRecibido: true,
          TotalPagado: true,
          TotalNotasCredito: true,
          TotalDescuentos: true,
        },
      }),
    ]);

    const proveedorIds = [...new Set(pedidos.map((p) => p.ProveedorID).filter(Boolean))] as number[];
    const proveedores = proveedorIds.length
      ? await prisma.catalogo_proveedores.findMany({
          where: { ProveedorID: { in: proveedorIds } },
          select: { ProveedorID: true, NombreProveedor: true, RFC: true },
        })
      : [];
    const proveedorMap = new Map(proveedores.map((p) => [p.ProveedorID, p]));

    const data = pedidos.map((p) => {
      const totalDescuentosPP = round2(
        p.pedidos_descuentos.reduce((sum, d) => sum + Number(d.MontoDescuento || 0), 0)
      );
      return {
        ...p,
        FechaPedido: p.FechaPedido ? moment.utc(p.FechaPedido).format('YYYY-MM-DD') : null,
        FechaVencimientoCredito: p.FechaVencimientoCredito
          ? moment.utc(p.FechaVencimientoCredito).format('YYYY-MM-DD')
          : null,
        AplicaIVA: p.AplicaIVA === 1,
        proveedor: p.ProveedorID
          ? {
              NombreProveedor: proveedorMap.get(p.ProveedorID)?.NombreProveedor || null,
              RFC: proveedorMap.get(p.ProveedorID)?.RFC || null,
            }
          : null,
        TotalCubierto: round2(
          Number(p.TotalPagado || 0) +
          Number(p.TotalNotasCredito || 0) +
          totalDescuentosPP
        ),
        SaldoPendiente: round2(
          Number(p.TotalNeto || 0) -
          Number(p.TotalPagado || 0) -
          Number(p.TotalNotasCredito || 0) -
          totalDescuentosPP
        ),
      };
    });

    const sumaPagado = Number(agregados._sum.TotalPagado || 0);
    const sumaNC = Number(agregados._sum.TotalNotasCredito || 0);
    const sumaDescuentos = Number(agregados._sum.TotalDescuentos || 0);
    const sumaNeto = Number(agregados._sum.TotalNeto || 0);

    const totalPages = sinPaginacion ? 1 : Math.max(1, Math.ceil(total / size));

    return {
      message: 'Pedidos (control) obtenidos',
      data: {
        data,
        meta: {
          total,
          page: sinPaginacion ? 1 : currentPage,
          pageSize: sinPaginacion ? total : size,
          totalPages,
          sumas: {
            bruto: round2(Number(agregados._sum.TotalBruto || 0)),
            iva: round2(Number(agregados._sum.TotalIVA || 0)),
            neto: round2(sumaNeto),
            recibido: round2(Number(agregados._sum.TotalRecibido || 0)),
            pagado: round2(sumaPagado),
            nc: round2(sumaNC),
            descuentos: round2(sumaDescuentos),
            cubierto: round2(sumaPagado + sumaNC + sumaDescuentos),
            saldo: round2(sumaNeto - sumaPagado - sumaNC - sumaDescuentos),
          },
        },
      },
    };
  }
}

export const controlService = new ControlService();
