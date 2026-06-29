import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { Prisma, EstadoPagoCompra, FormaPagoCompra } from '@prisma/client';
import moment from 'moment';
import { CreatePedidoPagoDto } from './pedidos-pagos.schema';
import { validarSaldoCuentaBancaria } from '../../shared/shared-operations.service';

class PedidosPagosService {
  private round2(value: number): number {
    return Math.round(value * 100) / 100;
  }

  /**
   * Registra un nuevo pago para un pedido (Modelo v3).
   * El frontend envia el Monto YA CON DESCUENTO APLICADO (neto).
   * El banco egresa ese Monto directo.
   * Si hay DescuentoPorcentaje, se registra en pedidos_descuentos como historico
   * (no afecta saldo ni cobertura). Se acepta MontoDescuento opcional del frontend.
   */
  async create(dto: CreatePedidoPagoDto) {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Obtener el pedido
      const pedido = await this.obtenerPedidoOError(tx, dto.PedidoID);

      // 2. Calcular saldo pendiente (considerando notas de crédito y descuentos pronto pago previos)
      const totalPagado = this.round2(Number(pedido.TotalPagado) || 0);
      const totalNeto = this.round2(Number(pedido.TotalNeto) || 0);
      const totalNotasCredito = this.round2(Number(pedido.TotalNotasCredito) || 0);
      const montoRedondeado = this.round2(dto.Monto);
      const fechaPago = dto.FechaPago;

      // Modelo v4: los descuentos PRONTO_PAGO ya aplicados también cubren saldo.
      const descuentosPPPrevios = await tx.pedidos_descuentos.aggregate({
        where: {
          PedidoID: dto.PedidoID,
          IsActive: true,
          TipoDescuento: 'PRONTO_PAGO',
        },
        _sum: { MontoDescuento: true },
      });
      const totalDescuentosPP = this.round2(Number(descuentosPPPrevios._sum?.MontoDescuento || 0));

      // 3. Validar que no exceda el saldo pendiente.
      // Modelo v4: el Monto ya viene neto (con descuento aplicado por el frontend);
      // la cobertura incluye pagos + NC + descuentos PRONTO_PAGO previos.
      const saldoPendiente = this.round2(totalNeto - totalPagado - totalNotasCredito - totalDescuentosPP);
      if (montoRedondeado > saldoPendiente) {
        throw new HttpError(
          `El monto ($${montoRedondeado.toFixed(2)}) excede el saldo pendiente ($${saldoPendiente.toFixed(2)})`,
          400
        );
      }

      // ─── 3.5 Descuento por pronto pago (si aplica) ───
      // Modelo v4: el Monto ya viene neto desde el frontend. El descuento se guarda
      // en pedidos_descuentos y SÍ cuenta como cobertura del pedido (salda la deuda).
      let descuentoCreado: { PedidoDescuentoID: number } | null = null;
      let montoDescuento = 0;

      if (dto.DescuentoPorcentaje && dto.DescuentoPorcentaje > 0) {
        const fechaBase = dto.FechaBase || dto.FechaPago;
        const dias = dto.DiasProntoPago ?? 0;

        if (dias <= 0) {
          throw new HttpError('Debe especificar DiasProntoPago para aplicar el descuento', 400);
        }

        const fechaLimite = moment(fechaBase).add(dias, 'days').format('YYYY-MM-DD');
        const hoy = moment(fechaPago).format('YYYY-MM-DD');

        if (hoy > fechaLimite) {
          throw new HttpError(
            `El plazo de pronto pago venció. Fecha Pago: ${moment(hoy).format('DD/MM/YYYY')} Fecha límite: ${moment(fechaLimite).format('DD/MM/YYYY')}`,
            400,
          );
        }

        // MontoDescuento: si el frontend lo manda, usarlo; si no, derivarlo del neto.
        montoDescuento = dto.MontoDescuento ?? this.round2(
          montoRedondeado * (dto.DescuentoPorcentaje / (100 - dto.DescuentoPorcentaje))
        );

        if (montoDescuento <= 0) {
          throw new HttpError('El descuento calculado es 0', 400);
        }

        const montoBase = this.round2(montoRedondeado + montoDescuento);

        // Crear registro en pedidos_descuentos (solo historico)
        // PedidoPagoID se setea mas abajo, despues de crear el pago.
        descuentoCreado = await tx.pedidos_descuentos.create({
          data: {
            PedidoID: dto.PedidoID,
            TipoDescuento: 'PRONTO_PAGO',
            MontoBase: montoBase,
            PorcentajeDescuento: dto.DescuentoPorcentaje,
            MontoDescuento: montoDescuento,
            FechaBase: new Date(fechaBase),
            FechaLimite: new Date(fechaLimite),
            FechaAplicacion: new Date(dto.FechaPago),
            Observaciones: `Pronto pago ${dto.DescuentoPorcentaje}% en ${dias} días`,
            UsuarioID: dto.UsuarioID ?? null,
            IsActive: true,
          },
        });
      }

      // 4. Si es CONTADO y es el primer pago, debe ser el total
      if (pedido.FormaPago === 'CONTADO' && totalPagado === 0 && montoRedondeado < totalNeto) {
        throw new HttpError(
          `Los pedidos de CONTADO requieren pago completo. Total: $${totalNeto.toFixed(2)}`,
          400
        );
      }

      // 5. Validar saldo en cuenta bancaria (si aplica)
      // Modelo v3: el Monto ya es neto, el banco egresa ese monto directo.
      if (dto.CuentaBancariaID) {
        await validarSaldoCuentaBancaria(tx, dto.CuentaBancariaID, montoRedondeado);
      }

      // 6. Crear el registro de pago
      const pago = await tx.pedidos_pagos.create({
        data: {
          PedidoID: dto.PedidoID,
          MetodoPagoID: dto.MetodoPagoID || null,
          CuentaBancariaID: dto.CuentaBancariaID || null,
          Monto: montoRedondeado,
          FechaPago: new Date(dto.FechaPago),
          Referencia: dto.Referencia || null,
          Observaciones: dto.Observaciones || null,
          UsuarioID: dto.UsuarioID || null,
          IsActive: true,
        },
      });

      // 6.5 Si se creo un descuento, vincularlo al pago recien creado
      if (descuentoCreado) {
        await tx.pedidos_descuentos.update({
          where: { PedidoDescuentoID: descuentoCreado.PedidoDescuentoID },
          data: { PedidoPagoID: pago.PedidoPagoID },
        });
      }

      // 7. Crear movimiento bancario (si hay cuenta bancaria)
      if (dto.CuentaBancariaID) {
        await this.crearMovimientoBancarioPedido(tx, pago, dto, montoRedondeado);
      }

      // 8. Actualizar TotalPagado y EstadoPago del pedido
      await this.actualizarEstadoPagoPedido(tx, dto.PedidoID);

      return pago;
    });

    return { message: 'Pago registrado correctamente', data: result };
  }

  /**
   * Obtiene todos los pagos de un pedido
   */
  async getByPedido(pedidoID: number) {
    const pedido = await prisma.pedidos_encabezado.findUnique({
      where: { PedidoID: pedidoID },
    });

    if (!pedido) {
      throw new HttpError('Pedido no encontrado', 404);
    }

    const pagos = await prisma.pedidos_pagos.findMany({
      where: {
        PedidoID: pedidoID,
        IsActive: true,
      },
      orderBy: { FechaPago: 'desc' },
    });

    const pagosFormateados = pagos.map((pago) => ({
      ...pago,
      FechaPago: moment.utc(pago.FechaPago).format('YYYY-MM-DD'),
      FechaAlta: pago.FechaAlta ? moment.utc(pago.FechaAlta).format('YYYY-MM-DD HH:mm:ss') : null,
    }));

    const totalPagado = this.round2(pagos.reduce((sum, pago) => sum + Number(pago.Monto), 0));
    const totalNotasCredito = this.round2(Number(pedido.TotalNotasCredito) || 0);
    const totalNeto = this.round2(Number(pedido.TotalNeto) || 0);

    // Modelo v4: incluir descuentos PRONTO_PAGO en cobertura y saldo
    const descuentosPPAgg = await prisma.pedidos_descuentos.aggregate({
      where: {
        PedidoID: pedidoID,
        IsActive: true,
        TipoDescuento: 'PRONTO_PAGO',
      },
      _sum: {
        MontoDescuento: true,
      },
    });
    const totalDescuentosPP = this.round2(Number(descuentosPPAgg._sum?.MontoDescuento || 0));

    const saldoPendiente = this.round2(totalNeto - totalPagado - totalNotasCredito - totalDescuentosPP);

    return {
      message: 'Pagos obtenidos',
      data: {
        pagos: pagosFormateados,
        resumen: {
          TotalPedido: totalNeto,
          TotalPagado: totalPagado,
          TotalNotasCredito: totalNotasCredito,
          TotalDescuentos: totalDescuentosPP,
          SaldoPendiente: saldoPendiente,
          EstadoPago: pedido.EstadoPago,
          FormaPago: pedido.FormaPago,
        },
      },
    };
  }

  /**
   * Elimina un pago (soft delete)
   */
  async remove(pedidoPagoID: number) {
    const result = await prisma.$transaction(async (tx) => {
      const pago = await tx.pedidos_pagos.findUnique({
        where: { PedidoPagoID: pedidoPagoID },
      });

      if (!pago) {
        throw new HttpError('Pago no encontrado', 404);
      }

      if (pago.IsActive === false) {
        throw new HttpError('El pago ya fue eliminado', 400);
      }

      // Verificar si el pedido está entregado
      const pedido = await tx.pedidos_encabezado.findUnique({
        where: { PedidoID: pago.PedidoID },
      });

      if (pedido?.EstadoEntrega === 'ENTREGADO') {
        throw new HttpError('No se puede eliminar un pago de un pedido ya entregado', 400);
      }

      // Soft delete del pago
      await tx.pedidos_pagos.update({
        where: { PedidoPagoID: pedidoPagoID },
        data: { IsActive: false },
      });

      // Soft delete del descuento pronto pago vinculado (si existe)
      await tx.pedidos_descuentos.updateMany({
        where: {
          PedidoPagoID: pedidoPagoID,
          TipoDescuento: 'PRONTO_PAGO',
          IsActive: true,
        },
        data: { IsActive: false },
      });

      // Revertir movimiento bancario si existe (con monto neto)
      if (pago.CuentaBancariaID) {
        await this.revertirMovimientoBancario(tx, pago);
      }

      // Actualizar estado de pago del pedido
      await this.actualizarEstadoPagoPedido(tx, pago.PedidoID);

      return { PedidoPagoID: pedidoPagoID };
    });

    return { message: 'Pago eliminado correctamente', data: result };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MÉTODOS PRIVADOS
  // ═══════════════════════════════════════════════════════════════════════════

  private async obtenerPedidoOError(tx: Prisma.TransactionClient, pedidoID: number) {
    const pedido = await tx.pedidos_encabezado.findUnique({
      where: { PedidoID: pedidoID },
    });

    if (!pedido) {
      throw new HttpError('Pedido no encontrado', 404);
    }

    if (!pedido.IsActive) {
      throw new HttpError('El pedido no está activo', 400);
    }

    if (pedido.EstadoPago === 'PAGADO') {
      throw new HttpError('El pedido ya está completamente pagado', 400);
    }

    return pedido;
  }

  private async crearMovimientoBancarioPedido(
    tx: Prisma.TransactionClient,
    pago: { PedidoPagoID: number; Monto: Prisma.Decimal },
    dto: CreatePedidoPagoDto,
    montoNeto: number
  ) {
    // Crear movimiento bancario (egreso)
    await tx.historial_movimientos_bancarios.create({
      data: {
        CuentaBancariaID: dto.CuentaBancariaID!,
        PagosID: pago.PedidoPagoID,
        CobrosID: 0,
        CuentaContableID: '',
        DescripcionMovimiento: dto.Observaciones || `Pago de pedido #${dto.PedidoID}`,
        FechaMovimiento: new Date(dto.FechaPago),
        EoI: false, // false = egreso
        MontoMovimiento: montoNeto,
      },
    });

    // Actualizar saldo de cuenta bancaria
    const cuentaBancaria = await tx.catalogo_cuentasBancarias.findUnique({
      where: { CuentaBancariaID: dto.CuentaBancariaID! },
    });

    if (cuentaBancaria) {
      const nuevoSaldo = Number(cuentaBancaria.Saldo || 0) - montoNeto;
      await tx.catalogo_cuentasBancarias.update({
        where: { CuentaBancariaID: dto.CuentaBancariaID! },
        data: { Saldo: nuevoSaldo },
      });
    }
  }

  private async revertirMovimientoBancario(
    tx: Prisma.TransactionClient,
    pago: { PedidoPagoID: number; CuentaBancariaID: number | null; Monto: Prisma.Decimal }
  ) {
    if (!pago.CuentaBancariaID) return;

    // Modelo v3: el Monto del pago ya es neto, se revierte tal cual.
    const montoRevertir = Number(pago.Monto);

    // Revertir saldo
    const cuentaBancaria = await tx.catalogo_cuentasBancarias.findUnique({
      where: { CuentaBancariaID: pago.CuentaBancariaID },
    });

    if (cuentaBancaria) {
      const nuevoSaldo = Number(cuentaBancaria.Saldo || 0) + montoRevertir;
      await tx.catalogo_cuentasBancarias.update({
        where: { CuentaBancariaID: pago.CuentaBancariaID },
        data: { Saldo: nuevoSaldo },
      });
    }
  }

  /**
   * Actualiza el EstadoPago, TotalPagado y TotalDescuentos de un pedido.
   * Modelo v4: cobertura = TotalPagado + TotalNotasCredito + descuentos PRONTO_PAGO.
   */
  async actualizarEstadoPagoPedido(tx: Prisma.TransactionClient, pedidoID: number) {
    // Obtener suma de pagos activos
    const pagos = await tx.pedidos_pagos.findMany({
      where: {
        PedidoID: pedidoID,
        IsActive: true,
      },
    });

    const totalPagado = this.round2(pagos.reduce((sum, pago) => sum + Number(pago.Monto), 0));

    // Obtener total del pedido
    const pedido = await tx.pedidos_encabezado.findUnique({
      where: { PedidoID: pedidoID },
    });

    if (!pedido) return;

    const totalNeto = this.round2(Number(pedido.TotalNeto) || 0);
    const totalNotasCredito = this.round2(Number(pedido.TotalNotasCredito) || 0);

    // Obtener suma real de descuentos PRONTO_PAGO activos (Modelo v4)
    const descuentosPP = await tx.pedidos_descuentos.aggregate({
      where: {
        PedidoID: pedidoID,
        IsActive: true,
        TipoDescuento: 'PRONTO_PAGO',
      },
      _sum: {
        MontoDescuento: true,
      },
    });
    const totalDescuentosPP = this.round2(Number(descuentosPP._sum?.MontoDescuento || 0));

    // Modelo v4: cobertura = pagos + notas de crédito + descuentos PRONTO_PAGO.
    const totalCubierto = this.round2(totalPagado + totalNotasCredito + totalDescuentosPP);

    // Determinar nuevo estado de pago
    let nuevoEstadoPago: EstadoPagoCompra;
    if (totalCubierto >= totalNeto) {
      nuevoEstadoPago = 'PAGADO';
    } else if (totalCubierto > 0) {
      nuevoEstadoPago = 'PARCIAL';
    } else {
      nuevoEstadoPago = 'PENDIENTE';
    }

    // Actualizar pedido (NO tocar Estatus legacy, pedidos no lo tiene)
    await tx.pedidos_encabezado.update({
      where: { PedidoID: pedidoID },
      data: {
        TotalPagado: totalPagado,
        EstadoPago: nuevoEstadoPago,
        TotalDescuentos: totalDescuentosPP,
      },
    });
  }
}

export const pedidosPagosService = new PedidosPagosService();
