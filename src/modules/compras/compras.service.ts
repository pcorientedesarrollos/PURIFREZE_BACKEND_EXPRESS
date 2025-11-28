import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { Prisma, compras_encabezado_Estatus } from '@prisma/client';
import moment from 'moment';
import {
  CreateCompraDto,
  CreateCompraDetalleDto,
  UpdateCompraDto,
  UpdateCompraDetalleDto,
} from './compras.schema';
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

class ComprasService {
  /**
   * Crea una nueva compra
   */
  async create(dto: CreateCompraDto) {
    this.validarDetallesRequeridos(dto.Detalles);

    const result = await prisma.$transaction(async (tx) => {
      await this.validarRequisitosCreacion(tx, dto);

      const encabezado = await this.crearEncabezadoCompra(tx, dto);
      const detalles = await this.crearDetallesCompra(tx, encabezado.CompraEncabezadoID, dto.Detalles);

      if (dto.Estatus === ESTATUS_FINALIZADO) {
        await this.procesarFinalizacion(tx, encabezado.CompraEncabezadoID, dto.Detalles, dto);
      }

      return { encabezado, detalles };
    });

    return { message: 'Compra registrada correctamente', data: result };
  }

  /**
   * Actualiza una compra existente
   */
  async update(id: number, dto: UpdateCompraDto) {
    const result = await prisma.$transaction(async (tx) => {
      const compraExistente = await this.obtenerCompraOError(tx, id);
      this.validarCompraModificable(compraExistente.Estatus);

      const { Detalles, DetallesEliminar, CuentaBancariaID, MetodoPagoID, ...datosEncabezado } = dto;
      const cambiaAFinalizado = this.verificarCambioAFinalizado(dto.Estatus, compraExistente.Estatus);

      let hayRecepcionesPrevias = false;
      if (cambiaAFinalizado) {
        const totalNeto = dto.TotalNeto ?? compraExistente.TotalNeto ?? 0;
        hayRecepcionesPrevias = await this.validarRequisitosFinalizacion(
          tx, id, compraExistente.compras_detalle, MetodoPagoID, CuentaBancariaID, totalNeto
        );
      }

      await this.ejecutarActualizaciones(tx, id, datosEncabezado, Detalles, DetallesEliminar);

      if (cambiaAFinalizado && !hayRecepcionesPrevias) {
        const totalNeto = dto.TotalNeto ?? compraExistente.TotalNeto ?? 0;
        await this.procesarFinalizacionDesdeUpdate(tx, id, CuentaBancariaID!, MetodoPagoID!, totalNeto, dto.UsuarioID);
      }

      return await tx.compras_encabezado.findUnique({
        where: { CompraEncabezadoID: id },
        include: { compras_detalle: true },
      });
    });

    return { message: 'Compra actualizada correctamente', data: result };
  }

  /**
   * Obtiene todos los estatus disponibles para compras
   */
  async findEstatus() {
    const estatusCompra = ['Pendiente', 'Finalizado'];
    return { message: 'Estatus obtenidos', data: estatusCompra };
  }

  /**
   * Obtiene todas las compras con sus detalles
   */
  async findAll() {
    const compras = await prisma.compras_encabezado.findMany({
      include: {
        compras_detalle: true,
        catalogo_proveedores: true,
      },
      orderBy: { CompraEncabezadoID: 'desc' },
    });

    return { message: 'Compras obtenidas', data: compras };
  }

  /**
   * Obtiene una compra por ID
   */
  async findOne(id: number) {
    const compra = await prisma.compras_encabezado.findUnique({
      where: { CompraEncabezadoID: id },
      include: { compras_detalle: true },
    });

    if (!compra) {
      throw new HttpError('Compra no encontrada', 404);
    }

    return { message: 'Compra obtenida', data: compra };
  }

  /**
   * Elimina (soft delete) una compra
   */
  async remove(id: number) {
    const compra = await prisma.compras_encabezado.findUnique({
      where: { CompraEncabezadoID: id },
    });

    if (!compra) {
      throw new HttpError('Compra no encontrada', 404);
    }

    if (compra.Estatus === ESTATUS_FINALIZADO) {
      throw new HttpError('No se puede eliminar una compra finalizada', 400);
    }

    await prisma.compras_encabezado.update({
      where: { CompraEncabezadoID: id },
      data: { IsActive: false },
    });

    return { message: 'Compra eliminada correctamente', data: { CompraEncabezadoID: id } };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VALIDACIONES
  // ═══════════════════════════════════════════════════════════════════════════

  private validarDetallesRequeridos(detalles: CreateCompraDetalleDto[] | undefined): void {
    if (!detalles?.length) {
      throw new HttpError('No ingresaste ninguna refacción', 400);
    }
  }

  private async validarRequisitosCreacion(tx: Prisma.TransactionClient, dto: CreateCompraDto): Promise<void> {
    if (dto.Estatus === ESTATUS_FINALIZADO) {
      if (!dto.MetodoPagoID) {
        throw new HttpError('El MetodoPagoID es requerido cuando el estatus es Finalizado', 400);
      }
      await validarSaldoCuentaBancaria(tx, dto.CuentaBancariaID, dto.TotalNeto);
    }
  }

  private validarCompraModificable(estatus: compras_encabezado_Estatus | null): void {
    if (estatus === ESTATUS_FINALIZADO) {
      throw new HttpError('No se puede modificar una compra finalizada', 400);
    }
  }

  private verificarCambioAFinalizado(nuevoEstatus: string | undefined, estatusActual: compras_encabezado_Estatus | null): boolean {
    return nuevoEstatus === ESTATUS_FINALIZADO && estatusActual !== ESTATUS_FINALIZADO;
  }

  private async validarRequisitosFinalizacion(
    tx: Prisma.TransactionClient,
    compraId: number,
    detalles: Array<{ RefaccionID: number | null; Cantidad: number | null; IsActive: boolean | null }>,
    metodoPagoID: number | undefined,
    cuentaBancariaID: number | undefined,
    totalNeto: number,
  ): Promise<boolean> {
    if (!metodoPagoID) {
      throw new HttpError('El MetodoPagoID es requerido cuando el estatus es Finalizado', 400);
    }

    const cantidadesRecibidas = await obtenerCantidadesRecibidasCompra(tx, compraId);
    const totalPagado = await obtenerTotalPagadoCompra(tx, compraId);
    const hayRecepcionesPrevias = cantidadesRecibidas.size > 0 || totalPagado > 0;

    if (hayRecepcionesPrevias) {
      this.validarRecepcionesCompletas(detalles, cantidadesRecibidas, totalPagado, totalNeto);
    } else {
      this.validarDatosParaFinalizacionDirecta(cuentaBancariaID);
      await validarSaldoCuentaBancaria(tx, cuentaBancariaID!, totalNeto);
    }

    return hayRecepcionesPrevias;
  }

  private validarRecepcionesCompletas(
    detalles: Array<{ RefaccionID: number | null; Cantidad: number | null; IsActive: boolean | null }>,
    cantidadesRecibidas: Map<number, number>,
    totalPagado: number,
    totalNeto: number,
  ): void {
    const detallesActivos = detalles.filter(d => d.IsActive);

    for (const detalle of detallesActivos) {
      if (!detalle.RefaccionID || !detalle.Cantidad) continue;
      const cantidadRecibida = cantidadesRecibidas.get(detalle.RefaccionID) || 0;
      if (cantidadRecibida < detalle.Cantidad) {
        const pendiente = detalle.Cantidad - cantidadRecibida;
        throw new HttpError(
          `No se puede finalizar: la refacción ${detalle.RefaccionID} tiene pendiente ${pendiente} unidades por recibir`,
          400,
        );
      }
    }

    if (totalPagado < totalNeto) {
      throw new HttpError(
        `No se puede finalizar: el monto pagado ($${totalPagado}) es menor al total ($${totalNeto}). Pendiente: $${totalNeto - totalPagado}`,
        400,
      );
    }
  }

  private validarDatosParaFinalizacionDirecta(cuentaBancariaID: number | undefined): void {
    if (!cuentaBancariaID) {
      throw new HttpError('El CuentaBancariaID es requerido para finalizar la compra', 400);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OPERACIONES DE BASE DE DATOS
  // ═══════════════════════════════════════════════════════════════════════════

  private async obtenerCompraOError(tx: Prisma.TransactionClient, id: number) {
    const compra = await tx.compras_encabezado.findUnique({
      where: { CompraEncabezadoID: id },
      include: { compras_detalle: true },
    });

    if (!compra) {
      throw new HttpError('Compra no encontrada', 404);
    }

    return compra;
  }

  private async crearEncabezadoCompra(tx: Prisma.TransactionClient, dto: CreateCompraDto) {
    return await tx.compras_encabezado.create({
      data: {
        ProveedorID: dto.ProveedorID,
        FechaCompra: dto.FechaCompra,
        TotalBruto: dto.TotalBruto,
        TotalDescuentosPorcentaje: dto.TotalDescuentosPorcentaje,
        TotalDescuentoEfectivo: dto.TotalDescuentoEfectivo,
        TotalGastosOperativos: dto.TotalGastosOperativos,
        TotalGastosImportacion: dto.TotalGastosImportacion,
        TotalIVA: dto.TotalIVA,
        TotalNeto: dto.TotalNeto,
        UsuarioID: dto.UsuarioID,
        Estatus: dto.Estatus as compras_encabezado_Estatus,
        IsActive: true,
        FechaAlta: moment().format('YYYY-MM-DD HH:mm:ss'),
      },
    });
  }

  private async crearDetallesCompra(
    tx: Prisma.TransactionClient,
    compraEncabezadoID: number,
    detalles: CreateCompraDetalleDto[],
  ) {
    const detallesCreados = [];

    for (const detalle of detalles) {
      const detalleCreado = await tx.compras_detalle.create({
        data: {
          ...detalle,
          CompraEncabezadoID: compraEncabezadoID,
          IsActive: true,
        },
      });
      detallesCreados.push(detalleCreado);
    }

    return detallesCreados;
  }

  private async ejecutarActualizaciones(
    tx: Prisma.TransactionClient,
    compraId: number,
    datosEncabezado: Record<string, unknown>,
    detalles?: UpdateCompraDetalleDto[],
    detallesEliminar?: number[],
  ): Promise<void> {
    // Convertir Estatus a enum si existe
    const dataToUpdate = { ...datosEncabezado };
    if (dataToUpdate.Estatus) {
      dataToUpdate.Estatus = dataToUpdate.Estatus as compras_encabezado_Estatus;
    }

    // Actualizar encabezado
    await tx.compras_encabezado.update({
      where: { CompraEncabezadoID: compraId },
      data: dataToUpdate,
    });

    // Eliminar detalles (soft delete)
    if (detallesEliminar?.length) {
      for (const detalleID of detallesEliminar) {
        await tx.compras_detalle.updateMany({
          where: { CompraDetalleID: detalleID, CompraEncabezadoID: compraId },
          data: { IsActive: false },
        });
      }
    }

    // Actualizar o crear detalles
    if (detalles?.length) {
      for (const detalle of detalles) {
        if (detalle.CompraDetalleID) {
          const { CompraDetalleID, ...data } = detalle;
          await tx.compras_detalle.updateMany({
            where: { CompraDetalleID, CompraEncabezadoID: compraId },
            data,
          });
        } else {
          await tx.compras_detalle.create({
            data: { ...detalle, CompraEncabezadoID: compraId, IsActive: true },
          });
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCESAMIENTO DE FINALIZACIÓN
  // ═══════════════════════════════════════════════════════════════════════════

  private async procesarFinalizacion(
    tx: Prisma.TransactionClient,
    compraEncabezadoID: number,
    detalles: CreateCompraDetalleDto[],
    dto: CreateCompraDto,
  ): Promise<void> {
    const fechaHoy = moment().format('YYYY-MM-DD');
    const usuarioID = dto.UsuarioID || 0;

    const recepcion = await this.crearRecepcionCompra(tx, compraEncabezadoID, dto.TotalNeto, usuarioID, fechaHoy);
    await this.procesarDetallesRecepcion(tx, recepcion.ComprasRecepcionesEncabezadoID, compraEncabezadoID, detalles, usuarioID, fechaHoy);
    await this.crearPagoCompra(tx, compraEncabezadoID, dto, usuarioID, fechaHoy);
  }

  private async procesarFinalizacionDesdeUpdate(
    tx: Prisma.TransactionClient,
    compraId: number,
    cuentaBancariaID: number,
    metodoPagoID: number,
    totalNeto: number,
    usuarioID?: number,
  ) {
    const compra = await tx.compras_encabezado.findUnique({
      where: { CompraEncabezadoID: compraId },
      include: { compras_detalle: true },
    });

    if (!compra) return null;

    const detallesActivos = compra.compras_detalle.filter(d => d.IsActive);

    if (detallesActivos.length === 0) {
      return null;
    }

    const fechaHoy = moment().format('YYYY-MM-DD');
    const usuario = usuarioID || compra.UsuarioID || 0;

    // Crear recepción
    const recepcion = await this.crearRecepcionCompra(tx, compraId, totalNeto, usuario, fechaHoy);

    // Procesar detalles
    const detallesDto: CreateCompraDetalleDto[] = detallesActivos.map(d => ({
      RefaccionID: d.RefaccionID || 0,
      Cantidad: d.Cantidad || 0,
      PrecioUnitario: d.PrecioUnitario || 0,
      DescuentoPorcentaje: d.DescuentoPorcentaje || 0,
      DescuentoEfectivo: d.DescuentoEfectivo || 0,
      GastosOperativos: d.GastosOperativos || 0,
      GastosImportacion: d.GastosImportacion || 0,
      SubTotal: d.SubTotal || 0,
      Total: d.Total || 0,
    }));

    await this.procesarDetallesRecepcion(tx, recepcion.ComprasRecepcionesEncabezadoID, compraId, detallesDto, usuario, fechaHoy);

    // Crear pago
    await crearPagoYMovimientoBancario(tx, {
      referenciaTipo: 'Compras',
      referenciaID: compraId,
      metodoPagoID: metodoPagoID,
      cuentaBancariaID: cuentaBancariaID,
      monto: totalNeto,
      UsuarioID: usuario,
      observaciones: `Pago de compra #${compraId}`,
      fechaPago: fechaHoy,
    });

    return null;
  }

  private async crearRecepcionCompra(
    tx: Prisma.TransactionClient,
    compraEncabezadoID: number,
    montoRecepcion: number,
    usuarioID: number,
    fecha: string,
  ) {
    return await tx.compras_recepciones_encabezado.create({
      data: {
        CompraEncabezadoID: compraEncabezadoID,
        FechaRecepcion: fecha,
        Observaciones: 'Recepción automática por compra finalizada',
        MontoRecepcion: montoRecepcion,
        UsuarioID: usuarioID,
        IsActive: 1,
      },
    });
  }

  private async procesarDetallesRecepcion(
    tx: Prisma.TransactionClient,
    recepcionID: number,
    compraID: number,
    detalles: CreateCompraDetalleDto[],
    usuarioID: number,
    fecha: string,
  ): Promise<void> {
    for (const detalle of detalles) {
      // Crear detalle de recepción
      await tx.compras_recepciones_detalle.create({
        data: {
          ComprasRecepcionesEncabezadoID: recepcionID,
          RefaccionID: detalle.RefaccionID,
          CantidadEstablecida: detalle.Cantidad,
          IsActive: 1,
        },
      });

      // Actualizar inventario
      await actualizarInventario(tx, detalle.RefaccionID, detalle.Cantidad, fecha);

      // Registrar en Kardex
      await crearKardex(
        tx, detalle.RefaccionID, detalle.Cantidad, detalle.PrecioUnitario,
        usuarioID, 'Entrada_Compra', `Entrada por compra #${compraID}`, fecha,
      );

      // Actualizar costo promedio
      await actualizarCostoPromedioRefaccion(tx, detalle.RefaccionID, detalle.PrecioUnitario, detalle.Cantidad);
    }
  }

  private async crearPagoCompra(
    tx: Prisma.TransactionClient,
    compraID: number,
    dto: CreateCompraDto,
    usuarioID: number,
    fecha: string,
  ): Promise<void> {
    await crearPagoYMovimientoBancario(tx, {
      referenciaTipo: 'Compras',
      referenciaID: compraID,
      metodoPagoID: dto.MetodoPagoID!,
      cuentaBancariaID: dto.CuentaBancariaID,
      monto: dto.TotalNeto,
      UsuarioID: usuarioID,
      observaciones: `Pago de compra #${compraID}`,
      fechaPago: fecha,
    });
  }
}

export const comprasService = new ComprasService();
