import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { Prisma } from '@prisma/client';
import moment from 'moment';
import { ReporteQueryDto } from './reportes-bancarios.schema';

class ReportesBancariosService {
  /**
   * Resumen de todas las cuentas: saldo, total ingresos, total egresos y cantidad de movimientos
   */
  async findResumen() {
    const cuentas = await prisma.catalogo_cuentasBancarias.findMany({
      orderBy: { CuentaBancariaID: 'asc' },
    });

    const resumen = await Promise.all(
      cuentas.map(async (cuenta) => {
        const movimientos = await prisma.historial_movimientos_bancarios.findMany({
          where: { CuentaBancariaID: cuenta.CuentaBancariaID },
        });

        const totalIngresos = movimientos
          .filter((m) => m.EoI === true)
          .reduce((sum, m) => sum + (m.MontoMovimiento || 0), 0);

        const totalEgresos = movimientos
          .filter((m) => m.EoI === false)
          .reduce((sum, m) => sum + (m.MontoMovimiento || 0), 0);

        return {
          CuentaBancariaID: cuenta.CuentaBancariaID,
          CuentaBancaria:   cuenta.CuentaBancaria,
          NombrePropietario: cuenta.NombrePropietario,
          BancoID:          cuenta.BancoID,
          SaldoActual:      cuenta.Saldo || 0,
          TotalIngresos:    Math.round(totalIngresos * 100) / 100,
          TotalEgresos:     Math.round(totalEgresos * 100) / 100,
          TotalMovimientos: movimientos.length,
          IsActive:         cuenta.IsActive,
        };
      })
    );

    const saldoGlobal = resumen.reduce((sum, c) => sum + c.SaldoActual, 0);

    return {
      message: 'Resumen bancario obtenido',
      data: {
        cuentas: resumen,
        SaldoGlobal: Math.round(saldoGlobal * 100) / 100,
      },
    };
  }

  /**
   * Detalle de una cuenta: info + movimientos con referencia a compra si aplica
   * Soporta filtros opcionales FechaInicio / FechaFin
   */
  async findDetalle(cuentaBancariaID: number, query: ReporteQueryDto) {
    const cuenta = await prisma.catalogo_cuentasBancarias.findUnique({
      where: { CuentaBancariaID: cuentaBancariaID },
    });

    if (!cuenta) {
      throw new HttpError('Cuenta bancaria no encontrada', 404);
    }

    const whereMovimientos: Prisma.historial_movimientos_bancariosWhereInput = {
      CuentaBancariaID: cuentaBancariaID,
    };

    if (query.FechaInicio || query.FechaFin) {
      whereMovimientos.FechaMovimiento = {
        ...(query.FechaInicio && { gte: new Date(query.FechaInicio) }),
        ...(query.FechaFin    && { lte: new Date(query.FechaFin)   }),
      };
    }

    const movimientos = await prisma.historial_movimientos_bancarios.findMany({
      where:   whereMovimientos,
      orderBy: { FechaMovimiento: 'desc' },
    });

    // Enriquecer cada movimiento con info de compra si tiene PagosID
    const movimientosEnriquecidos = await Promise.all(
      movimientos.map(async (mov) => {
        let compra = null;

        if (mov.PagosID && mov.PagosID > 0) {
          // Buscar en compras_pagos (flujo moderno)
          const compraPago = await prisma.compras_pagos.findUnique({
            where: { CompraPagoID: mov.PagosID },
            include: {
              compra: {
                select: {
                  CompraEncabezadoID: true,
                  FechaCompra:        true,
                  TotalNeto:          true,
                  EstadoPago:         true,
                  EstadoEntrega:      true,
                  Factura:            true,
                  catalogo_proveedores: {
                    select: { NombreProveedor: true },
                  },
                },
              },
            },
          });

          if (compraPago) {
            compra = {
              Origen:            'compras_pagos',
              CompraPagoID:      compraPago.CompraPagoID,
              CompraEncabezadoID: compraPago.CompraEncabezadoID,
              FechaCompra:       compraPago.compra.FechaCompra
                ? moment.utc(compraPago.compra.FechaCompra).format('YYYY-MM-DD')
                : null,
              Proveedor:    compraPago.compra.catalogo_proveedores?.NombreProveedor || null,
              TotalNeto:    compraPago.compra.TotalNeto,
              EstadoPago:   compraPago.compra.EstadoPago,
              EstadoEntrega: compraPago.compra.EstadoEntrega,
              Factura:      compraPago.compra.Factura,
              MontoPago:    compraPago.Monto,
            };
          } else {
            // Buscar en tabla pagos (flujo legacy)
            const pago = await prisma.pagos.findUnique({
              where: { PagosID: mov.PagosID },
            });

            if (pago?.ReferenciaID && pago.ReferenciaTipo === 'Compras') {
              const compraEnc = await prisma.compras_encabezado.findUnique({
                where: { CompraEncabezadoID: pago.ReferenciaID },
                select: {
                  CompraEncabezadoID: true,
                  FechaCompra:        true,
                  TotalNeto:          true,
                  EstadoPago:         true,
                  EstadoEntrega:      true,
                  Factura:            true,
                  catalogo_proveedores: {
                    select: { NombreProveedor: true },
                  },
                },
              });

              if (compraEnc) {
                compra = {
                  Origen:            'pagos',
                  CompraPagoID:      pago.PagosID,
                  CompraEncabezadoID: compraEnc.CompraEncabezadoID,
                  FechaCompra:       compraEnc.FechaCompra
                    ? moment.utc(compraEnc.FechaCompra).format('YYYY-MM-DD')
                    : null,
                  Proveedor:    compraEnc.catalogo_proveedores?.NombreProveedor || null,
                  TotalNeto:    compraEnc.TotalNeto,
                  EstadoPago:   compraEnc.EstadoPago,
                  EstadoEntrega: compraEnc.EstadoEntrega,
                  Factura:      compraEnc.Factura,
                  MontoPago:    pago.Monto,
                };
              }
            }
          }
        }

        return {
          MovimientosBancariosID: mov.MovimientosBancariosID,
          Fecha:       mov.FechaMovimiento
            ? moment.utc(mov.FechaMovimiento).format('YYYY-MM-DD')
            : null,
          Tipo:        mov.EoI ? 'INGRESO' : 'EGRESO',
          Monto:       mov.MontoMovimiento || 0,
          Descripcion: mov.DescripcionMovimiento,
          Compra:      compra,
        };
      })
    );

    const totalIngresos = movimientosEnriquecidos
      .filter((m) => m.Tipo === 'INGRESO')
      .reduce((sum, m) => sum + m.Monto, 0);

    const totalEgresos = movimientosEnriquecidos
      .filter((m) => m.Tipo === 'EGRESO')
      .reduce((sum, m) => sum + m.Monto, 0);

    return {
      message: 'Detalle de cuenta obtenido',
      data: {
        cuenta: {
          CuentaBancariaID:  cuenta.CuentaBancariaID,
          CuentaBancaria:    cuenta.CuentaBancaria,
          NombrePropietario: cuenta.NombrePropietario,
          SaldoActual:       cuenta.Saldo || 0,
          IsActive:          cuenta.IsActive,
        },
        resumen: {
          TotalIngresos:    Math.round(totalIngresos * 100) / 100,
          TotalEgresos:     Math.round(totalEgresos * 100) / 100,
          TotalMovimientos: movimientosEnriquecidos.length,
          FiltroFechaInicio: query.FechaInicio || null,
          FiltroFechaFin:    query.FechaFin    || null,
        },
        movimientos: movimientosEnriquecidos,
      },
    };
  }
}

export const reportesBancariosService = new ReportesBancariosService();
