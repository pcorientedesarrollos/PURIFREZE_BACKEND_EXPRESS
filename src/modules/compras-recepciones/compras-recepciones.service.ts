import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { compras_encabezado_Estatus, EstadoEntregaCompra, Prisma } from '@prisma/client';
import moment from 'moment';
import { CreateRecepcionDto, UpdateFacturaDto, ReporteQueryDto } from './compras-recepciones.schema';
import {
  actualizarInventario,
  crearKardex,
  actualizarCostoPromedioRefaccion,
} from '../../shared/shared-operations.service';

const ESTATUS_FINALIZADO: compras_encabezado_Estatus = 'Finalizado';

class ComprasRecepcionesService {
  // ==================== CREAR RECEPCIÓN ====================

  async create(createDto: CreateRecepcionDto) {
    const { CompraEncabezadoID, Detalles, MontoRecepcion, UsuarioID } = createDto;
    const fechaHoyStr = createDto.FechaRecepcion || moment().format('YYYY-MM-DD');
    const fechaHoy = new Date(fechaHoyStr);
    const usuarioIDNum = UsuarioID || 0;

    const result = await prisma.$transaction(
      async (tx) => {
      // 1. Verificar que la compra exista y no esté completamente entregada
      const compra = await tx.compras_encabezado.findUnique({
        where: { CompraEncabezadoID },
        include: { compras_detalle: true },
      });

      if (!compra) {
        throw new HttpError('Compra no encontrada', 404);
      }

      // Usar nuevo sistema de estados (EstadoEntrega en lugar de Estatus)
      if (compra.EstadoEntrega === 'ENTREGADO') {
        throw new HttpError('La compra ya está completamente entregada', 400);
      }

      // 2. Validar que vengan detalles
      if (!Detalles?.length) {
        throw new HttpError('No ingresaste ningún item en la recepción', 400);
      }

      // 3. Crear mapa de detalles de compra por CompraDetalleID
      const detallesCompraMap = new Map<number, {
        CompraDetalleID: number;
        RefaccionID: number | null;
        EquipoVirtualID: number | null;
        Cantidad: number;
        PrecioUnitario: number | null;
      }>();

      for (const detalle of compra.compras_detalle) {
        if (detalle.IsActive) {
          detallesCompraMap.set(detalle.CompraDetalleID, {
            CompraDetalleID: detalle.CompraDetalleID,
            RefaccionID: detalle.RefaccionID,
            EquipoVirtualID: detalle.EquipoVirtualID,
            Cantidad: detalle.Cantidad || 0,
            PrecioUnitario: detalle.PrecioUnitario,
          });
        }
      }

      // 4. Obtener cantidades ya recibidas por CompraDetalleID
      const recepcionesExistentes = await tx.compras_recepciones_detalle.findMany({
        where: {
          compras_recepciones_encabezado: {
            CompraEncabezadoID,
            IsActive: 1,
          },
          IsActive: 1,
        },
      });

      const cantidadesRecibidasPorDetalle = new Map<number, number>();
      for (const rec of recepcionesExistentes) {
        if (rec.CompraDetalleID) {
          const actual = cantidadesRecibidasPorDetalle.get(rec.CompraDetalleID) || 0;
          cantidadesRecibidasPorDetalle.set(rec.CompraDetalleID, actual + (rec.CantidadEstablecida || 0));
        }
      }

      // 5. Validar que las cantidades no excedan las de la compra
      for (const detalleRecepcion of Detalles) {
        const detalleCompra = detallesCompraMap.get(detalleRecepcion.CompraDetalleID);

        if (!detalleCompra) {
          throw new HttpError(
            `El detalle con ID ${detalleRecepcion.CompraDetalleID} no existe en la compra`,
            400,
          );
        }

        const cantidadYaRecibida = cantidadesRecibidasPorDetalle.get(detalleRecepcion.CompraDetalleID) || 0;
        const cantidadPendiente = detalleCompra.Cantidad - cantidadYaRecibida;

        if (detalleRecepcion.CantidadEstablecida > cantidadPendiente) {
          throw new HttpError(
            `La cantidad a recibir (${detalleRecepcion.CantidadEstablecida}) excede la cantidad pendiente (${cantidadPendiente})`,
            400,
          );
        }
      }

      // 6. Crear recepción de compra (encabezado)
      const recepcionGuardada = await tx.compras_recepciones_encabezado.create({
        data: {
          CompraEncabezadoID,
          FechaRecepcion: fechaHoy,
          Observaciones: createDto.Observaciones || 'Recepción parcial de compra',
          MontoRecepcion,
          UsuarioID,
          NumeroFactura: createDto.NumeroFactura || null,
          IsActive: 1,
        },
      });

      // 7. Crear detalles de recepción y procesar inventario/kardex
      for (const detalleRecepcion of Detalles) {
        const detalleCompra = detallesCompraMap.get(detalleRecepcion.CompraDetalleID)!;
        const esEquipoVirtual = detalleCompra.EquipoVirtualID && !detalleCompra.RefaccionID;

        // Crear detalle de recepción
        await tx.compras_recepciones_detalle.create({
          data: {
            ComprasRecepcionesEncabezadoID: recepcionGuardada.ComprasRecepcionesEncabezadoID,
            CompraDetalleID: detalleRecepcion.CompraDetalleID,
            RefaccionID: detalleCompra.RefaccionID,
            CantidadEstablecida: detalleRecepcion.CantidadEstablecida,
            IsActive: 1,
          },
        });

        // Solo procesar inventario/kardex para refacciones (no para equipos virtuales)
        if (detalleCompra.RefaccionID && !esEquipoVirtual) {
          const precioUnitario = detalleCompra.PrecioUnitario || 0;

          // Actualizar inventario
          await actualizarInventario(
            tx,
            detalleCompra.RefaccionID,
            detalleRecepcion.CantidadEstablecida,
            fechaHoyStr,
          );

          // Crear registro en Kardex
          await crearKardex(
            tx,
            detalleCompra.RefaccionID,
            detalleRecepcion.CantidadEstablecida,
            precioUnitario,
            usuarioIDNum,
            'Entrada_Compra',
            `Entrada por recepción de compra #${CompraEncabezadoID}`,
            fechaHoyStr,
          );

          // Actualizar costo promedio
          await actualizarCostoPromedioRefaccion(
            tx,
            detalleCompra.RefaccionID,
            precioUnitario,
            detalleRecepcion.CantidadEstablecida,
          );
        }
      }

      // 8. Actualizar estado de entrega de la compra (nuevo sistema de ejes independientes)
      await this.actualizarEstadoEntrega(tx, CompraEncabezadoID);

      // 9. Verificar estado final
      const compraActualizada = await tx.compras_encabezado.findUnique({
        where: { CompraEncabezadoID },
      });

      const entregaCompleta = compraActualizada?.EstadoEntrega === 'ENTREGADO';
      const pagoCompleto = compraActualizada?.EstadoPago === 'PAGADO';

      // Actualizar Estatus legacy si ambos ejes están completos
      if (entregaCompleta && pagoCompleto) {
        await tx.compras_encabezado.update({
          where: { CompraEncabezadoID },
          data: { Estatus: ESTATUS_FINALIZADO },
        });
      }

      return {
        recepcion: recepcionGuardada,
        estadoEntrega: compraActualizada?.EstadoEntrega,
        estadoPago: compraActualizada?.EstadoPago,
        compraFinalizada: entregaCompleta && pagoCompleto,
      };
    },
      {
        maxWait: 10000, // Máximo 10 segundos esperando para iniciar la transacción
        timeout: 30000, // Máximo 30 segundos para completar la transacción
      },
    );

    return { message: 'Recepción de compra registrada correctamente', data: result };
  }

  // ==================== CONSULTAS ====================

  async findAll() {
    const recepciones = await prisma.compras_recepciones_encabezado.findMany({
      include: { compras_recepciones_detalle: true },
      orderBy: { ComprasRecepcionesEncabezadoID: 'desc' },
    });

    return { message: 'Recepciones obtenidas', data: recepciones };
  }

  async findByCompra(compraEncabezadoID: number) {
    const recepciones = await prisma.compras_recepciones_encabezado.findMany({
      where: { CompraEncabezadoID: compraEncabezadoID },
      include: { compras_recepciones_detalle: true },
      orderBy: { ComprasRecepcionesEncabezadoID: 'desc' },
    });

    return { message: 'Recepciones de la compra obtenidas', data: recepciones };
  }

  /**
   * Obtiene todas las recepciones con sus pagos asociados
   */
  async findAllWithPagos() {
    const recepciones = await prisma.compras_recepciones_encabezado.findMany({
      include: { compras_recepciones_detalle: true },
      orderBy: { ComprasRecepcionesEncabezadoID: 'desc' },
    });

    // Obtener pagos de todas las compras
    const compraIDs = [...new Set(recepciones.map(r => r.CompraEncabezadoID))];

    const pagos = await prisma.pagos.findMany({
      where: {
        ReferenciaTipo: 'Compras',
        ReferenciaID: { in: compraIDs.filter((id): id is number => id !== null) },
        IsActive: 1,
      },
      orderBy: { PagosID: 'desc' },
    });

    // Agrupar pagos por CompraEncabezadoID
    const pagosPorCompra = new Map<number, typeof pagos>();
    for (const pago of pagos) {
      if (pago.ReferenciaID) {
        const lista = pagosPorCompra.get(pago.ReferenciaID) || [];
        lista.push(pago);
        pagosPorCompra.set(pago.ReferenciaID, lista);
      }
    }

    // Combinar recepciones con sus pagos
    const recepcionesConPagos = recepciones.map(recepcion => ({
      ...recepcion,
      Pagos: recepcion.CompraEncabezadoID ? pagosPorCompra.get(recepcion.CompraEncabezadoID) || [] : [],
    }));

    return { message: 'Recepciones con pagos obtenidas', data: recepcionesConPagos };
  }

  /**
   * Obtiene recepciones con pagos por ID de compra
   * Incluye información completa de refacciones Y equipos virtuales para facilitar nuevas recepciones
   */
  async findByCompraWithPagos(compraEncabezadoID: number) {
    // 1. Obtener la compra con sus detalles
    const compra = await prisma.compras_encabezado.findUnique({
      where: { CompraEncabezadoID: compraEncabezadoID },
      include: {
        compras_detalle: {
          where: { IsActive: true },
        },
      },
    });

    if (!compra) {
      throw new HttpError('Compra no encontrada', 404);
    }

    // 2. Obtener recepciones con sus detalles
    const recepciones = await prisma.compras_recepciones_encabezado.findMany({
      where: { CompraEncabezadoID: compraEncabezadoID, IsActive: 1 },
      include: {
        compras_recepciones_detalle: {
          where: { IsActive: 1 },
        },
      },
      orderBy: { ComprasRecepcionesEncabezadoID: 'desc' },
    });

    // 3. Obtener pagos de la compra
    const pagos = await prisma.pagos.findMany({
      where: {
        ReferenciaTipo: 'Compras',
        ReferenciaID: compraEncabezadoID,
        IsActive: 1,
      },
      orderBy: { PagosID: 'desc' },
    });

    // 4. Obtener IDs de refacciones Y equipos virtuales
    const refaccionIDs = compra.compras_detalle
      .map(d => d.RefaccionID)
      .filter((id): id is number => id !== null);

    const equipoVirtualIDs = compra.compras_detalle
      .map(d => d.EquipoVirtualID)
      .filter((id): id is number => id !== null);

    // 5. Obtener información de las refacciones
    const refacciones = await prisma.catalogo_refacciones.findMany({
      where: { RefaccionID: { in: refaccionIDs } },
    });
    const refaccionesMap = new Map(refacciones.map(r => [r.RefaccionID, r]));

    // 5b. Obtener información de equipos virtuales
    const equiposVirtuales = equipoVirtualIDs.length > 0
      ? await prisma.equipos_virtuales.findMany({
          where: { EquipoVirtualID: { in: equipoVirtualIDs } },
        })
      : [];
    const equiposVirtualesMap = new Map(equiposVirtuales.map(e => [e.EquipoVirtualID, e]));

    // 6. Calcular cantidades recibidas por CompraDetalleID (no por RefaccionID)
    const cantidadesRecibidasPorDetalle = new Map<number, number>();
    for (const recepcion of recepciones) {
      for (const detalleRec of recepcion.compras_recepciones_detalle) {
        // Buscar el CompraDetalleID correspondiente
        if (detalleRec.CompraDetalleID) {
          const actual = cantidadesRecibidasPorDetalle.get(detalleRec.CompraDetalleID) || 0;
          cantidadesRecibidasPorDetalle.set(detalleRec.CompraDetalleID, actual + (detalleRec.CantidadEstablecida || 0));
        } else if (detalleRec.RefaccionID) {
          // Fallback: buscar por RefaccionID (compatibilidad con recepciones antiguas)
          const detalleCompra = compra.compras_detalle.find(d => d.RefaccionID === detalleRec.RefaccionID);
          if (detalleCompra) {
            const actual = cantidadesRecibidasPorDetalle.get(detalleCompra.CompraDetalleID) || 0;
            cantidadesRecibidasPorDetalle.set(detalleCompra.CompraDetalleID, actual + (detalleRec.CantidadEstablecida || 0));
          }
        }
      }
    }

    // 7. Construir detalle incluyendo TODOS los items (refacciones Y equipos virtuales)
    const refaccionesDetalle = compra.compras_detalle.map(detalle => {
      const esEquipoVirtual = detalle.EquipoVirtualID && !detalle.RefaccionID;

      let nombre: string;
      let descripcion: string;

      if (esEquipoVirtual) {
        const equipo = equiposVirtualesMap.get(detalle.EquipoVirtualID!);
        nombre = equipo?.Nombre || 'Equipo Virtual';
        descripcion = equipo?.Codigo || '';
      } else {
        const refaccion = refaccionesMap.get(detalle.RefaccionID!);
        nombre = refaccion?.NombrePieza || 'Refacción no encontrada';
        descripcion = refaccion?.Observaciones || '';
      }

      const cantidadRecibida = cantidadesRecibidasPorDetalle.get(detalle.CompraDetalleID) || 0;
      const cantidadComprada = detalle.Cantidad || 0;
      const cantidadPendiente = cantidadComprada - cantidadRecibida;
      const precioUnitario = detalle.PrecioUnitario || 0;

      return {
        CompraDetalleID: detalle.CompraDetalleID,
        RefaccionID: detalle.RefaccionID,
        EquipoVirtualID: detalle.EquipoVirtualID,
        EsEquipoVirtual: esEquipoVirtual,
        NombreRefaccion: nombre,
        Descripcion: descripcion,
        CantidadComprada: cantidadComprada,
        CantidadRecibida: cantidadRecibida,
        CantidadPendiente: cantidadPendiente,
        PrecioUnitario: precioUnitario,
        SubtotalComprado: cantidadComprada * precioUnitario,
        SubtotalRecibido: cantidadRecibida * precioUnitario,
        SubtotalPendiente: cantidadPendiente * precioUnitario,
        Completado: cantidadPendiente <= 0,
      };
    });

    // 8. Calcular totales
    const totalPagado = pagos.reduce((sum, p) => sum + (p.Monto || 0), 0);
    const totalRecibido = recepciones.reduce((sum, r) => sum + (r.MontoRecepcion || 0), 0);
    const totalCompra = compra.TotalNeto || 0;
    const montoPendientePago = totalCompra - totalPagado;

    // 9. Calcular totales de items (refacciones + equipos virtuales)
    const totalRefaccionesCompradas = refaccionesDetalle.reduce((sum, r) => sum + r.CantidadComprada, 0);
    const totalRefaccionesRecibidas = refaccionesDetalle.reduce((sum, r) => sum + r.CantidadRecibida, 0);
    const totalRefaccionesPendientes = refaccionesDetalle.reduce((sum, r) => sum + r.CantidadPendiente, 0);

    return {
      message: 'Recepciones con pagos de la compra obtenidas',
      data: {
        compra: {
          CompraEncabezadoID: compra.CompraEncabezadoID,
          ProveedorID: compra.ProveedorID,
          FechaCompra: compra.FechaCompra ? moment.utc(compra.FechaCompra).format('YYYY-MM-DD') : null,
          Estatus: compra.Estatus,
          TotalBruto: compra.TotalBruto,
          TotalIVA: compra.TotalIVA,
          TotalNeto: compra.TotalNeto,
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
          // Montos
          montoTotalCompra: totalCompra,
          montoTotalRecibido: totalRecibido,
          montoTotalPagado: totalPagado,
          montoPendientePago: montoPendientePago,
          // Items (refacciones + equipos virtuales)
          totalRefaccionesCompradas,
          totalRefaccionesRecibidas,
          totalRefaccionesPendientes,
          // Estado
          compraFinalizada: compra.Estatus === 'Finalizado',
          recepcionCompleta: totalRefaccionesPendientes <= 0,
          pagoCompleto: montoPendientePago <= 0,
        },
      },
    };
  }

  async findOne(id: number) {
    const recepcion = await prisma.compras_recepciones_encabezado.findUnique({
      where: { ComprasRecepcionesEncabezadoID: id },
      include: { compras_recepciones_detalle: true },
    });

    if (!recepcion) {
      throw new HttpError('Recepción no encontrada', 404);
    }

    return { message: 'Recepción obtenida', data: recepcion };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MÉTODOS PARA SISTEMA DE EJES INDEPENDIENTES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Actualiza el EstadoEntrega y TotalRecibido de una compra
   * basado en las recepciones realizadas
   */
  private async actualizarEstadoEntrega(tx: Prisma.TransactionClient, compraEncabezadoID: number) {
    const compra = await tx.compras_encabezado.findUnique({
      where: { CompraEncabezadoID: compraEncabezadoID },
      include: { compras_detalle: { where: { IsActive: true } } },
    });

    if (!compra) return;

    // Obtener cantidades recibidas por CompraDetalleID (cubre refacciones Y equipos virtuales)
    const recepciones = await tx.compras_recepciones_encabezado.findMany({
      where: { CompraEncabezadoID: compraEncabezadoID, IsActive: 1 },
      include: { compras_recepciones_detalle: { where: { IsActive: 1 } } },
    });

    const cantidadesRecibidasPorDetalle = new Map<number, number>();
    for (const recepcion of recepciones) {
      for (const detalleRec of recepcion.compras_recepciones_detalle) {
        if (detalleRec.CompraDetalleID) {
          const actual = cantidadesRecibidasPorDetalle.get(detalleRec.CompraDetalleID) || 0;
          cantidadesRecibidasPorDetalle.set(detalleRec.CompraDetalleID, actual + (detalleRec.CantidadEstablecida || 0));
        }
      }
    }

    // Calcular totales incluyendo todos los ítems (refacciones + equipos virtuales)
    let totalCantidadComprada = 0;
    let totalCantidadRecibida = 0;
    let totalMontoRecibido = 0;

    for (const detalle of compra.compras_detalle) {
      const cantidadComprada = detalle.Cantidad || 0;
      const cantidadRecibida = cantidadesRecibidasPorDetalle.get(detalle.CompraDetalleID) || 0;
      const precioUnitario = detalle.PrecioUnitario || 0;

      totalCantidadComprada += cantidadComprada;
      totalCantidadRecibida += Math.min(cantidadRecibida, cantidadComprada);
      totalMontoRecibido += Math.min(cantidadRecibida, cantidadComprada) * precioUnitario;
    }

    // Determinar estado de entrega
    let nuevoEstado: EstadoEntregaCompra;
    if (totalCantidadRecibida >= totalCantidadComprada && totalCantidadComprada > 0) {
      nuevoEstado = 'ENTREGADO';
    } else if (totalCantidadRecibida > 0) {
      nuevoEstado = 'PARCIAL';
    } else {
      nuevoEstado = 'PEDIDO';
    }

    await tx.compras_encabezado.update({
      where: { CompraEncabezadoID: compraEncabezadoID },
      data: {
        TotalRecibido: totalMontoRecibido,
        EstadoEntrega: nuevoEstado,
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REPORTE DE ENTREGAS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Obtiene reporte de entregas con filtros
   */
  async getReporte(query: ReporteQueryDto) {
    const { fechaInicio, fechaFin, proveedorId, tieneFactura } = query;

    // Construir condiciones de filtro
    const where: Prisma.compras_recepciones_encabezadoWhereInput = {
      IsActive: 1,
    };

    // Filtro por fecha
    if (fechaInicio || fechaFin) {
      where.FechaRecepcion = {};
      if (fechaInicio) {
        where.FechaRecepcion.gte = new Date(fechaInicio);
      }
      if (fechaFin) {
        where.FechaRecepcion.lte = new Date(fechaFin + 'T23:59:59');
      }
    }

    // Filtro por factura
    if (tieneFactura === 'si') {
      where.NumeroFactura = { not: null };
    } else if (tieneFactura === 'no') {
      where.NumeroFactura = null;
    }

    // Obtener recepciones
    const recepciones = await prisma.compras_recepciones_encabezado.findMany({
      where,
      include: {
        compras_recepciones_detalle: {
          where: { IsActive: 1 },
        },
        compra: {
          select: {
            CompraEncabezadoID: true,
            ProveedorID: true,
            FechaCompra: true,
            TotalNeto: true,
            EstadoEntrega: true,
            EstadoPago: true,
            Estatus: true,
            catalogo_proveedores: {
              select: {
                ProveedorID: true,
                NombreProveedor: true,
              },
            },
            compras_detalle: {
              where: { EquipoVirtualID: { not: null } },
              take: 1,
              select: {
                EquipoVirtualID: true,
                equipoVirtual: {
                  select: {
                    EquipoVirtualID: true,
                    Nombre: true,
                    Codigo: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { FechaRecepcion: 'desc' },
    });

    // Filtrar por proveedor si se especifica
    let recepcionesFiltradas = recepciones;
    if (proveedorId) {
      recepcionesFiltradas = recepciones.filter(
        r => r.compra?.ProveedorID === proveedorId
      );
    }

    // Formatear respuesta
    const reporteFormateado = recepcionesFiltradas.map(recepcion => ({
      RecepcionID: recepcion.ComprasRecepcionesEncabezadoID,
      FechaRecepcion: recepcion.FechaRecepcion ? moment.utc(recepcion.FechaRecepcion).format('YYYY-MM-DD') : null,
      NumeroFactura: recepcion.NumeroFactura,
      MontoRecepcion: recepcion.MontoRecepcion,
      Observaciones: recepcion.Observaciones,
      TotalRefacciones: recepcion.compras_recepciones_detalle.length,
      Compra: recepcion.compra ? {
        CompraEncabezadoID: recepcion.compra.CompraEncabezadoID,
        FechaCompra: recepcion.compra.FechaCompra ? moment.utc(recepcion.compra.FechaCompra).format('YYYY-MM-DD') : null,
        TotalNeto: recepcion.compra.TotalNeto,
        EstadoEntrega: recepcion.compra.EstadoEntrega,
        EstadoPago: recepcion.compra.EstadoPago,
        Estatus: recepcion.compra.Estatus,
      } : null,
      Proveedor: recepcion.compra?.catalogo_proveedores ? {
        ProveedorID: recepcion.compra.catalogo_proveedores.ProveedorID,
        NombreProveedor: recepcion.compra.catalogo_proveedores.NombreProveedor,
      } : null,
      EquipoVirtual: recepcion.compra?.compras_detalle?.[0]?.equipoVirtual ? {
        EquipoVirtualID: recepcion.compra.compras_detalle[0].equipoVirtual.EquipoVirtualID,
        Nombre: recepcion.compra.compras_detalle[0].equipoVirtual.Nombre,
        Codigo: recepcion.compra.compras_detalle[0].equipoVirtual.Codigo,
      } : null,
    }));

    // Calcular totales
    const totalRecepciones = reporteFormateado.length;
    const conFactura = reporteFormateado.filter(r => r.NumeroFactura).length;
    const sinFactura = totalRecepciones - conFactura;
    const montoTotal = reporteFormateado.reduce((sum, r) => sum + (r.MontoRecepcion || 0), 0);

    return {
      message: 'Reporte de entregas obtenido',
      data: {
        recepciones: reporteFormateado,
        resumen: {
          totalRecepciones,
          conFactura,
          sinFactura,
          montoTotal: Math.round(montoTotal * 100) / 100,
        },
      },
    };
  }

  /**
   * Actualiza el número de factura de una recepción
   */
  async updateFactura(id: number, dto: UpdateFacturaDto) {
    const recepcion = await prisma.compras_recepciones_encabezado.findUnique({
      where: { ComprasRecepcionesEncabezadoID: id },
    });

    if (!recepcion) {
      throw new HttpError('Recepción no encontrada', 404);
    }

    if (recepcion.IsActive !== 1) {
      throw new HttpError('La recepción no está activa', 400);
    }

    const recepcionActualizada = await prisma.compras_recepciones_encabezado.update({
      where: { ComprasRecepcionesEncabezadoID: id },
      data: {
        NumeroFactura: dto.NumeroFactura,
      },
    });

    return {
      message: 'Número de factura actualizado correctamente',
      data: {
        RecepcionID: recepcionActualizada.ComprasRecepcionesEncabezadoID,
        NumeroFactura: recepcionActualizada.NumeroFactura,
      },
    };
  }
}

export const comprasRecepcionesService = new ComprasRecepcionesService();
