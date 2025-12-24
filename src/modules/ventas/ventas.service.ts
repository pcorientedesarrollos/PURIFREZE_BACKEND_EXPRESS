import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import {
  CreateVentaDto,
  UpdateVentaDto,
  UpdateEstatusVentaDto,
  AddDetalleVentaDto,
  UpdateDetalleVentaDto,
  CreatePagoDto,
  VentasQueryDto,
} from './ventas.schema';

const IVA_PORCENTAJE = 0.16;

class VentasService {
  // Generar número de venta
  private async generarNumeroVenta(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `V-${year}-`;

    const ultimaVenta = await prisma.ventas_encabezado.findFirst({
      where: {
        NumeroVenta: { startsWith: prefix },
      },
      orderBy: { VentaID: 'desc' },
    });

    let siguiente = 1;
    if (ultimaVenta) {
      const partes = ultimaVenta.NumeroVenta.split('-');
      siguiente = parseInt(partes[2]) + 1;
    }

    return `${prefix}${siguiente.toString().padStart(4, '0')}`;
  }

  // Calcular subtotal de detalle
  private calcularSubtotalDetalle(cantidad: number, precioUnitario: number, descuentoPorcentaje?: number | null, descuentoEfectivo?: number | null): number {
    let subtotal = cantidad * precioUnitario;
    if (descuentoPorcentaje) {
      subtotal -= subtotal * (descuentoPorcentaje / 100);
    }
    if (descuentoEfectivo) {
      subtotal -= descuentoEfectivo;
    }
    return Math.max(0, subtotal);
  }

  // Recalcular totales de venta
  private async recalcularTotales(VentaID: number) {
    const detalles = await prisma.ventas_detalle.findMany({
      where: { VentaID, IsActive: 1 },
    });

    let subtotal = detalles.reduce((sum, d) => sum + (d.Subtotal || 0), 0);

    const venta = await prisma.ventas_encabezado.findUnique({
      where: { VentaID },
    });

    if (!venta) return;

    // Aplicar descuentos del encabezado
    if (venta.DescuentoPorcentaje) {
      subtotal -= subtotal * (venta.DescuentoPorcentaje / 100);
    }
    if (venta.DescuentoEfectivo) {
      subtotal -= venta.DescuentoEfectivo;
    }

    const iva = subtotal * IVA_PORCENTAJE;
    const total = subtotal + iva;

    await prisma.ventas_encabezado.update({
      where: { VentaID },
      data: {
        Subtotal: Math.max(0, subtotal),
        IVA: Math.max(0, iva),
        Total: Math.max(0, total),
      },
    });
  }

  // Actualizar estatus según pagos
  private async actualizarEstatusPorPagos(VentaID: number) {
    const venta = await prisma.ventas_encabezado.findUnique({
      where: { VentaID },
    });

    if (!venta || venta.Estatus === 'CANCELADA') return;

    const pagos = await prisma.ventas_pagos.findMany({
      where: { VentaID, IsActive: 1 },
    });

    const totalPagado = pagos.reduce((sum, p) => sum + (p.Monto || 0), 0);

    let nuevoEstatus: 'PENDIENTE' | 'PARCIAL' | 'PAGADA' = 'PENDIENTE';
    if (totalPagado >= (venta.Total || 0)) {
      nuevoEstatus = 'PAGADA';
    } else if (totalPagado > 0) {
      nuevoEstatus = 'PARCIAL';
    }

    if (venta.Estatus !== nuevoEstatus) {
      await prisma.ventas_encabezado.update({
        where: { VentaID },
        data: { Estatus: nuevoEstatus },
      });
    }
  }

  // Crear venta con detalles
  async create(data: CreateVentaDto) {
    // Validar cliente
    const cliente = await prisma.catalogo_clientes.findUnique({
      where: { ClienteID: data.ClienteID },
    });

    if (!cliente) {
      throw new HttpError('El cliente no existe', 404);
    }

    if (!cliente.IsActive) {
      throw new HttpError('El cliente no está activo', 300);
    }

    // Validar sucursal si se proporciona
    if (data.SucursalID) {
      const sucursal = await prisma.clientes_sucursales.findUnique({
        where: { SucursalID: data.SucursalID },
      });

      if (!sucursal) {
        throw new HttpError('La sucursal no existe', 404);
      }

      if (sucursal.ClienteID !== data.ClienteID) {
        throw new HttpError('La sucursal no pertenece al cliente', 300);
      }
    }

    // Generar número de venta
    const NumeroVenta = await this.generarNumeroVenta();

    // Crear venta con transacción
    const venta = await prisma.$transaction(async (tx) => {
      // Crear encabezado
      const ventaCreada = await tx.ventas_encabezado.create({
        data: {
          NumeroVenta,
          ClienteID: data.ClienteID,
          SucursalID: data.SucursalID || null,
          PresupuestoID: data.PresupuestoID || null,
          FechaVenta: data.FechaVenta ? new Date(data.FechaVenta) : new Date(),
          Subtotal: 0,
          DescuentoPorcentaje: data.DescuentoPorcentaje || null,
          DescuentoEfectivo: data.DescuentoEfectivo || null,
          IVA: 0,
          Total: 0,
          Estatus: 'PENDIENTE',
          Observaciones: data.Observaciones || null,
          UsuarioID: data.UsuarioID,
          IsActive: 1,
        },
      });

      // Crear detalles
      for (const detalle of data.detalles) {
        const subtotal = this.calcularSubtotalDetalle(
          detalle.Cantidad,
          detalle.PrecioUnitario,
          detalle.DescuentoPorcentaje,
          detalle.DescuentoEfectivo
        );

        // Calcular fecha fin garantía si aplica
        let fechaFinGarantia = null;
        if (detalle.MesesGarantia) {
          fechaFinGarantia = new Date();
          fechaFinGarantia.setMonth(fechaFinGarantia.getMonth() + detalle.MesesGarantia);
        }

        await tx.ventas_detalle.create({
          data: {
            VentaID: ventaCreada.VentaID,
            TipoItem: detalle.TipoItem,
            EquipoID: detalle.EquipoID || null,
            PlantillaEquipoID: detalle.PlantillaEquipoID || null,
            RefaccionID: detalle.RefaccionID || null,
            PresupuestoDetalleID: detalle.PresupuestoDetalleID || null,
            Descripcion: detalle.Descripcion || null,
            Cantidad: detalle.Cantidad,
            PrecioUnitario: detalle.PrecioUnitario,
            DescuentoPorcentaje: detalle.DescuentoPorcentaje || null,
            DescuentoEfectivo: detalle.DescuentoEfectivo || null,
            Subtotal: subtotal,
            NumeroSerie: detalle.NumeroSerie || null,
            MesesGarantia: detalle.MesesGarantia || 12,
            FechaFinGarantia: fechaFinGarantia,
            IsActive: 1,
          },
        });
      }

      return ventaCreada;
    });

    // Recalcular totales
    await this.recalcularTotales(venta.VentaID);

    return this.findOne(venta.VentaID);
  }

  // Obtener todas las ventas
  async findAll(query?: VentasQueryDto) {
    const where: any = { IsActive: 1 };

    if (query?.estatus) {
      where.Estatus = query.estatus;
    }

    if (query?.fechaDesde) {
      where.FechaVenta = { ...where.FechaVenta, gte: new Date(query.fechaDesde) };
    }

    if (query?.fechaHasta) {
      where.FechaVenta = { ...where.FechaVenta, lte: new Date(query.fechaHasta) };
    }

    const ventas = await prisma.ventas_encabezado.findMany({
      where,
      orderBy: { VentaID: 'desc' },
      include: {
        cliente: {
          select: { ClienteID: true, NombreComercio: true },
        },
        sucursal: {
          select: { SucursalID: true, NombreSucursal: true },
        },
        _count: {
          select: { detalles: true, pagos: true },
        },
      },
    });

    return { message: 'Ventas obtenidas', data: ventas };
  }

  // Obtener ventas por cliente
  async findByCliente(ClienteID: number, query?: VentasQueryDto) {
    const where: any = { ClienteID, IsActive: 1 };

    if (query?.estatus) {
      where.Estatus = query.estatus;
    }

    const ventas = await prisma.ventas_encabezado.findMany({
      where,
      orderBy: { VentaID: 'desc' },
      include: {
        cliente: {
          select: { ClienteID: true, NombreComercio: true },
        },
        sucursal: {
          select: { SucursalID: true, NombreSucursal: true },
        },
        _count: {
          select: { detalles: true, pagos: true },
        },
      },
    });

    return { message: 'Ventas del cliente obtenidas', data: ventas };
  }

  // Obtener una venta por ID
  async findOne(VentaID: number) {
    const venta = await prisma.ventas_encabezado.findUnique({
      where: { VentaID },
      include: {
        cliente: {
          select: { ClienteID: true, NombreComercio: true, Observaciones: true },
        },
        sucursal: {
          select: { SucursalID: true, NombreSucursal: true, Direccion: true, Telefono: true },
        },
        presupuesto: {
          select: { PresupuestoID: true, Estatus: true },
        },
        detalles: {
          where: { IsActive: 1 },
          include: {
            equipo: {
              select: {
                EquipoID: true,
                NumeroSerie: true,
                plantilla: { select: { NombreEquipo: true, Codigo: true } },
              },
            },
            plantilla: {
              select: { PlantillaEquipoID: true, NombreEquipo: true, Codigo: true },
            },
            refaccion: {
              select: { RefaccionID: true, NombrePieza: true, NombreCorto: true },
            },
          },
        },
        pagos: {
          where: { IsActive: 1 },
          orderBy: { FechaPago: 'desc' },
        },
      },
    });

    if (!venta) {
      throw new HttpError('Venta no encontrada', 404);
    }

    // Calcular total pagado y saldo pendiente
    const totalPagado = venta.pagos.reduce((sum, p) => sum + (p.Monto || 0), 0);
    const saldoPendiente = (venta.Total || 0) - totalPagado;

    return {
      message: 'Venta obtenida',
      data: {
        ...venta,
        TotalPagado: totalPagado,
        SaldoPendiente: Math.max(0, saldoPendiente),
      },
    };
  }

  // Actualizar encabezado de venta
  async update(VentaID: number, data: UpdateVentaDto) {
    const venta = await prisma.ventas_encabezado.findUnique({
      where: { VentaID },
    });

    if (!venta) {
      throw new HttpError('Venta no encontrada', 404);
    }

    if (venta.Estatus === 'CANCELADA') {
      throw new HttpError('No se puede editar una venta cancelada', 300);
    }

    if (venta.Estatus === 'PAGADA') {
      throw new HttpError('No se puede editar una venta pagada', 300);
    }

    await prisma.ventas_encabezado.update({
      where: { VentaID },
      data: {
        SucursalID: data.SucursalID !== undefined ? data.SucursalID : undefined,
        FechaVenta: data.FechaVenta ? new Date(data.FechaVenta) : undefined,
        Observaciones: data.Observaciones !== undefined ? data.Observaciones : undefined,
        DescuentoPorcentaje: data.DescuentoPorcentaje !== undefined ? data.DescuentoPorcentaje : undefined,
        DescuentoEfectivo: data.DescuentoEfectivo !== undefined ? data.DescuentoEfectivo : undefined,
      },
    });

    // Recalcular totales
    await this.recalcularTotales(VentaID);

    return this.findOne(VentaID);
  }

  // Cambiar estatus
  async updateEstatus(VentaID: number, data: UpdateEstatusVentaDto) {
    const venta = await prisma.ventas_encabezado.findUnique({
      where: { VentaID },
    });

    if (!venta) {
      throw new HttpError('Venta no encontrada', 404);
    }

    await prisma.ventas_encabezado.update({
      where: { VentaID },
      data: { Estatus: data.Estatus },
    });

    return this.findOne(VentaID);
  }

  // Agregar detalle a venta existente
  async addDetalle(VentaID: number, data: AddDetalleVentaDto) {
    const venta = await prisma.ventas_encabezado.findUnique({
      where: { VentaID },
    });

    if (!venta) {
      throw new HttpError('Venta no encontrada', 404);
    }

    if (venta.Estatus === 'CANCELADA') {
      throw new HttpError('No se pueden agregar items a una venta cancelada', 300);
    }

    if (venta.Estatus === 'PAGADA') {
      throw new HttpError('No se pueden agregar items a una venta pagada', 300);
    }

    const subtotal = this.calcularSubtotalDetalle(
      data.Cantidad,
      data.PrecioUnitario,
      data.DescuentoPorcentaje,
      data.DescuentoEfectivo
    );

    let fechaFinGarantia = null;
    if (data.MesesGarantia) {
      fechaFinGarantia = new Date();
      fechaFinGarantia.setMonth(fechaFinGarantia.getMonth() + data.MesesGarantia);
    }

    await prisma.ventas_detalle.create({
      data: {
        VentaID,
        TipoItem: data.TipoItem,
        EquipoID: data.EquipoID || null,
        PlantillaEquipoID: data.PlantillaEquipoID || null,
        RefaccionID: data.RefaccionID || null,
        PresupuestoDetalleID: data.PresupuestoDetalleID || null,
        Descripcion: data.Descripcion || null,
        Cantidad: data.Cantidad,
        PrecioUnitario: data.PrecioUnitario,
        DescuentoPorcentaje: data.DescuentoPorcentaje || null,
        DescuentoEfectivo: data.DescuentoEfectivo || null,
        Subtotal: subtotal,
        NumeroSerie: data.NumeroSerie || null,
        MesesGarantia: data.MesesGarantia || 12,
        FechaFinGarantia: fechaFinGarantia,
        IsActive: 1,
      },
    });

    await this.recalcularTotales(VentaID);

    return this.findOne(VentaID);
  }

  // Actualizar detalle
  async updateDetalle(VentaDetalleID: number, data: UpdateDetalleVentaDto) {
    const detalle = await prisma.ventas_detalle.findUnique({
      where: { VentaDetalleID },
      include: { venta: true },
    });

    if (!detalle) {
      throw new HttpError('Detalle no encontrado', 404);
    }

    if (detalle.venta?.Estatus === 'CANCELADA') {
      throw new HttpError('No se puede editar una venta cancelada', 300);
    }

    if (detalle.venta?.Estatus === 'PAGADA') {
      throw new HttpError('No se puede editar una venta pagada', 300);
    }

    const cantidad = data.Cantidad ?? detalle.Cantidad;
    const precioUnitario = data.PrecioUnitario ?? detalle.PrecioUnitario ?? 0;
    const descuentoPorcentaje = data.DescuentoPorcentaje !== undefined ? data.DescuentoPorcentaje : detalle.DescuentoPorcentaje;
    const descuentoEfectivo = data.DescuentoEfectivo !== undefined ? data.DescuentoEfectivo : detalle.DescuentoEfectivo;

    const subtotal = this.calcularSubtotalDetalle(cantidad, precioUnitario, descuentoPorcentaje, descuentoEfectivo);

    let fechaFinGarantia = detalle.FechaFinGarantia;
    if (data.MesesGarantia !== undefined) {
      if (data.MesesGarantia) {
        fechaFinGarantia = new Date();
        fechaFinGarantia.setMonth(fechaFinGarantia.getMonth() + data.MesesGarantia);
      } else {
        fechaFinGarantia = null;
      }
    }

    await prisma.ventas_detalle.update({
      where: { VentaDetalleID },
      data: {
        Cantidad: cantidad,
        PrecioUnitario: precioUnitario,
        DescuentoPorcentaje: descuentoPorcentaje,
        DescuentoEfectivo: descuentoEfectivo,
        Subtotal: subtotal,
        Descripcion: data.Descripcion !== undefined ? data.Descripcion : undefined,
        MesesGarantia: data.MesesGarantia !== undefined ? data.MesesGarantia : undefined,
        FechaFinGarantia: fechaFinGarantia,
      },
    });

    await this.recalcularTotales(detalle.VentaID);

    return this.findOne(detalle.VentaID);
  }

  // Eliminar detalle (soft delete)
  async removeDetalle(VentaDetalleID: number) {
    const detalle = await prisma.ventas_detalle.findUnique({
      where: { VentaDetalleID },
      include: { venta: true },
    });

    if (!detalle) {
      throw new HttpError('Detalle no encontrado', 404);
    }

    if (detalle.venta?.Estatus === 'CANCELADA') {
      throw new HttpError('No se puede eliminar de una venta cancelada', 300);
    }

    if (detalle.venta?.Estatus === 'PAGADA') {
      throw new HttpError('No se puede eliminar de una venta pagada', 300);
    }

    await prisma.ventas_detalle.update({
      where: { VentaDetalleID },
      data: { IsActive: 0 },
    });

    await this.recalcularTotales(detalle.VentaID);

    return { message: 'Item eliminado de la venta', data: { VentaDetalleID } };
  }

  // Registrar pago
  async addPago(VentaID: number, data: CreatePagoDto) {
    const venta = await prisma.ventas_encabezado.findUnique({
      where: { VentaID },
    });

    if (!venta) {
      throw new HttpError('Venta no encontrada', 404);
    }

    if (venta.Estatus === 'CANCELADA') {
      throw new HttpError('No se puede pagar una venta cancelada', 300);
    }

    // Validar método de pago
    const metodoPago = await prisma.catalogo_metodos_pago.findUnique({
      where: { MetodosDePagoID: data.MetodoPagoID },
    });

    if (!metodoPago) {
      throw new HttpError('El método de pago no existe', 404);
    }

    await prisma.ventas_pagos.create({
      data: {
        VentaID,
        MetodoPagoID: data.MetodoPagoID,
        Monto: data.Monto,
        FechaPago: new Date(data.FechaPago),
        Referencia: data.Referencia || null,
        Observaciones: data.Observaciones || null,
        UsuarioID: data.UsuarioID,
        IsActive: 1,
      },
    });

    // Actualizar estatus según pagos
    await this.actualizarEstatusPorPagos(VentaID);

    return this.findOne(VentaID);
  }

  // Eliminar pago (soft delete)
  async removePago(VentaPagoID: number) {
    const pago = await prisma.ventas_pagos.findUnique({
      where: { VentaPagoID },
      include: { venta: true },
    });

    if (!pago) {
      throw new HttpError('Pago no encontrado', 404);
    }

    await prisma.ventas_pagos.update({
      where: { VentaPagoID },
      data: { IsActive: 0 },
    });

    // Actualizar estatus según pagos
    await this.actualizarEstatusPorPagos(pago.VentaID);

    return { message: 'Pago eliminado', data: { VentaPagoID } };
  }

  // Dar de baja venta (soft delete)
  async baja(VentaID: number) {
    const venta = await prisma.ventas_encabezado.findUnique({
      where: { VentaID },
    });

    if (!venta) {
      throw new HttpError('Venta no encontrada', 404);
    }

    if (venta.IsActive === 0) {
      throw new HttpError('La venta ya está dada de baja', 300);
    }

    const updated = await prisma.ventas_encabezado.update({
      where: { VentaID },
      data: { IsActive: 0 },
    });

    return { message: 'Venta dada de baja', data: updated };
  }

  // Activar venta
  async activar(VentaID: number) {
    const venta = await prisma.ventas_encabezado.findUnique({
      where: { VentaID },
    });

    if (!venta) {
      throw new HttpError('Venta no encontrada', 404);
    }

    if (venta.IsActive === 1) {
      throw new HttpError('La venta ya está activa', 300);
    }

    const updated = await prisma.ventas_encabezado.update({
      where: { VentaID },
      data: { IsActive: 1 },
    });

    return { message: 'Venta activada', data: updated };
  }
}

export const ventasService = new VentasService();
