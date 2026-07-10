import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { Prisma, EstadoEntregaCompra } from '@prisma/client';
import moment from 'moment';
import { CreatePedidoRecepcionDto } from './pedidos-recepciones.schema';
import {
  actualizarInventario,
  crearKardex,
  actualizarCostoPromedioRefaccion,
} from '../../shared/shared-operations.service';


class PedidosRecepcionesService {
  private round2(value: number): number {
    return Math.round(value * 100) / 100;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONSULTAS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Busca una recepcion cruda (sin formato ni 404). Reusable dentro y fuera de tx.
   * Devuelve la recepcion con sus detalles activos, o null si no existe.
   */
  private async findOneRaw(tx: Prisma.TransactionClient | typeof prisma, id: number) {
    const recepcion = await tx.pedidos_recepciones_encabezado.findUnique({
      where: { PedidoRecepcionID: id },
      include: {
        pedidos_recepciones_detalle: {
          where: { IsActive: true },
        },
      },
    });

    if (!recepcion) return null;
    return recepcion;
  }

  /**
   * GET /pedidos-recepciones/:PedidoRecepcionID
   * Obtiene una recepcion por ID (404 si no existe).
   */
  async findOne(id: number) {
    const recepcion = await this.findOneRaw(prisma, id);

    if (!recepcion) {
      throw new HttpError('Recepción no encontrada', 404);
    }

    return {
      message: 'Recepción obtenida',
      data: {
        ...recepcion,
        FechaRecepcion: recepcion.FechaRecepcion
          ? moment.utc(recepcion.FechaRecepcion).format('YYYY-MM-DD')
          : null,
      },
    };
  }

  /**
   * GET /pedidos-recepciones/pedido/:PedidoID
   * Lista todas las recepciones activas de un pedido.
   */
  async findByPedido(pedidoId: number) {
    const recepciones = await prisma.pedidos_recepciones_encabezado.findMany({
      where: { PedidoID: pedidoId, IsActive: true },
      include: {
        pedidos_recepciones_detalle: {
          where: { IsActive: true },
        },
      },
      orderBy: { PedidoRecepcionID: 'desc' },
    });

    const recepcionesFormateadas = recepciones.map((r) => ({
      ...r,
      FechaRecepcion: r.FechaRecepcion
        ? moment.utc(r.FechaRecepcion).format('YYYY-MM-DD')
        : null,
    }));

    return { message: 'Recepciones obtenidas', data: recepcionesFormateadas };
  }

  /**
   * GET /pedidos-recepciones/pedido/:PedidoID/with-pagos
   * Obtiene recepciones + pagos + detalle de items de un pedido (enriquecido).
   * Replica de compras.findByCompraWithPagos adaptado a pedidos.
   */
  async findByPedidoWithPagos(pedidoId: number) {
    // 1. Obtener el pedido con sus detalles
    const pedido = await prisma.pedidos_encabezado.findUnique({
      where: { PedidoID: pedidoId },
      include: {
        pedidos_detalle: {
          where: { IsActive: true },
        },
      },
    });

    if (!pedido) {
      throw new HttpError('Pedido no encontrado', 404);
    }

    // 2. Obtener recepciones con sus detalles
    const recepciones = await prisma.pedidos_recepciones_encabezado.findMany({
      where: { PedidoID: pedidoId, IsActive: true },
      include: {
        pedidos_recepciones_detalle: {
          where: { IsActive: true },
        },
      },
      orderBy: { PedidoRecepcionID: 'desc' },
    });

    // 3. Obtener pagos del pedido (tabla pedidos_pagos, NO pagos generica)
    const pagos = await prisma.pedidos_pagos.findMany({
      where: { PedidoID: pedidoId, IsActive: true },
      orderBy: { PedidoPagoID: 'desc' },
    });

    // 4. IDs de refacciones y equipos virtuales
    const refaccionIDs = pedido.pedidos_detalle
      .map(d => d.RefaccionID)
      .filter((id): id is number => id !== null);

    const equipoVirtualIDs = pedido.pedidos_detalle
      .map(d => d.EquipoVirtualID)
      .filter((id): id is number => id !== null);

    // 5. Info de refacciones y equipos virtuales
    const refacciones = await prisma.catalogo_refacciones.findMany({
      where: { RefaccionID: { in: refaccionIDs } },
    });
    const refaccionesMap = new Map(refacciones.map(r => [r.RefaccionID, r]));

    const equiposVirtuales = equipoVirtualIDs.length > 0
      ? await prisma.equipos_virtuales.findMany({
          where: { EquipoVirtualID: { in: equipoVirtualIDs } },
          include: {
            detalles: {
              where: { IsActive: true },
              include: {
                refaccion: {
                  select: { RefaccionID: true, NombrePieza: true },
                },
              },
            },
          },
        })
      : [];
    const equiposVirtualesMap = new Map(equiposVirtuales.map(e => [e.EquipoVirtualID, e]));

    // 5b. Stock actual en bodega general para refacciones directas + componentes de EV
    const refaccionIDsComponentes = equiposVirtuales.flatMap(e =>
      e.detalles.map(c => c.RefaccionID)
    );
    const todasRefaccionIDs = [...new Set([...refaccionIDs, ...refaccionIDsComponentes])];

    const inventarios = todasRefaccionIDs.length > 0
      ? await prisma.inventario.findMany({
          where: {
            RefaccionID: { in: todasRefaccionIDs },
            UbicacionID: 1, // UBICACION_BODEGA_GENERAL
          },
          select: { RefaccionID: true, StockActual: true },
        })
      : [];
    const stockPorRefaccionID = new Map<number, number>(
      inventarios.map(i => [i.RefaccionID!, i.StockActual ?? 0])
    );

    // 6. Calcular cantidades recibidas por PedidoDetalleID
    const cantidadesRecibidasPorDetalle = new Map<number, number>();
    for (const recepcion of recepciones) {
      for (const detalleRec of recepcion.pedidos_recepciones_detalle) {
        if (detalleRec.PedidoDetalleID) {
          const actual = cantidadesRecibidasPorDetalle.get(detalleRec.PedidoDetalleID) || 0;
          cantidadesRecibidasPorDetalle.set(detalleRec.PedidoDetalleID, actual + (detalleRec.CantidadRecibida || 0));
        } else if (detalleRec.RefaccionID) {
          const detallePedido = pedido.pedidos_detalle.find(d => d.RefaccionID === detalleRec.RefaccionID);
          if (detallePedido) {
            const actual = cantidadesRecibidasPorDetalle.get(detallePedido.PedidoDetalleID) || 0;
            cantidadesRecibidasPorDetalle.set(detallePedido.PedidoDetalleID, actual + (detalleRec.CantidadRecibida || 0));
          }
        }
      }
    }

    // 7. Construir detalle de items (refacciones + equipos virtuales)
    const refaccionesDetalle = pedido.pedidos_detalle.map(detalle => {
      const esEquipoVirtual = detalle.EquipoVirtualID && !detalle.RefaccionID;

      let nombre: string;
      let descripcion: string;
      let componentes: Array<{
        RefaccionID: number;
        NombreRefaccion: string;
        CantidadPiezasPorEquipo: number;
        CostoUnitario: number;
        StockInventario: number;
      }> | undefined;

      if (esEquipoVirtual) {
        const equipo = equiposVirtualesMap.get(detalle.EquipoVirtualID!);
        nombre = equipo?.Nombre || 'Equipo Virtual';
        descripcion = equipo?.Codigo || '';
        componentes = (equipo?.detalles ?? []).map(c => ({
          RefaccionID: c.RefaccionID,
          NombreRefaccion: c.refaccion?.NombrePieza || `Refacción #${c.RefaccionID}`,
          CantidadPiezasPorEquipo: c.Cantidad ?? 1,
          CostoUnitario: Number(c.CostoUnitario ?? 0),
          StockInventario: stockPorRefaccionID.get(c.RefaccionID) ?? 0,
        }));
      } else {
        const refaccion = refaccionesMap.get(detalle.RefaccionID!);
        nombre = refaccion?.NombrePieza || 'Refacción no encontrada';
        descripcion = refaccion?.Observaciones || '';
      }

      const stockInventario = !esEquipoVirtual && detalle.RefaccionID
        ? (stockPorRefaccionID.get(detalle.RefaccionID) ?? 0)
        : null;

      const cantidadRecibida = cantidadesRecibidasPorDetalle.get(detalle.PedidoDetalleID) || 0;
      const cantidadPedida = detalle.Cantidad || 0;
      const cantidadPendiente = cantidadPedida - cantidadRecibida;
      const precioUnitario = Number(detalle.PrecioUnitario ?? 0);

      return {
        PedidoDetalleID: detalle.PedidoDetalleID,
        RefaccionID: detalle.RefaccionID,
        EquipoVirtualID: detalle.EquipoVirtualID,
        EsEquipoVirtual: esEquipoVirtual,
        NombreRefaccion: nombre,
        Descripcion: descripcion,
        CantidadPedida: cantidadPedida,
        CantidadRecibida: cantidadRecibida,
        CantidadPendiente: cantidadPendiente,
        PrecioUnitario: precioUnitario,
        SubtotalPedido: cantidadPedida * precioUnitario,
        SubtotalRecibido: cantidadRecibida * precioUnitario,
        SubtotalPendiente: cantidadPendiente * precioUnitario,
        Completado: cantidadPendiente <= 0,
        StockInventario: stockInventario,
        Componentes: componentes,
      };
    });

    // 8. Calcular totales de pagos y recepciones
    const totalPagado = pagos.reduce((sum, p) => sum + Number(p.Monto || 0), 0);
    const totalRecibidoMonto = recepciones.reduce((sum, r) => sum + Number(r.MontoRecepcion || 0), 0);
    const montoTotalPedido = Number(pedido.TotalNeto ?? 0);
    const montoPendientePago = montoTotalPedido - totalPagado;

    // 9. Calcular totales de items usando Math.min(recibida, pedida) como en compras
    let totalItemsPedidos = 0;
    let totalItemsRecibidos = 0;
    let montoTotalRecibido = 0;

    for (const d of pedido.pedidos_detalle) {
      const pedida = d.Cantidad ?? 0;
      const recibida = cantidadesRecibidasPorDetalle.get(d.PedidoDetalleID) || 0;
      const precio = Number(d.PrecioUnitario ?? 0);

      totalItemsPedidos += pedida;
      totalItemsRecibidos += Math.min(recibida, pedida);
      montoTotalRecibido += Math.min(recibida, pedida) * precio;
    }

    const totalItemsPendientes = totalItemsPedidos - totalItemsRecibidos;

    return {
      message: 'Recepciones con pagos del pedido obtenidas',
      data: {
        pedido: {
          PedidoID: pedido.PedidoID,
          ProveedorID: pedido.ProveedorID,
          FechaPedido: pedido.FechaPedido ? moment.utc(pedido.FechaPedido).format('YYYY-MM-DD') : null,
          TotalBruto: Number(pedido.TotalBruto ?? 0),
          TotalIVA: Number(pedido.TotalIVA ?? 0),
          TotalNeto: Number(pedido.TotalNeto ?? 0),
        },
        refacciones: refaccionesDetalle,
        recepciones: recepciones.map(r => ({
          ...r,
          FechaRecepcion: r.FechaRecepcion ? moment.utc(r.FechaRecepcion).format('YYYY-MM-DD') : null,
        })),
        pagos: pagos.map(p => ({
          ...p,
          FechaPago: p.FechaPago ? moment.utc(p.FechaPago).format('YYYY-MM-DD') : null,
        })),
        resumen: {
          totalRecepciones: recepciones.length,
          totalPagos: pagos.length,
          montoTotalPedido,
          montoTotalRecibido: this.round2(montoTotalRecibido),
          montoTotalPagado: totalPagado,
          montoPendientePago,
          totalItemsPedidos,
          totalItemsRecibidos,
          totalItemsPendientes,
          recepcionCompleta: totalItemsPendientes <= 0,
          pagoCompleto: montoPendientePago <= 0,
        },
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CREAR RECEPCION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * POST /pedidos-recepciones
   * Registra una recepcion (parcial o total) de un pedido:
   *  - valida pertenencia y que no exceda lo pendiente
   *  - mueve inventario/kardex (solo refacciones)
   *  - recalcula EstadoEntrega + TotalRecibido del pedido
   * Todo dentro de una transaccion: si algo falla, rollback total.
   */
  async create(dto: CreatePedidoRecepcionDto) {
    const fechaStr = dto.FechaRecepcion || moment().format('YYYY-MM-DD');
    const usuarioID = dto.UsuarioID ?? null;

    const result = await prisma.$transaction(async (tx) => {
      // ─── PASO 1: traer el pedido + sus detalles activos ───
      const pedido = await tx.pedidos_encabezado.findUnique({
        where: { PedidoID: dto.PedidoID },
        include: { pedidos_detalle: { where: { IsActive: true } } },
      });

      if (!pedido) {
        throw new HttpError('Pedido no encontrado', 404);
      }

      // R1: no se recibe sobre un pedido ya completamente entregado
      if (pedido.EstadoEntrega === 'ENTREGADO') {
        throw new HttpError('El pedido ya está completamente entregado', 400);
      }

      // ─── PASO 2: mapa de detalles del pedido por PedidoDetalleID ───
      // Permite validar pertenencia y leer RefaccionID + PrecioUnitario de cada renglon.
      const detallesPedidoMap = new Map<number, {
        RefaccionID: number | null;
        EquipoVirtualID: number | null;
        Cantidad: number;
        PrecioUnitario: number;
      }>();

      for (const d of pedido.pedidos_detalle) {
        detallesPedidoMap.set(d.PedidoDetalleID, {
          RefaccionID: d.RefaccionID,
          EquipoVirtualID: d.EquipoVirtualID,
          Cantidad: d.Cantidad ?? 0,
          PrecioUnitario: Number(d.PrecioUnitario ?? 0),
        });
      }

      // ─── PASO 2b: cargar composicion de equipos virtuales presentes en el pedido ───
      // Por cada EquipoVirtualID: lista de refacciones componentes (CostoUnitario +
      // CantidadPiezasPorEquipo) y Nombre para observaciones del kardex.
      const equipoVirtualIDs = Array.from(
        new Set(
          pedido.pedidos_detalle
            .map(d => d.EquipoVirtualID)
            .filter((id): id is number => id !== null),
        ),
      );

      const componentesPorEquipo = new Map<number, Array<{
        RefaccionID: number;
        CantidadPiezasPorEquipo: number;
        CostoUnitario: number;
      }>>();
      const nombreEquipoPorID = new Map<number, string>();

      if (equipoVirtualIDs.length > 0) {
        const equipos = await tx.equipos_virtuales.findMany({
          where: { EquipoVirtualID: { in: equipoVirtualIDs } },
          include: { detalles: { where: { IsActive: true } } },
        });

        for (const eq of equipos) {
          nombreEquipoPorID.set(eq.EquipoVirtualID, eq.Nombre);
          componentesPorEquipo.set(
            eq.EquipoVirtualID,
            eq.detalles.map(c => ({
              RefaccionID: c.RefaccionID,
              CantidadPiezasPorEquipo: c.Cantidad ?? 1,
              CostoUnitario: Number(c.CostoUnitario ?? 0),
            })),
          );
        }
      }

      // ─── PASO 3: cuanto ya se recibio antes, por PedidoDetalleID ───
      // Suma de recepciones previas activas, para calcular lo pendiente.
      const recepcionesPrevias = await tx.pedidos_recepciones_detalle.findMany({
        where: {
          IsActive: true,
          pedidos_recepciones_encabezado: {
            PedidoID: dto.PedidoID,
            IsActive: true,
          },
        },
      });

      const recibidoPrevioPorDetalle = new Map<number, number>();
      for (const rec of recepcionesPrevias) {
        if (rec.PedidoDetalleID) {
          const actual = recibidoPrevioPorDetalle.get(rec.PedidoDetalleID) || 0;
          recibidoPrevioPorDetalle.set(rec.PedidoDetalleID, actual + (rec.CantidadRecibida || 0));
        }
      }

      // ─── PASO 4: validar cada detalle del dto ───
      for (const det of dto.Detalles) {
        const detPedido = detallesPedidoMap.get(det.PedidoDetalleID);

        // pertenencia: el PedidoDetalleID debe ser un renglon de ESTE pedido
        if (!detPedido) {
          throw new HttpError(
            `El detalle ${det.PedidoDetalleID} no pertenece al pedido ${dto.PedidoID}`,
            400,
          );
        }

        // R2: no exceder lo pendiente (pedido - ya recibido)
        const yaRecibido = recibidoPrevioPorDetalle.get(det.PedidoDetalleID) || 0;
        const pendiente = detPedido.Cantidad - yaRecibido;

        if (det.CantidadRecibida > pendiente) {
          throw new HttpError(
            `La cantidad a recibir (${det.CantidadRecibida}) excede lo pendiente (${pendiente}) del detalle ${det.PedidoDetalleID}`,
            400,
          );
        }
      }

      // ─── PASO 5: crear el encabezado de la recepcion ───
      // R3: MontoRecepcion = suma de (CantidadRecibida * PrecioUnitario) de cada detalle.
      let montoRecepcion = 0;
      for (const det of dto.Detalles) {
        const detPedido = detallesPedidoMap.get(det.PedidoDetalleID)!;
        montoRecepcion += det.CantidadRecibida * detPedido.PrecioUnitario;
      }
      montoRecepcion = this.round2(montoRecepcion);

      const recepcion = await tx.pedidos_recepciones_encabezado.create({
        data: {
          PedidoID: dto.PedidoID,
          FechaRecepcion: new Date(fechaStr),
          Observaciones: dto.Observaciones || null,
          MontoRecepcion: montoRecepcion,
          NumeroFactura: dto.NumeroFactura || null,
          UsuarioID: usuarioID,
          IsActive: true,
        },
      });

      // ─── PASO 6: crear detalles de recepcion + mover inventario/kardex ───
      for (const det of dto.Detalles) {
        const detPedido = detallesPedidoMap.get(det.PedidoDetalleID)!;

        // crear el detalle de recepcion
        await tx.pedidos_recepciones_detalle.create({
          data: {
            PedidoRecepcionID: recepcion.PedidoRecepcionID,
            PedidoDetalleID: det.PedidoDetalleID,
            RefaccionID: detPedido.RefaccionID,
            CantidadRecibida: det.CantidadRecibida,
            IsActive: true,
          },
        });

        // R4a: refaccion individual - mueve inventario/kardex directo
        const esRefaccion = detPedido.RefaccionID && !detPedido.EquipoVirtualID;
        if (esRefaccion) {
          const refaccionID = detPedido.RefaccionID!;

          await actualizarInventario(tx, refaccionID, det.CantidadRecibida, fechaStr);

          await crearKardex(
            tx,
            refaccionID,
            det.CantidadRecibida,
            detPedido.PrecioUnitario,
            usuarioID ?? 0,
            'Entrada_Compra',
            `Entrada por recepción de pedido #${dto.PedidoID}`,
            fechaStr,
          );

          await actualizarCostoPromedioRefaccion(
            tx,
            refaccionID,
            detPedido.PrecioUnitario,
            det.CantidadRecibida,
          );
        }
        // R4b: equipo virtual - descomponer en sus refacciones componentes.
        // Por cada componente:
        //   cantidadEntra = CantidadRecibida(EV) * CantidadPiezasPorEquipo
        //   precioProrrateado = PrecioUnitario(pedido) * CostoUnitario_i / SUM(CostoUnitario * CantidadPiezasPorEquipo)
        // Si costoBase = 0 (componentes con costo 0), fallback: usar CostoUnitario del componente.
        else if (detPedido.EquipoVirtualID) {
          const equipoVirtualID = detPedido.EquipoVirtualID;
          const componentes = componentesPorEquipo.get(equipoVirtualID) ?? [];
          const nombreEV = nombreEquipoPorID.get(equipoVirtualID) ?? 'Equipo Virtual';
          const costoBase = componentes.reduce(
            (s, c) => s + c.CostoUnitario * c.CantidadPiezasPorEquipo,
            0,
          );

          for (const comp of componentes) {
            const cantidadEntra = det.CantidadRecibida * comp.CantidadPiezasPorEquipo;
            console.log("CANTIDAD RECIBIDA", det.CantidadRecibida, "CANTIDAD DE PIEZAS POR EQUIPO", comp.CantidadPiezasPorEquipo)
            console.log("CANTIDAD ENTRA", cantidadEntra)
            
            if (cantidadEntra <= 0) continue;

            const precioProrrateado = costoBase > 0
              ? this.round2((detPedido.PrecioUnitario * comp.CostoUnitario) / costoBase)
              : comp.CostoUnitario;

            await actualizarInventario(tx, comp.RefaccionID, cantidadEntra, fechaStr);

            await crearKardex(
              tx,
              comp.RefaccionID,
              cantidadEntra,
              precioProrrateado,
              usuarioID ?? 0,
              'Entrada_Compra',
              `Entrada por recepción de pedido #${dto.PedidoID} - Equipo Virtual: ${nombreEV} (ID: ${equipoVirtualID})`,
              fechaStr,
            );

            await actualizarCostoPromedioRefaccion(
              tx,
              comp.RefaccionID,
              precioProrrateado,
              cantidadEntra,
            );
          }

          // R4c: si esta recepcion CIERRA la linea del EV (recibido acumulado >=
          // cantidad pedida), refrescar costos del catalogo equipos_virtuales +
          // registrar historial. Sobreescribe con el ultimo prorrateo.
          const yaRecibidoAntes = recibidoPrevioPorDetalle.get(det.PedidoDetalleID) || 0;
          const totalRecibidoAhora = yaRecibidoAntes + det.CantidadRecibida;
          const cierraElEV = totalRecibidoAhora >= detPedido.Cantidad && detPedido.Cantidad > 0;

          if (cierraElEV) {
            await this.actualizarCostosEquipoVirtual(
              tx,
              equipoVirtualID,
              componentes,
              detPedido.PrecioUnitario,
              costoBase,
              dto.PedidoID,
              usuarioID,
            );
          }
        }
      }

      // ─── PASO 7: recalcular EstadoEntrega + TotalRecibido del pedido ───
      await this.actualizarEstadoEntrega(tx, dto.PedidoID);

      return await this.findOneRaw(tx, recepcion.PedidoRecepcionID);
    }, {
      // EVs con muchos componentes (25+) hacen 3 queries por componente
      // (inventario+kardex+costo promedio) + update EV + historial al cerrar.
      // Con el default de 5s peta con "Transaction not found".
      maxWait: 10000,
      timeout: 60000,
    });

    return { message: 'Recepción registrada correctamente', data: result };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SISTEMA DE EJES INDEPENDIENTES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Recalcula EstadoEntrega y TotalRecibido de un pedido,
   * sumando todo lo recibido (todas las recepciones activas) contra lo pedido.
   */
  private async actualizarEstadoEntrega(tx: Prisma.TransactionClient, pedidoId: number) {
    const pedido = await tx.pedidos_encabezado.findUnique({
      where: { PedidoID: pedidoId },
      include: { pedidos_detalle: { where: { IsActive: true } } },
    });

    if (!pedido) return;

    // Sumar lo recibido por PedidoDetalleID (todas las recepciones activas)
    const recepciones = await tx.pedidos_recepciones_encabezado.findMany({
      where: { PedidoID: pedidoId, IsActive: true },
      include: { pedidos_recepciones_detalle: { where: { IsActive: true } } },
    });

    const recibidoPorDetalle = new Map<number, number>();
    for (const r of recepciones) {
      for (const det of r.pedidos_recepciones_detalle) {
        if (det.PedidoDetalleID) {
          const actual = recibidoPorDetalle.get(det.PedidoDetalleID) || 0;
          recibidoPorDetalle.set(det.PedidoDetalleID, actual + (det.CantidadRecibida || 0));
        }
      }
    }

    // Calcular totales (cantidad pedida vs recibida, y monto recibido)
    let totalCantidadPedida = 0;
    let totalCantidadRecibida = 0;
    let totalMontoRecibido = 0;

    for (const d of pedido.pedidos_detalle) {
      const pedida = d.Cantidad ?? 0;
      const recibida = recibidoPorDetalle.get(d.PedidoDetalleID) || 0;
      const precio = Number(d.PrecioUnitario ?? 0);

      totalCantidadPedida += pedida;
      totalCantidadRecibida += Math.min(recibida, pedida);
      totalMontoRecibido += Math.min(recibida, pedida) * precio;
    }

    // R5: determinar EstadoEntrega
    let nuevoEstado: EstadoEntregaCompra;
    if (totalCantidadRecibida >= totalCantidadPedida && totalCantidadPedida > 0) {
      nuevoEstado = 'ENTREGADO';
    } else if (totalCantidadRecibida > 0) {
      nuevoEstado = 'PARCIAL';
    } else {
      nuevoEstado = 'PEDIDO';
    }

    await tx.pedidos_encabezado.update({
      where: { PedidoID: pedidoId },
      data: {
        TotalRecibido: this.round2(totalMontoRecibido),
        EstadoEntrega: nuevoEstado,
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTUALIZACION DE COSTOS DE EQUIPO VIRTUAL
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Refresca CostoAnterior/CostoActual/Diferencia por componente + TotalCosto
   * global del EV, e inserta una fila en equipos_virtuales_historial. Se llama
   * SOLO cuando la linea de EV en el pedido queda completamente recibida.
   * Sobreescribe con el precio prorrateado del pedido actual.
   */
  private async actualizarCostosEquipoVirtual(
    tx: Prisma.TransactionClient,
    equipoVirtualID: number,
    componentes: Array<{ RefaccionID: number; CantidadPiezasPorEquipo: number; CostoUnitario: number }>,
    precioPedidoEquipo: number,
    costoBase: number,
    pedidoID: number,
    usuarioID: number | null,
  ) {
    // 1. Traer estado anterior del EV (para historial global)
    const equipoAntes = await tx.equipos_virtuales.findUnique({
      where: { EquipoVirtualID: equipoVirtualID },
      include: { detalles: { where: { IsActive: true } } },
    });
    if (!equipoAntes) return;

    const totalCostoAnterior = Number(equipoAntes.TotalCosto ?? 0);
    const detallesAntesPorRefaccion = new Map(
      equipoAntes.detalles.map((d) => [d.RefaccionID, d]),
    );

    // 2. Recalcular por componente (CostoAnterior/CostoActual/Diferencia/TotalUnidad/TotalFinal)
    const detallesCambio: Array<Record<string, number>> = [];
    let nuevoTotalCostoSinIva = 0;   // suma sin IVA -> equipos_virtuales.TotalCosto
    let nuevoTotalConIva = 0;         // suma con IVA -> equipos_virtuales.TotalConIVA

    for (const comp of componentes) {
      const detalleAntes = detallesAntesPorRefaccion.get(comp.RefaccionID);
      if (!detalleAntes) continue;

      // Prorrateo del precio del pedido (sin IVA) entre componentes segun costo unitario.
      const nuevoCostoUnitario = costoBase > 0
        ? this.round2((precioPedidoEquipo * comp.CostoUnitario) / costoBase)
        : Number(detalleAntes.CostoUnitario ?? 0);

      const cantidadDetalle = detalleAntes.Cantidad ?? 1;
      const descuento = Number(detalleAntes.Descuento ?? 0);
      const otros = Number(detalleAntes.Otros ?? 0);
      const costoImportacion = Number(detalleAntes.CostoImportacion ?? 0);
      const iva = Number(detalleAntes.IVA ?? 16);
      const cantidadPiezasPorEquipo = detalleAntes.CantidadPiezasPorEquipo ?? 1;
      const numeroEquipos = detalleAntes.NumeroEquipos ?? 1;

      // Sin IVA
      const nuevoTotalUnitario = this.round2(nuevoCostoUnitario * cantidadDetalle * (1 - descuento / 100));
      const nuevoTotalOtros    = this.round2(otros * cantidadDetalle);
      const subtotalSinIva     = nuevoTotalUnitario + nuevoTotalOtros + costoImportacion;

      // Con IVA
      const nuevoTotalUnidad = this.round2(subtotalSinIva * (1 + iva / 100));
      const nuevoTotalFinal  = this.round2(nuevoTotalUnidad * cantidadPiezasPorEquipo * numeroEquipos);
      const divisor          = cantidadPiezasPorEquipo * numeroEquipos;
      const nuevoCostoActual = divisor > 0 ? this.round2(nuevoTotalFinal / divisor) : nuevoTotalUnidad;

      const costoActualPrevio = Number(detalleAntes.CostoActual ?? 0);
      const diferencia = this.round2(nuevoCostoActual - costoActualPrevio);

      await tx.equipos_virtuales_detalle.update({
        where: { DetalleID: detalleAntes.DetalleID },
        data: {
          CostoUnitario:  nuevoCostoUnitario,
          TotalUnitario:  nuevoTotalUnitario,
          TotalOtros:     nuevoTotalOtros,
          TotalUnidad:    nuevoTotalUnidad,
          TotalFinal:     nuevoTotalFinal,
          CostoAnterior:  costoActualPrevio,
          CostoActual:    nuevoCostoActual,
          Diferencia:     diferencia,
        },
      });

      detallesCambio.push({
        RefaccionID: comp.RefaccionID,
        CostoAnterior: costoActualPrevio,
        CostoActual: nuevoCostoActual,
        Diferencia: diferencia,
      });
      nuevoTotalCostoSinIva += subtotalSinIva * cantidadPiezasPorEquipo * numeroEquipos;
      nuevoTotalConIva      += nuevoTotalFinal;
    }

    nuevoTotalCostoSinIva = this.round2(nuevoTotalCostoSinIva);
    nuevoTotalConIva      = this.round2(nuevoTotalConIva);

    // 3. Actualizar TotalCosto (sin IVA) + TotalConIVA globales del EV
    await tx.equipos_virtuales.update({
      where: { EquipoVirtualID: equipoVirtualID },
      data: {
        TotalCosto:  nuevoTotalCostoSinIva,
        TotalConIVA: nuevoTotalConIva,
      },
    });

    // 4. Registrar historial
    await tx.equipos_virtuales_historial.create({
      data: {
        EquipoVirtualID: equipoVirtualID,
        FechaCambio: new Date(),
        PrecioAnterior: totalCostoAnterior,
        PrecioNuevo: nuevoTotalCostoSinIva,
        Diferencia: this.round2(nuevoTotalCostoSinIva - totalCostoAnterior),
        DetallesCambio: detallesCambio as unknown as Prisma.InputJsonValue,
        UsuarioID: usuarioID,
        Observaciones: `Actualización por recepción completa del pedido #${pedidoID}`,
      },
    });
  }

}

export const pedidosRecepcionesService = new PedidosRecepcionesService();
