import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { Prisma } from '@prisma/client';
import moment from 'moment';
import {
  CreateEquipoVirtualDto,
  UpdateEquipoVirtualDto,
  CreateEquipoVirtualDetalleDto,
} from './equipos-virtuales.schema';
import { localDate } from '../../utils/date-utils';

class EquiposVirtualesService {
  /**
   * Crea un nuevo equipo virtual
   */
  async create(dto: CreateEquipoVirtualDto) {
    // Validar que no haya refacciones duplicadas
    this.validarRefaccionesDuplicadas(dto.Detalles);

    const result = await prisma.$transaction(async (tx) => {
      // Validar que las refacciones existan
      await this.validarRefaccionesExisten(tx, dto.Detalles.map(d => d.RefaccionID));

      // Calcular totales de los detalles
      const detallesConTotales = dto.Detalles.map(d => this.calcularTotalesDetalle(d));
      const totalCosto = detallesConTotales.reduce((sum, d) => sum + d.TotalFinal, 0);

      // Crear el equipo virtual
      const equipo = await tx.equipos_virtuales.create({
        data: {
          Nombre: dto.Nombre,
          Descripcion: dto.Descripcion || null,
          Codigo: dto.Codigo || null,
          TotalCosto: this.redondear(totalCosto),
          IsActive: true,
          FechaCreacion: localDate(),
        },
      });

      // Crear los detalles
      for (const detalle of detallesConTotales) {
        await tx.equipos_virtuales_detalle.create({
          data: {
            EquipoVirtualID: equipo.EquipoVirtualID,
            RefaccionID: detalle.RefaccionID,
            Cantidad: detalle.Cantidad,
            CostoUnitario: detalle.CostoUnitario,
            Descuento: detalle.Descuento,
            TotalUnitario: detalle.TotalUnitario,
            Otros: detalle.Otros,
            TotalOtros: detalle.TotalOtros,
            CostoImportacion: detalle.CostoImportacion,
            TotalUnidad: detalle.TotalUnidad,
            TotalFinal: detalle.TotalFinal,
            IVA: detalle.IVA,
            CantidadPiezasPorEquipo: detalle.CantidadPiezasPorEquipo,
            NumeroEquipos: detalle.NumeroEquipos,
            CostoAnterior: detalle.CostoAnterior,
            CostoActual: detalle.CostoActual,
            Diferencia: detalle.Diferencia,
            IsActive: true,
          },
        });
      }

      return equipo;
    });

    const equipoCompleto = await this.findOne(result.EquipoVirtualID);
    return { message: 'Equipo virtual creado correctamente', data: equipoCompleto.data };
  }

  /**
   * Obtiene todos los equipos virtuales
   */
  async findAll(search?: string) {
    const where: Prisma.equipos_virtualesWhereInput = {
      IsActive: true,
    };

    if (search) {
      where.OR = [
        { Nombre: { contains: search } },
        { Descripcion: { contains: search } },
      ];
    }

    const equipos = await prisma.equipos_virtuales.findMany({
      where,
      include: {
        detalles: {
          where: { IsActive: true },
          include: {
            refaccion: {
              select: {
                RefaccionID: true,
                NombrePieza: true,
                Codigo: true,
              },
            },
          },
        },
      },
      orderBy: { EquipoVirtualID: 'desc' },
    });

    const equiposFormateados = equipos.map(equipo => ({
      EquipoVirtualID: equipo.EquipoVirtualID,
      Nombre: equipo.Nombre,
      Descripcion: equipo.Descripcion,
      Codigo: equipo.Codigo,
      TotalCosto: equipo.TotalCosto,
      TotalRefacciones: equipo.detalles.length,
      TotalCantidad: equipo.detalles.reduce((sum, d) => sum + (d.Cantidad ?? 0), 0),
      FechaCreacion: equipo.FechaCreacion ? moment.utc(equipo.FechaCreacion).format('YYYY-MM-DD') : null,
      FechaActualizacion: equipo.FechaActualizacion ? moment.utc(equipo.FechaActualizacion).format('YYYY-MM-DD') : null,
    }));

    return { message: 'Equipos virtuales obtenidos', data: equiposFormateados };
  }

  /**
   * Obtiene un equipo virtual por ID con todos sus detalles
   */
  async findOne(id: number) {
    const equipo = await prisma.equipos_virtuales.findFirst({
      where: { EquipoVirtualID: id, IsActive: true },
      include: {
        detalles: {
          where: { IsActive: true },
          include: {
            refaccion: {
              select: {
                RefaccionID: true,
                NombrePieza: true,
                NombreCorto: true,
                Codigo: true,
                Modelo: true,
                CostoPromedio: true,
                catalogo_unidades: {
                  select: { DesUnidad: true },
                },
              },
            },
          },
        },
      },
    });

    if (!equipo) {
      throw new HttpError('Equipo virtual no encontrado', 404);
    }

    const equipoFormateado = {
      EquipoVirtualID: equipo.EquipoVirtualID,
      Nombre: equipo.Nombre,
      Descripcion: equipo.Descripcion,
      Codigo: equipo.Codigo,
      TotalCosto: equipo.TotalCosto,
      IsActive: equipo.IsActive,
      FechaCreacion: equipo.FechaCreacion ? moment.utc(equipo.FechaCreacion).format('YYYY-MM-DD') : null,
      FechaActualizacion: equipo.FechaActualizacion ? moment.utc(equipo.FechaActualizacion).format('YYYY-MM-DD') : null,
      detalles: equipo.detalles.map(detalle => ({
        DetalleID: detalle.DetalleID,
        RefaccionID: detalle.RefaccionID,
        Cantidad: detalle.Cantidad,
        CostoUnitario: detalle.CostoUnitario,
        Descuento: detalle.Descuento,
        TotalUnitario: detalle.TotalUnitario,
        Otros: detalle.Otros,
        TotalOtros: detalle.TotalOtros,
        CostoImportacion: detalle.CostoImportacion,
        TotalUnidad: detalle.TotalUnidad,
        TotalFinal: detalle.TotalFinal,
        IVA: detalle.IVA,
        CantidadPiezasPorEquipo: detalle.CantidadPiezasPorEquipo,
        NumeroEquipos: detalle.NumeroEquipos,
        CostoAnterior: detalle.CostoAnterior,
        CostoActual: detalle.CostoActual,
        Diferencia: detalle.Diferencia,
        Refaccion: {
          NombrePieza: detalle.refaccion.NombrePieza,
          NombreCorto: detalle.refaccion.NombreCorto,
          Codigo: detalle.refaccion.Codigo,
          Modelo: detalle.refaccion.Modelo,
          CostoPromedio: detalle.refaccion.CostoPromedio || 0,
          Unidad: detalle.refaccion.catalogo_unidades?.DesUnidad || null,
        },
      })),
    };

    return { message: 'Equipo virtual obtenido', data: equipoFormateado };
  }

  /**
   * Actualiza un equipo virtual existente
   */
  async update(id: number, dto: UpdateEquipoVirtualDto) {
    // Validar refacciones duplicadas si se envían detalles
    if (dto.Detalles) {
      this.validarRefaccionesDuplicadas(dto.Detalles);
    }

    const result = await prisma.$transaction(async (tx) => {
      // Verificar que el equipo existe
      const equipoExistente = await tx.equipos_virtuales.findFirst({
        where: { EquipoVirtualID: id, IsActive: true },
      });

      if (!equipoExistente) {
        throw new HttpError('Equipo virtual no encontrado', 404);
      }

      // Validar que las refacciones existan
      if (dto.Detalles) {
        await this.validarRefaccionesExisten(tx, dto.Detalles.map(d => d.RefaccionID));
      }

      // Eliminar detalles (soft delete)
      if (dto.DetallesEliminar?.length) {
        for (const detalleID of dto.DetallesEliminar) {
          await tx.equipos_virtuales_detalle.updateMany({
            where: { DetalleID: detalleID, EquipoVirtualID: id },
            data: { IsActive: false },
          });
        }
      }

      // Actualizar o crear detalles
      if (dto.Detalles?.length) {
        for (const detalle of dto.Detalles) {
          const detalleConTotales = this.calcularTotalesDetalle(detalle);

          if (detalle.DetalleID) {
            // Actualizar existente
            await tx.equipos_virtuales_detalle.updateMany({
              where: { DetalleID: detalle.DetalleID, EquipoVirtualID: id },
              data: {
                RefaccionID: detalleConTotales.RefaccionID,
                Cantidad: detalleConTotales.Cantidad,
                CostoUnitario: detalleConTotales.CostoUnitario,
                Descuento: detalleConTotales.Descuento,
                TotalUnitario: detalleConTotales.TotalUnitario,
                Otros: detalleConTotales.Otros,
                TotalOtros: detalleConTotales.TotalOtros,
                CostoImportacion: detalleConTotales.CostoImportacion,
                TotalUnidad: detalleConTotales.TotalUnidad,
                TotalFinal: detalleConTotales.TotalFinal,
                IVA: detalleConTotales.IVA,
                CantidadPiezasPorEquipo: detalleConTotales.CantidadPiezasPorEquipo,
                NumeroEquipos: detalleConTotales.NumeroEquipos,
                CostoAnterior: detalleConTotales.CostoAnterior,
                CostoActual: detalleConTotales.CostoActual,
                Diferencia: detalleConTotales.Diferencia,
              },
            });
          } else {
            // Verificar si ya existe la refacción
            const existente = await tx.equipos_virtuales_detalle.findFirst({
              where: { EquipoVirtualID: id, RefaccionID: detalle.RefaccionID },
            });

            if (existente) {
              // Reactivar y actualizar
              await tx.equipos_virtuales_detalle.update({
                where: { DetalleID: existente.DetalleID },
                data: {
                  Cantidad: detalleConTotales.Cantidad,
                  CostoUnitario: detalleConTotales.CostoUnitario,
                  Descuento: detalleConTotales.Descuento,
                  TotalUnitario: detalleConTotales.TotalUnitario,
                  Otros: detalleConTotales.Otros,
                  TotalOtros: detalleConTotales.TotalOtros,
                  CostoImportacion: detalleConTotales.CostoImportacion,
                  TotalUnidad: detalleConTotales.TotalUnidad,
                  TotalFinal: detalleConTotales.TotalFinal,
                  IVA: detalleConTotales.IVA,
                  CantidadPiezasPorEquipo: detalleConTotales.CantidadPiezasPorEquipo,
                  NumeroEquipos: detalleConTotales.NumeroEquipos,
                  CostoAnterior: detalleConTotales.CostoAnterior,
                  CostoActual: detalleConTotales.CostoActual,
                  Diferencia: detalleConTotales.Diferencia,
                  IsActive: true,
                },
              });
            } else {
              // Crear nuevo
              await tx.equipos_virtuales_detalle.create({
                data: {
                  EquipoVirtualID: id,
                  RefaccionID: detalleConTotales.RefaccionID,
                  Cantidad: detalleConTotales.Cantidad,
                  CostoUnitario: detalleConTotales.CostoUnitario,
                  Descuento: detalleConTotales.Descuento,
                  TotalUnitario: detalleConTotales.TotalUnitario,
                  Otros: detalleConTotales.Otros,
                  TotalOtros: detalleConTotales.TotalOtros,
                  CostoImportacion: detalleConTotales.CostoImportacion,
                  TotalUnidad: detalleConTotales.TotalUnidad,
                  TotalFinal: detalleConTotales.TotalFinal,
                  IVA: detalleConTotales.IVA,
                  CantidadPiezasPorEquipo: detalleConTotales.CantidadPiezasPorEquipo,
                  NumeroEquipos: detalleConTotales.NumeroEquipos,
                  CostoAnterior: detalleConTotales.CostoAnterior,
                  CostoActual: detalleConTotales.CostoActual,
                  Diferencia: detalleConTotales.Diferencia,
                  IsActive: true,
                },
              });
            }
          }
        }
      }

      // Recalcular total del equipo
      const detallesActualizados = await tx.equipos_virtuales_detalle.findMany({
        where: { EquipoVirtualID: id, IsActive: true },
      });

      const totalCosto = detallesActualizados.reduce(
        (sum, d) => sum + Number(d.TotalFinal || 0),
        0
      );

      // Actualizar encabezado
      await tx.equipos_virtuales.update({
        where: { EquipoVirtualID: id },
        data: {
          Nombre: dto.Nombre || equipoExistente.Nombre,
          Descripcion: dto.Descripcion !== undefined ? dto.Descripcion : equipoExistente.Descripcion,
          Codigo: dto.Codigo !== undefined ? dto.Codigo : equipoExistente.Codigo,
          TotalCosto: this.redondear(totalCosto),
          FechaActualizacion: localDate(),
        },
      });

      return id;
    }, { timeout: 30000 });

    const equipoActualizado = await this.findOne(result);
    return { message: 'Equipo virtual actualizado correctamente', data: equipoActualizado.data };
  }

  /**
   * Duplica un equipo virtual existente
   */
  async duplicate(id: number) {
    const equipoOriginal = await prisma.equipos_virtuales.findFirst({
      where: { EquipoVirtualID: id, IsActive: true },
      include: {
        detalles: {
          where: { IsActive: true },
        },
      },
    });

    if (!equipoOriginal) {
      throw new HttpError('Equipo virtual no encontrado', 404);
    }

    const result = await prisma.$transaction(async (tx) => {
      // Crear nuevo equipo
      const nuevoEquipo = await tx.equipos_virtuales.create({
        data: {
          Nombre: `${equipoOriginal.Nombre} (Copia)`,
          Descripcion: equipoOriginal.Descripcion,
          TotalCosto: equipoOriginal.TotalCosto,
          IsActive: true,
          FechaCreacion: localDate(),
        },
      });

      // Copiar detalles
      for (const detalle of equipoOriginal.detalles) {
        await tx.equipos_virtuales_detalle.create({
          data: {
            EquipoVirtualID: nuevoEquipo.EquipoVirtualID,
            RefaccionID: detalle.RefaccionID,
            Cantidad: detalle.Cantidad,
            CostoUnitario: detalle.CostoUnitario,
            Descuento: detalle.Descuento,
            TotalUnitario: detalle.TotalUnitario,
            Otros: detalle.Otros,
            TotalOtros: detalle.TotalOtros,
            CostoImportacion: detalle.CostoImportacion,
            TotalUnidad: detalle.TotalUnidad,
            TotalFinal: detalle.TotalFinal,
            IVA: detalle.IVA,
            CantidadPiezasPorEquipo: detalle.CantidadPiezasPorEquipo,
            NumeroEquipos: detalle.NumeroEquipos,
            CostoAnterior: detalle.CostoAnterior,
            CostoActual: detalle.CostoActual,
            Diferencia: detalle.Diferencia,
            IsActive: true,
          },
        });
      }

      return nuevoEquipo.EquipoVirtualID;
    });

    const equipoDuplicado = await this.findOne(result);
    return { message: 'Equipo virtual duplicado correctamente', data: equipoDuplicado.data };
  }

  /**
   * Da de baja un equipo virtual
   */
  async deactivate(id: number) {
    const equipo = await prisma.equipos_virtuales.findFirst({
      where: { EquipoVirtualID: id, IsActive: true },
    });

    if (!equipo) {
      throw new HttpError('Equipo virtual no encontrado', 404);
    }

    await prisma.equipos_virtuales.update({
      where: { EquipoVirtualID: id },
      data: { IsActive: false, FechaActualizacion: localDate() },
    });

    return { message: 'Equipo virtual dado de baja correctamente', data: { EquipoVirtualID: id } };
  }

  /**
   * Activa un equipo virtual
   */
  async activate(id: number) {
    const equipo = await prisma.equipos_virtuales.findFirst({
      where: { EquipoVirtualID: id, IsActive: false },
    });

    if (!equipo) {
      throw new HttpError('Equipo virtual no encontrado o ya está activo', 404);
    }

    await prisma.equipos_virtuales.update({
      where: { EquipoVirtualID: id },
      data: { IsActive: true, FechaActualizacion: localDate() },
    });

    return { message: 'Equipo virtual activado correctamente', data: { EquipoVirtualID: id } };
  }

  /**
   * Obtiene resumen de un equipo virtual para usar en compras
   */
  async getResumen(id: number) {
    const equipo = await this.findOne(id);

    const resumen = {
      EquipoVirtualID: equipo.data.EquipoVirtualID,
      Nombre: equipo.data.Nombre,
      Descripcion: equipo.data.Descripcion,
      TotalCosto: equipo.data.TotalCosto,
      TotalRefacciones: equipo.data.detalles.length,
      detalles: equipo.data.detalles.map((d: any) => ({
        RefaccionID: d.RefaccionID,
        Refaccion: d.Refaccion.NombrePieza,
        Codigo: d.Refaccion.Codigo,
        Cantidad: d.Cantidad,
        CostoUnitario: d.CostoUnitario,
        TotalFinal: d.TotalFinal,
      })),
    };

    return { message: 'Resumen de equipo virtual', data: resumen };
  }

  /**
   * Obtiene el historial de cambios de precio de un equipo virtual
   */
  async getHistorial(id: number) {
    const equipo = await prisma.equipos_virtuales.findFirst({
      where: { EquipoVirtualID: id },
    });

    if (!equipo) {
      throw new HttpError('Equipo virtual no encontrado', 404);
    }

    const historial = await prisma.equipos_virtuales_historial.findMany({
      where: { EquipoVirtualID: id },
      include: {
        cotizacion: {
          select: {
            CotizacionCompraID: true,
            Folio: true,
            FechaCotizacion: true,
          },
        },
      },
      orderBy: { FechaCambio: 'desc' },
    });

    const historialFormateado = historial.map(h => ({
      HistorialID: h.HistorialID,
      FechaCambio: moment.utc(h.FechaCambio).format('YYYY-MM-DD HH:mm:ss'),
      PrecioAnterior: h.PrecioAnterior,
      PrecioNuevo: h.PrecioNuevo,
      Diferencia: h.Diferencia,
      DetallesCambio: h.DetallesCambio,
      Observaciones: h.Observaciones,
      Cotizacion: h.cotizacion ? {
        CotizacionCompraID: h.cotizacion.CotizacionCompraID,
        Folio: h.cotizacion.Folio,
        FechaCotizacion: moment.utc(h.cotizacion.FechaCotizacion).format('YYYY-MM-DD'),
      } : null,
    }));

    return {
      message: 'Historial de equipo virtual',
      data: {
        EquipoVirtualID: equipo.EquipoVirtualID,
        Nombre: equipo.Nombre,
        Codigo: equipo.Codigo,
        TotalCosto: equipo.TotalCosto,
        historial: historialFormateado,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VALIDACIONES
  // ═══════════════════════════════════════════════════════════════════════════

  private validarRefaccionesDuplicadas(detalles: { RefaccionID: number }[]): void {
    const refaccionIds = detalles.map(d => d.RefaccionID);
    const duplicados = refaccionIds.filter((id, index) => refaccionIds.indexOf(id) !== index);

    if (duplicados.length > 0) {
      throw new HttpError(`No se pueden agregar refacciones duplicadas: ${[...new Set(duplicados)].join(', ')}`, 400);
    }
  }

  private async validarRefaccionesExisten(
    tx: Prisma.TransactionClient,
    refaccionIds: number[]
  ): Promise<void> {
    const refacciones = await tx.catalogo_refacciones.findMany({
      where: { RefaccionID: { in: refaccionIds }, IsActive: true },
      select: { RefaccionID: true },
    });

    const encontradas = refacciones.map(r => r.RefaccionID);
    const noEncontradas = refaccionIds.filter(id => !encontradas.includes(id));

    if (noEncontradas.length > 0) {
      throw new HttpError(`Refacciones no encontradas o inactivas: ${noEncontradas.join(', ')}`, 404);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CALCULOS
  // ═══════════════════════════════════════════════════════════════════════════

  private calcularTotalesDetalle(detalle: CreateEquipoVirtualDetalleDto) {
    const cantidad = detalle.Cantidad;
    const costoUnitario = detalle.CostoUnitario || 0;
    const descuento = detalle.Descuento || 0;
    const otros = detalle.Otros || 0;
    const costoImportacion = detalle.CostoImportacion || 0;
    const iva = detalle.IVA || 16;
    const cantidadPiezasPorEquipo = detalle.CantidadPiezasPorEquipo || 1;
    const numeroEquipos = detalle.NumeroEquipos || 1;
    const costoAnterior = detalle.CostoAnterior || 0;

    // TotalUnitario = CostoUnitario * Cantidad * (1 - Descuento/100)
    const totalUnitario = this.redondear(costoUnitario * cantidad * (1 - descuento / 100));

    // TotalOtros = Otros * Cantidad
    const totalOtros = this.redondear(otros * cantidad);

    // Sin IVA: el equipo virtual es solo lista de costos. El IVA se aplica UNA sola vez, a nivel Pedido.
    const subtotal = totalUnitario + totalOtros + costoImportacion;
    const totalUnidad = this.redondear(subtotal);

    // TotalFinal = TotalUnidad * CantidadPiezasPorEquipo * NumeroEquipos
    const totalFinal = this.redondear(totalUnidad * cantidadPiezasPorEquipo * numeroEquipos);

    // CostoActual = TotalFinal / (CantidadPiezasPorEquipo * NumeroEquipos) si > 0
    const divisor = cantidadPiezasPorEquipo * numeroEquipos;
    const costoActual = divisor > 0 ? this.redondear(totalFinal / divisor) : 0;

    // Diferencia = CostoActual - CostoAnterior
    const diferencia = this.redondear(costoActual - costoAnterior);

    return {
      RefaccionID: detalle.RefaccionID,
      Cantidad: cantidad,
      CostoUnitario: costoUnitario,
      Descuento: descuento,
      TotalUnitario: totalUnitario,
      Otros: otros,
      TotalOtros: totalOtros,
      CostoImportacion: costoImportacion,
      TotalUnidad: totalUnidad,
      TotalFinal: totalFinal,
      IVA: iva,
      CantidadPiezasPorEquipo: cantidadPiezasPorEquipo,
      NumeroEquipos: numeroEquipos,
      CostoAnterior: costoAnterior,
      CostoActual: costoActual,
      Diferencia: diferencia,
    };
  }

  /**
   * Migra un equipo virtual a una plantilla de equipo
   * Crea una nueva plantilla con el nombre "EQUIPO VIRTUAL - [Nombre]"
   * y copia los detalles (RefaccionID + Cantidad)
   */
  async migrarAPlantilla(equipoVirtualId: number) {
    return await prisma.$transaction(
      async (tx) => {
        // 1. Obtener equipo virtual con detalles
        const equipoVirtual = await tx.equipos_virtuales.findUnique({
          where: { EquipoVirtualID: equipoVirtualId },
          include: { detalles: { where: { IsActive: true } } },
        });

        if (!equipoVirtual || !equipoVirtual.IsActive) {
          throw new HttpError('Equipo virtual no encontrado', 404);
        }

        if (!equipoVirtual.detalles || equipoVirtual.detalles.length === 0) {
          throw new HttpError('El equipo virtual no tiene detalles para migrar', 400);
        }

        // 2. Verificar que no existe plantilla con mismo código (si tiene código)
        if (equipoVirtual.Codigo) {
          const existente = await tx.plantillas_equipo.findFirst({
            where: { Codigo: equipoVirtual.Codigo, IsActive: 1 },
          });
          if (existente) {
            throw new HttpError(`Ya existe una plantilla con código ${equipoVirtual.Codigo}`, 400);
          }
        }

        // 3. Crear plantilla (nombre incluye prefijo para identificación)
        const plantilla = await tx.plantillas_equipo.create({
          data: {
            Codigo: equipoVirtual.Codigo || null,
            NombreEquipo: `EQUIPO VIRTUAL - ${equipoVirtual.Nombre}`,
            Observaciones: equipoVirtual.Descripcion || null,
            EsExterno: 0,
            PorcentajeVenta: 35.00,
            PorcentajeRenta: 15.00,
            IsActive: 1,
            FechaCreacion: localDate(),
          },
        });

        // 4. Copiar detalles (solo RefaccionID y Cantidad)
        for (const detalle of equipoVirtual.detalles) {
          await tx.plantillas_equipo_detalle.create({
            data: {
              PlantillaEquipoID: plantilla.PlantillaEquipoID,
              RefaccionID: detalle.RefaccionID,
              Cantidad: detalle.Cantidad || 1,
              IsActive: 1,
            },
          });
        }

        return {
          PlantillaEquipoID: plantilla.PlantillaEquipoID,
          NombreEquipo: plantilla.NombreEquipo,
          TotalRefacciones: equipoVirtual.detalles.length,
        };
      },
      {
        maxWait: 10000,
        timeout: 30000,
      }
    );
  }

  private redondear(valor: number): number {
    return Math.round(valor * 100) / 100;
  }
}

export const equiposVirtualesService = new EquiposVirtualesService();
