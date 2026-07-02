import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { Prisma, FormaPagoCompra, EstadoPagoCompra, EstadoEntregaCompra } from '@prisma/client';
import moment from 'moment';
import {
  CreatePedidoDto,
  CreatePedidoDetalleDto,
  UpdatePedidoDto,
  UpdatePedidoDetalleDto,
} from './pedidos.schema';

const round2 = (v: number) => Math.round(v * 100) / 100;

class PedidosService {
  // ═══════════════════════════════════════════════════════════════════════════
  // CRUD
  // ═══════════════════════════════════════════════════════════════════════════

  async create(dto: CreatePedidoDto) {
    this.validarDetallesRequeridos(dto.Detalles);

    const { pedidoId, result } = await prisma.$transaction(async (tx) => {
      const encabezado = await this.crearEncabezadoPedido(tx, dto);
      await this.crearDetallesPedido(tx, encabezado.PedidoID, dto.Detalles);
      await this.recalcularTotalesPedido(tx, encabezado.PedidoID);

      return { pedidoId: encabezado.PedidoID, result: await this.findOneRaw(tx, encabezado.PedidoID) };
    });

    let message = 'Pedido registrado correctamente';

    // Autoasociar facturas por Número de Pedido (fuera de la transacción:
    // asociarFactura abre su propia transacción y ya maneja @unique/reactivar).
    const numeroPedido = dto.NumeroPedido?.trim();
    if (numeroPedido && dto.ProveedorID) {
      const { asociadas, warning } = await this.autoasociarFacturasPorNumeroPedido(
        pedidoId,
        numeroPedido,
        dto.ProveedorID,
      );
      if (asociadas > 0) {
        message += `. ${asociadas} factura(s) asociada(s) automáticamente`;
      }
      if (warning) {
        message += `. Advertencia: ${warning}`;
      }
      // Refrescar el pedido con las facturas ya asociadas
      const refrescado = await this.findOneRaw(prisma, pedidoId);
      return { message, data: refrescado };
    }

    return { message, data: result };
  }

  /**
   * Busca facturas con el NumeroPedido dado y las asocia al pedido.
   * Desambigua el emisor por el RFC del proveedor del pedido. Si el proveedor
   * no tiene RFC cargado, asocia todas las facturas con ese NumeroPedido y
   * devuelve una advertencia blanda (no lanza error).
   */
  private async autoasociarFacturasPorNumeroPedido(
    pedidoId: number,
    numeroPedido: string,
    proveedorId: number,
  ): Promise<{ asociadas: number; warning?: string }> {
    let warning: string | undefined;

    const proveedor = await prisma.catalogo_proveedores.findUnique({
      where: { ProveedorID: proveedorId },
      select: { RFC: true },
    });

    const rfcProveedor = proveedor?.RFC?.trim() || null;
    const facturaWhere: any = { NumeroPedido: numeroPedido, IsActive: true };

    if (rfcProveedor) {
      const emisor = await prisma.emisores_factura.findUnique({
        where: { RFC: rfcProveedor },
        select: { EmisorFacturaID: true },
      });
      if (!emisor) {
        // No hay facturas de ese emisor; nada que asociar de forma coherente.
        return { asociadas: 0, warning: `No se encontró emisor con RFC ${rfcProveedor} para las facturas del pedido ${numeroPedido}` };
      }
      facturaWhere.EmisorFacturaID = emisor.EmisorFacturaID;
    } else {
      warning = 'El proveedor no tiene RFC cargado; se asociaron todas las facturas con ese número de pedido sin validar el emisor';
    }

    const facturas = await prisma.facturas.findMany({
      where: facturaWhere,
      select: { FacturaID: true },
    });

    let asociadas = 0;
    for (const f of facturas) {
      // Saltar las que ya tienen una asociación activa (asociarFactura lanzaría error).
      const yaAsociada = await prisma.pedidos_facturas.findFirst({
        where: { FacturaID: f.FacturaID, IsActive: true },
      });
      if (yaAsociada) continue;

      try {
        await this.asociarFactura(pedidoId, f.FacturaID);
        asociadas++;
      } catch {
        // Si otra condición impide asociar, se ignora silenciosamente:
        // el pedido ya está creado y la asociación es best-effort.
      }
    }

    return { asociadas, warning };
  }

  async update(id: number, dto: UpdatePedidoDto) {
    const result = await prisma.$transaction(async (tx) => {
      const pedidoExistente = await this.obtenerPedidoOError(tx, id);

      const { Detalles, DetallesEliminar, ...datosEncabezado } = dto;

      await this.actualizarEncabezadoPedido(tx, id, datosEncabezado, pedidoExistente);

      if (DetallesEliminar?.length) {
        for (const detalleID of DetallesEliminar) {
          await tx.pedidos_detalle.updateMany({
            where: { PedidoDetalleID: detalleID, PedidoID: id },
            data: { IsActive: false },
          });
        }
      }

      if (Detalles?.length) {
        for (const detalle of Detalles) {
          if (detalle.PedidoDetalleID) {
            const { PedidoDetalleID, ...data } = detalle;
            const subTotal = round2((data.Cantidad || 0) * (data.PrecioUnitario || 0));
            await tx.pedidos_detalle.updateMany({
              where: { PedidoDetalleID, PedidoID: id },
              data: {
                ...data,
                SubTotal: subTotal,
                Total: subTotal,
              },
            });
          } else {
            await this.crearDetallePedido(tx, id, detalle);
          }
        }
      }

      await this.recalcularTotalesPedido(tx, id);

      return this.findOneRaw(tx, id);
    });

    return { message: 'Pedido actualizado correctamente', data: result };
  }

  async findAll() {
    const pedidos = await prisma.pedidos_encabezado.findMany({
      where: { IsActive: true },
      include: {
        pedidos_detalle: {
          where: { IsActive: true },
        },
        pedidos_descuentos: {
          where: { IsActive: true, TipoDescuento: 'PRONTO_PAGO' },
        },
      },
      orderBy: { PedidoID: 'desc' },
    });

    // Cargar proveedores en lote
    const proveedorIds = [...new Set(pedidos.map((p) => p.ProveedorID).filter(Boolean))] as number[];
    const proveedores = proveedorIds.length
      ? await prisma.catalogo_proveedores.findMany({
          where: { ProveedorID: { in: proveedorIds } },
          select: { ProveedorID: true, NombreProveedor: true, RFC: true },
        })
      : [];
    const proveedorMap = new Map(proveedores.map((p) => [p.ProveedorID, p]));

    const pedidosFormateados = pedidos.map((pedido) => {
      const totalDescuentosPP = round2(
        pedido.pedidos_descuentos.reduce((sum, d) => sum + Number(d.MontoDescuento || 0), 0)
      );
      return {
        ...pedido,
        FechaPedido: pedido.FechaPedido ? moment.utc(pedido.FechaPedido).format('YYYY-MM-DD') : null,
        FechaVencimientoCredito: pedido.FechaVencimientoCredito
          ? moment.utc(pedido.FechaVencimientoCredito).format('YYYY-MM-DD')
          : null,
        AplicaIVA: pedido.AplicaIVA === 1,
        proveedor: pedido.ProveedorID
          ? {
              NombreProveedor: proveedorMap.get(pedido.ProveedorID)?.NombreProveedor || null,
              RFC: proveedorMap.get(pedido.ProveedorID)?.RFC || null,
            }
          : null,
        TotalCubierto: round2(
          Number(pedido.TotalPagado || 0) +
          Number(pedido.TotalNotasCredito || 0) +
          totalDescuentosPP
        ),
        SaldoPendiente: round2(
          Number(pedido.TotalNeto || 0) -
          Number(pedido.TotalPagado || 0) -
          Number(pedido.TotalNotasCredito || 0) -
          totalDescuentosPP
        ),
      };
    });

    return { message: 'Pedidos obtenidos', data: pedidosFormateados };
  }

  async findOne(id: number) {
    const pedido = await this.findOneRaw(prisma, id);
    if (!pedido) {
      throw new HttpError('Pedido no encontrado', 404);
    }
    return { message: 'Pedido obtenido', data: pedido };
  }

  async remove(id: number) {
    const pedido = await prisma.pedidos_encabezado.findUnique({
      where: { PedidoID: id },
    });

    if (!pedido) {
      throw new HttpError('Pedido no encontrado', 404);
    }

    await prisma.pedidos_encabezado.update({
      where: { PedidoID: id },
      data: { IsActive: false },
    });

    return { message: 'Pedido eliminado correctamente', data: { PedidoID: id } };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FACTURAS
  // ═══════════════════════════════════════════════════════════════════════════

  async asociarFactura(pedidoId: number, facturaId: number) {
    await prisma.$transaction(async (tx) => {
      const pedido = await tx.pedidos_encabezado.findUnique({
        where: { PedidoID: pedidoId },
      });
      if (!pedido) {
        throw new HttpError('Pedido no encontrado', 404);
      }
      if (!pedido.IsActive) {
        throw new HttpError('El pedido no está activo', 400);
      }

      const factura = await prisma.facturas.findUnique({
        where: { FacturaID: facturaId },
      });
      if (!factura) {
        throw new HttpError('Factura no encontrada', 404);
      }
      if (!factura.IsActive) {
        throw new HttpError('La factura no está activa', 400);
      }

      // Verificar si ya existe activa
      const existenteActiva = await tx.pedidos_facturas.findFirst({
        where: { FacturaID: facturaId, IsActive: true },
      });
      if (existenteActiva) {
        // Idempotente: si ya está asociada a ESTE mismo pedido, no es error
        // (el autoasociar por N° de pedido y la sincronización del form se
        // solapan; la segunda llamada no debe romper ni ensuciar el log).
        if (existenteActiva.PedidoID === pedidoId) {
          return;
        }
        throw new HttpError('La factura ya está asociada a otro pedido', 400);
      }

      // Reactivar si existe soft-deleted
      const existenteInactiva = await tx.pedidos_facturas.findFirst({
        where: { FacturaID: facturaId, IsActive: false },
      });

      if (existenteInactiva) {
        await tx.pedidos_facturas.update({
          where: { PedidoFacturaID: existenteInactiva.PedidoFacturaID },
          data: {
            IsActive: true,
            PedidoID: pedidoId,
            FechaAsociacion: new Date(),
          },
        });
      } else {
        await tx.pedidos_facturas.create({
          data: {
            PedidoID: pedidoId,
            FacturaID: facturaId,
            IsActive: true,
            FechaAsociacion: new Date(),
          },
        });
      }
    });

    return { message: 'Factura asociada correctamente', data: { PedidoID: pedidoId, FacturaID: facturaId } };
  }

  async desasociarFactura(pedidoId: number, facturaId: number) {
    const asociacion = await prisma.pedidos_facturas.findFirst({
      where: { PedidoID: pedidoId, FacturaID: facturaId, IsActive: true },
    });

    if (!asociacion) {
      throw new HttpError('Asociación no encontrada', 404);
    }

    await prisma.pedidos_facturas.update({
      where: { PedidoFacturaID: asociacion.PedidoFacturaID },
      data: { IsActive: false },
    });

    return { message: 'Factura desasociada correctamente', data: { PedidoID: pedidoId, FacturaID: facturaId } };
  }

  async findFacturas(pedidoId: number) {
    const asociaciones = await prisma.pedidos_facturas.findMany({
      where: { PedidoID: pedidoId, IsActive: true },
    });

    if (!asociaciones.length) {
      return { message: 'Facturas obtenidas', data: [] };
    }

    const facturaIds = asociaciones.map((a) => a.FacturaID);
    const facturas = await prisma.facturas.findMany({
      where: { FacturaID: { in: facturaIds }, IsActive: true },
      include: {
        conceptos: true,
        emisor: {
          select: { RFC: true, RazonSocial: true, Alias: true },
        },
      },
    });

    const data = facturas.map((f) => ({
      FacturaID: f.FacturaID,
      UUID: f.UUID,
      Serie: f.Serie,
      Folio: f.Folio,
      NumeroPedido: f.NumeroPedido,
      FechaEmision: f.FechaEmision ? moment.utc(f.FechaEmision).format('YYYY-MM-DD') : null,
      SubTotal: Number(f.SubTotal),
      Descuento: Number(f.Descuento),
      Total: Number(f.Total),
      TotalImpuestosTrasladados: Number(f.TotalImpuestosTrasladados),
      Moneda: f.Moneda,
      MetodoPago: f.MetodoPago,
      FormaPago: f.FormaPago,
      emisor: f.emisor,
      conceptos: f.conceptos.map((c) => ({
        FacturaConceptoID: c.FacturaConceptoID,
        ClaveProdServ: c.ClaveProdServ,
        NoIdentificacion: c.NoIdentificacion,
        Cantidad: Number(c.Cantidad),
        ClaveUnidad: c.ClaveUnidad,
        Unidad: c.Unidad,
        Descripcion: c.Descripcion,
        ValorUnitario: Number(c.ValorUnitario),
        Importe: Number(c.Importe),
        Descuento: Number(c.Descuento),
        ObjetoImp: c.ObjetoImp,
        ImpuestoTrasladado: Number(c.ImpuestoTrasladado),
      })),
    }));

    return { message: 'Facturas obtenidas', data };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VALIDACIONES
  // ═══════════════════════════════════════════════════════════════════════════

  private validarDetallesRequeridos(detalles: CreatePedidoDetalleDto[] | undefined): void {
    if (!detalles?.length) {
      throw new HttpError('Debe incluir al menos un detalle', 400);
    }
  }

  private async obtenerPedidoOError(tx: Prisma.TransactionClient, id: number) {
    const pedido = await tx.pedidos_encabezado.findUnique({
      where: { PedidoID: id },
      include: { pedidos_detalle: true },
    });
    if (!pedido) {
      throw new HttpError('Pedido no encontrado', 404);
    }
    return pedido;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OPERACIONES DE BASE DE DATOS
  // ═══════════════════════════════════════════════════════════════════════════

  private async crearEncabezadoPedido(tx: Prisma.TransactionClient, dto: CreatePedidoDto) {
    let fechaVencimientoCredito: Date | null = null;
    if (dto.FormaPago === 'CREDITO' && dto.DiasCredito) {
      fechaVencimientoCredito = moment(dto.FechaPedido || new Date()).add(dto.DiasCredito, 'days').toDate();
    } else if (dto.FechaVencimientoCredito) {
      fechaVencimientoCredito = dto.FechaVencimientoCredito;
    }

    const aplicaIVA = dto.AplicaIVA === undefined ? true : dto.AplicaIVA;

    return await tx.pedidos_encabezado.create({
      data: {
        ProveedorID: dto.ProveedorID,
        NumeroPedido: dto.NumeroPedido || null,
        FechaPedido: dto.FechaPedido || new Date(),
        TotalBruto: 0,
        TotalIVA: 0,
        TotalNeto: 0,
        AplicaIVA: aplicaIVA ? 1 : 0,
        TasaIVA: dto.TasaIVA ?? 0.16,
        TotalPagado: 0,
        TotalRecibido: 0,
        TotalNotasCredito: 0,
        TotalDescuentos: 0,
        FormaPago: (dto.FormaPago || 'CREDITO') as FormaPagoCompra,
        EstadoPago: 'PENDIENTE' as EstadoPagoCompra,
        EstadoEntrega: 'PEDIDO' as EstadoEntregaCompra,
        DiasCredito: dto.DiasCredito || null,
        FechaVencimientoCredito: fechaVencimientoCredito,
        Observaciones: dto.Observaciones || null,
        UsuarioID: dto.UsuarioID || null,
        FechaAlta: new Date(),
        IsActive: true,
      },
    });
  }

  private async actualizarEncabezadoPedido(
    tx: Prisma.TransactionClient,
    id: number,
    datos: Record<string, unknown>,
    pedidoExistente: any,
  ) {
    const dataToUpdate: Record<string, unknown> = { ...datos };

    if (dataToUpdate.AplicaIVA !== undefined) {
      dataToUpdate.AplicaIVA = dataToUpdate.AplicaIVA ? 1 : 0;
    }

    // Si cambia FormaPago a CREDITO con DiasCredito, recalcular vencimiento
    if (dataToUpdate.FormaPago === 'CREDITO' && dataToUpdate.DiasCredito) {
      const baseFecha = (dataToUpdate.FechaPedido as Date) || pedidoExistente.FechaPedido || new Date();
      dataToUpdate.FechaVencimientoCredito = moment(baseFecha).add(dataToUpdate.DiasCredito as number, 'days').toDate();
    }

    if (Object.keys(dataToUpdate).length > 0) {
      await tx.pedidos_encabezado.update({
        where: { PedidoID: id },
        data: dataToUpdate as any,
      });
    }
  }

  private async crearDetallesPedido(
    tx: Prisma.TransactionClient,
    pedidoId: number,
    detalles: CreatePedidoDetalleDto[],
  ) {
    for (const detalle of detalles) {
      await this.crearDetallePedido(tx, pedidoId, detalle);
    }
  }

  private async crearDetallePedido(
    tx: Prisma.TransactionClient,
    pedidoId: number,
    detalle: CreatePedidoDetalleDto | UpdatePedidoDetalleDto,
  ) {
    const cantidad = detalle.Cantidad || 0;
    const precio = detalle.PrecioUnitario || 0;
    const subTotal = round2(cantidad * precio);

    return await tx.pedidos_detalle.create({
      data: {
        PedidoID: pedidoId,
        RefaccionID: detalle.RefaccionID || null,
        EquipoID: detalle.EquipoID || null,
        EquipoVirtualID: detalle.EquipoVirtualID || null,
        Cantidad: cantidad,
        PrecioUnitario: precio,
        SubTotal: subTotal,
        Total: subTotal,
        IsActive: true,
      },
    });
  }

  private async recalcularTotalesPedido(tx: Prisma.TransactionClient, pedidoId: number) {
    const detalles = await tx.pedidos_detalle.findMany({
      where: { PedidoID: pedidoId, IsActive: true },
    });

    const enc = await tx.pedidos_encabezado.findUnique({
      where: { PedidoID: pedidoId },
    });

    if (!enc) return;

    const totalBruto = round2(
      detalles.reduce((sum, d) => sum + Number(d.SubTotal || 0), 0)
    );

    const totalIVA = enc.AplicaIVA === 1
      ? round2(totalBruto * Number(enc.TasaIVA || 0))
      : 0;

    // TotalNeto = Bruto + IVA (el descuento PRONTO_PAGO es cobertura, no reduce el valor)
    const totalNeto = round2(totalBruto + totalIVA);

    await tx.pedidos_encabezado.update({
      where: { PedidoID: pedidoId },
      data: {
        TotalBruto: totalBruto,
        TotalIVA: totalIVA,
        TotalNeto: totalNeto,
      },
    });
  }

  private async findOneRaw(tx: Prisma.TransactionClient | typeof prisma, id: number) {
    const pedido = await tx.pedidos_encabezado.findUnique({
      where: { PedidoID: id },
      include: {
        pedidos_detalle: {
          where: { IsActive: true },
        },
        pedidos_facturas: {
          where: { IsActive: true },
        },
        pedidos_pagos: {
          where: { IsActive: true },
          orderBy: { FechaPago: 'desc' },
        },
        pedidos_descuentos: {
          where: { IsActive: true },
        },
      },
    });

    if (!pedido) return null;

    // Proveedor manual
    const proveedor = pedido.ProveedorID
      ? await prisma.catalogo_proveedores.findUnique({
          where: { ProveedorID: pedido.ProveedorID },
          select: {
            ProveedorID: true,
            NombreProveedor: true,
            RFC: true,
          },
        })
      : null;

    // Usuario manual
    const usuario = pedido.UsuarioID
      ? await prisma.usuarios.findUnique({
          where: { UsuarioID: pedido.UsuarioID },
          select: { UsuarioID: true, NombreCompleto: true, Celular: true, Puesto: true },
        })
      : null;

    // Facturas asociadas con conceptos (join manual)
    let facturasAsociadas: any[] = [];
    if (pedido.pedidos_facturas.length) {
      const facturaIds = pedido.pedidos_facturas.map((pf) => pf.FacturaID);
      const facturas = await prisma.facturas.findMany({
        where: { FacturaID: { in: facturaIds }, IsActive: true },
        include: {
          conceptos: true,
          emisor: {
            select: { RFC: true, RazonSocial: true, Alias: true },
          },
        },
      });
      facturasAsociadas = facturas.map((f) => ({
        FacturaID: f.FacturaID,
        UUID: f.UUID,
        Serie: f.Serie,
        Folio: f.Folio,
        FechaEmision: f.FechaEmision ? moment.utc(f.FechaEmision).format('YYYY-MM-DD') : null,
        SubTotal: Number(f.SubTotal),
        Descuento: Number(f.Descuento),
        Total: Number(f.Total),
        TotalImpuestosTrasladados: Number(f.TotalImpuestosTrasladados),
        Moneda: f.Moneda,
        MetodoPago: f.MetodoPago,
        FormaPago: f.FormaPago,
        emisor: f.emisor,
        conceptos: f.conceptos.map((c) => ({
          FacturaConceptoID: c.FacturaConceptoID,
          ClaveProdServ: c.ClaveProdServ,
          NoIdentificacion: c.NoIdentificacion,
          Cantidad: Number(c.Cantidad),
          Unidad: c.Unidad,
          Descripcion: c.Descripcion,
          ValorUnitario: Number(c.ValorUnitario),
          Importe: Number(c.Importe),
          Descuento: Number(c.Descuento),
          ObjetoImp: c.ObjetoImp,
          ImpuestoTrasladado: Number(c.ImpuestoTrasladado),
        })),
      }));
    }


    const totalDescuentosPP = round2(
      pedido.pedidos_descuentos
        .filter((d) => d.TipoDescuento === 'PRONTO_PAGO')
        .reduce((sum, d) => sum + Number(d.MontoDescuento || 0), 0)
    );

    return {
      ...pedido,
      AplicaIVA: pedido.AplicaIVA === 1,
      proveedor,
      usuario,
      facturas: facturasAsociadas,
      FechaPedido: pedido.FechaPedido ? moment.utc(pedido.FechaPedido).format('YYYY-MM-DD') : null,
      FechaVencimientoCredito: pedido.FechaVencimientoCredito
        ? moment.utc(pedido.FechaVencimientoCredito).format('YYYY-MM-DD')
        : null,
      pedidos_pagos: pedido.pedidos_pagos.map((pago) => ({
        ...pago,
        FechaPago: pago.FechaPago ? moment.utc(pago.FechaPago).format('YYYY-MM-DD') : null,
      })),
      TotalCubierto: round2(
        Number(pedido.TotalPagado || 0) +
        Number(pedido.TotalNotasCredito || 0) +
        totalDescuentosPP
      ),
      SaldoPendiente: round2(
        Number(pedido.TotalNeto || 0) -
        Number(pedido.TotalPagado || 0) -
        Number(pedido.TotalNotasCredito || 0) -
        totalDescuentosPP
      ),
    };
  }
}

export const pedidosService = new PedidosService();
