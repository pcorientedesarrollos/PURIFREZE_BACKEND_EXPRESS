import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { Prisma, compras_encabezado_Estatus, FormaPagoCompra, EstadoPagoCompra, EstadoEntregaCompra } from '@prisma/client';
import moment from 'moment';
import {
  CreateCompraDto,
  CreateCompraDetalleDto,
  UpdateCompraDto,
  UpdateCompraDetalleDto,
  AplicarDescuentosDto,
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
const ESTATUS_PAGADO: compras_encabezado_Estatus = 'Pagado';

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

      // Si es CONTADO, crear pago automático en compras_pagos
      if (dto.FormaPago === 'CONTADO' && dto.MetodoPagoID && dto.CuentaBancariaID) {
        await this.crearPagoAutomaticoContado(tx, encabezado.CompraEncabezadoID, dto);
      }

      if (dto.Estatus === ESTATUS_FINALIZADO) {
        await this.procesarFinalizacion(tx, encabezado.CompraEncabezadoID, dto.Detalles, dto);
      } else if (dto.Estatus === ESTATUS_PAGADO) {
        await this.procesarPago(tx, encabezado.CompraEncabezadoID, dto);
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

      // Solo bloquear cambios en detalles si está finalizada/pagada
      // Permitir actualizar campos del encabezado (NumeroPedido, etc.)
      const { Detalles, DetallesEliminar, CuentaBancariaID, MetodoPagoID, ...datosEncabezado } = dto;
      const tieneModificacionDetalles = (Detalles && Detalles.length > 0) || (DetallesEliminar && DetallesEliminar.length > 0);

      if (tieneModificacionDetalles) {
        this.validarCompraModificable(compraExistente.Estatus);
      }
      const cambiaAFinalizado = this.verificarCambioAFinalizado(dto.Estatus, compraExistente.Estatus);
      const cambiaAPagado = this.verificarCambioAPagado(dto.Estatus, compraExistente.Estatus);

      let hayRecepcionesPrevias = false;
      if (cambiaAFinalizado) {
        const totalNeto = dto.TotalNeto ?? compraExistente.TotalNeto ?? 0;
        hayRecepcionesPrevias = await this.validarRequisitosFinalizacion(
          tx, id, compraExistente.compras_detalle, MetodoPagoID, CuentaBancariaID, totalNeto
        );
      }

      if (cambiaAPagado) {
        if (!MetodoPagoID) {
          throw new HttpError('El MetodoPagoID es requerido para pagar la compra', 400);
        }
        if (!CuentaBancariaID) {
          throw new HttpError('El CuentaBancariaID es requerido para pagar la compra', 400);
        }
        const totalNeto = dto.TotalNeto ?? compraExistente.TotalNeto ?? 0;
        await validarSaldoCuentaBancaria(tx, CuentaBancariaID, totalNeto);
      }

      await this.ejecutarActualizaciones(tx, id, datosEncabezado, Detalles, DetallesEliminar);

      if (cambiaAPagado) {
        const totalNeto = dto.TotalNeto ?? compraExistente.TotalNeto ?? 0;
        await crearPagoYMovimientoBancario(tx, {
          referenciaTipo: 'Compras',
          referenciaID: id,
          metodoPagoID: MetodoPagoID!,
          cuentaBancariaID: CuentaBancariaID!,
          monto: totalNeto,
          UsuarioID: dto.UsuarioID || 0,
          observaciones: `Pago completo de compra #${id}`,
          fechaPago: moment().format('YYYY-MM-DD'),
        });
      }

      if (cambiaAFinalizado && !hayRecepcionesPrevias) {
        const totalNeto = dto.TotalNeto ?? compraExistente.TotalNeto ?? 0;
        await this.procesarFinalizacionDesdeUpdate(tx, id, CuentaBancariaID!, MetodoPagoID!, totalNeto, dto.UsuarioID);
      }

      return await tx.compras_encabezado.findUnique({
        where: { CompraEncabezadoID: id },
        include: { compras_detalle: { where: { IsActive: true } } },
      });
    });

    return { message: 'Compra actualizada correctamente', data: result };
  }

  /**
   * Obtiene todos los estatus disponibles para compras
   */
  async findEstatus() {
    const estatusCompra = ['Pendiente', 'Pagado', 'Finalizado'];
    return { message: 'Estatus obtenidos', data: estatusCompra };
  }

  /**
   * Obtiene todas las compras con sus detalles
   */
  async findAll() {
    const compras = await prisma.compras_encabezado.findMany({
      include: {
        compras_detalle: {
          where: { IsActive: true },
          include: {
            refaccion: {
              select: {
                RefaccionID: true,
                NombrePieza: true,
                Codigo: true,
              },
            },
            equipo: {
              select: {
                EquipoID: true,
                NumeroSerie: true,
                Estatus: true,
              },
            },
          },
        },
        catalogo_proveedores: true,
        compras_pagos: {
          where: { IsActive: 1 },
          orderBy: { FechaPago: 'desc' },
        },
      },
      orderBy: { CompraEncabezadoID: 'desc' },
    });

    // Formatear fechas - Usar moment.utc() para evitar conversión de timezone
    const comprasFormateadas = compras.map((compra) => ({
      ...compra,
      FechaCompra: compra.FechaCompra ? moment.utc(compra.FechaCompra).format('YYYY-MM-DD') : null,
      FechaVencimientoCredito: compra.FechaVencimientoCredito
        ? moment.utc(compra.FechaVencimientoCredito).format('YYYY-MM-DD')
        : null,
      compras_pagos: compra.compras_pagos.map((pago) => ({
        ...pago,
        FechaPago: moment.utc(pago.FechaPago).format('YYYY-MM-DD'),
      })),
    }));

    return { message: 'Compras obtenidas', data: comprasFormateadas };
  }

  /**
   * Obtiene una compra por ID
   */
  async findOne(id: number) {
    const compra = await prisma.compras_encabezado.findUnique({
      where: { CompraEncabezadoID: id },
      include: {
        compras_detalle: {
          where: { IsActive: true },
          include: {
            refaccion: {
              select: {
                RefaccionID: true,
                NombrePieza: true,
                Codigo: true,
                NombreCorto: true,
              },
            },
            equipo: {
              select: {
                EquipoID: true,
                NumeroSerie: true,
                Estatus: true,
                plantilla: {
                  select: {
                    PlantillaEquipoID: true,
                    NombreEquipo: true,
                  },
                },
              },
            },
            equipoVirtual: {
              select: {
                EquipoVirtualID: true,
                Nombre: true,
                Codigo: true,
              },
            },
          },
        },
        compras_pagos: {
          where: { IsActive: 1 },
          orderBy: { FechaPago: 'desc' },
        },
        compras_recepciones: {
          where: { IsActive: 1 },
          include: {
            compras_recepciones_detalle: {
              where: { IsActive: 1 },
            },
          },
        },
        catalogo_proveedores: {
          select: {
            ProveedorID: true,
            NombreProveedor: true,
            contactos: {
              where: { IsActive: true },
              select: {
                ContactoID: true,
                NombreContacto: true,
                Puesto: true,
                Celular: true,
              },
            },
          },
        },
      },
    });

    if (!compra) {
      throw new HttpError('Compra no encontrada', 404);
    }

    const usuario = compra.UsuarioID
      ? await prisma.usuarios.findUnique({
          where: { UsuarioID: compra.UsuarioID },
          select: { UsuarioID: true, NombreCompleto: true },
        })
      : null;

    const compraFormateada = {
      ...compra,
      usuario,
      FechaCompra: compra.FechaCompra ? moment.utc(compra.FechaCompra).format('YYYY-MM-DD') : null,
      FechaVencimientoCredito: compra.FechaVencimientoCredito
        ? moment.utc(compra.FechaVencimientoCredito).format('YYYY-MM-DD')
        : null,
      compras_pagos: compra.compras_pagos.map((pago) => ({
        ...pago,
        FechaPago: moment.utc(pago.FechaPago).format('YYYY-MM-DD'),
      })),
      compras_recepciones: compra.compras_recepciones.map((recepcion) => ({
        ...recepcion,
        FechaRecepcion: recepcion.FechaRecepcion
          ? moment.utc(recepcion.FechaRecepcion).format('YYYY-MM-DD')
          : null,
      })),
    };

    return { message: 'Compra obtenida', data: compraFormateada };
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
    // Validar requisitos para CONTADO
    if (dto.FormaPago === 'CONTADO') {
      if (!dto.MetodoPagoID) {
        throw new HttpError('El MetodoPagoID es requerido para compras de CONTADO', 400);
      }
      if (!dto.CuentaBancariaID) {
        throw new HttpError('El CuentaBancariaID es requerido para compras de CONTADO', 400);
      }
      await validarSaldoCuentaBancaria(tx, dto.CuentaBancariaID, dto.TotalNeto);
    }

    // Validar requisitos para Finalizado/Pagado (compatibilidad con sistema anterior)
    if (dto.Estatus === ESTATUS_FINALIZADO || dto.Estatus === ESTATUS_PAGADO) {
      if (!dto.MetodoPagoID) {
        throw new HttpError('El MetodoPagoID es requerido cuando el estatus es Finalizado o Pagado', 400);
      }
      if (dto.CuentaBancariaID) {
        await validarSaldoCuentaBancaria(tx, dto.CuentaBancariaID, dto.TotalNeto);
      }
    }
  }

  private validarCompraModificable(estatus: compras_encabezado_Estatus | null): void {
    if (estatus === ESTATUS_FINALIZADO) {
      throw new HttpError('No se puede modificar una compra finalizada', 400);
    }
    if (estatus === ESTATUS_PAGADO) {
      throw new HttpError('No se puede modificar una compra ya pagada', 400);
    }
  }

  private verificarCambioAFinalizado(nuevoEstatus: string | undefined, estatusActual: compras_encabezado_Estatus | null): boolean {
    return nuevoEstatus === ESTATUS_FINALIZADO && estatusActual !== ESTATUS_FINALIZADO;
  }

  private verificarCambioAPagado(nuevoEstatus: string | undefined, estatusActual: compras_encabezado_Estatus | null): boolean {
    return nuevoEstatus === ESTATUS_PAGADO && estatusActual === 'Pendiente';
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
    // Calcular fecha de vencimiento para crédito
    let fechaVencimientoCredito: Date | null = null;
    if (dto.FormaPago === 'CREDITO' && dto.DiasCredito) {
      fechaVencimientoCredito = moment(dto.FechaCompra).add(dto.DiasCredito, 'days').toDate();
    } else if (dto.FechaVencimientoCredito) {
      fechaVencimientoCredito = dto.FechaVencimientoCredito;
    }

    // Determinar estados iniciales
    const esContado = dto.FormaPago === 'CONTADO';
    const estadoPagoInicial: EstadoPagoCompra = esContado ? 'PAGADO' : 'PENDIENTE';
    const estadoEntregaInicial: EstadoEntregaCompra = dto.Estatus === 'Finalizado' ? 'ENTREGADO' : 'PEDIDO';

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
        // Nuevos campos para sistema de ejes independientes
        FormaPago: (dto.FormaPago || 'CREDITO') as FormaPagoCompra,
        EstadoPago: estadoPagoInicial,
        EstadoEntrega: estadoEntregaInicial,
        TotalPagado: esContado ? dto.TotalNeto : 0,
        TotalRecibido: estadoEntregaInicial === 'ENTREGADO' ? dto.TotalNeto : 0,
        DiasCredito: dto.DiasCredito || null,
        FechaVencimientoCredito: fechaVencimientoCredito,
        NumeroPedido: dto.NumeroPedido || null,
        Observaciones: dto.Observaciones || null,
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

  private async procesarPago(
    tx: Prisma.TransactionClient,
    compraEncabezadoID: number,
    dto: CreateCompraDto,
  ): Promise<void> {
    const usuarioID = dto.UsuarioID || 0;
    const fechaHoy = moment().format('YYYY-MM-DD');

    await crearPagoYMovimientoBancario(tx, {
      referenciaTipo: 'Compras',
      referenciaID: compraEncabezadoID,
      metodoPagoID: dto.MetodoPagoID!,
      cuentaBancariaID: dto.CuentaBancariaID!,
      monto: dto.TotalNeto,
      UsuarioID: usuarioID,
      observaciones: `Pago completo de compra #${compraEncabezadoID} (pendiente de recepción)`,
      fechaPago: fechaHoy,
    });
  }

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
      // Solo procesar si tiene RefaccionID (no equipos)
      if (!detalle.RefaccionID) continue;

      const refaccionID = detalle.RefaccionID;

      // Crear detalle de recepción
      await tx.compras_recepciones_detalle.create({
        data: {
          ComprasRecepcionesEncabezadoID: recepcionID,
          RefaccionID: refaccionID,
          CantidadEstablecida: detalle.Cantidad,
          IsActive: 1,
        },
      });

      // Actualizar inventario
      await actualizarInventario(tx, refaccionID, detalle.Cantidad, fecha);

      // Registrar en Kardex
      await crearKardex(
        tx, refaccionID, detalle.Cantidad, detalle.PrecioUnitario,
        usuarioID, 'Entrada_Compra', `Entrada por compra #${compraID}`, fecha,
      );

      // Actualizar costo promedio
      await actualizarCostoPromedioRefaccion(tx, refaccionID, detalle.PrecioUnitario, detalle.Cantidad);
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
      cuentaBancariaID: dto.CuentaBancariaID!,
      monto: dto.TotalNeto,
      UsuarioID: usuarioID,
      observaciones: `Pago de compra #${compraID}`,
      fechaPago: fecha,
    });
  }

  /**
   * Crea un pago automático en compras_pagos para compras de CONTADO
   */
  private async crearPagoAutomaticoContado(
    tx: Prisma.TransactionClient,
    compraEncabezadoID: number,
    dto: CreateCompraDto
  ): Promise<void> {
    const fechaHoy = moment().format('YYYY-MM-DD');
    const usuarioID = dto.UsuarioID || 0;

    // Crear pago en compras_pagos
    const pago = await tx.compras_pagos.create({
      data: {
        CompraEncabezadoID: compraEncabezadoID,
        MetodoPagoID: dto.MetodoPagoID!,
        CuentaBancariaID: dto.CuentaBancariaID!,
        Monto: dto.TotalNeto,
        FechaPago: new Date(fechaHoy),
        Observaciones: `Pago automático de compra CONTADO #${compraEncabezadoID}`,
        UsuarioID: usuarioID,
        IsActive: 1,
      },
    });

    // Crear movimiento bancario (egreso)
    await tx.historial_movimientos_bancarios.create({
      data: {
        CuentaBancariaID: dto.CuentaBancariaID!,
        PagosID: pago.CompraPagoID,
        CobrosID: 0,
        CuentaContableID: '',
        DescripcionMovimiento: `Pago de compra CONTADO #${compraEncabezadoID}`,
        FechaMovimiento: new Date(fechaHoy),
        EoI: false,
        MontoMovimiento: dto.TotalNeto,
      },
    });

    // Actualizar saldo de cuenta bancaria
    const cuentaBancaria = await tx.catalogo_cuentasBancarias.findUnique({
      where: { CuentaBancariaID: dto.CuentaBancariaID! },
    });

    if (cuentaBancaria) {
      const nuevoSaldo = (cuentaBancaria.Saldo || 0) - dto.TotalNeto;
      await tx.catalogo_cuentasBancarias.update({
        where: { CuentaBancariaID: dto.CuentaBancariaID! },
        data: { Saldo: nuevoSaldo },
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MÉTODOS PARA SISTEMA DE EJES INDEPENDIENTES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Actualiza el EstadoEntrega y TotalRecibido de una compra
   * basado en las recepciones realizadas
   */
  async actualizarEstadoEntrega(tx: Prisma.TransactionClient, compraEncabezadoID: number) {
    // Obtener compra con detalles
    const compra = await tx.compras_encabezado.findUnique({
      where: { CompraEncabezadoID: compraEncabezadoID },
      include: { compras_detalle: { where: { IsActive: true } } },
    });

    if (!compra) return;

    // Obtener cantidades recibidas por refacción
    const cantidadesRecibidas = await obtenerCantidadesRecibidasCompra(tx, compraEncabezadoID);

    // Calcular totales
    let totalCantidadComprada = 0;
    let totalCantidadRecibida = 0;
    let totalMontoRecibido = 0;

    for (const detalle of compra.compras_detalle) {
      if (!detalle.RefaccionID) continue;

      const cantidadComprada = detalle.Cantidad || 0;
      const cantidadRecibida = cantidadesRecibidas.get(detalle.RefaccionID) || 0;
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

    // Actualizar compra
    await tx.compras_encabezado.update({
      where: { CompraEncabezadoID: compraEncabezadoID },
      data: {
        TotalRecibido: totalMontoRecibido,
        EstadoEntrega: nuevoEstado,
        // Actualizar Estatus legacy si corresponde
        Estatus: nuevoEstado === 'ENTREGADO' && compra.EstadoPago === 'PAGADO'
          ? 'Finalizado'
          : compra.Estatus,
      },
    });
  }

  /**
   * Aplica descuentos al encabezado de una compra desde el modal de pagos
   * Recalcula TotalNeto basado en descuentos aplicados
   */
  async aplicarDescuentos(id: number, dto: AplicarDescuentosDto) {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Obtener la compra
      const compra = await tx.compras_encabezado.findUnique({
        where: { CompraEncabezadoID: id },
      });

      if (!compra) {
        throw new HttpError('Compra no encontrada', 404);
      }

      if (!compra.IsActive) {
        throw new HttpError('La compra no está activa', 400);
      }

      // 2. No permitir si ya está completamente pagada
      if (compra.EstadoPago === 'PAGADO') {
        throw new HttpError('No se pueden aplicar descuentos a una compra ya pagada', 400);
      }

      // 3. Calcular nuevos totales
      const totalBruto = compra.TotalBruto || 0;
      const gastosOperativos = compra.TotalGastosOperativos || 0;
      const gastosImportacion = compra.TotalGastosImportacion || 0;
      const totalPagado = compra.TotalPagado || 0;
      const totalNotasCredito = compra.TotalNotasCredito || 0;

      // Descuentos nuevos a aplicar (se SUMAN a los existentes)
      const descuentoPorcentajeNuevo = dto.DescuentoPorcentaje || 0;
      const descuentoEfectivoNuevo = dto.DescuentoEfectivo || 0;

      // Calcular monto del descuento por porcentaje (sobre el total bruto)
      const montoDescuentoPorcentaje = totalBruto * (descuentoPorcentajeNuevo / 100);

      // Total de descuentos nuevos
      const totalDescuentosNuevos = montoDescuentoPorcentaje + descuentoEfectivoNuevo;

      // Nuevo total de descuentos (acumulando con los existentes)
      const descuentosPrevios = (compra.TotalDescuentosPorcentaje || 0) + (compra.TotalDescuentoEfectivo || 0);
      const totalDescuentosFinal = descuentosPrevios + totalDescuentosNuevos;

      // Nuevo TotalNeto
      const nuevoTotalNeto = totalBruto - totalDescuentosFinal + gastosOperativos + gastosImportacion;

      // 4. Validar que el total no quede negativo
      if (nuevoTotalNeto < 0) {
        throw new HttpError('El descuento no puede ser mayor al total de la compra', 400);
      }

      // 5. Validar que no quede un saldo pendiente negativo
      const nuevoSaldoPendiente = nuevoTotalNeto - totalPagado - totalNotasCredito;
      if (nuevoSaldoPendiente < 0) {
        throw new HttpError(
          `El descuento generaría un saldo negativo. Total pagado + notas de crédito ($${(totalPagado + totalNotasCredito).toFixed(2)}) excede el nuevo total ($${nuevoTotalNeto.toFixed(2)})`,
          400
        );
      }

      // 6. Calcular IVA del nuevo total (los precios ya incluyen IVA 16%)
      const ivaFactor = 1.16;
      const totalSinIva = nuevoTotalNeto / ivaFactor;
      const nuevoTotalIva = totalSinIva * 0.16;

      // 7. Actualizar compra
      const compraActualizada = await tx.compras_encabezado.update({
        where: { CompraEncabezadoID: id },
        data: {
          TotalDescuentosPorcentaje: (compra.TotalDescuentosPorcentaje || 0) + montoDescuentoPorcentaje,
          TotalDescuentoEfectivo: (compra.TotalDescuentoEfectivo || 0) + descuentoEfectivoNuevo,
          TotalIVA: nuevoTotalIva,
          TotalNeto: nuevoTotalNeto,
        },
      });

      // 8. Actualizar estado de pago si el saldo pendiente es 0
      if (nuevoSaldoPendiente === 0) {
        await tx.compras_encabezado.update({
          where: { CompraEncabezadoID: id },
          data: { EstadoPago: 'PAGADO' },
        });
      }

      return {
        CompraEncabezadoID: id,
        TotalBruto: totalBruto,
        TotalDescuentosPorcentaje: compraActualizada.TotalDescuentosPorcentaje,
        TotalDescuentoEfectivo: compraActualizada.TotalDescuentoEfectivo,
        TotalNeto: nuevoTotalNeto,
        SaldoPendiente: nuevoSaldoPendiente,
      };
    });

    return { message: 'Descuentos aplicados correctamente', data: result };
  }

  /**
   * Actualiza el número de factura de una compra
   */
  async updateFactura(id: number, dto: { Factura?: string | null }) {
    const compra = await prisma.compras_encabezado.findUnique({
      where: { CompraEncabezadoID: id },
    });

    if (!compra) {
      throw new HttpError('Compra no encontrada', 404);
    }

    if (!compra.IsActive) {
      throw new HttpError('La compra no está activa', 400);
    }

    const compraActualizada = await prisma.compras_encabezado.update({
      where: { CompraEncabezadoID: id },
      data: { Factura: dto.Factura || null },
    });

    return {
      message: 'Factura actualizada correctamente',
      data: {
        CompraEncabezadoID: id,
        Factura: compraActualizada.Factura,
      },
    };
  }
}

export const comprasService = new ComprasService();
