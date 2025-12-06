import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { Prisma } from '@prisma/client';
import moment from 'moment';
import {
  CreateEquiposFromPlantillaDto,
  AgregarRefaccionEquipoDto,
  ModificarCantidadRefaccionDto,
  EliminarRefaccionEquipoDto,
  UpdateEquipoDto,
  InstalarEquipoDto,
  DesmontarEquipoDto,
  SearchEquiposQuery,
} from './equipos.schema';

class EquiposService {
  // ═══════════════════════════════════════════════════════════════════════════
  // CREAR EQUIPOS DESDE PLANTILLA
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Crea múltiples equipos a partir de una plantilla
   * - Solo equipos internos (Purifreeze) afectan inventario
   * - Genera números de serie automáticos
   */
  async createFromPlantilla(dto: CreateEquiposFromPlantillaDto, usuarioId?: number) {
    const result = await prisma.$transaction(async (tx) => {
      // Obtener plantilla con detalles
      const plantilla = await tx.plantillas_equipo.findFirst({
        where: { PlantillaEquipoID: dto.PlantillaEquipoID, IsActive: 1 },
        include: {
          detalles: {
            where: { IsActive: 1 },
            include: { refaccion: true },
          },
        },
      });

      if (!plantilla) {
        throw new HttpError('Plantilla no encontrada', 404);
      }

      const esInterno = plantilla.EsExterno === 0;

      // Validar stock si es equipo interno
      if (esInterno) {
        await this.validarStockParaEquipos(tx, plantilla.detalles, dto.Cantidad);
      }

      // Generar números de serie
      const numerosSerie = await this.generarNumerosSerie(tx, plantilla.NombreEquipo, dto.Cantidad);

      const equiposCreados: number[] = [];

      // Crear cada equipo
      for (let i = 0; i < dto.Cantidad; i++) {
        const equipo = await tx.equipos.create({
          data: {
            PlantillaEquipoID: plantilla.PlantillaEquipoID,
            NumeroSerie: numerosSerie[i],
            EsExterno: plantilla.EsExterno,
            Estatus: 'Armado',
            Observaciones: dto.Observaciones || null,
            FechaCreacion: new Date(),
            UsuarioCreadorID: usuarioId || null,
            IsActive: 1,
          },
        });

        // Crear detalles del equipo
        for (const detalle of plantilla.detalles) {
          await tx.equipos_detalle.create({
            data: {
              EquipoID: equipo.EquipoID,
              RefaccionID: detalle.RefaccionID,
              Cantidad: detalle.Cantidad,
              IsActive: 1,
            },
          });

          // Descontar del inventario si es interno
          if (esInterno) {
            await this.descontarInventario(tx, detalle.RefaccionID, detalle.Cantidad, usuarioId);
          }
        }

        equiposCreados.push(equipo.EquipoID);
      }

      return equiposCreados;
    });

    // Obtener equipos creados con detalles
    const equipos = await this.findByIds(result);
    return { message: `${dto.Cantidad} equipo(s) creado(s) correctamente`, data: equipos };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONSULTAS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Obtiene todos los equipos con filtros opcionales
   */
  async findAll(query: SearchEquiposQuery) {
    const where: Prisma.equiposWhereInput = {
      IsActive: 1,
    };

    if (query.q) {
      where.OR = [
        { NumeroSerie: { contains: query.q } },
        { Observaciones: { contains: query.q } },
        { plantilla: { NombreEquipo: { contains: query.q } } },
      ];
    }

    if (query.estatus && query.estatus !== 'todos') {
      where.Estatus = query.estatus as 'Armado' | 'Instalado' | 'Desmontado';
    }

    if (query.tipo === 'interno') {
      where.EsExterno = 0;
    } else if (query.tipo === 'externo') {
      where.EsExterno = 1;
    }

    if (query.plantillaId) {
      where.PlantillaEquipoID = query.plantillaId;
    }

    const equipos = await prisma.equipos.findMany({
      where,
      include: {
        plantilla: {
          select: {
            PlantillaEquipoID: true,
            NombreEquipo: true,
            Codigo: true,
            PorcentajeVenta: true,
            PorcentajeRenta: true,
          },
        },
        detalles: {
          where: { IsActive: 1 },
          include: {
            refaccion: {
              select: {
                RefaccionID: true,
                NombrePieza: true,
                CostoPromedio: true,
              },
            },
          },
        },
      },
      orderBy: { EquipoID: 'desc' },
    });

    const equiposFormateados = equipos.map(equipo => this.formatearEquipoResumen(equipo));
    return { message: 'Equipos obtenidos', data: equiposFormateados };
  }

  /**
   * Obtiene un equipo por ID con todos sus detalles
   */
  async findOne(id: number) {
    const equipo = await prisma.equipos.findFirst({
      where: { EquipoID: id, IsActive: 1 },
      include: {
        plantilla: {
          select: {
            PlantillaEquipoID: true,
            NombreEquipo: true,
            Codigo: true,
            PorcentajeVenta: true,
            PorcentajeRenta: true,
          },
        },
        detalles: {
          where: { IsActive: 1 },
          include: {
            refaccion: {
              select: {
                RefaccionID: true,
                NombrePieza: true,
                NombreCorto: true,
                Codigo: true,
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
      throw new HttpError('Equipo no encontrado', 404);
    }

    return { message: 'Equipo obtenido', data: this.formatearEquipoCompleto(equipo) };
  }

  /**
   * Obtiene múltiples equipos por IDs
   */
  private async findByIds(ids: number[]) {
    const equipos = await prisma.equipos.findMany({
      where: { EquipoID: { in: ids }, IsActive: 1 },
      include: {
        plantilla: {
          select: {
            PlantillaEquipoID: true,
            NombreEquipo: true,
            Codigo: true,
          },
        },
      },
      orderBy: { EquipoID: 'asc' },
    });

    return equipos.map(equipo => ({
      EquipoID: equipo.EquipoID,
      NumeroSerie: equipo.NumeroSerie,
      NombreEquipo: equipo.plantilla.NombreEquipo,
      Estatus: equipo.Estatus,
      EsExterno: equipo.EsExterno === 1,
      FechaCreacion: moment(equipo.FechaCreacion).format('YYYY-MM-DD'),
    }));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MODIFICAR EQUIPO (Solo estado Armado)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Actualiza observaciones del equipo
   */
  async update(id: number, dto: UpdateEquipoDto) {
    const equipo = await this.obtenerEquipoValidado(id, ['Armado']);

    await prisma.equipos.update({
      where: { EquipoID: id },
      data: { Observaciones: dto.Observaciones },
    });

    const equipoActualizado = await this.findOne(id);
    return { message: 'Equipo actualizado correctamente', data: equipoActualizado.data };
  }

  /**
   * Agrega una refacción al equipo
   */
  async agregarRefaccion(equipoId: number, dto: AgregarRefaccionEquipoDto, usuarioId?: number) {
    const result = await prisma.$transaction(async (tx) => {
      const equipo = await this.obtenerEquipoValidadoTx(tx, equipoId, ['Armado']);

      // Verificar que la refacción no esté ya en el equipo
      const existente = await tx.equipos_detalle.findFirst({
        where: { EquipoID: equipoId, RefaccionID: dto.RefaccionID, IsActive: 1 },
      });

      if (existente) {
        throw new HttpError('Esta refacción ya existe en el equipo', 400);
      }

      // Validar que la refacción exista
      const refaccion = await tx.catalogo_refacciones.findFirst({
        where: { RefaccionID: dto.RefaccionID, IsActive: true },
      });

      if (!refaccion) {
        throw new HttpError('Refacción no encontrada', 404);
      }

      // Validar stock si es equipo interno
      if (equipo.EsExterno === 0) {
        await this.validarStockRefaccion(tx, dto.RefaccionID, dto.Cantidad);
        await this.descontarInventario(tx, dto.RefaccionID, dto.Cantidad, usuarioId);
      }

      // Verificar si existe desactivada y reactivar
      const existenteInactivo = await tx.equipos_detalle.findFirst({
        where: { EquipoID: equipoId, RefaccionID: dto.RefaccionID, IsActive: 0 },
      });

      if (existenteInactivo) {
        await tx.equipos_detalle.update({
          where: { EquipoDetalleID: existenteInactivo.EquipoDetalleID },
          data: { Cantidad: dto.Cantidad, IsActive: 1 },
        });
      } else {
        await tx.equipos_detalle.create({
          data: {
            EquipoID: equipoId,
            RefaccionID: dto.RefaccionID,
            Cantidad: dto.Cantidad,
            IsActive: 1,
          },
        });
      }

      return equipoId;
    });

    const equipoActualizado = await this.findOne(result);
    return { message: 'Refacción agregada correctamente', data: equipoActualizado.data };
  }

  /**
   * Modifica la cantidad de una refacción en el equipo
   */
  async modificarCantidadRefaccion(
    equipoId: number,
    detalleId: number,
    dto: ModificarCantidadRefaccionDto,
    usuarioId?: number
  ) {
    const result = await prisma.$transaction(async (tx) => {
      const equipo = await this.obtenerEquipoValidadoTx(tx, equipoId, ['Armado']);

      const detalle = await tx.equipos_detalle.findFirst({
        where: { EquipoDetalleID: detalleId, EquipoID: equipoId, IsActive: 1 },
      });

      if (!detalle) {
        throw new HttpError('Detalle de equipo no encontrado', 404);
      }

      const diferencia = dto.Cantidad - detalle.Cantidad;

      // Si es equipo interno, ajustar inventario
      if (equipo.EsExterno === 0) {
        if (diferencia > 0) {
          // Necesita más piezas - validar y descontar
          await this.validarStockRefaccion(tx, detalle.RefaccionID, diferencia);
          await this.descontarInventario(tx, detalle.RefaccionID, diferencia, usuarioId);
        } else if (diferencia < 0) {
          // Devuelve piezas al inventario
          await this.incrementarInventario(tx, detalle.RefaccionID, Math.abs(diferencia), usuarioId);
        }
      }

      await tx.equipos_detalle.update({
        where: { EquipoDetalleID: detalleId },
        data: { Cantidad: dto.Cantidad },
      });

      return equipoId;
    });

    const equipoActualizado = await this.findOne(result);
    return { message: 'Cantidad actualizada correctamente', data: equipoActualizado.data };
  }

  /**
   * Elimina una refacción del equipo
   */
  async eliminarRefaccion(
    equipoId: number,
    detalleId: number,
    dto: EliminarRefaccionEquipoDto,
    usuarioId?: number
  ) {
    const result = await prisma.$transaction(async (tx) => {
      const equipo = await this.obtenerEquipoValidadoTx(tx, equipoId, ['Armado']);

      const detalle = await tx.equipos_detalle.findFirst({
        where: { EquipoDetalleID: detalleId, EquipoID: equipoId, IsActive: 1 },
      });

      if (!detalle) {
        throw new HttpError('Detalle de equipo no encontrado', 404);
      }

      // Desactivar el detalle
      await tx.equipos_detalle.update({
        where: { EquipoDetalleID: detalleId },
        data: { IsActive: 0 },
      });

      // Si es equipo interno, procesar destino de refacciones
      if (equipo.EsExterno === 0) {
        if (dto.Destino === 'inventario') {
          await this.incrementarInventario(tx, detalle.RefaccionID, detalle.Cantidad, usuarioId);
        } else if (dto.Destino === 'danada') {
          if (!dto.MotivoDano) {
            throw new HttpError('MotivoDano es requerido cuando el destino es dañada', 400);
          }
          await this.registrarRefaccionDanada(
            tx,
            detalle.RefaccionID,
            detalle.Cantidad,
            dto.MotivoDano,
            dto.Observaciones,
            equipoId,
            usuarioId
          );
        }
      }

      return equipoId;
    });

    const equipoActualizado = await this.findOne(result);
    return { message: 'Refacción eliminada correctamente', data: equipoActualizado.data };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CAMBIAR ESTATUS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Instala un equipo (Armado → Instalado)
   */
  async instalar(id: number, dto: InstalarEquipoDto) {
    const equipo = await this.obtenerEquipoValidado(id, ['Armado']);

    const fechaInstalacion = dto.FechaInstalacion
      ? moment(dto.FechaInstalacion).toDate()
      : new Date();

    await prisma.equipos.update({
      where: { EquipoID: id },
      data: {
        Estatus: 'Instalado',
        FechaInstalacion: fechaInstalacion,
      },
    });

    const equipoActualizado = await this.findOne(id);
    return { message: 'Equipo instalado correctamente', data: equipoActualizado.data };
  }

  /**
   * Desmonta un equipo (Instalado → Desmontado)
   * Solo equipos internos (Purifreeze) pueden desmontarse
   */
  async desmontar(id: number, dto: DesmontarEquipoDto, usuarioId?: number) {
    const result = await prisma.$transaction(async (tx) => {
      const equipo = await this.obtenerEquipoValidadoTx(tx, id, ['Instalado']);

      // Solo equipos Purifreeze pueden desmontarse
      if (equipo.EsExterno === 1) {
        throw new HttpError('Solo equipos Purifreeze pueden desmontarse', 400);
      }

      const fechaDesmontaje = dto.FechaDesmontaje
        ? moment(dto.FechaDesmontaje).toDate()
        : new Date();

      // Procesar refacciones si se especifican
      if (dto.Refacciones && dto.Refacciones.length > 0) {
        for (const ref of dto.Refacciones) {
          // Verificar que la refacción pertenezca al equipo
          const detalle = await tx.equipos_detalle.findFirst({
            where: { EquipoID: id, RefaccionID: ref.RefaccionID, IsActive: 1 },
          });

          if (!detalle) {
            throw new HttpError(`Refacción ${ref.RefaccionID} no encontrada en el equipo`, 404);
          }

          if (ref.Cantidad > detalle.Cantidad) {
            throw new HttpError(`Cantidad excede lo disponible para refacción ${ref.RefaccionID}`, 400);
          }

          if (ref.Destino === 'inventario') {
            await this.incrementarInventario(tx, ref.RefaccionID, ref.Cantidad, usuarioId);
          } else if (ref.Destino === 'danada') {
            if (!ref.MotivoDano) {
              throw new HttpError(`MotivoDano es requerido para refacción ${ref.RefaccionID}`, 400);
            }
            await this.registrarRefaccionDanada(
              tx,
              ref.RefaccionID,
              ref.Cantidad,
              ref.MotivoDano,
              ref.ObservacionesDano,
              id,
              usuarioId
            );
          }
        }
      }

      // Actualizar estado del equipo
      await tx.equipos.update({
        where: { EquipoID: id },
        data: {
          Estatus: 'Desmontado',
          FechaDesmontaje: fechaDesmontaje,
          Observaciones: dto.Observaciones || equipo.Observaciones,
        },
      });

      return id;
    });

    const equipoActualizado = await this.findOne(result);
    return { message: 'Equipo desmontado correctamente', data: equipoActualizado.data };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DAR DE BAJA / ACTIVAR
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Da de baja un equipo (soft delete)
   */
  async deactivate(id: number) {
    const equipo = await prisma.equipos.findFirst({
      where: { EquipoID: id, IsActive: 1 },
    });

    if (!equipo) {
      throw new HttpError('Equipo no encontrado', 404);
    }

    await prisma.equipos.update({
      where: { EquipoID: id },
      data: { IsActive: 0 },
    });

    return { message: 'Equipo dado de baja correctamente', data: { EquipoID: id } };
  }

  /**
   * Activa un equipo
   */
  async activate(id: number) {
    const equipo = await prisma.equipos.findFirst({
      where: { EquipoID: id, IsActive: 0 },
    });

    if (!equipo) {
      throw new HttpError('Equipo no encontrado o ya está activo', 404);
    }

    await prisma.equipos.update({
      where: { EquipoID: id },
      data: { IsActive: 1 },
    });

    return { message: 'Equipo activado correctamente', data: { EquipoID: id } };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BÚSQUEDA DE REFACCIONES CON STOCK
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Busca refacciones disponibles mostrando el stock del inventario general
   * Útil para agregar refacciones a equipos internos (Purifreeze)
   */
  async searchRefaccionesConStock(search?: string) {
    const where: Prisma.catalogo_refaccionesWhereInput = {
      IsActive: true,
    };

    if (search) {
      where.OR = [
        { NombrePieza: { contains: search } },
        { NombreCorto: { contains: search } },
        { Codigo: { contains: search } },
      ];
    }

    const refacciones = await prisma.catalogo_refacciones.findMany({
      where,
      select: {
        RefaccionID: true,
        NombrePieza: true,
        NombreCorto: true,
        Codigo: true,
        CostoPromedio: true,
        catalogo_unidades: {
          select: { DesUnidad: true },
        },
      },
      take: 30,
      orderBy: { NombrePieza: 'asc' },
    });

    // Obtener stock de inventario para cada refacción
    const refaccionIds = refacciones.map(r => r.RefaccionID);
    const inventarios = await prisma.inventario.findMany({
      where: {
        RefaccionID: { in: refaccionIds },
        IsActive: 1,
      },
      select: {
        RefaccionID: true,
        StockActual: true,
      },
    });

    // Crear mapa de stock
    const stockMap = new Map<number, number>();
    for (const inv of inventarios) {
      stockMap.set(inv.RefaccionID!, inv.StockActual || 0);
    }

    const refaccionesFormateadas = refacciones.map(ref => ({
      RefaccionID: ref.RefaccionID,
      NombrePieza: ref.NombrePieza,
      NombreCorto: ref.NombreCorto,
      Codigo: ref.Codigo,
      CostoPromedio: ref.CostoPromedio || 0,
      Unidad: ref.catalogo_unidades?.DesUnidad || null,
      StockDisponible: stockMap.get(ref.RefaccionID) || 0,
    }));

    return { message: 'Refacciones encontradas', data: refaccionesFormateadas };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILIDADES PRIVADAS - INVENTARIO
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Valida que haya stock suficiente para crear equipos
   */
  private async validarStockParaEquipos(
    tx: Prisma.TransactionClient,
    detalles: { RefaccionID: number; Cantidad: number }[],
    cantidadEquipos: number
  ): Promise<void> {
    for (const detalle of detalles) {
      const cantidadTotal = detalle.Cantidad * cantidadEquipos;
      await this.validarStockRefaccion(tx, detalle.RefaccionID, cantidadTotal);
    }
  }

  /**
   * Valida stock de una refacción específica
   */
  private async validarStockRefaccion(
    tx: Prisma.TransactionClient,
    refaccionId: number,
    cantidadRequerida: number
  ): Promise<void> {
    const inventario = await tx.inventario.findFirst({
      where: { RefaccionID: refaccionId, IsActive: 1 },
    });

    const stockDisponible = inventario?.StockActual || 0;

    if (stockDisponible < cantidadRequerida) {
      const refaccion = await tx.catalogo_refacciones.findUnique({
        where: { RefaccionID: refaccionId },
        select: { NombrePieza: true },
      });
      throw new HttpError(
        `Stock insuficiente para "${refaccion?.NombrePieza}". Disponible: ${stockDisponible}, Requerido: ${cantidadRequerida}`,
        400
      );
    }
  }

  /**
   * Descuenta del inventario general y registra en kardex
   */
  private async descontarInventario(
    tx: Prisma.TransactionClient,
    refaccionId: number,
    cantidad: number,
    usuarioId?: number
  ): Promise<void> {
    // Actualizar inventario
    await tx.inventario.updateMany({
      where: { RefaccionID: refaccionId, IsActive: 1 },
      data: {
        StockActual: { decrement: cantidad },
        FechaUltimoMovimiento: new Date(),
      },
    });

    // Obtener costo promedio para kardex
    const refaccion = await tx.catalogo_refacciones.findUnique({
      where: { RefaccionID: refaccionId },
      select: { CostoPromedio: true },
    });

    // Registrar en kardex
    await tx.kardex_inventario.create({
      data: {
        RefaccionID: refaccionId,
        FechaMovimiento: new Date(),
        TipoMovimiento: 'Traspaso_Bodega_Equipo',
        Cantidad: -cantidad,
        CostoPromedioMovimiento: refaccion?.CostoPromedio || 0,
        UsuarioID: usuarioId || null,
        Observaciones: 'Salida para armado de equipo',
      },
    });
  }

  /**
   * Incrementa el inventario general y registra en kardex
   */
  private async incrementarInventario(
    tx: Prisma.TransactionClient,
    refaccionId: number,
    cantidad: number,
    usuarioId?: number
  ): Promise<void> {
    // Actualizar inventario
    await tx.inventario.updateMany({
      where: { RefaccionID: refaccionId, IsActive: 1 },
      data: {
        StockActual: { increment: cantidad },
        FechaUltimoMovimiento: new Date(),
      },
    });

    // Obtener costo promedio para kardex
    const refaccion = await tx.catalogo_refacciones.findUnique({
      where: { RefaccionID: refaccionId },
      select: { CostoPromedio: true },
    });

    // Registrar en kardex
    await tx.kardex_inventario.create({
      data: {
        RefaccionID: refaccionId,
        FechaMovimiento: new Date(),
        TipoMovimiento: 'Traspaso_Equipo',
        Cantidad: cantidad,
        CostoPromedioMovimiento: refaccion?.CostoPromedio || 0,
        UsuarioID: usuarioId || null,
        Observaciones: 'Retorno de equipo a bodega',
      },
    });
  }

  /**
   * Registra una refacción como dañada
   */
  private async registrarRefaccionDanada(
    tx: Prisma.TransactionClient,
    refaccionId: number,
    cantidad: number,
    motivoDano: string,
    observaciones?: string,
    equipoId?: number,
    usuarioId?: number
  ): Promise<void> {
    await tx.refacciones_danadas.create({
      data: {
        RefaccionID: refaccionId,
        EquipoID: equipoId || null,
        Cantidad: cantidad,
        MotivoDano: motivoDano as any,
        Observaciones: observaciones || null,
        FechaRegistro: new Date(),
        UsuarioID: usuarioId || 1,
        IsActive: 1,
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILIDADES PRIVADAS - VALIDACIONES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Obtiene un equipo y valida que esté en estado permitido
   */
  private async obtenerEquipoValidado(id: number, estatusPermitidos: string[]) {
    const equipo = await prisma.equipos.findFirst({
      where: { EquipoID: id, IsActive: 1 },
    });

    if (!equipo) {
      throw new HttpError('Equipo no encontrado', 404);
    }

    if (!estatusPermitidos.includes(equipo.Estatus)) {
      throw new HttpError(
        `Esta operación solo está permitida para equipos en estado: ${estatusPermitidos.join(', ')}. Estado actual: ${equipo.Estatus}`,
        400
      );
    }

    return equipo;
  }

  /**
   * Obtiene un equipo dentro de transacción
   */
  private async obtenerEquipoValidadoTx(
    tx: Prisma.TransactionClient,
    id: number,
    estatusPermitidos: string[]
  ) {
    const equipo = await tx.equipos.findFirst({
      where: { EquipoID: id, IsActive: 1 },
    });

    if (!equipo) {
      throw new HttpError('Equipo no encontrado', 404);
    }

    if (!estatusPermitidos.includes(equipo.Estatus)) {
      throw new HttpError(
        `Esta operación solo está permitida para equipos en estado: ${estatusPermitidos.join(', ')}. Estado actual: ${equipo.Estatus}`,
        400
      );
    }

    return equipo;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILIDADES PRIVADAS - GENERACIÓN DE NÚMEROS DE SERIE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Genera números de serie únicos basados en nombre de plantilla + año + consecutivo
   */
  private async generarNumerosSerie(
    tx: Prisma.TransactionClient,
    nombreEquipo: string,
    cantidad: number
  ): Promise<string[]> {
    const anioActual = moment().format('YY');

    // Generar prefijo desde el nombre (primeras 3 letras o siglas)
    const prefijo = this.generarPrefijo(nombreEquipo);

    // Obtener el último consecutivo para este prefijo y año
    const patron = `${prefijo}-${anioActual}-%`;

    const ultimoEquipo = await tx.equipos.findFirst({
      where: {
        NumeroSerie: { startsWith: `${prefijo}-${anioActual}-` },
      },
      orderBy: { NumeroSerie: 'desc' },
    });

    let ultimoConsecutivo = 0;
    if (ultimoEquipo) {
      const partes = ultimoEquipo.NumeroSerie.split('-');
      const consecutivoStr = partes[partes.length - 1];
      ultimoConsecutivo = parseInt(consecutivoStr, 10) || 0;
    }

    const numerosSerie: string[] = [];
    for (let i = 1; i <= cantidad; i++) {
      const consecutivo = (ultimoConsecutivo + i).toString().padStart(4, '0');
      numerosSerie.push(`${prefijo}-${anioActual}-${consecutivo}`);
    }

    return numerosSerie;
  }

  /**
   * Genera prefijo de 3-4 caracteres desde el nombre del equipo
   */
  private generarPrefijo(nombre: string): string {
    // Limpiar y convertir a mayúsculas
    const palabras = nombre.toUpperCase().replace(/[^A-Z0-9\s]/g, '').split(/\s+/);

    if (palabras.length === 1) {
      // Si es una palabra, tomar primeras 3 letras
      return palabras[0].substring(0, 3);
    } else {
      // Si son múltiples palabras, tomar inicial de cada una (máx 4)
      return palabras.slice(0, 4).map(p => p[0]).join('');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILIDADES PRIVADAS - FORMATEO
  // ═══════════════════════════════════════════════════════════════════════════

  private formatearEquipoResumen(equipo: any) {
    const costoTotal = this.calcularCostoTotal(equipo.detalles);

    return {
      EquipoID: equipo.EquipoID,
      NumeroSerie: equipo.NumeroSerie,
      EsExterno: equipo.EsExterno === 1,
      Estatus: equipo.Estatus,
      Observaciones: equipo.Observaciones,
      FechaCreacion: equipo.FechaCreacion ? moment(equipo.FechaCreacion).format('YYYY-MM-DD') : null,
      FechaInstalacion: equipo.FechaInstalacion ? moment(equipo.FechaInstalacion).format('YYYY-MM-DD') : null,
      FechaDesmontaje: equipo.FechaDesmontaje ? moment(equipo.FechaDesmontaje).format('YYYY-MM-DD') : null,
      Plantilla: {
        PlantillaEquipoID: equipo.plantilla.PlantillaEquipoID,
        NombreEquipo: equipo.plantilla.NombreEquipo,
        Codigo: equipo.plantilla.Codigo,
      },
      TotalRefacciones: equipo.detalles.length,
      CostoTotal: this.redondear(costoTotal),
      PrecioVenta: this.redondear(costoTotal * (1 + (equipo.plantilla.PorcentajeVenta || 35) / 100)),
      PrecioRenta: this.redondear(costoTotal * ((equipo.plantilla.PorcentajeRenta || 15) / 100)),
    };
  }

  private formatearEquipoCompleto(equipo: any) {
    const costoTotal = this.calcularCostoTotal(equipo.detalles);

    return {
      EquipoID: equipo.EquipoID,
      NumeroSerie: equipo.NumeroSerie,
      EsExterno: equipo.EsExterno === 1,
      Estatus: equipo.Estatus,
      Observaciones: equipo.Observaciones,
      FechaCreacion: equipo.FechaCreacion ? moment(equipo.FechaCreacion).format('YYYY-MM-DD') : null,
      FechaInstalacion: equipo.FechaInstalacion ? moment(equipo.FechaInstalacion).format('YYYY-MM-DD') : null,
      FechaDesmontaje: equipo.FechaDesmontaje ? moment(equipo.FechaDesmontaje).format('YYYY-MM-DD') : null,
      UsuarioCreadorID: equipo.UsuarioCreadorID,
      Plantilla: {
        PlantillaEquipoID: equipo.plantilla.PlantillaEquipoID,
        NombreEquipo: equipo.plantilla.NombreEquipo,
        Codigo: equipo.plantilla.Codigo,
        PorcentajeVenta: equipo.plantilla.PorcentajeVenta,
        PorcentajeRenta: equipo.plantilla.PorcentajeRenta,
      },
      CostoTotal: this.redondear(costoTotal),
      PrecioVenta: this.redondear(costoTotal * (1 + (equipo.plantilla.PorcentajeVenta || 35) / 100)),
      PrecioRenta: this.redondear(costoTotal * ((equipo.plantilla.PorcentajeRenta || 15) / 100)),
      Detalles: equipo.detalles.map((detalle: any) => ({
        EquipoDetalleID: detalle.EquipoDetalleID,
        RefaccionID: detalle.RefaccionID,
        Cantidad: detalle.Cantidad,
        Refaccion: {
          NombrePieza: detalle.refaccion.NombrePieza,
          NombreCorto: detalle.refaccion.NombreCorto,
          Codigo: detalle.refaccion.Codigo,
          CostoPromedio: detalle.refaccion.CostoPromedio || 0,
          Unidad: detalle.refaccion.catalogo_unidades?.DesUnidad || null,
        },
        Subtotal: this.redondear((detalle.refaccion.CostoPromedio || 0) * detalle.Cantidad),
      })),
    };
  }

  private calcularCostoTotal(detalles: { Cantidad: number; refaccion: { CostoPromedio: number | null } }[]): number {
    return detalles.reduce((total, detalle) => {
      return total + (detalle.refaccion.CostoPromedio || 0) * detalle.Cantidad;
    }, 0);
  }

  private redondear(valor: number): number {
    return Math.round(valor * 100) / 100;
  }
}

export const equiposService = new EquiposService();
