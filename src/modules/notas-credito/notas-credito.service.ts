import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { Prisma } from '@prisma/client';
import moment from 'moment';
import {
  CreateNotaCreditoDto,
  UpdateNotaCreditoDto,
  AplicarNotaCreditoDto,
  SearchNotasCreditoQuery,
} from './notas-credito.schema';

class NotasCreditoService {
  // ═══════════════════════════════════════════════════════════════════════════
  // CREAR NOTA DE CRÉDITO
  // ═══════════════════════════════════════════════════════════════════════════

  async create(dto: CreateNotaCreditoDto, usuarioId: number) {
    // Validar que el proveedor existe
    const proveedor = await prisma.catalogo_proveedores.findFirst({
      where: { ProveedorID: dto.ProveedorID, IsActive: true },
    });

    if (!proveedor) {
      throw new HttpError('Proveedor no encontrado', 404);
    }

    const notaCredito = await prisma.notas_credito.create({
      data: {
        ProveedorID: dto.ProveedorID,
        Monto: dto.Monto,
        Fecha: moment(dto.Fecha).toDate(),
        NumeroReferencia: dto.NumeroReferencia || null,
        NumeroFactura: dto.NumeroFactura || null,
        NumeroCredito: dto.NumeroCredito || null,
        Descripcion: dto.Descripcion,
        Observaciones: dto.Observaciones || null,
        Estado: 'DISPONIBLE',
        UsuarioID: usuarioId,
        IsActive: 1,
      },
    });

    return {
      message: 'Nota de crédito creada correctamente',
      data: await this.findOne(notaCredito.NotaCreditoID),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONSULTAS
  // ═══════════════════════════════════════════════════════════════════════════

  async findAll(query: SearchNotasCreditoQuery) {
    const where: Prisma.notas_creditoWhereInput = { IsActive: 1 };

    if (query.proveedorId) {
      where.ProveedorID = query.proveedorId;
    }

    if (query.estado) {
      where.Estado = query.estado;
    }

    if (query.fechaDesde || query.fechaHasta) {
      where.Fecha = {};
      if (query.fechaDesde) {
        where.Fecha.gte = moment(query.fechaDesde).toDate();
      }
      if (query.fechaHasta) {
        where.Fecha.lte = moment(query.fechaHasta).toDate();
      }
    }

    const notasCredito = await prisma.notas_credito.findMany({
      where,
      include: {
        proveedor: {
          select: {
            ProveedorID: true,
            NombreProveedor: true,
          },
        },
        aplicaciones: {
          include: {
            compra: {
              select: {
                CompraEncabezadoID: true,
                FechaCompra: true,
              },
            },
          },
        },
      },
      orderBy: { FechaCreacion: 'desc' },
    });

    return {
      message: 'Notas de crédito obtenidas',
      data: notasCredito.map(nc => this.formatearNotaCredito(nc)),
    };
  }

  async findOne(id: number) {
    const notaCredito = await prisma.notas_credito.findFirst({
      where: { NotaCreditoID: id, IsActive: 1 },
      include: {
        proveedor: {
          select: {
            ProveedorID: true,
            NombreProveedor: true,
          },
        },
        aplicaciones: {
          include: {
            compra: {
              select: {
                CompraEncabezadoID: true,
                FechaCompra: true,
              },
            },
          },
        },
      },
    });

    if (!notaCredito) {
      throw new HttpError('Nota de crédito no encontrada', 404);
    }

    return this.formatearNotaCredito(notaCredito);
  }

  async findByProveedor(proveedorId: number, soloDisponibles: boolean = true) {
    const where: Prisma.notas_creditoWhereInput = {
      ProveedorID: proveedorId,
      IsActive: 1,
    };

    if (soloDisponibles) {
      where.Estado = 'DISPONIBLE';
    }

    const notasCredito = await prisma.notas_credito.findMany({
      where,
      include: {
        proveedor: {
          select: {
            ProveedorID: true,
            NombreProveedor: true,
          },
        },
        aplicaciones: {
          include: {
            compra: {
              select: {
                CompraEncabezadoID: true,
                FechaCompra: true,
              },
            },
          },
        },
      },
      orderBy: { Fecha: 'desc' },
    });

    return {
      message: 'Notas de crédito del proveedor',
      data: notasCredito.map(nc => this.formatearNotaCredito(nc)),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTUALIZAR NOTA DE CRÉDITO
  // ═══════════════════════════════════════════════════════════════════════════

  async update(id: number, dto: UpdateNotaCreditoDto) {
    const notaCredito = await prisma.notas_credito.findFirst({
      where: { NotaCreditoID: id, IsActive: 1 },
    });

    if (!notaCredito) {
      throw new HttpError('Nota de crédito no encontrada', 404);
    }

    if (notaCredito.Estado === 'APLICADO') {
      throw new HttpError('No se puede modificar una nota de crédito ya aplicada', 400);
    }

    const dataUpdate: Prisma.notas_creditoUpdateInput = {};

    if (dto.Monto !== undefined) dataUpdate.Monto = dto.Monto;
    if (dto.Fecha !== undefined) dataUpdate.Fecha = moment(dto.Fecha).toDate();
    if (dto.NumeroReferencia !== undefined) dataUpdate.NumeroReferencia = dto.NumeroReferencia;
    if (dto.NumeroFactura !== undefined) dataUpdate.NumeroFactura = dto.NumeroFactura;
    if (dto.NumeroCredito !== undefined) dataUpdate.NumeroCredito = dto.NumeroCredito;
    if (dto.Descripcion !== undefined) dataUpdate.Descripcion = dto.Descripcion;
    if (dto.Observaciones !== undefined) dataUpdate.Observaciones = dto.Observaciones;

    await prisma.notas_credito.update({
      where: { NotaCreditoID: id },
      data: dataUpdate,
    });

    return {
      message: 'Nota de crédito actualizada',
      data: await this.findOne(id),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ELIMINAR NOTA DE CRÉDITO (SOFT DELETE)
  // ═══════════════════════════════════════════════════════════════════════════

  async delete(id: number) {
    const notaCredito = await prisma.notas_credito.findFirst({
      where: { NotaCreditoID: id, IsActive: 1 },
    });

    if (!notaCredito) {
      throw new HttpError('Nota de crédito no encontrada', 404);
    }

    if (notaCredito.Estado === 'APLICADO') {
      throw new HttpError('No se puede eliminar una nota de crédito ya aplicada', 400);
    }

    await prisma.notas_credito.update({
      where: { NotaCreditoID: id },
      data: { IsActive: 0 },
    });

    return { message: 'Nota de crédito eliminada' };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // APLICAR NOTA DE CRÉDITO A UNA COMPRA
  // ═══════════════════════════════════════════════════════════════════════════

  async aplicar(id: number, dto: AplicarNotaCreditoDto, usuarioId: number) {
    const notaCredito = await prisma.notas_credito.findFirst({
      where: { NotaCreditoID: id, IsActive: 1 },
    });

    if (!notaCredito) {
      throw new HttpError('Nota de crédito no encontrada', 404);
    }

    if (notaCredito.Estado === 'APLICADO') {
      throw new HttpError('Esta nota de crédito ya fue aplicada', 400);
    }

    // Verificar que la compra existe y pertenece al mismo proveedor
    const compra = await prisma.compras_encabezado.findFirst({
      where: { CompraEncabezadoID: dto.CompraEncabezadoID, IsActive: true },
    });

    if (!compra) {
      throw new HttpError('Compra no encontrada', 404);
    }

    if (compra.ProveedorID !== notaCredito.ProveedorID) {
      throw new HttpError('La nota de crédito no pertenece al proveedor de esta compra', 400);
    }

    // Calcular saldo pendiente real de la compra
    const totalNeto = Number(compra.TotalNeto) || 0;
    const totalPagado = Number(compra.TotalPagado) || 0;
    const totalNotasCredito = Number(compra.TotalNotasCredito) || 0;
    const saldoPendiente = totalNeto - totalPagado - totalNotasCredito;

    // Si la compra ya está pagada, no permitir aplicar más notas
    if (saldoPendiente <= 0) {
      throw new HttpError('Esta compra ya está completamente pagada', 400);
    }

    const montoNota = Number(notaCredito.Monto);
    let montoAplicar = dto.MontoAplicado ? Number(dto.MontoAplicado) : montoNota;
    let montoExcedente = 0;

    // Si el monto a aplicar supera el saldo pendiente, calcular excedente
    if (montoAplicar > saldoPendiente) {
      montoExcedente = montoAplicar - saldoPendiente;
      montoAplicar = saldoPendiente; // Aplicar solo lo necesario para liquidar
    }

    return await prisma.$transaction(async (tx) => {
      // Crear registro de aplicación
      await tx.notas_credito_aplicaciones.create({
        data: {
          NotaCreditoID: id,
          CompraEncabezadoID: dto.CompraEncabezadoID,
          MontoAplicado: montoAplicar,
          UsuarioID: usuarioId,
        },
      });

      // Cambiar estado de la nota original a APLICADO
      await tx.notas_credito.update({
        where: { NotaCreditoID: id },
        data: { Estado: 'APLICADO' },
      });

      // Si hay excedente, crear nueva nota de crédito con el monto restante
      let notaExcedenteCreada: any = null;
      if (montoExcedente > 0) {
        notaExcedenteCreada = await tx.notas_credito.create({
          data: {
            ProveedorID: notaCredito.ProveedorID,
            Monto: montoExcedente,
            Fecha: new Date(),
            NumeroReferencia: `EXC-${notaCredito.NumeroReferencia || id}`,
            Descripcion: `Excedente de NC #${id} - ${notaCredito.Descripcion}`,
            Observaciones: `Generada automáticamente por excedente de $${montoExcedente.toFixed(2)}`,
            Estado: 'DISPONIBLE',
            UsuarioID: usuarioId,
            IsActive: 1,
          },
        });
      }

      // Actualizar TotalNotasCredito en la compra
      const nuevoTotalNotasCredito = totalNotasCredito + montoAplicar;

      // Calcular nuevo saldo y determinar EstadoPago
      const nuevoSaldoPendiente = totalNeto - totalPagado - nuevoTotalNotasCredito;
      let nuevoEstadoPago = compra.EstadoPago;

      if (nuevoSaldoPendiente <= 0) {
        nuevoEstadoPago = 'PAGADO';
      } else if (totalPagado + nuevoTotalNotasCredito > 0) {
        nuevoEstadoPago = 'PARCIAL';
      }

      await tx.compras_encabezado.update({
        where: { CompraEncabezadoID: dto.CompraEncabezadoID },
        data: {
          TotalNotasCredito: nuevoTotalNotasCredito,
          EstadoPago: nuevoEstadoPago,
        },
      });

      // Construir mensaje de respuesta
      let mensaje = 'Nota de crédito aplicada correctamente';
      if (notaExcedenteCreada) {
        mensaje = `Nota aplicada. Se creó NC #${notaExcedenteCreada.NotaCreditoID} con excedente de $${montoExcedente.toFixed(2)}`;
      }
      if (nuevoEstadoPago === 'PAGADO') {
        mensaje += '. La compra ha sido liquidada.';
      }

      return {
        message: mensaje,
        data: {
          notaAplicada: await this.findOne(id),
          montoAplicado: montoAplicar,
          montoExcedente: montoExcedente,
          notaExcedenteID: notaExcedenteCreada?.NotaCreditoID || null,
          nuevoEstadoPago,
          saldoPendienteFinal: nuevoSaldoPendiente,
        },
      };
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILIDADES PRIVADAS
  // ═══════════════════════════════════════════════════════════════════════════

  private formatearNotaCredito(nc: any) {
    return {
      NotaCreditoID: nc.NotaCreditoID,
      ProveedorID: nc.ProveedorID,
      Proveedor: nc.proveedor ? {
        ProveedorID: nc.proveedor.ProveedorID,
        NombreProveedor: nc.proveedor.NombreProveedor,
      } : null,
      Monto: nc.Monto,
      Fecha: moment.utc(nc.Fecha).format('YYYY-MM-DD'),
      NumeroReferencia: nc.NumeroReferencia,
      NumeroFactura: nc.NumeroFactura,
      NumeroCredito: nc.NumeroCredito,
      Descripcion: nc.Descripcion,
      Observaciones: nc.Observaciones,
      Estado: nc.Estado,
      FechaCreacion: moment.utc(nc.FechaCreacion).format('YYYY-MM-DD HH:mm'),
      Aplicaciones: nc.aplicaciones?.map((app: any) => ({
        AplicacionID: app.AplicacionID,
        CompraEncabezadoID: app.CompraEncabezadoID,
        FechaCompra: app.compra?.FechaCompra ? moment.utc(app.compra.FechaCompra).format('YYYY-MM-DD') : null,
        MontoAplicado: app.MontoAplicado,
        FechaAplicacion: moment.utc(app.FechaAplicacion).format('YYYY-MM-DD HH:mm'),
      })) || [],
    };
  }
}

export const notasCreditoService = new NotasCreditoService();
