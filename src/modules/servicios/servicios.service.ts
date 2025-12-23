import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { Prisma, TipoServicio, EstatusServicio } from '@prisma/client';
import moment from 'moment';
import {
  CreateServicioDto,
  UpdateServicioDto,
  CambiarEstatusDto,
  CancelarServicioDto,
  ReagendarServicioDto,
  AgregarEquipoServicioDto,
  ActualizarRefaccionDto,
  AgregarRefaccionEquipoServicioDto,
  EliminarRefaccionEquipoServicioDto,
  AgregarInsumoDto,
  ModificarInsumoDto,
  ConfigurarDesinstalacionDto,
  FinalizarServicioDto,
  SearchServiciosQuery,
  AgendaQuery,
} from './servicios.schema';

class ServiciosService {
  // ═══════════════════════════════════════════════════════════════════════════
  // CREAR SERVICIO
  // ═══════════════════════════════════════════════════════════════════════════

  async create(dto: CreateServicioDto, usuarioId?: number) {
    const servicioId = await prisma.$transaction(async (tx) => {
      // Validar que el contrato existe y está activo
      const contrato = await tx.contratos.findFirst({
        where: { ContratoID: dto.ContratoID, IsActive: 1, Estatus: 'ACTIVO' },
        include: {
          cliente: { select: { NombreComercio: true } },
          equipos: {
            where: { IsActive: 1 },
            include: {
              equipo: { select: { EquipoID: true, NumeroSerie: true, Estatus: true, EsExterno: true } },
              plantilla: { select: { NombreEquipo: true } },
            },
          },
        },
      });

      if (!contrato) {
        throw new HttpError('Contrato no encontrado o no está activo', 404);
      }

      // Validar equipos seleccionados
      const equiposContrato = contrato.equipos.filter(e => dto.EquiposIDs.includes(e.ContratoEquipoID));
      if (equiposContrato.length !== dto.EquiposIDs.length) {
        throw new HttpError('Algunos equipos seleccionados no pertenecen al contrato', 400);
      }

      // Validar reglas de negocio según tipo de servicio
      for (const contratoEquipo of equiposContrato) {
        const equipo = contratoEquipo.equipo;
        const esExterno = equipo?.EsExterno === 1 || contratoEquipo.TipoItem === 'EQUIPO_EXTERNO';

        if (dto.TipoServicio === 'INSTALACION') {
          // Solo equipos Purifreeze pueden instalarse
          if (esExterno) {
            throw new HttpError(`Equipos externos no requieren instalación: ${contratoEquipo.plantilla?.NombreEquipo || 'Equipo'}`, 400);
          }
          // El equipo debe estar en estado Armado o Reacondicionado
          if (equipo && !['Armado', 'Reacondicionado'].includes(equipo.Estatus)) {
            throw new HttpError(`El equipo ${equipo.NumeroSerie} debe estar en estado Armado o Reacondicionado para instalarse. Estado actual: ${equipo.Estatus}`, 400);
          }
        } else if (dto.TipoServicio === 'DESINSTALACION') {
          // Solo equipos Purifreeze pueden desinstalarse
          if (esExterno) {
            throw new HttpError(`Equipos externos no pueden desinstalarse: ${contratoEquipo.plantilla?.NombreEquipo || 'Equipo'}`, 400);
          }
          // El equipo debe estar instalado
          if (equipo && equipo.Estatus !== 'Instalado') {
            throw new HttpError(`El equipo ${equipo.NumeroSerie} debe estar instalado para desinstalarse. Estado actual: ${equipo.Estatus}`, 400);
          }
        } else {
          // MANTENIMIENTO o REPARACION
          // Equipos Purifreeze deben estar instalados
          if (!esExterno && equipo && equipo.Estatus !== 'Instalado') {
            throw new HttpError(`El equipo Purifreeze ${equipo.NumeroSerie} debe estar instalado para recibir mantenimiento. Estado actual: ${equipo.Estatus}`, 400);
          }
        }
      }

      // Crear el servicio
      const servicio = await tx.servicios.create({
        data: {
          ContratoID: dto.ContratoID,
          TipoServicio: dto.TipoServicio as TipoServicio,
          FechaProgramada: moment(dto.FechaProgramada).toDate(),
          HoraProgramada: dto.HoraProgramada ? moment(dto.HoraProgramada, 'HH:mm').toDate() : null,
          TecnicoID: dto.TecnicoID || null,
          OrigenInventario: dto.OrigenInventario || 'TECNICO',
          Estatus: dto.TecnicoID ? 'PENDIENTE' : 'POR_CONFIRMAR',
          ObservacionesGenerales: dto.ObservacionesGenerales || null,
          UsuarioCreadorID: usuarioId || null,
          IsActive: 1,
        },
      });

      // Crear servicios_equipos con sus refacciones
      for (const contratoEquipoId of dto.EquiposIDs) {
        const contratoEquipo = equiposContrato.find(e => e.ContratoEquipoID === contratoEquipoId)!;

        const servicioEquipo = await tx.servicios_equipos.create({
          data: {
            ServicioID: servicio.ServicioID,
            ContratoEquipoID: contratoEquipoId,
            EquipoID: contratoEquipo.EquipoID,
            IsActive: 1,
          },
        });

        // Cargar refacciones del equipo si existe
        if (contratoEquipo.EquipoID) {
          const equipoDetalles = await tx.equipos_detalle.findMany({
            where: { EquipoID: contratoEquipo.EquipoID, IsActive: 1 },
          });

          for (const detalle of equipoDetalles) {
            await tx.servicios_equipos_refacciones.create({
              data: {
                ServicioEquipoID: servicioEquipo.ServicioEquipoID,
                RefaccionID: detalle.RefaccionID,
                CantidadEquipo: detalle.Cantidad,
                CantidadTecnico: 0,
                Cambio: 0,
                Limpieza: 0,
                Verificacion: 0,
                IsActive: 1,
              },
            });
          }
        }
      }

      // Registrar en historial
      await this.registrarHistorial(tx, servicio.ServicioID, 'CREACION', 'Servicio creado', null, JSON.stringify({
        TipoServicio: dto.TipoServicio,
        Equipos: dto.EquiposIDs.length,
      }), usuarioId);

      return servicio.ServicioID;
    });

    // Retornar el servicio completo (fuera de la transacción)
    return await this.findOne(servicioId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONSULTAS
  // ═══════════════════════════════════════════════════════════════════════════

  async findAll(query: SearchServiciosQuery) {
    const where: Prisma.serviciosWhereInput = { IsActive: 1 };

    if (query.estatus) {
      where.Estatus = query.estatus as EstatusServicio;
    }

    if (query.tipo) {
      where.TipoServicio = query.tipo as TipoServicio;
    }

    if (query.tecnicoId) {
      where.TecnicoID = query.tecnicoId;
    }

    if (query.contratoId) {
      where.ContratoID = query.contratoId;
    }

    if (query.clienteId) {
      where.contrato = { ClienteID: query.clienteId };
    }

    if (query.fechaDesde || query.fechaHasta) {
      where.FechaProgramada = {};
      if (query.fechaDesde) {
        where.FechaProgramada.gte = moment(query.fechaDesde).toDate();
      }
      if (query.fechaHasta) {
        where.FechaProgramada.lte = moment(query.fechaHasta).toDate();
      }
    }

    if (query.q) {
      where.OR = [
        { contrato: { NumeroContrato: { contains: query.q } } },
        { contrato: { cliente: { NombreComercio: { contains: query.q } } } },
        { ObservacionesGenerales: { contains: query.q } },
      ];
    }

    const servicios = await prisma.servicios.findMany({
      where,
      include: {
        contrato: {
          select: {
            ContratoID: true,
            NumeroContrato: true,
            cliente: { select: { ClienteID: true, NombreComercio: true } },
            sucursal: { select: { SucursalID: true, NombreSucursal: true, Direccion: true } },
          },
        },
        tecnico: {
          select: {
            TecnicoID: true,
            Codigo: true,
            Telefono: true,
            usuario: { select: { NombreCompleto: true } },
          },
        },
        equipos: {
          where: { IsActive: 1 },
          select: { ServicioEquipoID: true },
        },
      },
      orderBy: [{ FechaProgramada: 'asc' }, { HoraProgramada: 'asc' }],
    });

    return {
      message: 'Servicios obtenidos',
      data: servicios.map(s => this.formatearServicioResumen(s)),
    };
  }

  async findOne(id: number) {
    const servicio = await prisma.servicios.findFirst({
      where: { ServicioID: id, IsActive: 1 },
      include: {
        contrato: {
          select: {
            ContratoID: true,
            NumeroContrato: true,
            FrecuenciaMantenimiento: true,
            cliente: { select: { ClienteID: true, NombreComercio: true } },
            sucursal: { select: { SucursalID: true, NombreSucursal: true, Direccion: true, Telefono: true, Contacto: true } },
          },
        },
        tecnico: {
          select: {
            TecnicoID: true,
            Codigo: true,
            Telefono: true,
            usuario: { select: { NombreCompleto: true } },
          },
        },
        equipos: {
          where: { IsActive: 1 },
          include: {
            equipo: {
              select: {
                EquipoID: true,
                NumeroSerie: true,
                Estatus: true,
                EsExterno: true,
                plantilla: { select: { NombreEquipo: true, Codigo: true } },
              },
            },
            contrato_equipo: {
              select: {
                ContratoEquipoID: true,
                Modalidad: true,
                plantilla: { select: { NombreEquipo: true, Codigo: true } },
              },
            },
            refacciones: {
              where: { IsActive: 1 },
              include: {
                refaccion: {
                  select: {
                    RefaccionID: true,
                    NombrePieza: true,
                    NombreCorto: true,
                    Codigo: true,
                    CostoPromedio: true,
                    catalogo_unidades: { select: { DesUnidad: true } },
                  },
                },
                refaccion_nueva: {
                  select: {
                    RefaccionID: true,
                    NombrePieza: true,
                    NombreCorto: true,
                    Codigo: true,
                  },
                },
              },
            },
          },
        },
        insumos: {
          where: { IsActive: 1 },
          include: {
            refaccion: {
              select: {
                RefaccionID: true,
                NombrePieza: true,
                NombreCorto: true,
                Codigo: true,
                CostoPromedio: true,
                catalogo_unidades: { select: { DesUnidad: true } },
              },
            },
          },
        },
        firmas: {
          where: { IsActive: 1 },
          select: {
            FirmaID: true,
            TipoFirma: true,
            NombreFirmante: true,
            FechaFirma: true,
          },
        },
      },
    });

    if (!servicio) {
      throw new HttpError('Servicio no encontrado', 404);
    }

    return { message: 'Servicio obtenido', data: this.formatearServicioCompleto(servicio) };
  }

  async getAgenda(query: AgendaQuery) {
    const where: Prisma.serviciosWhereInput = {
      IsActive: 1,
      Estatus: { in: ['POR_CONFIRMAR', 'PENDIENTE', 'CONFIRMADO', 'EN_PROCESO'] },
    };

    if (query.tecnicoId) {
      where.TecnicoID = query.tecnicoId;
    }

    const fechaDesde = query.fechaDesde ? moment(query.fechaDesde) : moment().startOf('week');
    const fechaHasta = query.fechaHasta ? moment(query.fechaHasta) : moment().endOf('week').add(2, 'weeks');

    where.FechaProgramada = {
      gte: fechaDesde.toDate(),
      lte: fechaHasta.toDate(),
    };

    const servicios = await prisma.servicios.findMany({
      where,
      include: {
        contrato: {
          select: {
            NumeroContrato: true,
            cliente: { select: { NombreComercio: true } },
            sucursal: { select: { NombreSucursal: true, Direccion: true } },
          },
        },
        tecnico: {
          select: {
            TecnicoID: true,
            Codigo: true,
            usuario: { select: { NombreCompleto: true } },
          },
        },
        equipos: {
          where: { IsActive: 1 },
          select: { ServicioEquipoID: true },
        },
      },
      orderBy: [{ FechaProgramada: 'asc' }, { HoraProgramada: 'asc' }],
    });

    return {
      message: 'Agenda obtenida',
      data: servicios.map(s => ({
        ServicioID: s.ServicioID,
        TipoServicio: s.TipoServicio,
        FechaProgramada: moment(s.FechaProgramada).format('YYYY-MM-DD'),
        HoraProgramada: s.HoraProgramada ? moment(s.HoraProgramada).format('HH:mm') : null,
        Estatus: s.Estatus,
        NumeroContrato: s.contrato.NumeroContrato,
        NombreCliente: s.contrato.cliente.NombreComercio,
        Sucursal: s.contrato.sucursal?.NombreSucursal || null,
        Direccion: s.contrato.sucursal?.Direccion || null,
        Tecnico: s.tecnico ? {
          TecnicoID: s.tecnico.TecnicoID,
          Codigo: s.tecnico.Codigo,
          Nombre: s.tecnico.usuario.NombreCompleto,
        } : null,
        TotalEquipos: s.equipos.length,
      })),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ACTUALIZAR SERVICIO
  // ═══════════════════════════════════════════════════════════════════════════

  async update(id: number, dto: UpdateServicioDto, usuarioId?: number) {
    const servicio = await this.obtenerServicioValidado(id, ['POR_CONFIRMAR', 'PENDIENTE', 'CONFIRMADO']);

    const dataUpdate: Prisma.serviciosUpdateInput = {};

    if (dto.FechaProgramada !== undefined) {
      dataUpdate.FechaProgramada = moment(dto.FechaProgramada).toDate();
    }
    if (dto.HoraProgramada !== undefined) {
      dataUpdate.HoraProgramada = dto.HoraProgramada ? moment(dto.HoraProgramada, 'HH:mm').toDate() : null;
    }
    if (dto.TecnicoID !== undefined) {
      if (dto.TecnicoID) {
        dataUpdate.tecnico = { connect: { TecnicoID: dto.TecnicoID } };
        // Si se asigna técnico y está POR_CONFIRMAR, pasar a PENDIENTE
        if (servicio.Estatus === 'POR_CONFIRMAR') {
          dataUpdate.Estatus = 'PENDIENTE';
        }
      } else {
        dataUpdate.tecnico = { disconnect: true };
      }
    }
    if (dto.OrigenInventario !== undefined) {
      dataUpdate.OrigenInventario = dto.OrigenInventario;
    }
    if (dto.ObservacionesAntes !== undefined) {
      dataUpdate.ObservacionesAntes = dto.ObservacionesAntes;
    }
    if (dto.ObservacionesDespues !== undefined) {
      dataUpdate.ObservacionesDespues = dto.ObservacionesDespues;
    }
    if (dto.ObservacionesGenerales !== undefined) {
      dataUpdate.ObservacionesGenerales = dto.ObservacionesGenerales;
    }

    await prisma.servicios.update({
      where: { ServicioID: id },
      data: dataUpdate,
    });

    await this.registrarHistorial(prisma, id, 'MODIFICACION', 'Servicio actualizado', null, JSON.stringify(dto), usuarioId);

    return await this.findOne(id);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CAMBIO DE ESTATUS
  // ═══════════════════════════════════════════════════════════════════════════

  async cambiarEstatus(id: number, dto: CambiarEstatusDto, usuarioId?: number) {
    const servicio = await this.obtenerServicioValidado(id);
    const estatusAnterior = servicio.Estatus;

    // Validar transiciones permitidas
    const transicionesPermitidas: Record<string, string[]> = {
      'POR_CONFIRMAR': ['PENDIENTE', 'CANCELADO'],
      'PENDIENTE': ['CONFIRMADO', 'CANCELADO'],
      'CONFIRMADO': ['EN_PROCESO', 'CANCELADO'],
      'EN_PROCESO': ['REALIZADO', 'CANCELADO'],
    };

    if (!transicionesPermitidas[estatusAnterior]?.includes(dto.Estatus)) {
      throw new HttpError(`No se puede cambiar de ${estatusAnterior} a ${dto.Estatus}`, 400);
    }

    // Validaciones específicas
    if (dto.Estatus === 'PENDIENTE' && !servicio.TecnicoID) {
      throw new HttpError('Debe asignar un técnico antes de pasar a PENDIENTE', 400);
    }

    await prisma.servicios.update({
      where: { ServicioID: id },
      data: { Estatus: dto.Estatus as EstatusServicio },
    });

    await this.registrarHistorial(prisma, id, 'CAMBIO_ESTATUS', `Estatus cambiado de ${estatusAnterior} a ${dto.Estatus}`, estatusAnterior, dto.Estatus, usuarioId);

    return await this.findOne(id);
  }

  async cancelar(id: number, dto: CancelarServicioDto, usuarioId?: number) {
    const servicio = await this.obtenerServicioValidado(id, ['POR_CONFIRMAR', 'PENDIENTE', 'CONFIRMADO', 'EN_PROCESO']);

    await prisma.servicios.update({
      where: { ServicioID: id },
      data: {
        Estatus: 'CANCELADO',
        MotivoCancelacion: dto.MotivoCancelacion,
      },
    });

    await this.registrarHistorial(prisma, id, 'CANCELACION', `Servicio cancelado: ${dto.MotivoCancelacion}`, servicio.Estatus, 'CANCELADO', usuarioId);

    return await this.findOne(id);
  }

  async reagendar(id: number, dto: ReagendarServicioDto, usuarioId?: number) {
    const servicioOriginal = await this.obtenerServicioValidado(id, ['POR_CONFIRMAR', 'PENDIENTE', 'CONFIRMADO']);

    return await prisma.$transaction(async (tx) => {
      // Cancelar el servicio original
      await tx.servicios.update({
        where: { ServicioID: id },
        data: {
          Estatus: 'CANCELADO',
          MotivoReagendamiento: dto.MotivoReagendamiento,
        },
      });

      // Crear nuevo servicio con los mismos equipos
      const equiposOriginales = await tx.servicios_equipos.findMany({
        where: { ServicioID: id, IsActive: 1 },
        select: { ContratoEquipoID: true },
      });

      const nuevoServicio = await tx.servicios.create({
        data: {
          ContratoID: servicioOriginal.ContratoID,
          TipoServicio: servicioOriginal.TipoServicio,
          FechaProgramada: moment(dto.NuevaFechaProgramada).toDate(),
          HoraProgramada: dto.NuevaHoraProgramada ? moment(dto.NuevaHoraProgramada, 'HH:mm').toDate() : servicioOriginal.HoraProgramada,
          TecnicoID: dto.NuevoTecnicoID || servicioOriginal.TecnicoID,
          OrigenInventario: servicioOriginal.OrigenInventario,
          Estatus: (dto.NuevoTecnicoID || servicioOriginal.TecnicoID) ? 'PENDIENTE' : 'POR_CONFIRMAR',
          ObservacionesGenerales: servicioOriginal.ObservacionesGenerales,
          ServicioOrigenID: id,
          UsuarioCreadorID: usuarioId || null,
          IsActive: 1,
        },
      });

      // Copiar equipos al nuevo servicio
      for (const equipo of equiposOriginales) {
        const nuevoServicioEquipo = await tx.servicios_equipos.create({
          data: {
            ServicioID: nuevoServicio.ServicioID,
            ContratoEquipoID: equipo.ContratoEquipoID,
            EquipoID: null, // Se cargará con las refacciones actuales
            IsActive: 1,
          },
        });

        // Obtener el equipo del contrato
        const contratoEquipo = await tx.contratos_equipos.findUnique({
          where: { ContratoEquipoID: equipo.ContratoEquipoID },
          select: { EquipoID: true },
        });

        if (contratoEquipo?.EquipoID) {
          await tx.servicios_equipos.update({
            where: { ServicioEquipoID: nuevoServicioEquipo.ServicioEquipoID },
            data: { EquipoID: contratoEquipo.EquipoID },
          });

          // Cargar refacciones actuales del equipo
          const equipoDetalles = await tx.equipos_detalle.findMany({
            where: { EquipoID: contratoEquipo.EquipoID, IsActive: 1 },
          });

          for (const detalle of equipoDetalles) {
            await tx.servicios_equipos_refacciones.create({
              data: {
                ServicioEquipoID: nuevoServicioEquipo.ServicioEquipoID,
                RefaccionID: detalle.RefaccionID,
                CantidadEquipo: detalle.Cantidad,
                CantidadTecnico: 0,
                Cambio: 0,
                Limpieza: 0,
                Verificacion: 0,
                IsActive: 1,
              },
            });
          }
        }
      }

      await this.registrarHistorial(tx, id, 'REAGENDAMIENTO', `Reagendado a servicio ${nuevoServicio.ServicioID}`, null, dto.MotivoReagendamiento, usuarioId);
      await this.registrarHistorial(tx, nuevoServicio.ServicioID, 'CREACION', `Servicio creado por reagendamiento desde ${id}`, null, null, usuarioId);

      return await this.findOneInternal(tx, nuevoServicio.ServicioID);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GESTIÓN DE REFACCIONES
  // ═══════════════════════════════════════════════════════════════════════════

  async actualizarRefaccion(servicioId: number, dto: ActualizarRefaccionDto, usuarioId?: number) {
    await this.obtenerServicioValidado(servicioId, ['POR_CONFIRMAR', 'PENDIENTE', 'CONFIRMADO', 'EN_PROCESO']);

    const refaccion = await prisma.servicios_equipos_refacciones.findFirst({
      where: {
        ServicioEquipoRefaccionID: dto.ServicioEquipoRefaccionID,
        servicio_equipo: { ServicioID: servicioId },
        IsActive: 1,
      },
    });

    if (!refaccion) {
      throw new HttpError('Refacción no encontrada en este servicio', 404);
    }

    const dataUpdate: Prisma.servicios_equipos_refaccionesUpdateInput = {};

    if (dto.CantidadTecnico !== undefined) dataUpdate.CantidadTecnico = dto.CantidadTecnico;
    if (dto.Cambio !== undefined) dataUpdate.Cambio = dto.Cambio ? 1 : 0;
    if (dto.Limpieza !== undefined) dataUpdate.Limpieza = dto.Limpieza ? 1 : 0;
    if (dto.Verificacion !== undefined) dataUpdate.Verificacion = dto.Verificacion ? 1 : 0;
    if (dto.RefaccionNuevaID !== undefined) {
      if (dto.RefaccionNuevaID) {
        dataUpdate.refaccion_nueva = { connect: { RefaccionID: dto.RefaccionNuevaID } };
      } else {
        dataUpdate.refaccion_nueva = { disconnect: true };
      }
    }
    if (dto.CantidadNueva !== undefined) dataUpdate.CantidadNueva = dto.CantidadNueva;
    if (dto.Observaciones !== undefined) dataUpdate.Observaciones = dto.Observaciones;

    await prisma.servicios_equipos_refacciones.update({
      where: { ServicioEquipoRefaccionID: dto.ServicioEquipoRefaccionID },
      data: dataUpdate,
    });

    await this.registrarHistorial(prisma, servicioId, 'MODIFICACION_REFACCION', 'Refacción actualizada', null, JSON.stringify(dto), usuarioId);

    return await this.findOne(servicioId);
  }

  async agregarRefaccionEquipo(servicioId: number, dto: AgregarRefaccionEquipoServicioDto, usuarioId?: number) {
    await this.obtenerServicioValidado(servicioId, ['POR_CONFIRMAR', 'PENDIENTE', 'CONFIRMADO', 'EN_PROCESO']);

    // Verificar que el ServicioEquipoID pertenece al servicio
    const servicioEquipo = await prisma.servicios_equipos.findFirst({
      where: { ServicioEquipoID: dto.ServicioEquipoID, ServicioID: servicioId, IsActive: 1 },
    });

    if (!servicioEquipo) {
      throw new HttpError('Equipo no encontrado en este servicio', 404);
    }

    // Verificar que la refacción no esté ya agregada
    const existente = await prisma.servicios_equipos_refacciones.findFirst({
      where: { ServicioEquipoID: dto.ServicioEquipoID, RefaccionID: dto.RefaccionID, IsActive: 1 },
    });

    if (existente) {
      throw new HttpError('Esta refacción ya está en el equipo', 400);
    }

    await prisma.servicios_equipos_refacciones.create({
      data: {
        ServicioEquipoID: dto.ServicioEquipoID,
        RefaccionID: dto.RefaccionID,
        CantidadEquipo: 0, // Nueva refacción, no estaba en el equipo
        CantidadTecnico: dto.CantidadTecnico,
        Cambio: dto.Cambio ? 1 : 0,
        Limpieza: 0,
        Verificacion: 0,
        Observaciones: dto.Observaciones || null,
        IsActive: 1,
      },
    });

    await this.registrarHistorial(prisma, servicioId, 'MODIFICACION_REFACCION', 'Refacción agregada al equipo', null, JSON.stringify(dto), usuarioId);

    return await this.findOne(servicioId);
  }

  async eliminarRefaccionEquipo(servicioId: number, dto: EliminarRefaccionEquipoServicioDto, usuarioId?: number) {
    await this.obtenerServicioValidado(servicioId, ['POR_CONFIRMAR', 'PENDIENTE', 'CONFIRMADO', 'EN_PROCESO']);

    const refaccion = await prisma.servicios_equipos_refacciones.findFirst({
      where: {
        ServicioEquipoRefaccionID: dto.ServicioEquipoRefaccionID,
        servicio_equipo: { ServicioID: servicioId },
        IsActive: 1,
      },
    });

    if (!refaccion) {
      throw new HttpError('Refacción no encontrada en este servicio', 404);
    }

    if (dto.DestinoRefaccion === 'DANADA' && !dto.MotivoDano) {
      throw new HttpError('MotivoDano es requerido cuando el destino es DANADA', 400);
    }

    await prisma.servicios_equipos_refacciones.update({
      where: { ServicioEquipoRefaccionID: dto.ServicioEquipoRefaccionID },
      data: {
        IsActive: 0,
        DestinoRefaccion: dto.DestinoRefaccion,
        MotivoDano: dto.MotivoDano || null,
        ObservacionesDano: dto.ObservacionesDano || null,
      },
    });

    await this.registrarHistorial(prisma, servicioId, 'MODIFICACION_REFACCION', 'Refacción eliminada del equipo', null, JSON.stringify(dto), usuarioId);

    return await this.findOne(servicioId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GESTIÓN DE INSUMOS
  // ═══════════════════════════════════════════════════════════════════════════

  async agregarInsumo(servicioId: number, dto: AgregarInsumoDto, usuarioId?: number) {
    const servicio = await this.obtenerServicioValidado(servicioId, ['POR_CONFIRMAR', 'PENDIENTE', 'CONFIRMADO', 'EN_PROCESO']);

    // Obtener costo de la refacción
    const refaccion = await prisma.catalogo_refacciones.findUnique({
      where: { RefaccionID: dto.RefaccionID },
      select: { CostoPromedio: true, NombrePieza: true },
    });

    if (!refaccion) {
      throw new HttpError('Refacción no encontrada', 404);
    }

    const costoUnitario = refaccion.CostoPromedio || 0;
    const subtotal = costoUnitario * dto.Cantidad;

    await prisma.servicios_insumos.create({
      data: {
        ServicioID: servicioId,
        RefaccionID: dto.RefaccionID,
        Cantidad: dto.Cantidad,
        OrigenInventario: dto.OrigenInventario || servicio.OrigenInventario,
        CostoUnitario: costoUnitario,
        Subtotal: subtotal,
        Observaciones: dto.Observaciones || null,
        IsActive: 1,
      },
    });

    // Actualizar costo total del servicio
    await this.recalcularCostos(servicioId);

    await this.registrarHistorial(prisma, servicioId, 'AGREGAR_INSUMO', `Insumo agregado: ${refaccion.NombrePieza}`, null, JSON.stringify(dto), usuarioId);

    return await this.findOne(servicioId);
  }

  async modificarInsumo(servicioId: number, dto: ModificarInsumoDto, usuarioId?: number) {
    await this.obtenerServicioValidado(servicioId, ['POR_CONFIRMAR', 'PENDIENTE', 'CONFIRMADO', 'EN_PROCESO']);

    const insumo = await prisma.servicios_insumos.findFirst({
      where: { ServicioInsumoID: dto.ServicioInsumoID, ServicioID: servicioId, IsActive: 1 },
    });

    if (!insumo) {
      throw new HttpError('Insumo no encontrado en este servicio', 404);
    }

    const dataUpdate: Prisma.servicios_insumosUpdateInput = {};

    if (dto.Cantidad !== undefined) {
      dataUpdate.Cantidad = dto.Cantidad;
      dataUpdate.Subtotal = (insumo.CostoUnitario || 0) * dto.Cantidad;
    }
    if (dto.Observaciones !== undefined) {
      dataUpdate.Observaciones = dto.Observaciones;
    }

    await prisma.servicios_insumos.update({
      where: { ServicioInsumoID: dto.ServicioInsumoID },
      data: dataUpdate,
    });

    await this.recalcularCostos(servicioId);

    return await this.findOne(servicioId);
  }

  async eliminarInsumo(servicioId: number, servicioInsumoId: number, usuarioId?: number) {
    await this.obtenerServicioValidado(servicioId, ['POR_CONFIRMAR', 'PENDIENTE', 'CONFIRMADO', 'EN_PROCESO']);

    const insumo = await prisma.servicios_insumos.findFirst({
      where: { ServicioInsumoID: servicioInsumoId, ServicioID: servicioId, IsActive: 1 },
    });

    if (!insumo) {
      throw new HttpError('Insumo no encontrado en este servicio', 404);
    }

    await prisma.servicios_insumos.update({
      where: { ServicioInsumoID: servicioInsumoId },
      data: { IsActive: 0 },
    });

    await this.recalcularCostos(servicioId);

    return await this.findOne(servicioId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DESINSTALACIÓN
  // ═══════════════════════════════════════════════════════════════════════════

  async configurarDesinstalacion(servicioId: number, dto: ConfigurarDesinstalacionDto, usuarioId?: number) {
    const servicio = await this.obtenerServicioValidado(servicioId, ['POR_CONFIRMAR', 'PENDIENTE', 'CONFIRMADO', 'EN_PROCESO']);

    if (servicio.TipoServicio !== 'DESINSTALACION') {
      throw new HttpError('Esta operación solo está disponible para servicios de desinstalación', 400);
    }

    const servicioEquipo = await prisma.servicios_equipos.findFirst({
      where: { ServicioEquipoID: dto.ServicioEquipoID, ServicioID: servicioId, IsActive: 1 },
    });

    if (!servicioEquipo) {
      throw new HttpError('Equipo no encontrado en este servicio', 404);
    }

    await prisma.servicios_equipos.update({
      where: { ServicioEquipoID: dto.ServicioEquipoID },
      data: { AccionDesinstalacion: dto.AccionDesinstalacion },
    });

    // Si es PIEZAS_INDIVIDUALES, actualizar destinos de refacciones
    if (dto.AccionDesinstalacion === 'PIEZAS_INDIVIDUALES' && dto.Refacciones) {
      for (const ref of dto.Refacciones) {
        if (ref.DestinoRefaccion === 'DANADA' && !ref.MotivoDano) {
          throw new HttpError(`MotivoDano es requerido para refacción ${ref.ServicioEquipoRefaccionID}`, 400);
        }

        await prisma.servicios_equipos_refacciones.update({
          where: { ServicioEquipoRefaccionID: ref.ServicioEquipoRefaccionID },
          data: {
            DestinoRefaccion: ref.DestinoRefaccion,
            MotivoDano: ref.MotivoDano || null,
            ObservacionesDano: ref.ObservacionesDano || null,
          },
        });
      }
    }

    await this.registrarHistorial(prisma, servicioId, 'MODIFICACION', 'Configuración de desinstalación actualizada', null, JSON.stringify(dto), usuarioId);

    return await this.findOne(servicioId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FINALIZAR SERVICIO
  // ═══════════════════════════════════════════════════════════════════════════

  async finalizar(id: number, dto: FinalizarServicioDto, usuarioId?: number) {
    const servicio = await this.obtenerServicioValidado(id, ['EN_PROCESO']);

    return await prisma.$transaction(async (tx) => {
      // Obtener equipos y refacciones del servicio
      const servicioEquipos = await tx.servicios_equipos.findMany({
        where: { ServicioID: id, IsActive: 1 },
        include: {
          equipo: true,
          refacciones: { where: { IsActive: 1 } },
        },
      });

      const origenInventario = servicio.OrigenInventario;
      const tecnicoId = servicio.TecnicoID;

      // Procesar cada equipo
      for (const servicioEquipo of servicioEquipos) {
        const equipo = servicioEquipo.equipo;

        // Procesar refacciones
        for (const refaccion of servicioEquipo.refacciones) {
          // Si hubo CAMBIO, procesar inventarios
          if (refaccion.Cambio === 1 && refaccion.CantidadTecnico > 0) {
            // Descontar del inventario origen
            if (origenInventario === 'TECNICO' && tecnicoId) {
              await this.descontarInventarioTecnico(tx, tecnicoId, refaccion.RefaccionNuevaID || refaccion.RefaccionID, refaccion.CantidadNueva || refaccion.CantidadTecnico, usuarioId);
            } else {
              await this.descontarInventarioBodega(tx, refaccion.RefaccionNuevaID || refaccion.RefaccionID, refaccion.CantidadNueva || refaccion.CantidadTecnico, usuarioId);
            }

            // Actualizar equipo_detalle si existe el equipo
            if (equipo) {
              // Si hay refacción nueva diferente, actualizar
              if (refaccion.RefaccionNuevaID && refaccion.RefaccionNuevaID !== refaccion.RefaccionID) {
                // Quitar refacción vieja
                await tx.equipos_detalle.updateMany({
                  where: { EquipoID: equipo.EquipoID, RefaccionID: refaccion.RefaccionID },
                  data: { IsActive: 0 },
                });

                // Agregar o actualizar nueva
                const existeNueva = await tx.equipos_detalle.findFirst({
                  where: { EquipoID: equipo.EquipoID, RefaccionID: refaccion.RefaccionNuevaID },
                });

                if (existeNueva) {
                  await tx.equipos_detalle.update({
                    where: { EquipoDetalleID: existeNueva.EquipoDetalleID },
                    data: { Cantidad: refaccion.CantidadNueva || refaccion.CantidadTecnico, IsActive: 1 },
                  });
                } else {
                  await tx.equipos_detalle.create({
                    data: {
                      EquipoID: equipo.EquipoID,
                      RefaccionID: refaccion.RefaccionNuevaID,
                      Cantidad: refaccion.CantidadNueva || refaccion.CantidadTecnico,
                      IsActive: 1,
                    },
                  });
                }
              } else {
                // Misma refacción, actualizar cantidad
                await tx.equipos_detalle.updateMany({
                  where: { EquipoID: equipo.EquipoID, RefaccionID: refaccion.RefaccionID },
                  data: { Cantidad: refaccion.CantidadNueva || refaccion.CantidadEquipo },
                });
              }
            }
          }

          // Procesar refacciones eliminadas (destino)
          if (refaccion.IsActive === 0 && refaccion.DestinoRefaccion) {
            if (refaccion.DestinoRefaccion === 'INVENTARIO') {
              await this.incrementarInventarioBodega(tx, refaccion.RefaccionID, refaccion.CantidadEquipo, usuarioId);
            } else if (refaccion.DestinoRefaccion === 'DANADA') {
              await tx.refacciones_danadas.create({
                data: {
                  RefaccionID: refaccion.RefaccionID,
                  EquipoID: equipo?.EquipoID || null,
                  Cantidad: refaccion.CantidadEquipo,
                  MotivoDano: refaccion.MotivoDano || 'Otro',
                  Observaciones: refaccion.ObservacionesDano || null,
                  FechaRegistro: new Date(),
                  UsuarioID: usuarioId || 1,
                  IsActive: 1,
                },
              });
            }
          }
        }

        // Actualizar estado del equipo según tipo de servicio
        if (equipo) {
          if (servicio.TipoServicio === 'INSTALACION') {
            await tx.equipos.update({
              where: { EquipoID: equipo.EquipoID },
              data: {
                Estatus: 'Instalado',
                FechaInstalacion: new Date(),
              },
            });

            // Actualizar contratos_equipos
            await tx.contratos_equipos.update({
              where: { ContratoEquipoID: servicioEquipo.ContratoEquipoID },
              data: {
                Estatus: 'INSTALADO',
                FechaInstalacion: new Date(),
              },
            });
          } else if (servicio.TipoServicio === 'DESINSTALACION') {
            const nuevoEstatus = servicioEquipo.AccionDesinstalacion === 'EQUIPO_COMPLETO' ? 'Reacondicionado' : 'Desmontado';

            await tx.equipos.update({
              where: { EquipoID: equipo.EquipoID },
              data: {
                Estatus: nuevoEstatus,
                FechaDesmontaje: new Date(),
                ContratoID: null,
                ClienteID: null,
                SucursalID: null,
              },
            });

            // Actualizar contratos_equipos
            await tx.contratos_equipos.update({
              where: { ContratoEquipoID: servicioEquipo.ContratoEquipoID },
              data: {
                Estatus: 'RETIRADO',
                FechaRetiro: new Date(),
              },
            });

            // Procesar refacciones para desinstalación
            if (servicioEquipo.AccionDesinstalacion === 'PIEZAS_INDIVIDUALES') {
              for (const refaccion of servicioEquipo.refacciones) {
                if (refaccion.DestinoRefaccion === 'INVENTARIO') {
                  await this.incrementarInventarioBodega(tx, refaccion.RefaccionID, refaccion.CantidadEquipo, usuarioId);
                } else if (refaccion.DestinoRefaccion === 'DANADA') {
                  await tx.refacciones_danadas.create({
                    data: {
                      RefaccionID: refaccion.RefaccionID,
                      EquipoID: equipo.EquipoID,
                      Cantidad: refaccion.CantidadEquipo,
                      MotivoDano: refaccion.MotivoDano || 'Otro',
                      Observaciones: refaccion.ObservacionesDano || null,
                      FechaRegistro: new Date(),
                      UsuarioID: usuarioId || 1,
                      IsActive: 1,
                    },
                  });
                }

                // Desactivar detalle del equipo
                await tx.equipos_detalle.updateMany({
                  where: { EquipoID: equipo.EquipoID, RefaccionID: refaccion.RefaccionID },
                  data: { IsActive: 0 },
                });
              }
            }
          }
        }
      }

      // Procesar insumos
      const insumos = await tx.servicios_insumos.findMany({
        where: { ServicioID: id, IsActive: 1 },
      });

      for (const insumo of insumos) {
        if (insumo.OrigenInventario === 'TECNICO' && tecnicoId) {
          await this.descontarInventarioTecnico(tx, tecnicoId, insumo.RefaccionID, insumo.Cantidad, usuarioId);
        } else {
          await this.descontarInventarioBodega(tx, insumo.RefaccionID, insumo.Cantidad, usuarioId);
        }
      }

      // Actualizar servicio
      await tx.servicios.update({
        where: { ServicioID: id },
        data: {
          Estatus: 'REALIZADO',
          FechaEjecucion: new Date(),
          HoraFin: new Date(),
          ObservacionesDespues: dto.ObservacionesDespues || null,
          ObservacionesGenerales: dto.ObservacionesGenerales || servicio.ObservacionesGenerales,
          ProximoServicioMeses: dto.ProximoServicioMeses || null,
          UsuarioFinalizaID: usuarioId || null,
        },
      });

      // Guardar firmas si existen
      if (dto.FirmaCliente) {
        await tx.servicios_firmas.create({
          data: {
            ServicioID: id,
            TipoFirma: 'CLIENTE',
            NombreFirmante: dto.FirmaCliente.NombreFirmante,
            FirmaData: dto.FirmaCliente.FirmaData,
            IsActive: 1,
          },
        });
      }

      if (dto.FirmaTecnico) {
        await tx.servicios_firmas.create({
          data: {
            ServicioID: id,
            TipoFirma: 'TECNICO',
            NombreFirmante: dto.FirmaTecnico.NombreFirmante,
            FirmaData: dto.FirmaTecnico.FirmaData,
            IsActive: 1,
          },
        });
      }

      // Crear notificación para próximo servicio si aplica
      if (dto.ProximoServicioMeses) {
        const fechaProximo = moment().add(dto.ProximoServicioMeses, 'months').toDate();
        await tx.servicios_notificaciones.create({
          data: {
            ServicioID: id,
            ContratoID: servicio.ContratoID,
            Tipo: 'MANTENIMIENTO_PROGRAMADO',
            Titulo: `Próximo mantenimiento programado`,
            Mensaje: `Servicio programado en ${dto.ProximoServicioMeses} meses desde el servicio ${id}`,
            FechaNotificacion: fechaProximo,
            Estatus: 'PENDIENTE',
            IsActive: 1,
          },
        });
      }

      await this.registrarHistorial(tx, id, 'FINALIZACION', 'Servicio finalizado', null, JSON.stringify(dto), usuarioId);

      return await this.findOneInternal(tx, id);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILIDADES PRIVADAS - INVENTARIO
  // ═══════════════════════════════════════════════════════════════════════════

  private async descontarInventarioTecnico(
    tx: Prisma.TransactionClient,
    tecnicoId: number,
    refaccionId: number,
    cantidad: number,
    usuarioId?: number
  ) {
    const inventario = await tx.inventario_tecnico.findFirst({
      where: { TecnicoID: tecnicoId, RefaccionID: refaccionId, IsActive: 1 },
    });

    if (!inventario || (inventario.StockNuevo + inventario.StockUsado) < cantidad) {
      const refaccion = await tx.catalogo_refacciones.findUnique({
        where: { RefaccionID: refaccionId },
        select: { NombrePieza: true },
      });
      throw new HttpError(`Stock insuficiente del técnico para "${refaccion?.NombrePieza}"`, 400);
    }

    // Descontar primero del stock usado, luego del nuevo
    let restante = cantidad;
    let descontadoUsado = Math.min(inventario.StockUsado, restante);
    restante -= descontadoUsado;
    let descontadoNuevo = restante;

    await tx.inventario_tecnico.update({
      where: { InventarioTecnicoID: inventario.InventarioTecnicoID },
      data: {
        StockUsado: { decrement: descontadoUsado },
        StockNuevo: { decrement: descontadoNuevo },
        FechaUltimoMov: new Date(),
      },
    });

    // Registrar en kardex
    const refaccion = await tx.catalogo_refacciones.findUnique({
      where: { RefaccionID: refaccionId },
      select: { CostoPromedio: true },
    });

    await tx.kardex_inventario.create({
      data: {
        RefaccionID: refaccionId,
        FechaMovimiento: new Date(),
        TipoMovimiento: 'Servicio_Consumo_Tecnico',
        Cantidad: -cantidad,
        CostoPromedioMovimiento: refaccion?.CostoPromedio || 0,
        UsuarioID: usuarioId || null,
        Observaciones: `Consumo en servicio - Técnico ${tecnicoId}`,
      },
    });
  }

  private async descontarInventarioBodega(
    tx: Prisma.TransactionClient,
    refaccionId: number,
    cantidad: number,
    usuarioId?: number
  ) {
    const inventario = await tx.inventario.findFirst({
      where: { RefaccionID: refaccionId, IsActive: 1 },
    });

    if (!inventario || (inventario.StockActual || 0) < cantidad) {
      const refaccion = await tx.catalogo_refacciones.findUnique({
        where: { RefaccionID: refaccionId },
        select: { NombrePieza: true },
      });
      throw new HttpError(`Stock insuficiente en bodega para "${refaccion?.NombrePieza}"`, 400);
    }

    await tx.inventario.updateMany({
      where: { RefaccionID: refaccionId, IsActive: 1 },
      data: {
        StockActual: { decrement: cantidad },
        FechaUltimoMovimiento: new Date(),
      },
    });

    const refaccion = await tx.catalogo_refacciones.findUnique({
      where: { RefaccionID: refaccionId },
      select: { CostoPromedio: true },
    });

    await tx.kardex_inventario.create({
      data: {
        RefaccionID: refaccionId,
        FechaMovimiento: new Date(),
        TipoMovimiento: 'Servicio_Consumo_Bodega',
        Cantidad: -cantidad,
        CostoPromedioMovimiento: refaccion?.CostoPromedio || 0,
        UsuarioID: usuarioId || null,
        Observaciones: 'Consumo en servicio - Bodega',
      },
    });
  }

  private async incrementarInventarioBodega(
    tx: Prisma.TransactionClient,
    refaccionId: number,
    cantidad: number,
    usuarioId?: number
  ) {
    await tx.inventario.updateMany({
      where: { RefaccionID: refaccionId, IsActive: 1 },
      data: {
        StockActual: { increment: cantidad },
        FechaUltimoMovimiento: new Date(),
      },
    });

    const refaccion = await tx.catalogo_refacciones.findUnique({
      where: { RefaccionID: refaccionId },
      select: { CostoPromedio: true },
    });

    await tx.kardex_inventario.create({
      data: {
        RefaccionID: refaccionId,
        FechaMovimiento: new Date(),
        TipoMovimiento: 'Servicio_Devolucion_Bodega',
        Cantidad: cantidad,
        CostoPromedioMovimiento: refaccion?.CostoPromedio || 0,
        UsuarioID: usuarioId || null,
        Observaciones: 'Devolución desde servicio a bodega',
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILIDADES PRIVADAS - VALIDACIONES Y FORMATEO
  // ═══════════════════════════════════════════════════════════════════════════

  private async obtenerServicioValidado(id: number, estatusPermitidos?: string[]) {
    const servicio = await prisma.servicios.findFirst({
      where: { ServicioID: id, IsActive: 1 },
    });

    if (!servicio) {
      throw new HttpError('Servicio no encontrado', 404);
    }

    if (estatusPermitidos && !estatusPermitidos.includes(servicio.Estatus)) {
      throw new HttpError(
        `Esta operación solo está permitida para servicios en estado: ${estatusPermitidos.join(', ')}. Estado actual: ${servicio.Estatus}`,
        400
      );
    }

    return servicio;
  }

  private async recalcularCostos(servicioId: number) {
    const insumos = await prisma.servicios_insumos.findMany({
      where: { ServicioID: servicioId, IsActive: 1 },
    });

    const costoRefacciones = insumos.reduce((sum, i) => sum + (i.Subtotal || 0), 0);

    await prisma.servicios.update({
      where: { ServicioID: servicioId },
      data: {
        CostoRefacciones: costoRefacciones,
        CostoTotal: costoRefacciones, // Por ahora solo refacciones, se puede agregar CostoServicio
      },
    });
  }

  private async registrarHistorial(
    tx: Prisma.TransactionClient | typeof prisma,
    servicioId: number,
    tipoAccion: string,
    descripcion: string,
    valorAnterior: string | null,
    valorNuevo: string | null,
    usuarioId?: number
  ) {
    await tx.servicios_historial.create({
      data: {
        ServicioID: servicioId,
        TipoAccion: tipoAccion as any,
        Descripcion: descripcion,
        ValorAnterior: valorAnterior,
        ValorNuevo: valorNuevo,
        UsuarioID: usuarioId || 1,
      },
    });
  }

  private async findOneInternal(tx: Prisma.TransactionClient, id: number) {
    const servicio = await tx.servicios.findFirst({
      where: { ServicioID: id, IsActive: 1 },
      include: {
        contrato: {
          select: {
            ContratoID: true,
            NumeroContrato: true,
            cliente: { select: { ClienteID: true, NombreComercio: true } },
          },
        },
        tecnico: {
          select: {
            TecnicoID: true,
            usuario: { select: { NombreCompleto: true } },
          },
        },
      },
    });

    return { message: 'Servicio procesado', data: servicio };
  }

  private formatearServicioResumen(servicio: any) {
    return {
      ServicioID: servicio.ServicioID,
      TipoServicio: servicio.TipoServicio,
      FechaProgramada: moment(servicio.FechaProgramada).format('YYYY-MM-DD'),
      HoraProgramada: servicio.HoraProgramada ? moment(servicio.HoraProgramada).format('HH:mm') : null,
      Estatus: servicio.Estatus,
      OrigenInventario: servicio.OrigenInventario,
      Contrato: {
        ContratoID: servicio.contrato.ContratoID,
        NumeroContrato: servicio.contrato.NumeroContrato,
      },
      Cliente: {
        ClienteID: servicio.contrato.cliente.ClienteID,
        NombreComercio: servicio.contrato.cliente.NombreComercio,
      },
      Sucursal: servicio.contrato.sucursal ? {
        SucursalID: servicio.contrato.sucursal.SucursalID,
        NombreSucursal: servicio.contrato.sucursal.NombreSucursal,
        Direccion: servicio.contrato.sucursal.Direccion,
      } : null,
      Tecnico: servicio.tecnico ? {
        TecnicoID: servicio.tecnico.TecnicoID,
        Codigo: servicio.tecnico.Codigo,
        Nombre: servicio.tecnico.usuario.NombreCompleto,
        Telefono: servicio.tecnico.Telefono,
      } : null,
      TotalEquipos: servicio.equipos.length,
    };
  }

  private formatearServicioCompleto(servicio: any) {
    return {
      ServicioID: servicio.ServicioID,
      TipoServicio: servicio.TipoServicio,
      FechaProgramada: moment(servicio.FechaProgramada).format('YYYY-MM-DD'),
      HoraProgramada: servicio.HoraProgramada ? moment(servicio.HoraProgramada).format('HH:mm') : null,
      FechaEjecucion: servicio.FechaEjecucion ? moment(servicio.FechaEjecucion).format('YYYY-MM-DD') : null,
      HoraInicio: servicio.HoraInicio ? moment(servicio.HoraInicio).format('HH:mm') : null,
      HoraFin: servicio.HoraFin ? moment(servicio.HoraFin).format('HH:mm') : null,
      Estatus: servicio.Estatus,
      OrigenInventario: servicio.OrigenInventario,
      ObservacionesAntes: servicio.ObservacionesAntes,
      ObservacionesDespues: servicio.ObservacionesDespues,
      ObservacionesGenerales: servicio.ObservacionesGenerales,
      ProximoServicioMeses: servicio.ProximoServicioMeses,
      ServicioOrigenID: servicio.ServicioOrigenID,
      MotivoReagendamiento: servicio.MotivoReagendamiento,
      MotivoCancelacion: servicio.MotivoCancelacion,
      CostoServicio: servicio.CostoServicio,
      CostoRefacciones: servicio.CostoRefacciones,
      CostoTotal: servicio.CostoTotal,
      Contrato: {
        ContratoID: servicio.contrato.ContratoID,
        NumeroContrato: servicio.contrato.NumeroContrato,
        FrecuenciaMantenimiento: servicio.contrato.FrecuenciaMantenimiento,
      },
      Cliente: {
        ClienteID: servicio.contrato.cliente.ClienteID,
        NombreComercio: servicio.contrato.cliente.NombreComercio,
      },
      Sucursal: servicio.contrato.sucursal ? {
        SucursalID: servicio.contrato.sucursal.SucursalID,
        NombreSucursal: servicio.contrato.sucursal.NombreSucursal,
        Direccion: servicio.contrato.sucursal.Direccion,
        Telefono: servicio.contrato.sucursal.Telefono,
        Contacto: servicio.contrato.sucursal.Contacto,
      } : null,
      Tecnico: servicio.tecnico ? {
        TecnicoID: servicio.tecnico.TecnicoID,
        Codigo: servicio.tecnico.Codigo,
        Nombre: servicio.tecnico.usuario.NombreCompleto,
        Telefono: servicio.tecnico.Telefono,
      } : null,
      Equipos: servicio.equipos.map((se: any) => ({
        ServicioEquipoID: se.ServicioEquipoID,
        ContratoEquipoID: se.ContratoEquipoID,
        AccionDesinstalacion: se.AccionDesinstalacion,
        Observaciones: se.Observaciones,
        Equipo: se.equipo ? {
          EquipoID: se.equipo.EquipoID,
          NumeroSerie: se.equipo.NumeroSerie,
          Estatus: se.equipo.Estatus,
          EsExterno: se.equipo.EsExterno === 1,
          NombreEquipo: se.equipo.plantilla?.NombreEquipo,
          Codigo: se.equipo.plantilla?.Codigo,
        } : {
          NombreEquipo: se.contrato_equipo.plantilla?.NombreEquipo,
          Codigo: se.contrato_equipo.plantilla?.Codigo,
          Modalidad: se.contrato_equipo.Modalidad,
        },
        Refacciones: se.refacciones.map((ref: any) => ({
          ServicioEquipoRefaccionID: ref.ServicioEquipoRefaccionID,
          RefaccionID: ref.RefaccionID,
          NombrePieza: ref.refaccion.NombrePieza,
          NombreCorto: ref.refaccion.NombreCorto,
          Codigo: ref.refaccion.Codigo,
          Unidad: ref.refaccion.catalogo_unidades?.DesUnidad,
          CostoPromedio: ref.refaccion.CostoPromedio,
          CantidadEquipo: ref.CantidadEquipo,
          CantidadTecnico: ref.CantidadTecnico,
          Cambio: ref.Cambio === 1,
          Limpieza: ref.Limpieza === 1,
          Verificacion: ref.Verificacion === 1,
          RefaccionNueva: ref.refaccion_nueva ? {
            RefaccionID: ref.refaccion_nueva.RefaccionID,
            NombrePieza: ref.refaccion_nueva.NombrePieza,
            Codigo: ref.refaccion_nueva.Codigo,
          } : null,
          CantidadNueva: ref.CantidadNueva,
          DestinoRefaccion: ref.DestinoRefaccion,
          MotivoDano: ref.MotivoDano,
          ObservacionesDano: ref.ObservacionesDano,
          Observaciones: ref.Observaciones,
        })),
      })),
      Insumos: servicio.insumos.map((ins: any) => ({
        ServicioInsumoID: ins.ServicioInsumoID,
        RefaccionID: ins.RefaccionID,
        NombrePieza: ins.refaccion.NombrePieza,
        NombreCorto: ins.refaccion.NombreCorto,
        Codigo: ins.refaccion.Codigo,
        Unidad: ins.refaccion.catalogo_unidades?.DesUnidad,
        Cantidad: ins.Cantidad,
        OrigenInventario: ins.OrigenInventario,
        CostoUnitario: ins.CostoUnitario,
        Subtotal: ins.Subtotal,
        Observaciones: ins.Observaciones,
      })),
      Firmas: servicio.firmas.map((f: any) => ({
        FirmaID: f.FirmaID,
        TipoFirma: f.TipoFirma,
        NombreFirmante: f.NombreFirmante,
        FechaFirma: moment(f.FechaFirma).format('YYYY-MM-DD HH:mm'),
      })),
      FechaCreacion: moment(servicio.FechaCreacion).format('YYYY-MM-DD HH:mm'),
    };
  }
}

export const serviciosService = new ServiciosService();
