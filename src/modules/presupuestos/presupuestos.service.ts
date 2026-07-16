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
import { equiposService } from '../equipos/equipos.service';

const IVA_PORCENTAJE = 0.16;

class PresupuestosService {
  // Calcular subtotal de un detalle
  // Nota: El PeriodoRenta es solo informativo (cuántos meses renta el cliente)
  // El precio en el presupuesto es MENSUAL, no se multiplica por el período
  private calcularSubtotalDetalle(detalle: CreateDetalleDto): number {
    const base = detalle.PrecioUnitario * detalle.Cantidad;
    let subtotal = base;

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
    gastosAdicionales?: number | null,
    aplicaIVA: boolean = true
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

    const iva = aplicaIVA ? subtotal * IVA_PORCENTAJE : 0;
    const total = subtotal + iva;

    return {
      Subtotal: Math.max(0, subtotal),
      IVA: Math.max(0, iva),
      Total: Math.max(0, total),
    };
  }

  // Obtener precio automático según tipo de item
  async obtenerPrecioAutomatico(detalle: CreateDetalleDto): Promise<number> {
    // Si es servicio del catálogo, obtener precio del catálogo
    if (detalle.TipoItem === 'SERVICIO' && detalle.ServicioAdicionalID) {
      const servicioAdicional = await prisma.catalogo_servicios_adicionales.findUnique({
        where: { ServicioAdicionalID: detalle.ServicioAdicionalID },
        select: { Costo: true },
      });
      return servicioAdicional?.Costo || 0;
    }

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
        // Si la plantilla tiene PrecioRenta fijo, usarlo directamente
        if (plantilla.PrecioRenta && plantilla.PrecioRenta > 0) {
          return plantilla.PrecioRenta;
        }
        // Si no, calcular con el porcentaje
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
        // Validar campos requeridos según tipo de item
        if (detalle.TipoItem === 'EQUIPO_PURIFREEZE' || detalle.TipoItem === 'EQUIPO_EXTERNO') {
          if (!detalle.PlantillaEquipoID) {
            throw new HttpError(`PlantillaEquipoID es requerido para ${detalle.TipoItem}`, 400);
          }
          if (!detalle.Modalidad) {
            throw new HttpError(`Modalidad es requerida para ${detalle.TipoItem}`, 400);
          }
        }
        if (detalle.TipoItem === 'REFACCION' && !detalle.RefaccionID) {
          throw new HttpError('RefaccionID es requerido para REFACCION', 400);
        }
        if (detalle.TipoItem === 'SERVICIO' && (!detalle.PrecioUnitario || detalle.PrecioUnitario <= 0) && !detalle.ServicioAdicionalID) {
          throw new HttpError('PrecioUnitario > 0 o ServicioAdicionalID es requerido para SERVICIO', 400);
        }

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
    const aplicaIVA = data.aplicaIVA !== false; // true por defecto
    const totales = this.calcularTotales(
      detallesProcesados,
      data.DescuentoPorcentaje,
      data.DescuentoEfectivo,
      data.GastosAdicionales,
      aplicaIVA
    );

    // Crear presupuesto con transacción
    const presupuesto = await prisma.$transaction(async (tx) => {
      // Generar número de presupuesto
      const numeroPresupuesto = await this.generarNumeroPresupuesto(tx);

      const encabezado = await tx.presupuestos_encabezado.create({
        data: {
          NumeroPresupuesto: numeroPresupuesto,
          ClienteID: data.ClienteID,
          SucursalID: data.SucursalID || null,
          FechaVigencia: new Date(data.FechaVigencia),
          Observaciones: data.Observaciones || null,
          UsuarioID: data.UsuarioID,
          DescuentoPorcentaje: data.DescuentoPorcentaje || null,
          DescuentoEfectivo: data.DescuentoEfectivo || null,
          GastosAdicionales: data.GastosAdicionales || null,
          aplicaIVA: aplicaIVA ? 1 : 0,
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
          ServicioAdicionalID: d.ServicioAdicionalID || null,
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

    // Calcular vencimiento dinámicamente
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const presupuestosConVencimiento = presupuestos.map(p => {
      // Si está Pendiente y la fecha de vigencia pasó, mostrar como Vencido
      if (p.Estatus === 'Pendiente' && new Date(p.FechaVigencia) < hoy) {
        return { ...p, Estatus: 'Vencido' as const };
      }
      return p;
    });

    return { message: 'Presupuestos obtenidos', data: presupuestosConVencimiento };
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
            servicio_adicional: {
              select: {
                ServicioAdicionalID: true,
                Nombre: true,
                Costo: true,
              },
            },
          },
        },
      },
    });

    if (!presupuesto) {
      throw new HttpError('Presupuesto no encontrado', 404);
    }

    // Calcular vencimiento dinámicamente
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    let estatusFinal = presupuesto.Estatus;
    if (presupuesto.Estatus === 'Pendiente' && new Date(presupuesto.FechaVigencia) < hoy) {
      estatusFinal = 'Vencido';
    }

    return { message: 'Presupuesto obtenido', data: { ...presupuesto, Estatus: estatusFinal } };
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

    // Calcular vencimiento dinámicamente
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const presupuestosConVencimiento = presupuestos.map(p => {
      if (p.Estatus === 'Pendiente' && new Date(p.FechaVigencia) < hoy) {
        return { ...p, Estatus: 'Vencido' as const };
      }
      return p;
    });

    return { message: 'Presupuestos del cliente obtenidos', data: presupuestosConVencimiento };
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
    const aplicaIVAUpdate = data.aplicaIVA !== undefined ? data.aplicaIVA : presupuesto.aplicaIVA !== 0;
    const detallesActuales = presupuesto.detalles.map(d => ({ Subtotal: d.Subtotal }));
    const totales = this.calcularTotales(
      detallesActuales,
      data.DescuentoPorcentaje !== undefined ? data.DescuentoPorcentaje : presupuesto.DescuentoPorcentaje,
      data.DescuentoEfectivo !== undefined ? data.DescuentoEfectivo : presupuesto.DescuentoEfectivo,
      data.GastosAdicionales !== undefined ? data.GastosAdicionales : presupuesto.GastosAdicionales,
      aplicaIVAUpdate
    );

    const { aplicaIVA: _aplicaIVA, ...dataRest } = data;
    const updated = await prisma.presupuestos_encabezado.update({
      where: { PresupuestoID },
      data: {
        ...dataRest,
        FechaVigencia: data.FechaVigencia ? new Date(data.FechaVigencia) : undefined,
        aplicaIVA: aplicaIVAUpdate ? 1 : 0,
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

    // Servicios adicionales del catálogo (para generar cobros en RENTA)
    const serviciosAdicionalesDelCatalogo = servicios.filter(
      (d: any) => d.ServicioAdicionalID !== null && d.ServicioAdicionalID !== undefined
    );

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

        // Calcular monto mensual (precio mensual * cantidad)
        // El contrato mantiene el precio mensual, no se multiplica por período
        let montoMensual = 0;
        for (const equipo of equiposRenta) {
          montoMensual += equipo.PrecioUnitario * equipo.Cantidad;
        }

        const contrato = await tx.contratos.create({
          data: {
            NumeroContrato: numeroContrato,
            PresupuestoID: presupuesto.PresupuestoID,
            ClienteID: presupuesto.ClienteID,
            SucursalID: presupuesto.SucursalID,
            FechaInicio: new Date(),
            FechaFin: fechaFin,
            MontoTotal: montoMensual, // Es el monto mensual (no multiplicado por período)
            Estatus: 'ACTIVO', // Se activa automáticamente al aprobar presupuesto
            Observaciones: `Generado automáticamente desde presupuesto #${presupuesto.PresupuestoID}`,
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
          // Verificar si es equipo Purifreeze (interno) para crear equipo físico
          const plantilla = await tx.plantillas_equipo.findUnique({
            where: { PlantillaEquipoID: equipo.PlantillaEquipoID },
            select: { EsExterno: true, NombreEquipo: true },
          });

          const esPurifreeze = plantilla?.EsExterno === 0;

          for (let i = 0; i < equipo.Cantidad; i++) {
            let equipoID: number | null = null;

            // Si es Purifreeze, crear equipo físico automáticamente
            if (esPurifreeze) {
              equipoID = await equiposService.crearEquipoEnTransaccion(
                tx,
                equipo.PlantillaEquipoID,
                presupuesto.UsuarioID,
                `Creado automáticamente - Venta desde presupuesto`
              );
            }

            await tx.clientes_equipos.create({
              data: {
                ClienteID: presupuesto.ClienteID,
                SucursalID: presupuesto.SucursalID,
                PlantillaEquipoID: equipo.PlantillaEquipoID,
                EquipoID: equipoID, // Asignar equipo físico si es Purifreeze
                TipoPropiedad: 'COMPRA',
                PresupuestoDetalleID: equipo.DetalleID,
                FechaAsignacion: new Date(),
                Estatus: equipoID ? 'PENDIENTE_INSTALACION' : 'ACTIVO',
                Observaciones: `Compra desde presupuesto - ${esPurifreeze ? 'Equipo físico creado automáticamente' : 'Equipo externo'}`,
                IsActive: 1,
              },
            });
          }
        }
      }

      // 3.2 Equipos en RENTA (siempre son Purifreeze internos)
      for (const equipo of equiposRenta) {
        if (equipo.PlantillaEquipoID) {
          for (let i = 0; i < equipo.Cantidad; i++) {
            // Crear equipo físico automáticamente (renta siempre es Purifreeze)
            const equipoID = await equiposService.crearEquipoEnTransaccion(
              tx,
              equipo.PlantillaEquipoID,
              presupuesto.UsuarioID,
              `Creado automáticamente - Renta desde presupuesto`
            );

            // Crear registro en clientes_equipos
            const clienteEquipo = await tx.clientes_equipos.create({
              data: {
                ClienteID: presupuesto.ClienteID,
                SucursalID: presupuesto.SucursalID,
                PlantillaEquipoID: equipo.PlantillaEquipoID,
                EquipoID: equipoID,
                TipoPropiedad: 'RENTA',
                ContratoID: contratoID,
                PresupuestoDetalleID: equipo.DetalleID,
                Modalidad: 'RENTA',
                PrecioUnitario: equipo.PrecioUnitario,
                PeriodoMeses: equipo.PeriodoRenta || 12,
                FechaAsignacion: new Date(),
                Estatus: 'PENDIENTE_INSTALACION',
                Observaciones: `Renta desde presupuesto - Equipo físico creado automáticamente`,
                IsActive: 1,
              },
            });

            // Crear registro en contratos_equipos
            if (contratoID) {
              await tx.contratos_equipos.create({
                data: {
                  ContratoID: contratoID,
                  EquipoID: equipoID,
                  PlantillaEquipoID: equipo.PlantillaEquipoID,
                  Modalidad: 'RENTA',
                  PrecioUnitario: equipo.PrecioUnitario,
                  PeriodoMeses: equipo.PeriodoRenta || 12,
                  TipoItem: 'EQUIPO_PURIFREEZE',
                  CantidadRequerida: 1,
                  CantidadAsignada: 1,
                  Estatus: 'PENDIENTE',
                  Observaciones: `Equipo creado automáticamente desde presupuesto`,
                  IsActive: 1,
                },
              });
            }
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
                Observaciones: `Equipo externo para mantenimiento desde presupuesto #${presupuesto.PresupuestoID}`,
                IsActive: 1,
              },
            });
          }
        }
      }

      // 4. CREAR COBROS
      // =============================================
      let cobrosServiciosCreados = 0;
      let cobroVentaCreado = false;

      // 4.1 Si hay RENTA Y servicios adicionales del catálogo → crear cobro por cada servicio
      if (contratoID && serviciosAdicionalesDelCatalogo.length > 0) {
        for (const servicio of serviciosAdicionalesDelCatalogo) {
          const numeroCobro = `SA-${presupuesto.PresupuestoID}-${servicio.DetalleID}`;

          await tx.cobros.create({
            data: {
              ContratoID: contratoID,
              PresupuestoID: presupuesto.PresupuestoID,
              NumeroCobro: numeroCobro,
              NumeroPeriodo: 1,
              FechaVencimiento: new Date(),
              MontoOriginal: servicio.Subtotal || 0,
              MontoFinal: servicio.Subtotal || 0,
              Estatus: 'PENDIENTE',
              Observaciones: `Servicio adicional: ${servicio.Descripcion || 'Servicio'} (generado al aprobar presupuesto)`,
              UsuarioCreadorID: presupuesto.UsuarioID,
              IsActive: 1,
            },
          });

          // Registrar en historial
          const cobroCreado = await tx.cobros.findFirst({
            where: { NumeroCobro: numeroCobro },
            orderBy: { CobroID: 'desc' },
          });

          if (cobroCreado) {
            await tx.cobros_historial.create({
              data: {
                CobroID: cobroCreado.CobroID,
                TipoAccion: 'CREACION',
                Descripcion: `Cobro por servicio adicional generado automáticamente desde presupuesto #${presupuesto.PresupuestoID}`,
                UsuarioID: presupuesto.UsuarioID,
              },
            });
          }

          cobrosServiciosCreados++;
        }
      }

      // 4.2 Si hay VENTA → crear cobro pendiente por el total de la venta
      if (ventaID) {
        // Obtener totales de la venta recién creada
        const ventaCreada = await tx.ventas_encabezado.findUnique({
          where: { VentaID: ventaID },
        });

        if (ventaCreada && ventaCreada.Total > 0) {
          const numeroCobroVenta = `CV-${presupuesto.PresupuestoID}-${ventaID}`;

          await tx.cobros.create({
            data: {
              VentaID: ventaID,
              PresupuestoID: presupuesto.PresupuestoID,
              NumeroCobro: numeroCobroVenta,
              NumeroPeriodo: 1,
              FechaVencimiento: new Date(),
              MontoOriginal: ventaCreada.Total,
              MontoFinal: ventaCreada.Total,
              Estatus: 'PENDIENTE',
              Observaciones: `Cobro por venta (generado al aprobar presupuesto #${presupuesto.PresupuestoID})`,
              UsuarioCreadorID: presupuesto.UsuarioID,
              IsActive: 1,
            },
          });

          // Registrar en historial
          const cobroVenta = await tx.cobros.findFirst({
            where: { NumeroCobro: numeroCobroVenta },
            orderBy: { CobroID: 'desc' },
          });

          if (cobroVenta) {
            await tx.cobros_historial.create({
              data: {
                CobroID: cobroVenta.CobroID,
                TipoAccion: 'CREACION',
                Descripcion: `Cobro por venta generado automáticamente desde presupuesto #${presupuesto.PresupuestoID} - Total: $${ventaCreada.Total.toFixed(2)}`,
                UsuarioID: presupuesto.UsuarioID,
              },
            });
          }

          cobroVentaCreado = true;
        }
      }

      // 5. Actualizar estatus del presupuesto
      await tx.presupuestos_encabezado.update({
        where: { PresupuestoID: presupuesto.PresupuestoID },
        data: { Estatus: 'Aprobado' },
      });
    }, { timeout: 60000 }); // 60 segundos para permitir creación de múltiples equipos

    // Contar equipos físicos creados
    const equiposPurifreezeVenta = equiposVenta.filter((e: any) => e.TipoItem === 'EQUIPO_PURIFREEZE');
    const totalEquiposFisicosCreados = equiposPurifreezeVenta.reduce((sum: number, e: any) => sum + e.Cantidad, 0)
      + equiposRenta.reduce((sum: number, e: any) => sum + e.Cantidad, 0);

    // Contar cobros creados
    const totalCobrosCreados = serviciosAdicionalesDelCatalogo.length + (itemsVenta.length > 0 ? 1 : 0);

    return {
      message: 'Presupuesto aprobado y procesado correctamente',
      data: {
        PresupuestoID: presupuesto.PresupuestoID,
        Estatus: 'Aprobado',
        Procesado: {
          VentasCreadas: [...equiposVenta, ...refacciones, ...servicios].length > 0,
          ContratosCreados: equiposRenta.length > 0,
          EquiposAsignados: equiposVenta.length + equiposRenta.length + equiposExternosMantenimiento.length,
          EquiposFisicosCreados: totalEquiposFisicosCreados,
          InventarioAfectado: totalEquiposFisicosCreados > 0,
          CobrosGenerados: totalCobrosCreados,
          CobrosServiciosAdicionales: serviciosAdicionalesDelCatalogo.length,
          CobroVentaGenerado: itemsVenta.length > 0,
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

  // Generar número de presupuesto
  private async generarNumeroPresupuesto(tx: any): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `P-${year}-`;

    const ultimoPresupuesto = await tx.presupuestos_encabezado.findFirst({
      where: { NumeroPresupuesto: { startsWith: prefix } },
      orderBy: { PresupuestoID: 'desc' },
    });

    let siguiente = 1;
    if (ultimoPresupuesto && ultimoPresupuesto.NumeroPresupuesto) {
      const partes = ultimoPresupuesto.NumeroPresupuesto.split('-');
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
        ServicioAdicionalID: data.ServicioAdicionalID || null,
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
      presupuesto.GastosAdicionales,
      presupuesto.aplicaIVA !== 0
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

  // Duplicar presupuesto
  async duplicar(PresupuestoID: number) {
    const original = await prisma.presupuestos_encabezado.findUnique({
      where: { PresupuestoID },
      include: {
        detalles: {
          where: { IsActive: 1 },
        },
      },
    });

    if (!original) {
      throw new HttpError('Presupuesto no encontrado', 404);
    }

    // Crear copia con transacción
    const copia = await prisma.$transaction(async (tx) => {
      // Generar nuevo número de presupuesto
      const numeroPresupuesto = await this.generarNumeroPresupuesto(tx);

      // Calcular nueva fecha de vigencia (30 días desde hoy)
      const nuevaVigencia = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // Crear encabezado
      const nuevoEncabezado = await tx.presupuestos_encabezado.create({
        data: {
          NumeroPresupuesto: numeroPresupuesto,
          ClienteID: original.ClienteID,
          SucursalID: original.SucursalID,
          FechaVigencia: nuevaVigencia,
          Observaciones: original.Observaciones ? `${original.Observaciones} (Copia)` : '(Copia)',
          UsuarioID: original.UsuarioID,
          DescuentoPorcentaje: original.DescuentoPorcentaje,
          DescuentoEfectivo: original.DescuentoEfectivo,
          GastosAdicionales: original.GastosAdicionales,
          aplicaIVA: original.aplicaIVA,
          Subtotal: original.Subtotal,
          IVA: original.IVA,
          Total: original.Total,
          Estatus: 'Pendiente',
          IsActive: 1,
        },
      });

      // Copiar detalles
      if (original.detalles.length > 0) {
        await tx.presupuestos_detalle.createMany({
          data: original.detalles.map(d => ({
            PresupuestoID: nuevoEncabezado.PresupuestoID,
            TipoItem: d.TipoItem,
            Modalidad: d.Modalidad,
            PlantillaEquipoID: d.PlantillaEquipoID,
            RefaccionID: d.RefaccionID,
            ServicioAdicionalID: d.ServicioAdicionalID,
            Descripcion: d.Descripcion,
            Cantidad: d.Cantidad,
            PeriodoRenta: d.PeriodoRenta,
            PrecioUnitario: d.PrecioUnitario,
            DescuentoPorcentaje: d.DescuentoPorcentaje,
            DescuentoEfectivo: d.DescuentoEfectivo,
            Subtotal: d.Subtotal,
            IsActive: 1,
          })),
        });
      }

      return nuevoEncabezado;
    });

    return this.findOne(copia.PresupuestoID);
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
    let usaPrecioFijo = false;

    if (modalidad === 'VENTA') {
      precio = costoTotal * (1 + (plantilla.PorcentajeVenta / 100));
    } else if (modalidad === 'RENTA') {
      // Si la plantilla tiene PrecioRenta fijo, usarlo directamente
      if (plantilla.PrecioRenta && plantilla.PrecioRenta > 0) {
        precio = plantilla.PrecioRenta;
        usaPrecioFijo = true;
      } else {
        precio = costoTotal * (plantilla.PorcentajeRenta / 100);
      }
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
        UsaPrecioFijo: usaPrecioFijo,
        PrecioRentaFijo: plantilla.PrecioRenta,
      },
    };
  }
}

export const presupuestosService = new PresupuestosService();
