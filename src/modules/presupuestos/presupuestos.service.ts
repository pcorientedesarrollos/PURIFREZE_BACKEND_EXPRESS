import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import {
  CreatePresupuestoDto,
  UpdatePresupuestoDto,
  UpdateEstatusDto,
  AddDetalleDto,
  UpdateDetalleDto,
  CreateDetalleDto,
} from './presupuestos.schema';

const IVA_PORCENTAJE = 0.16;

class PresupuestosService {
  // Calcular subtotal de un detalle
  private calcularSubtotalDetalle(detalle: CreateDetalleDto): number {
    const base = detalle.PrecioUnitario * detalle.Cantidad;
    let subtotal = base;

    // Aplicar periodo de renta si existe
    if (detalle.PeriodoRenta && detalle.PeriodoRenta > 0) {
      subtotal = base * detalle.PeriodoRenta;
    }

    // Aplicar descuentos
    if (detalle.DescuentoPorcentaje && detalle.DescuentoPorcentaje > 0) {
      subtotal = subtotal - (subtotal * detalle.DescuentoPorcentaje / 100);
    }
    if (detalle.DescuentoEfectivo && detalle.DescuentoEfectivo > 0) {
      subtotal = subtotal - detalle.DescuentoEfectivo;
    }

    return Math.max(0, subtotal);
  }

  // Calcular totales del presupuesto
  private calcularTotales(
    detalles: { Subtotal: number }[],
    descuentoPorcentaje?: number | null,
    descuentoEfectivo?: number | null,
    gastosAdicionales?: number | null
  ) {
    let subtotal = detalles.reduce((sum, d) => sum + (d.Subtotal || 0), 0);

    // Aplicar descuentos globales
    if (descuentoPorcentaje && descuentoPorcentaje > 0) {
      subtotal = subtotal - (subtotal * descuentoPorcentaje / 100);
    }
    if (descuentoEfectivo && descuentoEfectivo > 0) {
      subtotal = subtotal - descuentoEfectivo;
    }

    // Agregar gastos adicionales
    if (gastosAdicionales && gastosAdicionales > 0) {
      subtotal = subtotal + gastosAdicionales;
    }

    const iva = subtotal * IVA_PORCENTAJE;
    const total = subtotal + iva;

    return {
      Subtotal: Math.max(0, subtotal),
      IVA: Math.max(0, iva),
      Total: Math.max(0, total),
    };
  }

  // Obtener precio automático según tipo de item
  async obtenerPrecioAutomatico(detalle: CreateDetalleDto): Promise<number> {
    if (detalle.TipoItem === 'REFACCION' && detalle.RefaccionID) {
      const refaccion = await prisma.catalogo_refacciones.findUnique({
        where: { RefaccionID: detalle.RefaccionID },
        select: { PrecioVenta: true },
      });
      return refaccion?.PrecioVenta || 0;
    }

    if ((detalle.TipoItem === 'EQUIPO_PURIFREEZE' || detalle.TipoItem === 'EQUIPO_EXTERNO') && detalle.PlantillaEquipoID) {
      const plantilla = await prisma.plantillas_equipo.findUnique({
        where: { PlantillaEquipoID: detalle.PlantillaEquipoID },
        include: {
          detalles: {
            where: { IsActive: 1 },
            include: {
              refaccion: {
                select: { CostoPromedio: true },
              },
            },
          },
        },
      });

      if (!plantilla) return 0;

      // Calcular costo total del equipo
      const costoTotal = plantilla.detalles.reduce((sum, d) => {
        return sum + ((d.refaccion.CostoPromedio || 0) * d.Cantidad);
      }, 0);

      // Aplicar porcentaje según modalidad
      if (detalle.Modalidad === 'VENTA') {
        return costoTotal * (1 + (plantilla.PorcentajeVenta / 100));
      } else if (detalle.Modalidad === 'RENTA') {
        return costoTotal * (plantilla.PorcentajeRenta / 100);
      } else if (detalle.Modalidad === 'MANTENIMIENTO') {
        // Para mantenimiento, usar un porcentaje base (ej: 20% del costo)
        return costoTotal * 0.20;
      }
    }

    return detalle.PrecioUnitario || 0;
  }

  async create(data: CreatePresupuestoDto) {
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

      if (!sucursal.IsActive) {
        throw new HttpError('La sucursal no está activa', 300);
      }
    }

    // Procesar detalles y calcular precios
    const detallesProcesados = await Promise.all(
      data.detalles.map(async (detalle) => {
        // Validar referencias según tipo
        if (detalle.TipoItem === 'REFACCION' && detalle.RefaccionID) {
          const refaccion = await prisma.catalogo_refacciones.findUnique({
            where: { RefaccionID: detalle.RefaccionID },
          });
          if (!refaccion || !refaccion.IsActive) {
            throw new HttpError(`La refacción ${detalle.RefaccionID} no existe o no está activa`, 404);
          }
        }

        if ((detalle.TipoItem === 'EQUIPO_PURIFREEZE' || detalle.TipoItem === 'EQUIPO_EXTERNO') && detalle.PlantillaEquipoID) {
          const plantilla = await prisma.plantillas_equipo.findUnique({
            where: { PlantillaEquipoID: detalle.PlantillaEquipoID },
          });
          if (!plantilla || plantilla.IsActive !== 1) {
            throw new HttpError(`La plantilla ${detalle.PlantillaEquipoID} no existe o no está activa`, 404);
          }

          // Validar que tipo de plantilla coincida
          if (detalle.TipoItem === 'EQUIPO_PURIFREEZE' && plantilla.EsExterno === 1) {
            throw new HttpError('La plantilla es de tipo externo, use EQUIPO_EXTERNO', 300);
          }
          if (detalle.TipoItem === 'EQUIPO_EXTERNO' && plantilla.EsExterno === 0) {
            throw new HttpError('La plantilla es de tipo Purifreeze, use EQUIPO_PURIFREEZE', 300);
          }
        }

        // Obtener precio automático si no se proporciona
        const precioUnitario = detalle.PrecioUnitario > 0
          ? detalle.PrecioUnitario
          : await this.obtenerPrecioAutomatico(detalle);

        const detalleConPrecio = { ...detalle, PrecioUnitario: precioUnitario };
        const subtotal = this.calcularSubtotalDetalle(detalleConPrecio);

        return {
          ...detalleConPrecio,
          Subtotal: subtotal,
        };
      })
    );

    // Calcular totales
    const totales = this.calcularTotales(
      detallesProcesados,
      data.DescuentoPorcentaje,
      data.DescuentoEfectivo,
      data.GastosAdicionales
    );

    // Crear presupuesto con transacción
    const presupuesto = await prisma.$transaction(async (tx) => {
      const encabezado = await tx.presupuestos_encabezado.create({
        data: {
          ClienteID: data.ClienteID,
          SucursalID: data.SucursalID || null,
          FechaVigencia: new Date(data.FechaVigencia),
          Observaciones: data.Observaciones || null,
          UsuarioID: data.UsuarioID,
          DescuentoPorcentaje: data.DescuentoPorcentaje || null,
          DescuentoEfectivo: data.DescuentoEfectivo || null,
          GastosAdicionales: data.GastosAdicionales || null,
          Subtotal: totales.Subtotal,
          IVA: totales.IVA,
          Total: totales.Total,
          IsActive: 1,
        },
      });

      // Crear detalles
      await tx.presupuestos_detalle.createMany({
        data: detallesProcesados.map((d) => ({
          PresupuestoID: encabezado.PresupuestoID,
          TipoItem: d.TipoItem,
          Modalidad: d.Modalidad || null,
          PlantillaEquipoID: d.PlantillaEquipoID || null,
          RefaccionID: d.RefaccionID || null,
          Descripcion: d.Descripcion || null,
          Cantidad: d.Cantidad,
          PeriodoRenta: d.PeriodoRenta || null,
          PrecioUnitario: d.PrecioUnitario,
          DescuentoPorcentaje: d.DescuentoPorcentaje || null,
          DescuentoEfectivo: d.DescuentoEfectivo || null,
          Subtotal: d.Subtotal,
          IsActive: 1,
        })),
      });

      return encabezado;
    });

    // Retornar presupuesto completo
    return this.findOne(presupuesto.PresupuestoID);
  }

  async findAll() {
    const presupuestos = await prisma.presupuestos_encabezado.findMany({
      where: { IsActive: 1 },
      orderBy: { PresupuestoID: 'desc' },
      include: {
        cliente: {
          select: { ClienteID: true, NombreComercio: true },
        },
        sucursal: {
          select: { SucursalID: true, NombreSucursal: true },
        },
        _count: {
          select: { detalles: true },
        },
      },
    });

    return { message: 'Presupuestos obtenidos', data: presupuestos };
  }

  async findOne(PresupuestoID: number) {
    const presupuesto = await prisma.presupuestos_encabezado.findUnique({
      where: { PresupuestoID },
      include: {
        cliente: {
          select: { ClienteID: true, NombreComercio: true, Observaciones: true },
        },
        sucursal: {
          select: { SucursalID: true, NombreSucursal: true, Direccion: true, Telefono: true, Contacto: true },
        },
        detalles: {
          where: { IsActive: 1 },
          include: {
            plantilla: {
              select: {
                PlantillaEquipoID: true,
                Codigo: true,
                NombreEquipo: true,
                EsExterno: true,
                PorcentajeVenta: true,
                PorcentajeRenta: true,
              },
            },
            refaccion: {
              select: {
                RefaccionID: true,
                NombrePieza: true,
                NombreCorto: true,
                Codigo: true,
                PrecioVenta: true,
              },
            },
          },
        },
      },
    });

    if (!presupuesto) {
      throw new HttpError('Presupuesto no encontrado', 404);
    }

    return { message: 'Presupuesto obtenido', data: presupuesto };
  }

  async findByCliente(ClienteID: number) {
    const presupuestos = await prisma.presupuestos_encabezado.findMany({
      where: { ClienteID, IsActive: 1 },
      orderBy: { PresupuestoID: 'desc' },
      include: {
        cliente: {
          select: { ClienteID: true, NombreComercio: true },
        },
        sucursal: {
          select: { SucursalID: true, NombreSucursal: true },
        },
        _count: {
          select: { detalles: true },
        },
      },
    });

    return { message: 'Presupuestos del cliente obtenidos', data: presupuestos };
  }

  async update(PresupuestoID: number, data: UpdatePresupuestoDto) {
    const presupuesto = await prisma.presupuestos_encabezado.findUnique({
      where: { PresupuestoID },
      include: { detalles: { where: { IsActive: 1 } } },
    });

    if (!presupuesto) {
      throw new HttpError('Presupuesto no encontrado', 404);
    }

    if (presupuesto.Estatus !== 'Pendiente') {
      throw new HttpError('Solo se pueden editar presupuestos en estado Pendiente', 300);
    }

    // Validar cliente si se actualiza
    if (data.ClienteID && data.ClienteID !== presupuesto.ClienteID) {
      const cliente = await prisma.catalogo_clientes.findUnique({
        where: { ClienteID: data.ClienteID },
      });
      if (!cliente || !cliente.IsActive) {
        throw new HttpError('El cliente no existe o no está activo', 404);
      }
    }

    // Validar sucursal si se actualiza
    if (data.SucursalID) {
      const sucursal = await prisma.clientes_sucursales.findUnique({
        where: { SucursalID: data.SucursalID },
      });
      if (!sucursal || !sucursal.IsActive) {
        throw new HttpError('La sucursal no existe o no está activa', 404);
      }
      const clienteID = data.ClienteID || presupuesto.ClienteID;
      if (sucursal.ClienteID !== clienteID) {
        throw new HttpError('La sucursal no pertenece al cliente', 300);
      }
    }

    // Recalcular totales si cambian descuentos o gastos
    const detallesActuales = presupuesto.detalles.map(d => ({ Subtotal: d.Subtotal }));
    const totales = this.calcularTotales(
      detallesActuales,
      data.DescuentoPorcentaje !== undefined ? data.DescuentoPorcentaje : presupuesto.DescuentoPorcentaje,
      data.DescuentoEfectivo !== undefined ? data.DescuentoEfectivo : presupuesto.DescuentoEfectivo,
      data.GastosAdicionales !== undefined ? data.GastosAdicionales : presupuesto.GastosAdicionales
    );

    const updated = await prisma.presupuestos_encabezado.update({
      where: { PresupuestoID },
      data: {
        ...data,
        FechaVigencia: data.FechaVigencia ? new Date(data.FechaVigencia) : undefined,
        Subtotal: totales.Subtotal,
        IVA: totales.IVA,
        Total: totales.Total,
      },
    });

    return this.findOne(updated.PresupuestoID);
  }

  async updateEstatus(PresupuestoID: number, data: UpdateEstatusDto) {
    const presupuesto = await prisma.presupuestos_encabezado.findUnique({
      where: { PresupuestoID },
      include: {
        detalles: { where: { IsActive: 1 } },
      },
    });

    if (!presupuesto) {
      throw new HttpError('Presupuesto no encontrado', 404);
    }

    // Si se aprueba el presupuesto, procesar automáticamente
    if (data.Estatus === 'Aprobado' && presupuesto.Estatus !== 'Aprobado') {
      return this.aprobarPresupuesto(presupuesto);
    }

    const updated = await prisma.presupuestos_encabezado.update({
      where: { PresupuestoID },
      data: { Estatus: data.Estatus },
    });

    return { message: `Presupuesto actualizado a ${data.Estatus}`, data: updated };
  }

  // Procesar aprobación del presupuesto
  private async aprobarPresupuesto(presupuesto: any) {
    const detalles = presupuesto.detalles;

    // Separar detalles por tipo
    const equiposVenta = detalles.filter(
      (d: any) => (d.TipoItem === 'EQUIPO_PURIFREEZE' || d.TipoItem === 'EQUIPO_EXTERNO') && d.Modalidad === 'VENTA'
    );
    const equiposRenta = detalles.filter(
      (d: any) => d.TipoItem === 'EQUIPO_PURIFREEZE' && d.Modalidad === 'RENTA'
    );
    const equiposExternosMantenimiento = detalles.filter(
      (d: any) => d.TipoItem === 'EQUIPO_EXTERNO' && d.Modalidad === 'MANTENIMIENTO'
    );
    const refacciones = detalles.filter((d: any) => d.TipoItem === 'REFACCION');
    const servicios = detalles.filter((d: any) => d.TipoItem === 'SERVICIO');

    // Items para venta (equipos venta + refacciones + servicios)
    const itemsVenta = [...equiposVenta, ...refacciones, ...servicios];

    await prisma.$transaction(async (tx) => {
      // 1. Crear venta si hay items de venta
      let ventaID: number | null = null;
      if (itemsVenta.length > 0) {
        const numeroVenta = await this.generarNumeroVenta(tx);

        const venta = await tx.ventas_encabezado.create({
          data: {
            NumeroVenta: numeroVenta,
            ClienteID: presupuesto.ClienteID,
            SucursalID: presupuesto.SucursalID,
            PresupuestoID: presupuesto.PresupuestoID,
            FechaVenta: new Date(),
            Subtotal: 0,
            IVA: 0,
            Total: 0,
            Estatus: 'PENDIENTE',
            UsuarioID: presupuesto.UsuarioID,
            IsActive: 1,
          },
        });
        ventaID = venta.VentaID;

        // Crear detalles de venta
        let subtotalVenta = 0;
        for (const item of itemsVenta) {
          const subtotalItem = item.Subtotal || 0;
          subtotalVenta += subtotalItem;

          await tx.ventas_detalle.create({
            data: {
              VentaID: venta.VentaID,
              TipoItem: item.TipoItem,
              PlantillaEquipoID: item.PlantillaEquipoID,
              RefaccionID: item.RefaccionID,
              PresupuestoDetalleID: item.DetalleID,
              Descripcion: item.Descripcion,
              Cantidad: item.Cantidad,
              PrecioUnitario: item.PrecioUnitario,
              DescuentoPorcentaje: item.DescuentoPorcentaje,
              DescuentoEfectivo: item.DescuentoEfectivo,
              Subtotal: subtotalItem,
              MesesGarantia: 12,
              IsActive: 1,
            },
          });
        }

        // Actualizar totales de venta
        const ivaVenta = subtotalVenta * 0.16;
        await tx.ventas_encabezado.update({
          where: { VentaID: venta.VentaID },
          data: {
            Subtotal: subtotalVenta,
            IVA: ivaVenta,
            Total: subtotalVenta + ivaVenta,
          },
        });
      }

      // 2. Crear contrato si hay equipos en renta
      let contratoID: number | null = null;
      if (equiposRenta.length > 0) {
        const numeroContrato = await this.generarNumeroContrato(tx);

        // Calcular fecha fin (usar el mayor PeriodoRenta)
        const maxPeriodo = Math.max(...equiposRenta.map((e: any) => e.PeriodoRenta || 12));
        const fechaFin = new Date();
        fechaFin.setMonth(fechaFin.getMonth() + maxPeriodo);

        // Calcular monto total (precio mensual * meses * cantidad)
        let montoTotal = 0;
        for (const equipo of equiposRenta) {
          const periodoMeses = equipo.PeriodoRenta || 12;
          montoTotal += equipo.PrecioUnitario * equipo.Cantidad * periodoMeses;
        }

        const contrato = await tx.contratos.create({
          data: {
            NumeroContrato: numeroContrato,
            PresupuestoID: presupuesto.PresupuestoID,
            ClienteID: presupuesto.ClienteID,
            SucursalID: presupuesto.SucursalID,
            FechaInicio: new Date(),
            FechaFin: fechaFin,
            MontoTotal: montoTotal,
            Estatus: 'ACTIVO',
            Observaciones: `Generado automáticamente desde presupuesto ${presupuesto.NumeroPresupuesto}`,
            UsuarioID: presupuesto.UsuarioID,
            IsActive: 1,
          },
        });
        contratoID = contrato.ContratoID;
      }

      // 3. Crear registros en clientes_equipos
      // 3.1 Equipos en VENTA (COMPRA para el cliente)
      for (const equipo of equiposVenta) {
        if (equipo.PlantillaEquipoID) {
          for (let i = 0; i < equipo.Cantidad; i++) {
            await tx.clientes_equipos.create({
              data: {
                ClienteID: presupuesto.ClienteID,
                SucursalID: presupuesto.SucursalID,
                PlantillaEquipoID: equipo.PlantillaEquipoID,
                TipoPropiedad: 'COMPRA',
                PresupuestoDetalleID: equipo.DetalleID,
                FechaAsignacion: new Date(),
                Estatus: 'ACTIVO',
                Observaciones: `Compra desde presupuesto ${presupuesto.NumeroPresupuesto}`,
                IsActive: 1,
              },
            });
          }
        }
      }

      // 3.2 Equipos en RENTA
      for (const equipo of equiposRenta) {
        if (equipo.PlantillaEquipoID) {
          for (let i = 0; i < equipo.Cantidad; i++) {
            await tx.clientes_equipos.create({
              data: {
                ClienteID: presupuesto.ClienteID,
                SucursalID: presupuesto.SucursalID,
                PlantillaEquipoID: equipo.PlantillaEquipoID,
                TipoPropiedad: 'RENTA',
                ContratoID: contratoID,
                PresupuestoDetalleID: equipo.DetalleID,
                FechaAsignacion: new Date(),
                Estatus: 'ACTIVO',
                Observaciones: `Renta desde presupuesto ${presupuesto.NumeroPresupuesto}`,
                IsActive: 1,
              },
            });
          }
        }
      }

      // 3.3 Equipos EXTERNOS (mantenimiento)
      for (const equipo of equiposExternosMantenimiento) {
        if (equipo.PlantillaEquipoID) {
          for (let i = 0; i < equipo.Cantidad; i++) {
            await tx.clientes_equipos.create({
              data: {
                ClienteID: presupuesto.ClienteID,
                SucursalID: presupuesto.SucursalID,
                PlantillaEquipoID: equipo.PlantillaEquipoID,
                TipoPropiedad: 'EXTERNO',
                PresupuestoDetalleID: equipo.DetalleID,
                DescripcionEquipo: equipo.Descripcion,
                FechaAsignacion: new Date(),
                Estatus: 'ACTIVO',
                Observaciones: `Equipo externo para mantenimiento desde presupuesto ${presupuesto.NumeroPresupuesto}`,
                IsActive: 1,
              },
            });
          }
        }
      }

      // 4. Actualizar estatus del presupuesto
      await tx.presupuestos_encabezado.update({
        where: { PresupuestoID: presupuesto.PresupuestoID },
        data: { Estatus: 'Aprobado' },
      });
    });

    return {
      message: 'Presupuesto aprobado y procesado correctamente',
      data: {
        PresupuestoID: presupuesto.PresupuestoID,
        Estatus: 'Aprobado',
        Procesado: {
          VentasCreadas: [...equiposVenta, ...refacciones, ...servicios].length > 0,
          ContratosCreados: equiposRenta.length > 0,
          EquiposAsignados: equiposVenta.length + equiposRenta.length + equiposExternosMantenimiento.length,
        },
      },
    };
  }

  // Generar número de venta
  private async generarNumeroVenta(tx: any): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `V-${year}-`;

    const ultimaVenta = await tx.ventas_encabezado.findFirst({
      where: { NumeroVenta: { startsWith: prefix } },
      orderBy: { VentaID: 'desc' },
    });

    let siguiente = 1;
    if (ultimaVenta) {
      const partes = ultimaVenta.NumeroVenta.split('-');
      siguiente = parseInt(partes[2]) + 1;
    }

    return `${prefix}${siguiente.toString().padStart(4, '0')}`;
  }

  // Generar número de contrato
  private async generarNumeroContrato(tx: any): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `C-${year}-`;

    const ultimoContrato = await tx.contratos.findFirst({
      where: { NumeroContrato: { startsWith: prefix } },
      orderBy: { ContratoID: 'desc' },
    });

    let siguiente = 1;
    if (ultimoContrato) {
      const partes = ultimoContrato.NumeroContrato.split('-');
      siguiente = parseInt(partes[2]) + 1;
    }

    return `${prefix}${siguiente.toString().padStart(4, '0')}`;
  }

  async addDetalle(PresupuestoID: number, data: AddDetalleDto) {
    const presupuesto = await prisma.presupuestos_encabezado.findUnique({
      where: { PresupuestoID },
      include: { detalles: { where: { IsActive: 1 } } },
    });

    if (!presupuesto) {
      throw new HttpError('Presupuesto no encontrado', 404);
    }

    if (presupuesto.Estatus !== 'Pendiente') {
      throw new HttpError('Solo se pueden agregar items a presupuestos en estado Pendiente', 300);
    }

    // Obtener precio automático si no se proporciona
    const precioUnitario = data.PrecioUnitario > 0
      ? data.PrecioUnitario
      : await this.obtenerPrecioAutomatico(data);

    const detalleConPrecio = { ...data, PrecioUnitario: precioUnitario };
    const subtotalDetalle = this.calcularSubtotalDetalle(detalleConPrecio);

    // Crear detalle
    await prisma.presupuestos_detalle.create({
      data: {
        PresupuestoID,
        TipoItem: data.TipoItem,
        Modalidad: data.Modalidad || null,
        PlantillaEquipoID: data.PlantillaEquipoID || null,
        RefaccionID: data.RefaccionID || null,
        Descripcion: data.Descripcion || null,
        Cantidad: data.Cantidad,
        PeriodoRenta: data.PeriodoRenta || null,
        PrecioUnitario: precioUnitario,
        DescuentoPorcentaje: data.DescuentoPorcentaje || null,
        DescuentoEfectivo: data.DescuentoEfectivo || null,
        Subtotal: subtotalDetalle,
        IsActive: 1,
      },
    });

    // Recalcular totales
    await this.recalcularTotales(PresupuestoID);

    return this.findOne(PresupuestoID);
  }

  async updateDetalle(DetalleID: number, data: UpdateDetalleDto) {
    const detalle = await prisma.presupuestos_detalle.findUnique({
      where: { DetalleID },
      include: { presupuesto: true },
    });

    if (!detalle) {
      throw new HttpError('Detalle no encontrado', 404);
    }

    if (detalle.presupuesto.Estatus !== 'Pendiente') {
      throw new HttpError('Solo se pueden editar items de presupuestos en estado Pendiente', 300);
    }

    // Calcular nuevo subtotal
    const cantidad = data.Cantidad ?? detalle.Cantidad;
    const precioUnitario = data.PrecioUnitario ?? detalle.PrecioUnitario;
    const periodoRenta = data.PeriodoRenta !== undefined ? data.PeriodoRenta : detalle.PeriodoRenta;
    const descuentoPorcentaje = data.DescuentoPorcentaje !== undefined ? data.DescuentoPorcentaje : detalle.DescuentoPorcentaje;
    const descuentoEfectivo = data.DescuentoEfectivo !== undefined ? data.DescuentoEfectivo : detalle.DescuentoEfectivo;

    const nuevoDetalle: CreateDetalleDto = {
      TipoItem: detalle.TipoItem as any,
      Cantidad: cantidad,
      PrecioUnitario: precioUnitario,
      PeriodoRenta: periodoRenta,
      DescuentoPorcentaje: descuentoPorcentaje,
      DescuentoEfectivo: descuentoEfectivo,
    };

    const subtotal = this.calcularSubtotalDetalle(nuevoDetalle);

    await prisma.presupuestos_detalle.update({
      where: { DetalleID },
      data: {
        ...data,
        Subtotal: subtotal,
      },
    });

    // Recalcular totales del presupuesto
    await this.recalcularTotales(detalle.PresupuestoID);

    return this.findOne(detalle.PresupuestoID);
  }

  async removeDetalle(DetalleID: number) {
    const detalle = await prisma.presupuestos_detalle.findUnique({
      where: { DetalleID },
      include: { presupuesto: true },
    });

    if (!detalle) {
      throw new HttpError('Detalle no encontrado', 404);
    }

    if (detalle.presupuesto.Estatus !== 'Pendiente') {
      throw new HttpError('Solo se pueden eliminar items de presupuestos en estado Pendiente', 300);
    }

    await prisma.presupuestos_detalle.update({
      where: { DetalleID },
      data: { IsActive: 0 },
    });

    // Recalcular totales
    await this.recalcularTotales(detalle.PresupuestoID);

    return this.findOne(detalle.PresupuestoID);
  }

  private async recalcularTotales(PresupuestoID: number) {
    const presupuesto = await prisma.presupuestos_encabezado.findUnique({
      where: { PresupuestoID },
      include: { detalles: { where: { IsActive: 1 } } },
    });

    if (!presupuesto) return;

    const totales = this.calcularTotales(
      presupuesto.detalles,
      presupuesto.DescuentoPorcentaje,
      presupuesto.DescuentoEfectivo,
      presupuesto.GastosAdicionales
    );

    await prisma.presupuestos_encabezado.update({
      where: { PresupuestoID },
      data: {
        Subtotal: totales.Subtotal,
        IVA: totales.IVA,
        Total: totales.Total,
      },
    });
  }

  async baja(PresupuestoID: number) {
    const presupuesto = await prisma.presupuestos_encabezado.findUnique({
      where: { PresupuestoID },
    });

    if (!presupuesto) {
      throw new HttpError('Presupuesto no encontrado', 404);
    }

    if (presupuesto.IsActive === 0) {
      throw new HttpError('El presupuesto ya está dado de baja', 300);
    }

    const updated = await prisma.presupuestos_encabezado.update({
      where: { PresupuestoID },
      data: { IsActive: 0 },
    });

    return { message: 'Presupuesto dado de baja', data: updated };
  }

  async activar(PresupuestoID: number) {
    const presupuesto = await prisma.presupuestos_encabezado.findUnique({
      where: { PresupuestoID },
    });

    if (!presupuesto) {
      throw new HttpError('Presupuesto no encontrado', 404);
    }

    if (presupuesto.IsActive === 1) {
      throw new HttpError('El presupuesto ya está activo', 300);
    }

    const updated = await prisma.presupuestos_encabezado.update({
      where: { PresupuestoID },
      data: { IsActive: 1 },
    });

    return { message: 'Presupuesto activado', data: updated };
  }

  // Endpoint auxiliar para obtener precio de plantilla
  async getPrecioPlantilla(PlantillaEquipoID: number, modalidad: 'VENTA' | 'RENTA' | 'MANTENIMIENTO') {
    const plantilla = await prisma.plantillas_equipo.findUnique({
      where: { PlantillaEquipoID },
      include: {
        detalles: {
          where: { IsActive: 1 },
          include: {
            refaccion: {
              select: { CostoPromedio: true, NombrePieza: true },
            },
          },
        },
      },
    });

    if (!plantilla) {
      throw new HttpError('Plantilla no encontrada', 404);
    }

    const costoTotal = plantilla.detalles.reduce((sum, d) => {
      return sum + ((d.refaccion.CostoPromedio || 0) * d.Cantidad);
    }, 0);

    let precio = 0;
    if (modalidad === 'VENTA') {
      precio = costoTotal * (1 + (plantilla.PorcentajeVenta / 100));
    } else if (modalidad === 'RENTA') {
      precio = costoTotal * (plantilla.PorcentajeRenta / 100);
    } else if (modalidad === 'MANTENIMIENTO') {
      precio = costoTotal * 0.20;
    }

    return {
      message: 'Precio calculado',
      data: {
        PlantillaEquipoID: plantilla.PlantillaEquipoID,
        NombreEquipo: plantilla.NombreEquipo,
        EsExterno: plantilla.EsExterno,
        CostoTotal: costoTotal,
        Modalidad: modalidad,
        PorcentajeAplicado: modalidad === 'VENTA' ? plantilla.PorcentajeVenta : modalidad === 'RENTA' ? plantilla.PorcentajeRenta : 20,
        PrecioCalculado: precio,
      },
    };
  }
}

export const presupuestosService = new PresupuestosService();
