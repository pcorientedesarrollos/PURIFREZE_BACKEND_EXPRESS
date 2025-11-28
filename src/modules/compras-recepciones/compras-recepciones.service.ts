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
    const fechaHoy = createDto.FechaRecepcion || moment().format('YYYY-MM-DD');
    const usuarioIDNum = UsuarioID || 0;

    const result = await prisma.$transaction(async (tx) => {
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
          fechaHoy,
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
          fechaHoy,
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
        fechaPago: fechaHoy,
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
    });

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
   */
  async findByCompraWithPagos(compraEncabezadoID: number) {
    const recepciones = await prisma.compras_recepciones_encabezado.findMany({
      where: { CompraEncabezadoID: compraEncabezadoID },
      include: { compras_recepciones_detalle: true },
      orderBy: { ComprasRecepcionesEncabezadoID: 'desc' },
    });

    // Obtener pagos de la compra
    const pagos = await prisma.pagos.findMany({
      where: {
        ReferenciaTipo: 'Compras',
        ReferenciaID: compraEncabezadoID,
        IsActive: 1,
      },
      orderBy: { PagosID: 'desc' },
    });

    // Obtener totales
    const totalPagado = pagos.reduce((sum, p) => sum + (p.Monto || 0), 0);
    const totalRecibido = recepciones.reduce((sum, r) => sum + (r.MontoRecepcion || 0), 0);

    return {
      message: 'Recepciones con pagos de la compra obtenidas',
      data: {
        recepciones,
        pagos,
        resumen: {
          totalRecepciones: recepciones.length,
          totalPagos: pagos.length,
          montoTotalRecibido: totalRecibido,
          montoTotalPagado: totalPagado,
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
