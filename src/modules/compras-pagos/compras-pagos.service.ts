import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { Prisma, EstadoPagoCompra, FormaPagoCompra } from '@prisma/client';
import moment from 'moment';
import { CreateCompraPagoDto } from './compras-pagos.schema';
import { validarSaldoCuentaBancaria } from '../../shared/shared-operations.service';

class ComprasPagosService {
  private round2(value: number): number {
    return Math.round(value * 100) / 100;
  }

  /**
   * Registra un nuevo pago para una compra
   */
  async create(dto: CreateCompraPagoDto) {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Obtener la compra
      const compra = await this.obtenerCompraOError(tx, dto.CompraEncabezadoID);

      // 2. Calcular saldo pendiente (considerando notas de crédito)
      const totalPagado = this.round2(Number(compra.TotalPagado) || 0);
      const totalNeto = this.round2(Number(compra.TotalNeto) || 0);
      const totalNotasCredito = this.round2(Number(compra.TotalNotasCredito) || 0);
      const saldoPendiente = this.round2(totalNeto - totalPagado - totalNotasCredito);
      const montoRedondeado = this.round2(dto.Monto);

      // 3. Validar que no exceda el saldo pendiente
      if (montoRedondeado > saldoPendiente) {
        throw new HttpError(
          `El monto ($${montoRedondeado.toFixed(2)}) excede el saldo pendiente ($${saldoPendiente.toFixed(2)})`,
          400
        );
      }

      // 4. Si es CONTADO y es el primer pago, debe ser el total
      if (compra.FormaPago === 'CONTADO' && totalPagado === 0 && montoRedondeado < totalNeto) {
        throw new HttpError(
          `Las compras de CONTADO requieren pago completo. Total: $${totalNeto.toFixed(2)}`,
          400
        );
      }

      // 5. Validar saldo en cuenta bancaria (si aplica)
      if (dto.CuentaBancariaID) {
        await validarSaldoCuentaBancaria(tx, dto.CuentaBancariaID, dto.Monto);
      }

      // 6. Crear el registro de pago
      const descuento = this.round2(dto.Descuento || 0);
      const pago = await tx.compras_pagos.create({
        data: {
          CompraEncabezadoID: dto.CompraEncabezadoID,
          MetodoPagoID: dto.MetodoPagoID,
          CuentaBancariaID: dto.CuentaBancariaID || null,
          Monto: montoRedondeado,
          Descuento: descuento,
          FechaPago: new Date(dto.FechaPago),
          Referencia: dto.Referencia || null,
          Factura: dto.Factura || null,
          Observaciones: dto.Observaciones || null,
          UsuarioID: dto.UsuarioID,
          IsActive: 1,
        },
      });

      // 6.1 Si hay descuento, reducir TotalNeto de la compra permanentemente
      if (descuento > 0) {
        const nuevoTotalNeto = Math.max(0, totalNeto - descuento);
        await tx.compras_encabezado.update({
          where: { CompraEncabezadoID: dto.CompraEncabezadoID },
          data: { TotalNeto: nuevoTotalNeto },
        });
      }

      // 7. Crear movimiento bancario (si hay cuenta bancaria)
      if (dto.CuentaBancariaID) {
        await this.crearMovimientoBancario(tx, pago, dto);
      }

      // 8. Actualizar TotalPagado y EstadoPago de la compra
      await this.actualizarEstadoPagoCompra(tx, dto.CompraEncabezadoID);

      return pago;
    });

    return { message: 'Pago registrado correctamente', data: result };
  }

  /**
   * Obtiene todos los pagos de una compra
   */
  async getByCompra(compraEncabezadoID: number) {
    const compra = await prisma.compras_encabezado.findUnique({
      where: { CompraEncabezadoID: compraEncabezadoID },
    });

    if (!compra) {
      throw new HttpError('Compra no encontrada', 404);
    }

    const pagos = await prisma.compras_pagos.findMany({
      where: {
        CompraEncabezadoID: compraEncabezadoID,
        IsActive: 1,
      },
      orderBy: { FechaPago: 'desc' },
    });

    const pagosFormateados = pagos.map((pago) => ({
      ...pago,
      FechaPago: moment.utc(pago.FechaPago).format('YYYY-MM-DD'),
      FechaRegistro: moment.utc(pago.FechaRegistro).format('YYYY-MM-DD HH:mm:ss'),
    }));

    const totalPagado = this.round2(pagos.reduce((sum, pago) => sum + Number(pago.Monto), 0));
    const totalNotasCredito = this.round2(Number(compra.TotalNotasCredito) || 0);
    const totalNeto = this.round2(Number(compra.TotalNeto) || 0);
    const saldoPendiente = this.round2(totalNeto - totalPagado - totalNotasCredito);

    return {
      message: 'Pagos obtenidos',
      data: {
        pagos: pagosFormateados,
        resumen: {
          TotalCompra: totalNeto,
          TotalPagado: totalPagado,
          TotalNotasCredito: totalNotasCredito,
          SaldoPendiente: saldoPendiente,
          EstadoPago: compra.EstadoPago,
          FormaPago: compra.FormaPago,
        },
      },
    };
  }

  /**
   * Elimina un pago (soft delete)
   */
  async remove(compraPagoID: number) {
    const result = await prisma.$transaction(async (tx) => {
      const pago = await tx.compras_pagos.findUnique({
        where: { CompraPagoID: compraPagoID },
      });

      if (!pago) {
        throw new HttpError('Pago no encontrado', 404);
      }

      if (pago.IsActive === 0) {
        throw new HttpError('El pago ya fue eliminado', 400);
      }

      // Verificar si la compra está finalizada
      const compra = await tx.compras_encabezado.findUnique({
        where: { CompraEncabezadoID: pago.CompraEncabezadoID },
      });

      if (compra?.EstadoEntrega === 'ENTREGADO') {
        throw new HttpError('No se puede eliminar un pago de una compra ya entregada', 400);
      }

      // Soft delete del pago
      await tx.compras_pagos.update({
        where: { CompraPagoID: compraPagoID },
        data: { IsActive: 0 },
      });

      // Revertir movimiento bancario si existe
      if (pago.CuentaBancariaID) {
        await this.revertirMovimientoBancario(tx, pago);
      }

      // Actualizar estado de pago de la compra
      await this.actualizarEstadoPagoCompra(tx, pago.CompraEncabezadoID);

      return { CompraPagoID: compraPagoID };
    });

    return { message: 'Pago eliminado correctamente', data: result };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MÉTODOS PRIVADOS
  // ═══════════════════════════════════════════════════════════════════════════

  private async obtenerCompraOError(tx: Prisma.TransactionClient, compraEncabezadoID: number) {
    const compra = await tx.compras_encabezado.findUnique({
      where: { CompraEncabezadoID: compraEncabezadoID },
    });

    if (!compra) {
      throw new HttpError('Compra no encontrada', 404);
    }

    if (!compra.IsActive) {
      throw new HttpError('La compra no está activa', 400);
    }

    if (compra.EstadoPago === 'PAGADO') {
      throw new HttpError('La compra ya está completamente pagada', 400);
    }

    return compra;
  }

  private async crearMovimientoBancario(
    tx: Prisma.TransactionClient,
    pago: { CompraPagoID: number; Monto: number },
    dto: CreateCompraPagoDto
  ) {
    // Crear movimiento bancario (egreso)
    await tx.historial_movimientos_bancarios.create({
      data: {
        CuentaBancariaID: dto.CuentaBancariaID!,
        PagosID: pago.CompraPagoID,
        CobrosID: 0,
        CuentaContableID: '',
        DescripcionMovimiento: dto.Observaciones || `Pago de compra #${dto.CompraEncabezadoID}`,
        FechaMovimiento: new Date(dto.FechaPago),
        EoI: false, // false = egreso
        MontoMovimiento: dto.Monto,
      },
    });

    // Actualizar saldo de cuenta bancaria
    const cuentaBancaria = await tx.catalogo_cuentasBancarias.findUnique({
      where: { CuentaBancariaID: dto.CuentaBancariaID! },
    });

    if (cuentaBancaria) {
      const nuevoSaldo = (cuentaBancaria.Saldo || 0) - dto.Monto;
      await tx.catalogo_cuentasBancarias.update({
        where: { CuentaBancariaID: dto.CuentaBancariaID! },
        data: { Saldo: nuevoSaldo },
      });
    }
  }

  private async revertirMovimientoBancario(
    tx: Prisma.TransactionClient,
    pago: { CompraPagoID: number; CuentaBancariaID: number | null; Monto: number }
  ) {
    if (!pago.CuentaBancariaID) return;

    // Revertir saldo
    const cuentaBancaria = await tx.catalogo_cuentasBancarias.findUnique({
      where: { CuentaBancariaID: pago.CuentaBancariaID },
    });

    if (cuentaBancaria) {
      const nuevoSaldo = (cuentaBancaria.Saldo || 0) + pago.Monto;
      await tx.catalogo_cuentasBancarias.update({
        where: { CuentaBancariaID: pago.CuentaBancariaID },
        data: { Saldo: nuevoSaldo },
      });
    }
  }

  /**
   * Actualiza el EstadoPago y TotalPagado de una compra
   * También verifica si ambos ejes están completos para actualizar Estatus legacy
   * Considera TotalNotasCredito en el cálculo del saldo pendiente
   */
  async actualizarEstadoPagoCompra(tx: Prisma.TransactionClient, compraEncabezadoID: number) {
    // Obtener suma de pagos activos
    const pagos = await tx.compras_pagos.findMany({
      where: {
        CompraEncabezadoID: compraEncabezadoID,
        IsActive: 1,
      },
    });

    const totalPagado = this.round2(pagos.reduce((sum, pago) => sum + Number(pago.Monto), 0));

    // Obtener total de la compra
    const compra = await tx.compras_encabezado.findUnique({
      where: { CompraEncabezadoID: compraEncabezadoID },
    });

    if (!compra) return;

    const totalNeto = this.round2(Number(compra.TotalNeto) || 0);
    const totalNotasCredito = this.round2(Number(compra.TotalNotasCredito) || 0);
    // El saldo real considera pagos + notas de crédito
    const totalCubierto = this.round2(totalPagado + totalNotasCredito);

    // Determinar nuevo estado de pago
    let nuevoEstadoPago: EstadoPagoCompra;
    if (totalCubierto >= totalNeto) {
      nuevoEstadoPago = 'PAGADO';
    } else if (totalCubierto > 0) {
      nuevoEstadoPago = 'PARCIAL';
    } else {
      nuevoEstadoPago = 'PENDIENTE';
    }

    // Verificar si ambos ejes están completos para actualizar Estatus legacy
    const entregaCompleta = compra.EstadoEntrega === 'ENTREGADO';
    const pagoCompleto = nuevoEstadoPago === 'PAGADO';
    const nuevoEstatus = (entregaCompleta && pagoCompleto) ? 'Finalizado' : compra.Estatus;

    // Actualizar compra
    await tx.compras_encabezado.update({
      where: { CompraEncabezadoID: compraEncabezadoID },
      data: {
        TotalPagado: totalPagado,
        EstadoPago: nuevoEstadoPago,
        Estatus: nuevoEstatus,
      },
    });
  }
}

export const comprasPagosService = new ComprasPagosService();
