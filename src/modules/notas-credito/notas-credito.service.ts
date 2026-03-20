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

    const montoAplicar = dto.MontoAplicado || notaCredito.Monto;

    if (montoAplicar > notaCredito.Monto) {
      throw new HttpError('El monto a aplicar no puede ser mayor al monto de la nota de crédito', 400);
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

      // Cambiar estado de la nota a APLICADO
      await tx.notas_credito.update({
        where: { NotaCreditoID: id },
        data: { Estado: 'APLICADO' },
      });

      // Actualizar TotalNotasCredito en la compra
      const totalNotasActual = compra.TotalNotasCredito || 0;
      await tx.compras_encabezado.update({
        where: { CompraEncabezadoID: dto.CompraEncabezadoID },
        data: {
          TotalNotasCredito: totalNotasActual + montoAplicar,
        },
      });

      return {
        message: 'Nota de crédito aplicada correctamente',
        data: await this.findOne(id),
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
