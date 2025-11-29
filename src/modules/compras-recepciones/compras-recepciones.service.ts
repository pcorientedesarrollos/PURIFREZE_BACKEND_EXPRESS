import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { compras_encabezado_Estatus } from '@prisma/client';
import moment from 'moment';
import { CreateRecepcionDto } from './compras-recepciones.schema';
import {
  validarSaldoCuentaBancaria,
  actualizarInventario,
  crearKardex,
  actualizarCostoPromedioRefaccion,
  crearPagoYMovimientoBancario,
  obtenerTotalPagadoCompra,
  obtenerCantidadesRecibidasCompra,
} from '../../shared/shared-operations.service';

const ESTATUS_FINALIZADO: compras_encabezado_Estatus = 'Finalizado';

class ComprasRecepcionesService {
  // ==================== CREAR RECEPCIÓN ====================

  async create(createDto: CreateRecepcionDto) {
    const { CompraEncabezadoID, Detalles, MontoRecepcion, MetodoPagoID, CuentaBancariaID, UsuarioID } = createDto;
    const fechaHoyStr = createDto.FechaRecepcion || moment().format('YYYY-MM-DD');
    const fechaHoy = new Date(fechaHoyStr);
    const usuarioIDNum = UsuarioID || 0;

    const result = await prisma.$transaction(
      async (tx) => {
      // 1. Verificar que la compra exista y no esté finalizada
      const compra = await tx.compras_encabezado.findUnique({
        where: { CompraEncabezadoID },
        include: { compras_detalle: true },
      });

      if (!compra) {
        throw new HttpError('Compra no encontrada', 404);
      }

      if (compra.Estatus === ESTATUS_FINALIZADO) {
        throw new HttpError('La compra ya está finalizada', 400);
      }

      // 2. Validar que vengan detalles
      if (!Detalles?.length) {
        throw new HttpError('No ingresaste ninguna refacción en la recepción', 400);
      }

      // 3. Validar saldo suficiente en cuenta bancaria
      await validarSaldoCuentaBancaria(tx, CuentaBancariaID, MontoRecepcion);

      // 4. Obtener cantidades ya recibidas
      const cantidadesRecibidas = await obtenerCantidadesRecibidasCompra(tx, CompraEncabezadoID);

      // 5. Validar que las cantidades no excedan las de la compra
      const detallesCompraMap = new Map<number, { RefaccionID: number; Cantidad: number; PrecioUnitario: number | null }>();
      for (const detalle of compra.compras_detalle) {
        if (detalle.IsActive && detalle.RefaccionID) {
          detallesCompraMap.set(detalle.RefaccionID, {
            RefaccionID: detalle.RefaccionID,
            Cantidad: detalle.Cantidad || 0,
            PrecioUnitario: detalle.PrecioUnitario,
          });
        }
      }

      for (const detalleRecepcion of Detalles) {
        const detalleCompra = detallesCompraMap.get(detalleRecepcion.RefaccionID);

        if (!detalleCompra) {
          throw new HttpError(
            `La refacción ${detalleRecepcion.RefaccionID} no existe en la compra`,
            400,
          );
        }

        const cantidadYaRecibida = cantidadesRecibidas.get(detalleRecepcion.RefaccionID) || 0;
        const cantidadPendiente = detalleCompra.Cantidad - cantidadYaRecibida;

        if (detalleRecepcion.CantidadEstablecida > cantidadPendiente) {
          throw new HttpError(
            `La cantidad a recibir (${detalleRecepcion.CantidadEstablecida}) para la refacción ${detalleRecepcion.RefaccionID} excede la cantidad pendiente (${cantidadPendiente})`,
            400,
          );
        }
      }

      // 6. Validar que el monto no exceda el pendiente por pagar
      const totalPagado = await obtenerTotalPagadoCompra(tx, CompraEncabezadoID);
      const montoPendiente = (compra.TotalNeto || 0) - totalPagado;

      if (MontoRecepcion > montoPendiente) {
        throw new HttpError(
          `El monto de la recepción ($${MontoRecepcion}) excede el monto pendiente por pagar ($${montoPendiente})`,
          400,
        );
      }

      // 7. Crear recepción de compra (encabezado)
      const recepcionGuardada = await tx.compras_recepciones_encabezado.create({
        data: {
          CompraEncabezadoID,
          FechaRecepcion: fechaHoy,
          Observaciones: createDto.Observaciones || 'Recepción parcial de compra',
          MontoRecepcion,
          UsuarioID,
          IsActive: 1,
        },
      });

      // 8. Crear detalles de recepción y procesar inventario/kardex
      for (const detalleRecepcion of Detalles) {
        // Crear detalle de recepción
        await tx.compras_recepciones_detalle.create({
          data: {
            ComprasRecepcionesEncabezadoID: recepcionGuardada.ComprasRecepcionesEncabezadoID,
            RefaccionID: detalleRecepcion.RefaccionID,
            CantidadEstablecida: detalleRecepcion.CantidadEstablecida,
            IsActive: 1,
          },
        });

        // Obtener precio unitario de la compra
        const detalleCompra = detallesCompraMap.get(detalleRecepcion.RefaccionID)!;
        const precioUnitario = detalleCompra.PrecioUnitario || 0;

        // Actualizar inventario
        await actualizarInventario(
          tx,
          detalleRecepcion.RefaccionID,
          detalleRecepcion.CantidadEstablecida,
          fechaHoyStr,
        );

        // Crear registro en Kardex
        await crearKardex(
          tx,
          detalleRecepcion.RefaccionID,
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
          detalleRecepcion.RefaccionID,
          precioUnitario,
          detalleRecepcion.CantidadEstablecida,
        );
      }

      // 9. Crear pago automático
      await crearPagoYMovimientoBancario(tx, {
        referenciaTipo: 'Compras',
        referenciaID: CompraEncabezadoID,
        metodoPagoID: MetodoPagoID,
        cuentaBancariaID: CuentaBancariaID,
        monto: MontoRecepcion,
        UsuarioID: UsuarioID || 0,
        observaciones: `Pago parcial de compra #${CompraEncabezadoID} - Recepción #${recepcionGuardada.ComprasRecepcionesEncabezadoID}`,
        fechaPago: fechaHoyStr,
      });

      // 10. Verificar si la compra se completó
      const nuevoTotalPagado = totalPagado + MontoRecepcion;
      const nuevasCantidadesRecibidas = await obtenerCantidadesRecibidasCompra(tx, CompraEncabezadoID);

      // Verificar si todas las cantidades están completas
      let recepcionCompleta = true;
      for (const detalle of compra.compras_detalle) {
        if (detalle.IsActive && detalle.RefaccionID) {
          const cantidadRecibida = nuevasCantidadesRecibidas.get(detalle.RefaccionID) || 0;
          if (cantidadRecibida < (detalle.Cantidad || 0)) {
            recepcionCompleta = false;
            break;
          }
        }
      }

      // Si el pago y las recepciones están completas, finalizar la compra
      const totalNeto = compra.TotalNeto || 0;
      if (recepcionCompleta && nuevoTotalPagado >= totalNeto) {
        await tx.compras_encabezado.update({
          where: { CompraEncabezadoID },
          data: { Estatus: ESTATUS_FINALIZADO },
        });
      }

      return {
        recepcion: recepcionGuardada,
        compraFinalizada: recepcionCompleta && nuevoTotalPagado >= totalNeto,
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
   * Incluye información completa de refacciones para facilitar nuevas recepciones
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

    // 4. Obtener IDs de refacciones de la compra
    const refaccionIDs = compra.compras_detalle
      .map(d => d.RefaccionID)
      .filter((id): id is number => id !== null);

    // 5. Obtener información de las refacciones
    const refacciones = await prisma.catalogo_refacciones.findMany({
      where: { RefaccionID: { in: refaccionIDs } },
    });
    const refaccionesMap = new Map(refacciones.map(r => [r.RefaccionID, r]));

    // 6. Calcular cantidades recibidas por refacción
    const cantidadesRecibidas = new Map<number, number>();
    for (const recepcion of recepciones) {
      for (const detalle of recepcion.compras_recepciones_detalle) {
        if (detalle.RefaccionID) {
          const actual = cantidadesRecibidas.get(detalle.RefaccionID) || 0;
          cantidadesRecibidas.set(detalle.RefaccionID, actual + (detalle.CantidadEstablecida || 0));
        }
      }
    }

    // 7. Construir detalle de refacciones con info completa
    const refaccionesDetalle = compra.compras_detalle.map(detalle => {
      const refaccion = detalle.RefaccionID ? refaccionesMap.get(detalle.RefaccionID) : null;
      const cantidadRecibida = detalle.RefaccionID ? (cantidadesRecibidas.get(detalle.RefaccionID) || 0) : 0;
      const cantidadComprada = detalle.Cantidad || 0;
      const cantidadPendiente = cantidadComprada - cantidadRecibida;
      const precioUnitario = detalle.PrecioUnitario || 0;

      return {
        CompraDetalleID: detalle.CompraDetalleID,
        RefaccionID: detalle.RefaccionID,
        NombreRefaccion: refaccion?.NombrePieza || 'Refacción no encontrada',
        Descripcion: refaccion?.Observaciones || '',
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

    // 9. Calcular totales de refacciones
    const totalRefaccionesCompradas = refaccionesDetalle.reduce((sum, r) => sum + r.CantidadComprada, 0);
    const totalRefaccionesRecibidas = refaccionesDetalle.reduce((sum, r) => sum + r.CantidadRecibida, 0);
    const totalRefaccionesPendientes = refaccionesDetalle.reduce((sum, r) => sum + r.CantidadPendiente, 0);

    return {
      message: 'Recepciones con pagos de la compra obtenidas',
      data: {
        compra: {
          CompraEncabezadoID: compra.CompraEncabezadoID,
          ProveedorID: compra.ProveedorID,
          FechaCompra: compra.FechaCompra ? moment(compra.FechaCompra).format('YYYY-MM-DD') : null,
          Estatus: compra.Estatus,
          Subtotal: compra.Subtotal,
          IVA: compra.IVA,
          TotalNeto: compra.TotalNeto,
          Observaciones: compra.Observaciones,
        },
        refacciones: refaccionesDetalle,
        recepciones: recepciones.map(r => ({
          ...r,
          FechaRecepcion: r.FechaRecepcion ? moment(r.FechaRecepcion).format('YYYY-MM-DD') : null,
        })),
        pagos: pagos.map(p => ({
          ...p,
          FechaPago: p.FechaPago ? moment(p.FechaPago).format('YYYY-MM-DD') : null,
        })),
        resumen: {
          totalRecepciones: recepciones.length,
          totalPagos: pagos.length,
          // Montos
          montoTotalCompra: totalCompra,
          montoTotalRecibido: totalRecibido,
          montoTotalPagado: totalPagado,
          montoPendientePago: montoPendientePago,
          // Refacciones
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
}

export const comprasRecepcionesService = new ComprasRecepcionesService();
