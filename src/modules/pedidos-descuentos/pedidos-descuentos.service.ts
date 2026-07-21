import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { Prisma, EstadoPagoCompra } from '@prisma/client';
import moment from 'moment';
import { AplicarNotaCreditoDto } from './pedidos-descuentos.schema';
import { localDate } from '../../utils/date-utils';

class PedidosDescuentosService {
  private round2(value: number): number {
    return Math.round(value * 100) / 100;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NOTA DE CRÉDITO
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Aplica una nota de crédito existente a un pedido.
   * Réplica del patrón de compras: valida pertenencia, saldo pendiente,
   * genera excedente como NC nueva si sobra, actualiza TotalNotasCredito
   * y recalcula EstadoPago (Modelo 2: NC cubre saldo, no baja el neto).
   */
  async aplicarNotaCredito(dto: AplicarNotaCreditoDto) {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Validar pedido
      const pedido = await tx.pedidos_encabezado.findUnique({
        where: { PedidoID: dto.PedidoID },
      });

      if (!pedido) {
        throw new HttpError('Pedido no encontrado', 404);
      }
      if (!pedido.IsActive) {
        throw new HttpError('El pedido no está activo', 400);
      }

      // 2. Validar nota de crédito
      const notaCredito = await tx.notas_credito.findFirst({
        where: { NotaCreditoID: dto.NotaCreditoID, IsActive: 1 },
      });

      if (!notaCredito) {
        throw new HttpError('Nota de crédito no encontrada', 404);
      }

      if (notaCredito.Estado === 'APLICADO') {
        throw new HttpError('Esta nota de crédito ya fue aplicada', 400);
      }

      // 3. Validar mismo proveedor
      if (pedido.ProveedorID !== notaCredito.ProveedorID) {
        throw new HttpError('La nota de crédito no pertenece al proveedor de este pedido', 400);
      }

      // 4. Calcular saldo pendiente (Modelo v4)
      const totalNeto = this.round2(Number(pedido.TotalNeto) || 0);
      const totalPagado = this.round2(Number(pedido.TotalPagado) || 0);
      const totalNotasCredito = this.round2(Number(pedido.TotalNotasCredito) || 0);

      const descuentosPP = await tx.pedidos_descuentos.aggregate({
        where: { PedidoID: dto.PedidoID, IsActive: true, TipoDescuento: 'PRONTO_PAGO' },
        _sum: { MontoDescuento: true },
      });
      const totalDescuentosPP = this.round2(Number(descuentosPP._sum?.MontoDescuento || 0));

      // Modelo v4: saldo pendiente = totalNeto - pagos - NC - descuentos PRONTO_PAGO.
      const saldoPendiente = this.round2(totalNeto - totalPagado - totalNotasCredito - totalDescuentosPP);

      if (saldoPendiente <= 0) {
        throw new HttpError('Este pedido ya está completamente cubierto', 400);
      }

      // 5. Determinar monto a aplicar
      const montoNota = this.round2(Number(notaCredito.Monto));
      let montoAplicar = dto.MontoAplicado
        ? this.round2(dto.MontoAplicado)
        : montoNota;
      let montoExcedente = 0;

      if (montoAplicar > saldoPendiente) {
        montoExcedente = this.round2(montoAplicar - saldoPendiente);
        montoAplicar = saldoPendiente;
      }

      // 6. Crear registro en pedidos_descuentos
      await tx.pedidos_descuentos.create({
        data: {
          PedidoID: dto.PedidoID,
          NotaCreditoID: dto.NotaCreditoID,
          TipoDescuento: 'NOTA_CREDITO',
          MontoBase: montoNota,
          MontoDescuento: montoAplicar,
          FechaAplicacion: localDate(),
          Observaciones: `NC #${dto.NotaCreditoID} - ${notaCredito.NumeroCredito || notaCredito.Descripcion}`,
          UsuarioID: notaCredito.UsuarioID,
          IsActive: true,
        },
      });

      // 7. Actualizar TotalNotasCredito del pedido
      const nuevoTotalNotasCredito = this.round2(totalNotasCredito + montoAplicar);

      await tx.pedidos_encabezado.update({
        where: { PedidoID: dto.PedidoID },
        data: { TotalNotasCredito: nuevoTotalNotasCredito },
      });

      // 8. Marcar NC original como APLICADO
      await tx.notas_credito.update({
        where: { NotaCreditoID: dto.NotaCreditoID },
        data: { Estado: 'APLICADO' },
      });

      // 9. Si hay excedente, crear nueva NC DISPONIBLE
      let notaExcedenteCreada: any = null;
      if (montoExcedente > 0) {
        notaExcedenteCreada = await tx.notas_credito.create({
          data: {
            ProveedorID: notaCredito.ProveedorID,
            Monto: montoExcedente,
            Fecha: localDate(),
            NumeroReferencia: `EXC-${notaCredito.NumeroReferencia || dto.NotaCreditoID}`,
            Descripcion: `Excedente de NC #${dto.NotaCreditoID}`,
            Observaciones: `Generada por excedente de $${montoExcedente.toFixed(2)} al aplicar al pedido #${dto.PedidoID}`,
            Estado: 'DISPONIBLE',
            UsuarioID: notaCredito.UsuarioID,
            IsActive: 1,
          },
        });
      }

      // 10. Recalcular EstadoPago del pedido
      await this.recalcularEstadoPago(tx, dto.PedidoID);

      return {
        PedidoID: dto.PedidoID,
        NotaCreditoID: dto.NotaCreditoID,
        MontoAplicado: montoAplicar,
        MontoExcedente: montoExcedente,
        NotaExcedente: notaExcedenteCreada,
      };
    });

    return { message: 'Nota de crédito aplicada correctamente', data: result };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONSULTAS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Lista todos los descuentos (pronto pago + NC) activos de un pedido.
   */
  async findByPedido(pedidoId: number) {
    const descuentos = await prisma.pedidos_descuentos.findMany({
      where: { PedidoID: pedidoId, IsActive: true },
      orderBy: { PedidoDescuentoID: 'desc' },
    });

    const formateados = descuentos.map((d) => ({
      ...d,
      FechaAplicacion: moment.utc(d.FechaAplicacion).format('YYYY-MM-DD'),
      FechaLimite: d.FechaLimite ? moment.utc(d.FechaLimite).format('YYYY-MM-DD') : null,
    }));

    return { message: 'Descuentos obtenidos', data: formateados };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ELIMINAR
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Elimina (soft delete) un descuento y revierte su efecto.
   * - PRONTO_PAGO: revierte TotalDescuentos y recalcula TotalNeto.
   * - NOTA_CREDITO: revierte TotalNotasCredito y recalcula EstadoPago.
   */
  async remove(descuentoId: number) {
    const result = await prisma.$transaction(async (tx) => {
      const descuento = await tx.pedidos_descuentos.findUnique({
        where: { PedidoDescuentoID: descuentoId },
      });

      if (!descuento) {
        throw new HttpError('Descuento no encontrado', 404);
      }

      if (!descuento.IsActive) {
        throw new HttpError('El descuento ya fue eliminado', 400);
      }

      const pedido = await tx.pedidos_encabezado.findUnique({
        where: { PedidoID: descuento.PedidoID },
      });

      if (!pedido) {
        throw new HttpError('Pedido no encontrado', 404);
      }

      const monto = this.round2(Number(descuento.MontoDescuento) || 0);

      // Soft delete
      await tx.pedidos_descuentos.update({
        where: { PedidoDescuentoID: descuentoId },
        data: { IsActive: false },
      });

      if (descuento.TipoDescuento === 'PRONTO_PAGO') {
        // Modelo v3: el pronto pago es solo historico, NO afecta saldo ni neto.
        // Solo recalculamos EstadoPago (por si cambia la cobertura real).
        await this.recalcularEstadoPago(tx, descuento.PedidoID);
      } else if (descuento.TipoDescuento === 'NOTA_CREDITO') {
        // Revertir TotalNotasCredito y recalcular EstadoPago
        const nuevoTotalNotas = this.round2(
          Math.max(0, Number(pedido.TotalNotasCredito || 0) - monto)
        );
        await tx.pedidos_encabezado.update({
          where: { PedidoID: descuento.PedidoID },
          data: { TotalNotasCredito: nuevoTotalNotas },
        });
        await this.recalcularEstadoPago(tx, descuento.PedidoID);
      }

      return { PedidoDescuentoID: descuentoId };
    });

    return { message: 'Descuento eliminado correctamente', data: result };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MÉTODOS PRIVADOS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Recalcula EstadoPago del pedido (réplica de pedidos-pagos.actualizarEstadoPagoPedido).
   * Modelo v4: totalCubierto = TotalPagado + TotalNotasCredito + descuentos PRONTO_PAGO.
   */
  private async recalcularEstadoPago(tx: Prisma.TransactionClient, pedidoId: number) {
    const pagos = await tx.pedidos_pagos.findMany({
      where: { PedidoID: pedidoId, IsActive: true },
    });
    const totalPagado = this.round2(pagos.reduce((sum, p) => sum + Number(p.Monto), 0));

    const pedido = await tx.pedidos_encabezado.findUnique({
      where: { PedidoID: pedidoId },
    });
    if (!pedido) return;

    const totalNeto = this.round2(Number(pedido.TotalNeto) || 0);
    const totalNotasCredito = this.round2(Number(pedido.TotalNotasCredito) || 0);

    // Obtener suma real de descuentos PRONTO_PAGO activos (Modelo v4)
    const descuentosPP = await tx.pedidos_descuentos.aggregate({
      where: { PedidoID: pedidoId, IsActive: true, TipoDescuento: 'PRONTO_PAGO' },
      _sum: { MontoDescuento: true },
    });
    const totalDescuentosPP = this.round2(Number(descuentosPP._sum?.MontoDescuento || 0));

    // Modelo v4: cobertura = pagos + notas de crédito + descuentos PRONTO_PAGO.
    const totalCubierto = this.round2(totalPagado + totalNotasCredito + totalDescuentosPP);

    let nuevoEstadoPago: EstadoPagoCompra;
    if (totalCubierto >= totalNeto) {
      nuevoEstadoPago = 'PAGADO';
    } else if (totalCubierto > 0) {
      nuevoEstadoPago = 'PARCIAL';
    } else {
      nuevoEstadoPago = 'PENDIENTE';
    }

    await tx.pedidos_encabezado.update({
      where: { PedidoID: pedidoId },
      data: {
        TotalPagado: totalPagado,
        EstadoPago: nuevoEstadoPago,
        TotalDescuentos: totalDescuentosPP,
      },
    });
  }
}

export const pedidosDescuentosService = new PedidosDescuentosService();
