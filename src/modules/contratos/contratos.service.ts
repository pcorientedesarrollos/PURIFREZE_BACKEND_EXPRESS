import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import {
  CreateContratoDto,
  UpdateContratoDto,
  AddEquipoDto,
  AsignarEquipoDto,
  UpdateEquipoContratoDto,
  CancelarContratoDto,
  RenovarContratoDto,
  ActualizarMontoDto,
  ContratosQueryDto,
} from './contratos.schema';

class ContratosService {
  // Generar número de contrato: CTR-YY-XXXX
  private async generarNumeroContrato(): Promise<string> {
    const year = new Date().getFullYear().toString().slice(-2);
    const prefix = `CTR-${year}-`;

    const ultimoContrato = await prisma.contratos.findFirst({
      where: {
        NumeroContrato: { startsWith: prefix },
      },
      orderBy: { NumeroContrato: 'desc' },
    });

    let consecutivo = 1;
    if (ultimoContrato) {
      const ultimo = ultimoContrato.NumeroContrato.split('-').pop();
      consecutivo = parseInt(ultimo || '0', 10) + 1;
    }

    return `${prefix}${consecutivo.toString().padStart(4, '0')}`;
  }

  // Registrar historial
  private async registrarHistorial(
    ContratoID: number,
    TipoAccion: 'CREACION' | 'ACTIVACION' | 'ACTUALIZACION_MONTO' | 'AGREGAR_EQUIPO' | 'RETIRAR_EQUIPO' | 'CANCELACION' | 'RENOVACION' | 'MODIFICACION',
    Descripcion: string,
    UsuarioID: number,
    ValorAnterior?: any,
    ValorNuevo?: any
  ) {
    await prisma.contratos_historial.create({
      data: {
        ContratoID,
        TipoAccion,
        Descripcion,
        UsuarioID,
        ValorAnterior: ValorAnterior ? JSON.stringify(ValorAnterior) : null,
        ValorNuevo: ValorNuevo ? JSON.stringify(ValorNuevo) : null,
      },
    });
  }

  // Calcular monto total del contrato
  private async calcularMontoTotal(ContratoID: number): Promise<number> {
    const equipos = await prisma.contratos_equipos.findMany({
      where: { ContratoID, IsActive: 1 },
    });

    return equipos.reduce((sum, eq) => {
      let monto = eq.PrecioUnitario;
      if (eq.PeriodoMeses && eq.PeriodoMeses > 0) {
        monto = monto * eq.PeriodoMeses;
      }
      return sum + monto;
    }, 0);
  }

  // =============================================
  // CONTRATOS - CRUD
  // =============================================

  async create(data: CreateContratoDto) {
    // Validar presupuesto con sus detalles
    const presupuesto = await prisma.presupuestos_encabezado.findUnique({
      where: { PresupuestoID: data.PresupuestoID },
      include: {
        cliente: true,
        sucursal: true,
        detalles: {
          where: { IsActive: 1 },
          include: {
            plantilla: { select: { PlantillaEquipoID: true, NombreEquipo: true, Codigo: true } },
            refaccion: { select: { RefaccionID: true, NombrePieza: true, Codigo: true } },
          },
        },
      },
    });

    if (!presupuesto) {
      throw new HttpError('El presupuesto no existe', 404);
    }

    if (presupuesto.Estatus !== 'Aprobado') {
      throw new HttpError('Solo se pueden crear contratos de presupuestos aprobados', 300);
    }

    // Verificar que no exista otro contrato activo para este presupuesto
    const contratoExistente = await prisma.contratos.findFirst({
      where: {
        PresupuestoID: data.PresupuestoID,
        Estatus: { in: ['EN_REVISION', 'ACTIVO'] },
        IsActive: 1,
      },
    });

    if (contratoExistente) {
      throw new HttpError('Ya existe un contrato activo para este presupuesto', 300);
    }

    const numeroContrato = await this.generarNumeroContrato();

    // Crear contrato con items pre-cargados en una transacción
    const contrato = await prisma.$transaction(async (tx) => {
      // Crear el contrato
      const nuevoContrato = await tx.contratos.create({
        data: {
          NumeroContrato: numeroContrato,
          PresupuestoID: data.PresupuestoID,
          ClienteID: presupuesto.ClienteID,
          SucursalID: presupuesto.SucursalID,
          FechaInicio: new Date(data.FechaInicio),
          FechaFin: new Date(data.FechaFin),
          CondicionesPago: data.CondicionesPago,
          DiaPago: data.DiaPago,
          FrecuenciaMantenimiento: data.FrecuenciaMantenimiento || null,
          PenalizacionCancelacion: data.PenalizacionCancelacion || null,
          Observaciones: data.Observaciones || null,
          UsuarioID: data.UsuarioID,
          IsActive: 1,
        },
      });

      // Pre-cargar items del presupuesto como "pendientes de asignar"
      // Solo se copian los equipos Purifreeze (no externos, refacciones ni servicios)
      const equiposPurifreeze = presupuesto.detalles.filter(d => d.TipoItem === 'EQUIPO_PURIFREEZE');

      for (const detalle of equiposPurifreeze) {
        // Mapear modalidad del presupuesto a modalidad del contrato
        let modalidadContrato: 'VENTA' | 'RENTA' | 'COMODATO' | 'MANTENIMIENTO' = 'VENTA';
        if (detalle.Modalidad === 'RENTA') modalidadContrato = 'RENTA';
        else if (detalle.Modalidad === 'MANTENIMIENTO') modalidadContrato = 'MANTENIMIENTO';
        else if (detalle.Modalidad === 'VENTA') modalidadContrato = 'VENTA';

        // Generar descripción legible
        let descripcion = detalle.Descripcion || '';
        if (detalle.TipoItem === 'EQUIPO_PURIFREEZE' || detalle.TipoItem === 'EQUIPO_EXTERNO') {
          descripcion = detalle.plantilla?.NombreEquipo || descripcion;
          if (detalle.plantilla?.Codigo) {
            descripcion = `[${detalle.plantilla.Codigo}] ${descripcion}`;
          }
        } else if (detalle.TipoItem === 'REFACCION') {
          descripcion = detalle.refaccion?.NombrePieza || descripcion;
          if (detalle.refaccion?.Codigo) {
            descripcion = `[${detalle.refaccion.Codigo}] ${descripcion}`;
          }
        }

        await tx.contratos_equipos.create({
          data: {
            ContratoID: nuevoContrato.ContratoID,
            EquipoID: null, // Pendiente de asignar
            Modalidad: modalidadContrato,
            PrecioUnitario: detalle.PrecioUnitario,
            PeriodoMeses: detalle.PeriodoRenta || null,
            Estatus: 'PENDIENTE',
            IsActive: 1,
            // Datos del presupuesto para referencia
            PlantillaEquipoID: detalle.PlantillaEquipoID || null,
            RefaccionID: detalle.RefaccionID || null,
            TipoItem: detalle.TipoItem,
            Descripcion: descripcion,
            CantidadRequerida: detalle.Cantidad,
            CantidadAsignada: 0,
          },
        });
      }

      return nuevoContrato;
    });

    // Contar items copiados (solo equipos Purifreeze)
    const itemsCopiados = presupuesto.detalles.filter(d => d.TipoItem === 'EQUIPO_PURIFREEZE').length;

    await this.registrarHistorial(
      contrato.ContratoID,
      'CREACION',
      `Contrato ${numeroContrato} creado desde presupuesto #${data.PresupuestoID} con ${itemsCopiados} equipos Purifreeze pendientes de asignar`,
      data.UsuarioID
    );

    return this.findOne(contrato.ContratoID);
  }

  async findAll(query?: ContratosQueryDto) {
    const where: any = { IsActive: 1 };

    if (query?.estatus) {
      where.Estatus = query.estatus;
    }
    if (query?.clienteId) {
      where.ClienteID = query.clienteId;
    }
    if (query?.fechaDesde || query?.fechaHasta) {
      where.FechaInicio = {};
      if (query.fechaDesde) {
        where.FechaInicio.gte = new Date(query.fechaDesde);
      }
      if (query.fechaHasta) {
        where.FechaInicio.lte = new Date(query.fechaHasta);
      }
    }

    const contratos = await prisma.contratos.findMany({
      where,
      orderBy: { ContratoID: 'desc' },
      include: {
        cliente: {
          select: { ClienteID: true, NombreComercio: true },
        },
        sucursal: {
          select: { SucursalID: true, NombreSucursal: true },
        },
        presupuesto: {
          select: { PresupuestoID: true, Total: true },
        },
        _count: {
          select: { equipos: true },
        },
      },
    });

    return { message: 'Contratos obtenidos', data: contratos };
  }

  async findOne(ContratoID: number) {
    const contrato = await prisma.contratos.findUnique({
      where: { ContratoID },
      include: {
        cliente: {
          select: { ClienteID: true, NombreComercio: true, Observaciones: true },
        },
        sucursal: {
          select: { SucursalID: true, NombreSucursal: true, Direccion: true, Telefono: true, Contacto: true },
        },
        presupuesto: {
          select: { PresupuestoID: true, Total: true, FechaCreacion: true },
        },
        contrato_origen: {
          select: { ContratoID: true, NumeroContrato: true },
        },
        equipos: {
          where: { IsActive: 1 },
          include: {
            equipo: {
              select: {
                EquipoID: true,
                NumeroSerie: true,
                EsExterno: true,
                Estatus: true,
                plantilla: {
                  select: { PlantillaEquipoID: true, NombreEquipo: true, Codigo: true },
                },
              },
            },
            // Datos de referencia del presupuesto
            plantilla: {
              select: { PlantillaEquipoID: true, NombreEquipo: true, Codigo: true, EsExterno: true },
            },
            refaccion: {
              select: { RefaccionID: true, NombrePieza: true, Codigo: true },
            },
            servicios_equipos: {
              where: { IsActive: 1 },
              select: {
                ServicioEquipoID: true,
                servicio: {
                  select: {
                    ServicioID: true,
                    TipoServicio: true,
                    FechaProgramada: true,
                    HoraProgramada: true,
                    Estatus: true,
                  },
                },
              },
            },
          },
        },
        historial: {
          orderBy: { FechaAccion: 'desc' },
          take: 20,
        },
      },
    });

    if (!contrato) {
      throw new HttpError('Contrato no encontrado', 404);
    }

    return { message: 'Contrato obtenido', data: contrato };
  }

  async findByCliente(ClienteID: number) {
    const contratos = await prisma.contratos.findMany({
      where: { ClienteID, IsActive: 1 },
      orderBy: { ContratoID: 'desc' },
      include: {
        cliente: {
          select: { ClienteID: true, NombreComercio: true },
        },
        sucursal: {
          select: { SucursalID: true, NombreSucursal: true },
        },
        _count: {
          select: { equipos: true },
        },
      },
    });

    return { message: 'Contratos del cliente obtenidos', data: contratos };
  }

  async update(ContratoID: number, data: UpdateContratoDto, UsuarioID: number) {
    const contrato = await prisma.contratos.findUnique({
      where: { ContratoID },
    });

    if (!contrato) {
      throw new HttpError('Contrato no encontrado', 404);
    }

    if (contrato.Estatus !== 'EN_REVISION') {
      throw new HttpError('Solo se pueden editar contratos en revisión', 300);
    }

    const updated = await prisma.contratos.update({
      where: { ContratoID },
      data: {
        ...data,
        FechaInicio: data.FechaInicio ? new Date(data.FechaInicio) : undefined,
        FechaFin: data.FechaFin ? new Date(data.FechaFin) : undefined,
      },
    });

    await this.registrarHistorial(
      ContratoID,
      'MODIFICACION',
      'Contrato actualizado',
      UsuarioID,
      contrato,
      updated
    );

    return this.findOne(ContratoID);
  }

  async activar(ContratoID: number, UsuarioID: number) {
    const contrato = await prisma.contratos.findUnique({
      where: { ContratoID },
      include: { equipos: { where: { IsActive: 1 } } },
    });

    if (!contrato) {
      throw new HttpError('Contrato no encontrado', 404);
    }

    if (contrato.Estatus !== 'EN_REVISION') {
      throw new HttpError('Solo se pueden activar contratos en revisión', 300);
    }

    if (contrato.equipos.length === 0) {
      throw new HttpError('El contrato debe tener al menos un equipo asignado', 300);
    }

    // Recalcular monto total
    const montoTotal = await this.calcularMontoTotal(ContratoID);

    const updated = await prisma.contratos.update({
      where: { ContratoID },
      data: {
        Estatus: 'ACTIVO',
        MontoTotal: montoTotal,
      },
    });

    await this.registrarHistorial(
      ContratoID,
      'ACTIVACION',
      `Contrato activado con monto total: $${montoTotal.toFixed(2)}`,
      UsuarioID
    );

    return { message: 'Contrato activado', data: updated };
  }

  async cancelar(ContratoID: number, data: CancelarContratoDto) {
    const contrato = await prisma.contratos.findUnique({
      where: { ContratoID },
      include: {
        equipos: {
          where: { IsActive: 1, Estatus: 'INSTALADO' },
          include: { equipo: true },
        },
      },
    });

    if (!contrato) {
      throw new HttpError('Contrato no encontrado', 404);
    }

    if (contrato.Estatus === 'CANCELADO' || contrato.Estatus === 'RENOVADO') {
      throw new HttpError('El contrato ya está cancelado o renovado', 300);
    }

    // Marcar equipos como retirados y limpiar ubicación
    await prisma.$transaction(async (tx) => {
      for (const ce of contrato.equipos) {
        await tx.contratos_equipos.update({
          where: { ContratoEquipoID: ce.ContratoEquipoID },
          data: {
            Estatus: 'RETIRADO',
            FechaRetiro: new Date(),
          },
        });

        if (ce.EquipoID) {
          await tx.equipos.update({
            where: { EquipoID: ce.EquipoID },
            data: {
              Estatus: 'Desmontado',
              FechaDesmontaje: new Date(),
              ClienteID: null,
              SucursalID: null,
              ContratoID: null,
            },
          });
        }
      }

      await tx.contratos.update({
        where: { ContratoID },
        data: {
          Estatus: 'CANCELADO',
          MotivosCancelacion: data.MotivosCancelacion,
        },
      });
    });

    await this.registrarHistorial(
      ContratoID,
      'CANCELACION',
      `Contrato cancelado. Motivo: ${data.MotivosCancelacion}`,
      data.UsuarioID
    );

    return this.findOne(ContratoID);
  }

  async renovar(ContratoID: number, data: RenovarContratoDto) {
    const contrato = await prisma.contratos.findUnique({
      where: { ContratoID },
      include: {
        equipos: {
          where: { IsActive: 1, Estatus: 'INSTALADO' },
        },
      },
    });

    if (!contrato) {
      throw new HttpError('Contrato no encontrado', 404);
    }

    if (contrato.Estatus !== 'ACTIVO' && contrato.Estatus !== 'VENCIDO') {
      throw new HttpError('Solo se pueden renovar contratos activos o vencidos', 300);
    }

    const numeroContrato = await this.generarNumeroContrato();

    const nuevoContrato = await prisma.$transaction(async (tx) => {
      // Crear nuevo contrato
      const nuevo = await tx.contratos.create({
        data: {
          NumeroContrato: numeroContrato,
          PresupuestoID: contrato.PresupuestoID,
          ClienteID: contrato.ClienteID,
          SucursalID: contrato.SucursalID,
          FechaInicio: new Date(data.FechaInicio),
          FechaFin: new Date(data.FechaFin),
          CondicionesPago: data.CondicionesPago || contrato.CondicionesPago,
          DiaPago: data.DiaPago || contrato.DiaPago,
          FrecuenciaMantenimiento: data.FrecuenciaMantenimiento !== undefined ? data.FrecuenciaMantenimiento : contrato.FrecuenciaMantenimiento,
          PenalizacionCancelacion: data.PenalizacionCancelacion !== undefined ? data.PenalizacionCancelacion : contrato.PenalizacionCancelacion,
          Observaciones: data.Observaciones || null,
          ContratoOrigenID: ContratoID,
          UsuarioID: data.UsuarioID,
          IsActive: 1,
        },
      });

      // Transferir equipos instalados al nuevo contrato
      for (const equipo of contrato.equipos) {
        await tx.contratos_equipos.create({
          data: {
            ContratoID: nuevo.ContratoID,
            EquipoID: equipo.EquipoID,
            Modalidad: equipo.Modalidad,
            PrecioUnitario: equipo.PrecioUnitario,
            PeriodoMeses: equipo.PeriodoMeses,
            FechaInstalacion: equipo.FechaInstalacion,
            Estatus: 'INSTALADO',
            IsActive: 1,
          },
        });

        // Actualizar referencia en equipo
        if (equipo.EquipoID) {
          await tx.equipos.update({
            where: { EquipoID: equipo.EquipoID },
            data: { ContratoID: nuevo.ContratoID },
          });
        }
      }

      // Marcar contrato anterior como renovado
      await tx.contratos.update({
        where: { ContratoID },
        data: { Estatus: 'RENOVADO' },
      });

      return nuevo;
    });

    // Calcular monto y activar
    const montoTotal = await this.calcularMontoTotal(nuevoContrato.ContratoID);
    await prisma.contratos.update({
      where: { ContratoID: nuevoContrato.ContratoID },
      data: { MontoTotal: montoTotal, Estatus: 'ACTIVO' },
    });

    await this.registrarHistorial(
      ContratoID,
      'RENOVACION',
      `Contrato renovado. Nuevo contrato: ${numeroContrato}`,
      data.UsuarioID
    );

    await this.registrarHistorial(
      nuevoContrato.ContratoID,
      'CREACION',
      `Contrato creado por renovación del contrato #${contrato.NumeroContrato}`,
      data.UsuarioID
    );

    return this.findOne(nuevoContrato.ContratoID);
  }

  async actualizarMonto(ContratoID: number, data: ActualizarMontoDto) {
    const contrato = await prisma.contratos.findUnique({
      where: { ContratoID },
    });

    if (!contrato) {
      throw new HttpError('Contrato no encontrado', 404);
    }

    if (contrato.Estatus !== 'ACTIVO') {
      throw new HttpError('Solo se puede actualizar el monto de contratos activos', 300);
    }

    const montoAnterior = contrato.MontoTotal;

    const updated = await prisma.contratos.update({
      where: { ContratoID },
      data: { MontoTotal: data.MontoTotal },
    });

    await this.registrarHistorial(
      ContratoID,
      'ACTUALIZACION_MONTO',
      `Monto actualizado de $${montoAnterior.toFixed(2)} a $${data.MontoTotal.toFixed(2)}`,
      data.UsuarioID,
      { MontoTotal: montoAnterior },
      { MontoTotal: data.MontoTotal }
    );

    return { message: 'Monto actualizado', data: updated };
  }

  async baja(ContratoID: number) {
    const contrato = await prisma.contratos.findUnique({
      where: { ContratoID },
    });

    if (!contrato) {
      throw new HttpError('Contrato no encontrado', 404);
    }

    if (contrato.IsActive === 0) {
      throw new HttpError('El contrato ya está dado de baja', 300);
    }

    const updated = await prisma.contratos.update({
      where: { ContratoID },
      data: { IsActive: 0 },
    });

    return { message: 'Contrato dado de baja', data: updated };
  }

  async activarRegistro(ContratoID: number) {
    const contrato = await prisma.contratos.findUnique({
      where: { ContratoID },
    });

    if (!contrato) {
      throw new HttpError('Contrato no encontrado', 404);
    }

    if (contrato.IsActive === 1) {
      throw new HttpError('El contrato ya está activo', 300);
    }

    const updated = await prisma.contratos.update({
      where: { ContratoID },
      data: { IsActive: 1 },
    });

    return { message: 'Contrato activado', data: updated };
  }

  // =============================================
  // EQUIPOS DEL CONTRATO
  // =============================================

  async addEquipo(ContratoID: number, data: AddEquipoDto, UsuarioID: number) {
    const contrato = await prisma.contratos.findUnique({
      where: { ContratoID },
    });

    if (!contrato) {
      throw new HttpError('Contrato no encontrado', 404);
    }

    if (contrato.Estatus !== 'EN_REVISION' && contrato.Estatus !== 'ACTIVO') {
      throw new HttpError('Solo se pueden agregar equipos a contratos en revisión o activos', 300);
    }

    // Validar equipo
    const equipo = await prisma.equipos.findUnique({
      where: { EquipoID: data.EquipoID },
    });

    if (!equipo) {
      throw new HttpError('El equipo no existe', 404);
    }

    if (equipo.IsActive !== 1) {
      throw new HttpError('El equipo no está activo', 300);
    }

    if (equipo.Estatus !== 'Armado' && equipo.Estatus !== 'Desmontado') {
      throw new HttpError('El equipo debe estar en estado Armado o Desmontado para asignarlo', 300);
    }

    // Verificar que no esté en otro contrato activo
    if (equipo.ContratoID && equipo.ContratoID !== ContratoID) {
      throw new HttpError('El equipo ya está asignado a otro contrato', 300);
    }

    // Verificar que no esté duplicado en este contrato
    const existente = await prisma.contratos_equipos.findFirst({
      where: { ContratoID, EquipoID: data.EquipoID, IsActive: 1 },
    });

    if (existente) {
      throw new HttpError('El equipo ya está asignado a este contrato', 300);
    }

    const contratoEquipo = await prisma.contratos_equipos.create({
      data: {
        ContratoID,
        EquipoID: data.EquipoID,
        Modalidad: data.Modalidad,
        PrecioUnitario: data.PrecioUnitario,
        PeriodoMeses: data.PeriodoMeses || null,
        Observaciones: data.Observaciones || null,
        IsActive: 1,
      },
    });

    // Recalcular monto si el contrato está activo
    if (contrato.Estatus === 'ACTIVO') {
      const montoTotal = await this.calcularMontoTotal(ContratoID);
      await prisma.contratos.update({
        where: { ContratoID },
        data: { MontoTotal: montoTotal },
      });
    }

    await this.registrarHistorial(
      ContratoID,
      'AGREGAR_EQUIPO',
      `Equipo ${equipo.NumeroSerie} agregado al contrato`,
      UsuarioID
    );

    return this.findOne(ContratoID);
  }

  async instalarEquipo(ContratoEquipoID: number, UsuarioID: number) {
    const contratoEquipo = await prisma.contratos_equipos.findUnique({
      where: { ContratoEquipoID },
      include: { contrato: true, equipo: true },
    });

    if (!contratoEquipo) {
      throw new HttpError('Equipo del contrato no encontrado', 404);
    }

    if (contratoEquipo.Estatus !== 'PENDIENTE') {
      throw new HttpError('El equipo ya está instalado o retirado', 300);
    }

    if (contratoEquipo.contrato.Estatus !== 'ACTIVO') {
      throw new HttpError('Solo se pueden instalar equipos de contratos activos', 300);
    }

    if (!contratoEquipo.EquipoID || !contratoEquipo.equipo) {
      throw new HttpError('El item no tiene un equipo físico asignado', 300);
    }

    const equipoNumeroSerie = contratoEquipo.equipo.NumeroSerie;

    await prisma.$transaction(async (tx) => {
      // Actualizar equipo del contrato
      await tx.contratos_equipos.update({
        where: { ContratoEquipoID },
        data: {
          Estatus: 'INSTALADO',
          FechaInstalacion: new Date(),
        },
      });

      // Actualizar equipo físico
      await tx.equipos.update({
        where: { EquipoID: contratoEquipo.EquipoID! },
        data: {
          Estatus: 'Instalado',
          FechaInstalacion: new Date(),
          ClienteID: contratoEquipo.contrato.ClienteID,
          SucursalID: contratoEquipo.contrato.SucursalID,
          ContratoID: contratoEquipo.ContratoID,
        },
      });
    });

    await this.registrarHistorial(
      contratoEquipo.ContratoID,
      'MODIFICACION',
      `Equipo ${equipoNumeroSerie} instalado`,
      UsuarioID
    );

    return this.findOne(contratoEquipo.ContratoID);
  }

  async retirarEquipo(ContratoEquipoID: number, UsuarioID: number) {
    const contratoEquipo = await prisma.contratos_equipos.findUnique({
      where: { ContratoEquipoID },
      include: { contrato: true, equipo: true },
    });

    if (!contratoEquipo) {
      throw new HttpError('Equipo del contrato no encontrado', 404);
    }

    if (contratoEquipo.Estatus !== 'INSTALADO') {
      throw new HttpError('Solo se pueden retirar equipos instalados', 300);
    }

    if (!contratoEquipo.EquipoID || !contratoEquipo.equipo) {
      throw new HttpError('El item no tiene un equipo físico asignado', 300);
    }

    const equipoNumeroSerie = contratoEquipo.equipo.NumeroSerie;

    await prisma.$transaction(async (tx) => {
      // Actualizar equipo del contrato
      await tx.contratos_equipos.update({
        where: { ContratoEquipoID },
        data: {
          Estatus: 'RETIRADO',
          FechaRetiro: new Date(),
        },
      });

      // Actualizar equipo físico
      await tx.equipos.update({
        where: { EquipoID: contratoEquipo.EquipoID! },
        data: {
          Estatus: 'Desmontado',
          FechaDesmontaje: new Date(),
          ClienteID: null,
          SucursalID: null,
          ContratoID: null,
        },
      });
    });

    // Recalcular monto si el contrato está activo
    if (contratoEquipo.contrato.Estatus === 'ACTIVO') {
      const montoTotal = await this.calcularMontoTotal(contratoEquipo.ContratoID);
      await prisma.contratos.update({
        where: { ContratoID: contratoEquipo.ContratoID },
        data: { MontoTotal: montoTotal },
      });
    }

    await this.registrarHistorial(
      contratoEquipo.ContratoID,
      'RETIRAR_EQUIPO',
      `Equipo ${equipoNumeroSerie} retirado del contrato`,
      UsuarioID
    );

    return this.findOne(contratoEquipo.ContratoID);
  }

  async updateEquipo(ContratoEquipoID: number, data: UpdateEquipoContratoDto, UsuarioID: number) {
    const contratoEquipo = await prisma.contratos_equipos.findUnique({
      where: { ContratoEquipoID },
      include: { contrato: true },
    });

    if (!contratoEquipo) {
      throw new HttpError('Equipo del contrato no encontrado', 404);
    }

    if (contratoEquipo.contrato.Estatus !== 'EN_REVISION' && contratoEquipo.contrato.Estatus !== 'ACTIVO') {
      throw new HttpError('Solo se pueden modificar equipos de contratos en revisión o activos', 300);
    }

    await prisma.contratos_equipos.update({
      where: { ContratoEquipoID },
      data,
    });

    // Recalcular monto si el contrato está activo
    if (contratoEquipo.contrato.Estatus === 'ACTIVO') {
      const montoTotal = await this.calcularMontoTotal(contratoEquipo.ContratoID);
      await prisma.contratos.update({
        where: { ContratoID: contratoEquipo.ContratoID },
        data: { MontoTotal: montoTotal },
      });
    }

    await this.registrarHistorial(
      contratoEquipo.ContratoID,
      'MODIFICACION',
      'Equipo del contrato actualizado',
      UsuarioID
    );

    return this.findOne(contratoEquipo.ContratoID);
  }

  // Asignar equipo físico a un item pendiente del contrato
  async asignarEquipo(ContratoEquipoID: number, data: AsignarEquipoDto, UsuarioID: number) {
    const contratoEquipo = await prisma.contratos_equipos.findUnique({
      where: { ContratoEquipoID },
      include: { contrato: true, plantilla: true },
    });

    if (!contratoEquipo) {
      throw new HttpError('Item del contrato no encontrado', 404);
    }

    if (contratoEquipo.EquipoID !== null) {
      throw new HttpError('Este item ya tiene un equipo físico asignado', 300);
    }

    if (contratoEquipo.contrato.Estatus !== 'EN_REVISION' && contratoEquipo.contrato.Estatus !== 'ACTIVO') {
      throw new HttpError('Solo se pueden asignar equipos a contratos en revisión o activos', 300);
    }

    // Validar equipo físico
    const equipo = await prisma.equipos.findUnique({
      where: { EquipoID: data.EquipoID },
      include: { plantilla: true },
    });

    if (!equipo) {
      throw new HttpError('El equipo no existe', 404);
    }

    if (equipo.IsActive !== 1) {
      throw new HttpError('El equipo no está activo', 300);
    }

    if (equipo.Estatus !== 'Armado' && equipo.Estatus !== 'Desmontado') {
      throw new HttpError('El equipo debe estar en estado Armado o Desmontado para asignarlo', 300);
    }

    // Verificar que no esté en otro contrato activo
    if (equipo.ContratoID && equipo.ContratoID !== contratoEquipo.ContratoID) {
      throw new HttpError('El equipo ya está asignado a otro contrato', 300);
    }

    // Verificar que no esté duplicado en este contrato
    const existente = await prisma.contratos_equipos.findFirst({
      where: {
        ContratoID: contratoEquipo.ContratoID,
        EquipoID: data.EquipoID,
        IsActive: 1,
        ContratoEquipoID: { not: ContratoEquipoID },
      },
    });

    if (existente) {
      throw new HttpError('El equipo ya está asignado a otro item de este contrato', 300);
    }

    // Validar que el equipo corresponda a la plantilla esperada (si aplica)
    if (contratoEquipo.PlantillaEquipoID && equipo.PlantillaEquipoID !== contratoEquipo.PlantillaEquipoID) {
      const plantillaEsperada = contratoEquipo.plantilla?.NombreEquipo || `ID ${contratoEquipo.PlantillaEquipoID}`;
      const plantillaEquipo = equipo.plantilla?.NombreEquipo || 'desconocida';
      throw new HttpError(
        `El equipo es de plantilla "${plantillaEquipo}" pero se requiere plantilla "${plantillaEsperada}"`,
        300
      );
    }

    // Actualizar el item del contrato con el equipo asignado
    await prisma.contratos_equipos.update({
      where: { ContratoEquipoID },
      data: {
        EquipoID: data.EquipoID,
        CantidadAsignada: 1,
        Observaciones: data.Observaciones || contratoEquipo.Observaciones,
      },
    });

    // Recalcular monto si el contrato está activo
    if (contratoEquipo.contrato.Estatus === 'ACTIVO') {
      const montoTotal = await this.calcularMontoTotal(contratoEquipo.ContratoID);
      await prisma.contratos.update({
        where: { ContratoID: contratoEquipo.ContratoID },
        data: { MontoTotal: montoTotal },
      });
    }

    await this.registrarHistorial(
      contratoEquipo.ContratoID,
      'AGREGAR_EQUIPO',
      `Equipo ${equipo.NumeroSerie} asignado al item: ${contratoEquipo.Descripcion}`,
      UsuarioID
    );

    return this.findOne(contratoEquipo.ContratoID);
  }

  // Obtener equipos disponibles para asignar a un item pendiente
  async getEquiposDisponibles(ContratoEquipoID: number) {
    const contratoEquipo = await prisma.contratos_equipos.findUnique({
      where: { ContratoEquipoID },
      include: { contrato: true, plantilla: true },
    });

    if (!contratoEquipo) {
      throw new HttpError('Item del contrato no encontrado', 404);
    }

    // Buscar equipos disponibles que coincidan con la plantilla
    const where: any = {
      IsActive: 1,
      Estatus: { in: ['Armado', 'Desmontado'] },
      OR: [
        { ContratoID: null },
        { ContratoID: contratoEquipo.ContratoID }, // Incluir los que ya están en este contrato
      ],
    };

    // Si el item tiene una plantilla específica, filtrar por ella
    if (contratoEquipo.PlantillaEquipoID) {
      where.PlantillaEquipoID = contratoEquipo.PlantillaEquipoID;
    }

    const equipos = await prisma.equipos.findMany({
      where,
      select: {
        EquipoID: true,
        NumeroSerie: true,
        Estatus: true,
        EsExterno: true,
        plantilla: {
          select: {
            PlantillaEquipoID: true,
            NombreEquipo: true,
            Codigo: true,
          },
        },
      },
      orderBy: { NumeroSerie: 'asc' },
    });

    // Filtrar los que ya están asignados a otro item de este contrato
    const equiposAsignados = await prisma.contratos_equipos.findMany({
      where: {
        ContratoID: contratoEquipo.ContratoID,
        EquipoID: { not: null },
        IsActive: 1,
        ContratoEquipoID: { not: ContratoEquipoID },
      },
      select: { EquipoID: true },
    });

    const idsAsignados = new Set(equiposAsignados.map(e => e.EquipoID));
    const equiposDisponibles = equipos.filter(e => !idsAsignados.has(e.EquipoID));

    return {
      message: 'Equipos disponibles obtenidos',
      data: {
        item: {
          ContratoEquipoID: contratoEquipo.ContratoEquipoID,
          Descripcion: contratoEquipo.Descripcion,
          TipoItem: contratoEquipo.TipoItem,
          PlantillaEquipoID: contratoEquipo.PlantillaEquipoID,
          plantilla: contratoEquipo.plantilla,
        },
        equipos: equiposDisponibles,
      },
    };
  }

  // Obtener items pendientes de asignar equipo
  async getItemsPendientes(ContratoID: number) {
    const contrato = await prisma.contratos.findUnique({
      where: { ContratoID },
    });

    if (!contrato) {
      throw new HttpError('Contrato no encontrado', 404);
    }

    const items = await prisma.contratos_equipos.findMany({
      where: {
        ContratoID,
        EquipoID: null, // Solo los pendientes
        IsActive: 1,
      },
      include: {
        plantilla: {
          select: { PlantillaEquipoID: true, NombreEquipo: true, Codigo: true, EsExterno: true },
        },
        refaccion: {
          select: { RefaccionID: true, NombrePieza: true, Codigo: true },
        },
      },
      orderBy: { ContratoEquipoID: 'asc' },
    });

    return { message: 'Items pendientes obtenidos', data: items };
  }

  // NOTA: Los servicios ahora se manejan en el módulo /servicios
}

export const contratosService = new ContratosService();
