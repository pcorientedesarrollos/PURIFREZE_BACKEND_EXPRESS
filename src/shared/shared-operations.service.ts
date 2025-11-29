import { HttpError } from '../utils/response';
import { Prisma, pagos_ReferenciaTipo, kardex_inventario_TipoMovimiento } from '@prisma/client';

export interface CrearPagoParams {
  referenciaTipo: pagos_ReferenciaTipo;
  referenciaID: number;
  metodoPagoID: number;
  cuentaBancariaID: number;
  monto: number;
  UsuarioID: number;
  observaciones: string;
  fechaPago: string;
}

const UBICACION_BODEGA_GENERAL = 1;

/**
 * Valida que la cuenta bancaria tenga saldo suficiente
 */
export async function validarSaldoCuentaBancaria(
  tx: Prisma.TransactionClient,
  cuentaBancariaID: number,
  montoRequerido: number,
) {
  const cuentaBancaria = await tx.catalogo_cuentasBancarias.findUnique({
    where: { CuentaBancariaID: cuentaBancariaID },
  });

  if (!cuentaBancaria) {
    throw new HttpError('La cuenta bancaria no existe', 404);
  }

  if ((cuentaBancaria.Saldo || 0) < montoRequerido) {
    throw new HttpError(
      `Saldo insuficiente. Saldo actual: $${cuentaBancaria.Saldo || 0}, Monto requerido: $${montoRequerido}`,
      400,
    );
  }

  return cuentaBancaria;
}

/**
 * Actualiza el inventario (suma stock)
 */
export async function actualizarInventario(
  tx: Prisma.TransactionClient,
  refaccionID: number,
  cantidad: number,
  fechaMovimiento: string,
) {
  const inventarioExistente = await tx.inventario.findFirst({
    where: {
      RefaccionID: refaccionID,
      UbicacionID: UBICACION_BODEGA_GENERAL,
    },
  });

  if (inventarioExistente) {
    await tx.inventario.update({
      where: { InventarioID: inventarioExistente.InventarioID },
      data: {
        StockActual: (inventarioExistente.StockActual || 0) + cantidad,
        FechaUltimoMovimiento: new Date(fechaMovimiento),
      },
    });
  } else {
    await tx.inventario.create({
      data: {
        RefaccionID: refaccionID,
        UbicacionID: UBICACION_BODEGA_GENERAL,
        StockActual: cantidad,
        FechaUltimoMovimiento: new Date(fechaMovimiento),
        IsActive: 1,
      },
    });
  }
}

/**
 * Crea registro en Kardex
 */
export async function crearKardex(
  tx: Prisma.TransactionClient,
  refaccionID: number,
  cantidad: number,
  costoPromedio: number,
  usuarioID: number,
  tipoMovimiento: kardex_inventario_TipoMovimiento,
  observaciones: string,
  fechaMovimiento: string,
) {
  await tx.kardex_inventario.create({
    data: {
      RefaccionID: refaccionID,
      FechaMovimiento: new Date(fechaMovimiento),
      TipoMovimiento: tipoMovimiento,
      Cantidad: cantidad,
      CostoPromedioMovimiento: costoPromedio,
      UsuarioID: usuarioID,
      Observaciones: observaciones,
    },
  });
}

/**
 * Actualiza el costo promedio de una refacción (costo promedio ponderado)
 */
export async function actualizarCostoPromedioRefaccion(
  tx: Prisma.TransactionClient,
  refaccionID: number,
  nuevoCosto: number,
  cantidadComprada: number,
) {
  const refaccion = await tx.catalogo_refacciones.findUnique({
    where: { RefaccionID: refaccionID },
  });

  if (!refaccion) return;

  const inventarios = await tx.inventario.findMany({
    where: { RefaccionID: refaccionID, IsActive: 1 },
  });

  const stockAnterior = inventarios.reduce((sum, inv) => sum + (inv.StockActual || 0), 0) - cantidadComprada;
  const costoAnterior = refaccion.CostoPromedio || 0;

  let nuevoCostoPromedio: number;
  if (stockAnterior <= 0) {
    nuevoCostoPromedio = nuevoCosto;
  } else {
    const stockTotal = stockAnterior + cantidadComprada;
    nuevoCostoPromedio = (stockAnterior * costoAnterior + cantidadComprada * nuevoCosto) / stockTotal;
  }

  await tx.catalogo_refacciones.update({
    where: { RefaccionID: refaccionID },
    data: { CostoPromedio: nuevoCostoPromedio },
  });
}

/**
 * Crea un pago y su movimiento bancario asociado (egreso)
 */
export async function crearPagoYMovimientoBancario(
  tx: Prisma.TransactionClient,
  params: CrearPagoParams,
) {
  // Crear pago
  const pago = await tx.pagos.create({
    data: {
      ReferenciaTipo: params.referenciaTipo,
      ReferenciaID: params.referenciaID,
      MetodoPagoID: params.metodoPagoID,
      CuentaBancariaID: params.cuentaBancariaID,
      Monto: params.monto,
      FechaPago: new Date(params.fechaPago),
      Observaciones: params.observaciones,
      UsuarioID: params.UsuarioID || 0,
      IsActive: 1,
    },
  });

  // Crear movimiento bancario (egreso)
  await tx.historial_movimientos_bancarios.create({
    data: {
      CuentaBancariaID: params.cuentaBancariaID,
      PagosID: pago.PagosID,
      CobrosID: 0,
      CuentaContableID: '',
      DescripcionMovimiento: params.observaciones,
      FechaMovimiento: new Date(params.fechaPago),
      EoI: false, // false = egreso
      MontoMovimiento: params.monto,
    },
  });

  // Actualizar saldo de cuenta bancaria
  const cuentaBancaria = await tx.catalogo_cuentasBancarias.findUnique({
    where: { CuentaBancariaID: params.cuentaBancariaID },
  });

  if (cuentaBancaria) {
    const nuevoSaldo = (cuentaBancaria.Saldo || 0) - params.monto;
    await tx.catalogo_cuentasBancarias.update({
      where: { CuentaBancariaID: params.cuentaBancariaID },
      data: { Saldo: nuevoSaldo },
    });
  }

  return pago;
}

/**
 * Obtiene el total pagado de una compra
 */
export async function obtenerTotalPagadoCompra(
  tx: Prisma.TransactionClient,
  compraEncabezadoID: number,
): Promise<number> {
  const pagos = await tx.pagos.findMany({
    where: {
      ReferenciaTipo: 'Compras',
      ReferenciaID: compraEncabezadoID,
      IsActive: 1,
    },
  });
  return pagos.reduce((sum, pago) => sum + (pago.Monto || 0), 0);
}

/**
 * Obtiene las cantidades recibidas por refacción de una compra
 * Optimizado: usa include para evitar N+1 queries
 */
export async function obtenerCantidadesRecibidasCompra(
  tx: Prisma.TransactionClient,
  compraEncabezadoID: number,
): Promise<Map<number, number>> {
  // Una sola query con include para obtener recepciones y detalles
  const recepciones = await tx.compras_recepciones_encabezado.findMany({
    where: { CompraEncabezadoID: compraEncabezadoID, IsActive: 1 },
    include: {
      compras_recepciones_detalle: {
        where: { IsActive: 1 },
      },
    },
  });

  const cantidadesRecibidas = new Map<number, number>();

  for (const recepcion of recepciones) {
    for (const detalle of recepcion.compras_recepciones_detalle) {
      if (detalle.RefaccionID) {
        const cantidadActual = cantidadesRecibidas.get(detalle.RefaccionID) || 0;
        cantidadesRecibidas.set(detalle.RefaccionID, cantidadActual + (detalle.CantidadEstablecida || 0));
      }
    }
  }
  return cantidadesRecibidas;
}

export const sharedOperationsService = {
  validarSaldoCuentaBancaria,
  actualizarInventario,
  crearKardex,
  actualizarCostoPromedioRefaccion,
  crearPagoYMovimientoBancario,
  obtenerTotalPagadoCompra,
  obtenerCantidadesRecibidasCompra,
};
