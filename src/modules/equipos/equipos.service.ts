import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { Prisma, EstatusEquipo, TipoAccionEquipo } from '@prisma/client';
import moment from 'moment';
import {
  CreateEquiposFromPlantillaDto,
  AgregarRefaccionEquipoDto,
  ModificarCantidadRefaccionDto,
  EliminarRefaccionEquipoDto,
  UpdateEquipoDto,
  InstalarEquipoDto,
  DesmontarEquipoDto,
  FinalizarReacondicionamientoDto,
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

        // Registrar historial de creación
        await this.registrarHistorial(
          tx,
          equipo.EquipoID,
          'CREACION',
          null,
          'Armado',
          `Equipo creado desde plantilla ${plantilla.NombreEquipo}`,
          { PlantillaID: plantilla.PlantillaEquipoID, NumeroSerie: numerosSerie[i] },
          usuarioId
        );

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
      where.Estatus = query.estatus as 'Armado' | 'Instalado' | 'Reacondicionado' | 'Desmontado';
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
   * Permitido en estados: Armado, Reacondicionado
   */
  async update(id: number, dto: UpdateEquipoDto, usuarioId?: number) {
    const equipo = await this.obtenerEquipoValidado(id, ['Armado', 'Reacondicionado']);

    await prisma.$transaction(async (tx) => {
      await tx.equipos.update({
        where: { EquipoID: id },
        data: { Observaciones: dto.Observaciones },
      });

      await this.registrarHistorial(
        tx,
        id,
        'MODIFICACION',
        equipo.Estatus,
        equipo.Estatus,
        'Observaciones actualizadas',
        { Observaciones: dto.Observaciones },
        usuarioId
      );
    });

    const equipoActualizado = await this.findOne(id);
    return { message: 'Equipo actualizado correctamente', data: equipoActualizado.data };
  }

  /**
   * Agrega una refacción al equipo
   * Permitido en estados: Armado, Reacondicionado
   */
  async agregarRefaccion(equipoId: number, dto: AgregarRefaccionEquipoDto, usuarioId?: number) {
    const result = await prisma.$transaction(async (tx) => {
      const equipo = await this.obtenerEquipoValidadoTx(tx, equipoId, ['Armado', 'Reacondicionado']);

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

      // Determinar tipo de movimiento según estado del equipo
      const tipoMovimiento = equipo.Estatus === 'Reacondicionado'
        ? 'Reacondicionamiento_Entrada'
        : 'Traspaso_Bodega_Equipo';

      // Validar stock si es equipo interno
      if (equipo.EsExterno === 0) {
        await this.validarStockRefaccion(tx, dto.RefaccionID, dto.Cantidad);
        await this.descontarInventarioConTipo(tx, dto.RefaccionID, dto.Cantidad, tipoMovimiento, equipoId, usuarioId);
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

      // Registrar historial
      await this.registrarHistorial(
        tx,
        equipoId,
        'AGREGAR_REFACCION',
        equipo.Estatus,
        equipo.Estatus,
        `Refacción agregada: ${refaccion.NombrePieza} (${dto.Cantidad})`,
        { RefaccionID: dto.RefaccionID, Cantidad: dto.Cantidad },
        usuarioId
      );

      return equipoId;
    });

    const equipoActualizado = await this.findOne(result);
    return { message: 'Refacción agregada correctamente', data: equipoActualizado.data };
  }

  /**
   * Modifica la cantidad de una refacción en el equipo
   * Permitido en estados: Armado, Reacondicionado
   */
  async modificarCantidadRefaccion(
    equipoId: number,
    detalleId: number,
    dto: ModificarCantidadRefaccionDto,
    usuarioId?: number
  ) {
    const result = await prisma.$transaction(async (tx) => {
      const equipo = await this.obtenerEquipoValidadoTx(tx, equipoId, ['Armado', 'Reacondicionado']);

      const detalle = await tx.equipos_detalle.findFirst({
        where: { EquipoDetalleID: detalleId, EquipoID: equipoId, IsActive: 1 },
        include: { refaccion: { select: { NombrePieza: true } } },
      });

      if (!detalle) {
        throw new HttpError('Detalle de equipo no encontrado', 404);
      }

      const diferencia = dto.Cantidad - detalle.Cantidad;
      const cantidadAnterior = detalle.Cantidad;

      // Determinar tipo de movimiento según estado del equipo
      const tipoMovimientoEntrada = equipo.Estatus === 'Reacondicionado'
        ? 'Reacondicionamiento_Entrada'
        : 'Traspaso_Bodega_Equipo';
      const tipoMovimientoSalida = equipo.Estatus === 'Reacondicionado'
        ? 'Reacondicionamiento_Salida'
        : 'Traspaso_Equipo';

      // Si es equipo interno, ajustar inventario
      if (equipo.EsExterno === 0) {
        if (diferencia > 0) {
          // Necesita más piezas - validar y descontar
          await this.validarStockRefaccion(tx, detalle.RefaccionID, diferencia);
          await this.descontarInventarioConTipo(tx, detalle.RefaccionID, diferencia, tipoMovimientoEntrada, equipoId, usuarioId);
        } else if (diferencia < 0) {
          // Devuelve piezas al inventario
          await this.incrementarInventarioConTipo(tx, detalle.RefaccionID, Math.abs(diferencia), tipoMovimientoSalida, equipoId, usuarioId);
        }
      }

      await tx.equipos_detalle.update({
        where: { EquipoDetalleID: detalleId },
        data: { Cantidad: dto.Cantidad },
      });

      // Registrar historial
      await this.registrarHistorial(
        tx,
        equipoId,
        'MODIFICAR_REFACCION',
        equipo.Estatus,
        equipo.Estatus,
        `Cantidad modificada: ${detalle.refaccion.NombrePieza} (${cantidadAnterior} → ${dto.Cantidad})`,
        { RefaccionID: detalle.RefaccionID, CantidadAnterior: cantidadAnterior, CantidadNueva: dto.Cantidad },
        usuarioId
      );

      return equipoId;
    });

    const equipoActualizado = await this.findOne(result);
    return { message: 'Cantidad actualizada correctamente', data: equipoActualizado.data };
  }

  /**
   * Elimina una refacción del equipo
   * Permitido en estados: Armado, Reacondicionado
   */
  async eliminarRefaccion(
    equipoId: number,
    detalleId: number,
    dto: EliminarRefaccionEquipoDto,
    usuarioId?: number
  ) {
    const result = await prisma.$transaction(async (tx) => {
      const equipo = await this.obtenerEquipoValidadoTx(tx, equipoId, ['Armado', 'Reacondicionado']);

      const detalle = await tx.equipos_detalle.findFirst({
        where: { EquipoDetalleID: detalleId, EquipoID: equipoId, IsActive: 1 },
        include: { refaccion: { select: { NombrePieza: true } } },
      });

      if (!detalle) {
        throw new HttpError('Detalle de equipo no encontrado', 404);
      }

      // Desactivar el detalle
      await tx.equipos_detalle.update({
        where: { EquipoDetalleID: detalleId },
        data: { IsActive: 0 },
      });

      // Determinar tipo de movimiento según estado del equipo
      const tipoMovimientoSalida = equipo.Estatus === 'Reacondicionado'
        ? 'Reacondicionamiento_Salida'
        : 'Traspaso_Equipo';

      // Si es equipo interno, procesar destino de refacciones
      if (equipo.EsExterno === 0) {
        if (dto.Destino === 'inventario') {
          await this.incrementarInventarioConTipo(tx, detalle.RefaccionID, detalle.Cantidad, tipoMovimientoSalida, equipoId, usuarioId);
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

      // Registrar historial
      await this.registrarHistorial(
        tx,
        equipoId,
        'ELIMINAR_REFACCION',
        equipo.Estatus,
        equipo.Estatus,
        `Refacción eliminada: ${detalle.refaccion.NombrePieza} (${detalle.Cantidad}) → ${dto.Destino}`,
        { RefaccionID: detalle.RefaccionID, Cantidad: detalle.Cantidad, Destino: dto.Destino },
        usuarioId
      );

      return equipoId;
    });

    const equipoActualizado = await this.findOne(result);
    return { message: 'Refacción eliminada correctamente', data: equipoActualizado.data };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CAMBIAR ESTATUS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Instala un equipo (Armado/Reacondicionado → Instalado)
   */
  async instalar(id: number, dto: InstalarEquipoDto, usuarioId?: number) {
    const equipo = await this.obtenerEquipoValidado(id, ['Armado', 'Reacondicionado']);

    const fechaInstalacion = dto.FechaInstalacion
      ? moment(dto.FechaInstalacion).toDate()
      : new Date();

    const estatusAnterior = equipo.Estatus;

    await prisma.$transaction(async (tx) => {
      await tx.equipos.update({
        where: { EquipoID: id },
        data: {
          Estatus: 'Instalado',
          FechaInstalacion: fechaInstalacion,
        },
      });

      await this.registrarHistorial(
        tx,
        id,
        'INSTALACION',
        estatusAnterior,
        'Instalado',
        `Equipo instalado (desde ${estatusAnterior})`,
        { FechaInstalacion: fechaInstalacion },
        usuarioId
      );
    });

    const equipoActualizado = await this.findOne(id);
    return { message: 'Equipo instalado correctamente', data: equipoActualizado.data };
  }

  /**
   * Desmonta un equipo (Armado/Instalado → Desmontado)
   * Solo equipos internos (Purifreeze) pueden desmontarse
   *
   * Casos de uso:
   * - Desde servicio: Equipo Instalado que se retira del cliente
   * - Desde fábrica: Equipo Armado que se desarma para recuperar refacciones
   *
   * IMPORTANTE: Todas las refacciones del equipo DEBEN ser procesadas
   * Opciones:
   * 1. TodoAlInventario = true: Todas las refacciones regresan automáticamente al inventario
   * 2. TodoAlInventario = false + Refacciones[]: El usuario especifica el destino de cada refacción
   */
  async desmontar(id: number, dto: DesmontarEquipoDto, usuarioId?: number) {
    const result = await prisma.$transaction(async (tx) => {
      const equipo = await this.obtenerEquipoValidadoTx(tx, id, ['Armado', 'Instalado']);

      // Solo equipos Purifreeze pueden desmontarse
      if (equipo.EsExterno === 1) {
        throw new HttpError('Solo equipos Purifreeze pueden desmontarse', 400);
      }

      const fechaDesmontaje = dto.FechaDesmontaje
        ? moment(dto.FechaDesmontaje).toDate()
        : new Date();

      // Obtener todas las refacciones del equipo
      const detallesEquipo = await tx.equipos_detalle.findMany({
        where: { EquipoID: id, IsActive: 1 },
        include: {
          refaccion: { select: { NombrePieza: true } },
        },
      });

      if (detallesEquipo.length === 0) {
        throw new HttpError('El equipo no tiene refacciones para desmontar', 400);
      }

      const refaccionesProcesadas: { RefaccionID: number; Cantidad: number; Destino: string; NombrePieza: string | null }[] = [];

      // OPCIÓN 1: Todo al inventario automáticamente
      if (dto.TodoAlInventario === true) {
        for (const detalle of detallesEquipo) {
          // Incrementar inventario y registrar en kardex
          await this.incrementarInventarioConTipo(
            tx,
            detalle.RefaccionID,
            detalle.Cantidad,
            'Traspaso_Equipo',
            id,
            usuarioId
          );

          refaccionesProcesadas.push({
            RefaccionID: detalle.RefaccionID,
            Cantidad: detalle.Cantidad,
            Destino: 'inventario',
            NombrePieza: detalle.refaccion.NombrePieza,
          });

          // Desactivar el detalle del equipo
          await tx.equipos_detalle.update({
            where: { EquipoDetalleID: detalle.EquipoDetalleID },
            data: { IsActive: 0 },
          });
        }
      }
      // OPCIÓN 2: El usuario especifica el destino de cada refacción
      else if (dto.Refacciones && dto.Refacciones.length > 0) {
        // Validar que TODAS las refacciones del equipo estén en el array
        const refaccionesEnEquipo = new Map(
          detallesEquipo.map(d => [d.RefaccionID, { cantidad: d.Cantidad, nombre: d.refaccion.NombrePieza, detalleId: d.EquipoDetalleID }])
        );

        // Agrupar cantidades por RefaccionID del dto
        const cantidadesPorRefaccion = new Map<number, number>();
        for (const ref of dto.Refacciones) {
          const actual = cantidadesPorRefaccion.get(ref.RefaccionID) || 0;
          cantidadesPorRefaccion.set(ref.RefaccionID, actual + ref.Cantidad);
        }

        // Validar que cada refacción del equipo esté completamente procesada
        for (const [refaccionId, info] of refaccionesEnEquipo) {
          const cantidadProcesada = cantidadesPorRefaccion.get(refaccionId) || 0;

          if (cantidadProcesada === 0) {
            throw new HttpError(
              `Falta especificar destino para la refacción "${info.nombre}" (RefaccionID: ${refaccionId}). Cantidad en equipo: ${info.cantidad}`,
              400
            );
          }

          if (cantidadProcesada !== info.cantidad) {
            throw new HttpError(
              `La cantidad procesada para "${info.nombre}" (${cantidadProcesada}) no coincide con la cantidad en el equipo (${info.cantidad})`,
              400
            );
          }
        }

        // Validar que no haya refacciones en el dto que no estén en el equipo
        for (const ref of dto.Refacciones) {
          if (!refaccionesEnEquipo.has(ref.RefaccionID)) {
            throw new HttpError(`Refacción ${ref.RefaccionID} no encontrada en el equipo`, 404);
          }
        }

        // Procesar cada refacción según su destino
        for (const ref of dto.Refacciones) {
          const info = refaccionesEnEquipo.get(ref.RefaccionID)!;

          if (ref.Destino === 'inventario') {
            // Incrementar inventario y registrar en kardex
            await this.incrementarInventarioConTipo(
              tx,
              ref.RefaccionID,
              ref.Cantidad,
              'Traspaso_Equipo',
              id,
              usuarioId
            );
          } else if (ref.Destino === 'danada') {
            if (!ref.MotivoDano) {
              throw new HttpError(`MotivoDano es requerido para refacción "${info.nombre}"`, 400);
            }
            // Registrar como dañada (no incrementa inventario)
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

          refaccionesProcesadas.push({
            RefaccionID: ref.RefaccionID,
            Cantidad: ref.Cantidad,
            Destino: ref.Destino,
            NombrePieza: info.nombre,
          });
        }

        // Desactivar todos los detalles del equipo
        for (const detalle of detallesEquipo) {
          await tx.equipos_detalle.update({
            where: { EquipoDetalleID: detalle.EquipoDetalleID },
            data: { IsActive: 0 },
          });
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

      // Construir descripción del historial
      const refaccionesAlInventario = refaccionesProcesadas.filter(r => r.Destino === 'inventario').length;
      const refaccionesDanadas = refaccionesProcesadas.filter(r => r.Destino === 'danada').length;
      const descripcionHistorial = dto.TodoAlInventario
        ? `Equipo desmontado. Todas las refacciones (${detallesEquipo.length}) regresaron al inventario`
        : `Equipo desmontado. Refacciones: ${refaccionesAlInventario} al inventario, ${refaccionesDanadas} dañadas`;

      // Registrar historial
      await this.registrarHistorial(
        tx,
        id,
        'DESINSTALACION',
        equipo.Estatus,
        'Desmontado',
        descripcionHistorial,
        {
          FechaDesmontaje: fechaDesmontaje,
          TodoAlInventario: dto.TodoAlInventario,
          Refacciones: refaccionesProcesadas
        },
        usuarioId
      );

      return id;
    });

    const equipoActualizado = await this.findOne(result);
    return { message: 'Equipo desmontado correctamente', data: equipoActualizado.data };
  }

  /**
   * Finaliza el reacondicionamiento de un equipo (Reacondicionado → Armado)
   * Marca el equipo como listo para un nuevo uso
   */
  async finalizarReacondicionamiento(id: number, dto: FinalizarReacondicionamientoDto, usuarioId?: number) {
    const equipo = await this.obtenerEquipoValidado(id, ['Reacondicionado']);

    // Solo equipos Purifreeze pueden reacondicionarse
    if (equipo.EsExterno === 1) {
      throw new HttpError('Solo equipos Purifreeze pueden reacondicionarse', 400);
    }

    await prisma.$transaction(async (tx) => {
      // Actualizar estado del equipo
      await tx.equipos.update({
        where: { EquipoID: id },
        data: {
          Estatus: 'Armado',
          FechaReacondicionamiento: new Date(),
          VecesReacondicionado: { increment: 1 },
          Observaciones: dto.Observaciones || equipo.Observaciones,
        },
      });

      // Registrar historial
      await this.registrarHistorial(
        tx,
        id,
        'FIN_REACONDICIONAMIENTO',
        'Reacondicionado',
        'Armado',
        `Reacondicionamiento finalizado. Veces reacondicionado: ${equipo.VecesReacondicionado + 1}`,
        { Observaciones: dto.Observaciones, VecesReacondicionado: equipo.VecesReacondicionado + 1 },
        usuarioId
      );
    });

    const equipoActualizado = await this.findOne(id);
    return { message: 'Reacondicionamiento finalizado. Equipo listo para nuevo uso.', data: equipoActualizado.data };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DAR DE BAJA / ACTIVAR
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Da de baja un equipo (soft delete)
   * No se permite dar de baja equipos en estado "Instalado"
   * Para dar de baja un equipo instalado, primero debe desmontarse
   */
  async deactivate(id: number, usuarioId?: number) {
    const equipo = await prisma.equipos.findFirst({
      where: { EquipoID: id, IsActive: 1 },
      include: {
        plantilla: { select: { NombreEquipo: true } },
      },
    });

    if (!equipo) {
      throw new HttpError('Equipo no encontrado', 404);
    }

    // No permitir dar de baja equipos instalados
    if (equipo.Estatus === 'Instalado') {
      throw new HttpError(
        `No se puede dar de baja un equipo instalado. El equipo "${equipo.NumeroSerie}" (${equipo.plantilla.NombreEquipo}) debe desmontarse primero`,
        400
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.equipos.update({
        where: { EquipoID: id },
        data: { IsActive: 0 },
      });

      await this.registrarHistorial(
        tx,
        id,
        'BAJA',
        equipo.Estatus,
        equipo.Estatus,
        `Equipo dado de baja (estado: ${equipo.Estatus})`,
        { EstatusAlDarDeBaja: equipo.Estatus },
        usuarioId
      );
    });

    return { message: 'Equipo dado de baja correctamente', data: { EquipoID: id } };
  }

  /**
   * Activa un equipo
   */
  async activate(id: number, usuarioId?: number) {
    const equipo = await prisma.equipos.findFirst({
      where: { EquipoID: id, IsActive: 0 },
    });

    if (!equipo) {
      throw new HttpError('Equipo no encontrado o ya está activo', 404);
    }

    await prisma.$transaction(async (tx) => {
      await tx.equipos.update({
        where: { EquipoID: id },
        data: { IsActive: 1 },
      });

      await this.registrarHistorial(
        tx,
        id,
        'ACTIVACION',
        equipo.Estatus,
        equipo.Estatus,
        'Equipo reactivado',
        undefined,
        usuarioId
      );
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

    // Registrar en kardex (usar moment para evitar problemas de zona horaria)
    await tx.kardex_inventario.create({
      data: {
        RefaccionID: refaccionId,
        FechaMovimiento: new Date(moment().format('YYYY-MM-DD')),
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

    // Registrar en kardex (usar moment para evitar problemas de zona horaria)
    await tx.kardex_inventario.create({
      data: {
        RefaccionID: refaccionId,
        FechaMovimiento: new Date(moment().format('YYYY-MM-DD')),
        TipoMovimiento: 'Traspaso_Equipo',
        Cantidad: cantidad,
        CostoPromedioMovimiento: refaccion?.CostoPromedio || 0,
        UsuarioID: usuarioId || null,
        Observaciones: 'Retorno de equipo a bodega',
      },
    });
  }

  /**
   * Descuenta del inventario con tipo de movimiento específico
   * Usado para diferenciar entre armado normal y reacondicionamiento
   */
  private async descontarInventarioConTipo(
    tx: Prisma.TransactionClient,
    refaccionId: number,
    cantidad: number,
    tipoMovimiento: string,
    equipoId: number,
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

    // Determinar observación según tipo
    const observacion = tipoMovimiento === 'Reacondicionamiento_Entrada'
      ? `Entrada a equipo ${equipoId} durante reacondicionamiento`
      : `Salida para equipo ${equipoId}`;

    // Registrar en kardex (usar moment para evitar problemas de zona horaria)
    await tx.kardex_inventario.create({
      data: {
        RefaccionID: refaccionId,
        FechaMovimiento: new Date(moment().format('YYYY-MM-DD')),
        TipoMovimiento: tipoMovimiento as any,
        Cantidad: -cantidad,
        CostoPromedioMovimiento: refaccion?.CostoPromedio || 0,
        UsuarioID: usuarioId || null,
        Observaciones: observacion,
      },
    });
  }

  /**
   * Incrementa el inventario con tipo de movimiento específico
   * Usado para diferenciar entre retorno normal y reacondicionamiento
   */
  private async incrementarInventarioConTipo(
    tx: Prisma.TransactionClient,
    refaccionId: number,
    cantidad: number,
    tipoMovimiento: string,
    equipoId: number,
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

    // Determinar observación según tipo
    const observacion = tipoMovimiento === 'Reacondicionamiento_Salida'
      ? `Salida de equipo ${equipoId} durante reacondicionamiento`
      : `Retorno desde equipo ${equipoId} a bodega`;

    // Registrar en kardex (usar moment para evitar problemas de zona horaria)
    await tx.kardex_inventario.create({
      data: {
        RefaccionID: refaccionId,
        FechaMovimiento: new Date(moment().format('YYYY-MM-DD')),
        TipoMovimiento: tipoMovimiento as any,
        Cantidad: cantidad,
        CostoPromedioMovimiento: refaccion?.CostoPromedio || 0,
        UsuarioID: usuarioId || null,
        Observaciones: observacion,
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
  // UTILIDADES PRIVADAS - HISTORIAL
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Registra un evento en el historial del equipo
   */
  private async registrarHistorial(
    tx: Prisma.TransactionClient,
    equipoId: number,
    tipoAccion: string,
    estatusAnterior: string | null,
    estatusNuevo: string | null,
    descripcion: string,
    detalleJSON?: object,
    usuarioId?: number
  ): Promise<void> {
    await tx.equipos_historial.create({
      data: {
        EquipoID: equipoId,
        TipoAccion: tipoAccion as TipoAccionEquipo,
        EstatusAnterior: estatusAnterior as EstatusEquipo | null,
        EstatusNuevo: estatusNuevo as EstatusEquipo | null,
        Descripcion: descripcion,
        DetalleJSON: detalleJSON ? JSON.stringify(detalleJSON) : null,
        UsuarioID: usuarioId || null,
      },
    });
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
      FechaReacondicionamiento: equipo.FechaReacondicionamiento ? moment(equipo.FechaReacondicionamiento).format('YYYY-MM-DD') : null,
      VecesReacondicionado: equipo.VecesReacondicionado || 0,
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
      FechaReacondicionamiento: equipo.FechaReacondicionamiento ? moment(equipo.FechaReacondicionamiento).format('YYYY-MM-DD') : null,
      VecesReacondicionado: equipo.VecesReacondicionado || 0,
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
