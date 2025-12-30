import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import {
  CreateContratoDto,
  UpdateContratoDto,
  UpdateContratoActivoDto,
  AddEquipoDto,
  EliminarEquipoDto,
  AsignarEquipoDto,
  CancelarContratoDto,
  RenovarContratoDto,
  ActualizarMontoDto,
  ContratosQueryDto,
} from './contratos.schema';
import { cobrosService } from '../cobros/cobros.service';

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
    const contrato = await prisma.contratos.findUnique({
      where: { ContratoID },
      select: { MontoTotal: true },
    });
    return contrato?.MontoTotal || 0;
  }

  // =============================================
  // CONTRATOS - CRUD
  // =============================================

  /**
   * NOTA: Los contratos ahora se crean automáticamente al aprobar presupuestos
   * Este método create() es para casos especiales donde se necesite crear
   * un contrato manualmente desde un presupuesto aprobado que no tiene contrato
   */
  async create(data: CreateContratoDto) {
    // Validar presupuesto
    const presupuesto = await prisma.presupuestos_encabezado.findUnique({
      where: { PresupuestoID: data.PresupuestoID },
      include: {
        cliente: true,
        sucursal: true,
        detalles: {
          where: { IsActive: 1, TipoItem: 'EQUIPO_PURIFREEZE', Modalidad: 'RENTA' },
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

    // Calcular monto total desde los detalles del presupuesto
    let montoTotal = 0;
    for (const detalle of presupuesto.detalles) {
      const periodoMeses = detalle.PeriodoRenta || 12;
      montoTotal += detalle.PrecioUnitario * detalle.Cantidad * periodoMeses;
    }

    const numeroContrato = await this.generarNumeroContrato();

    // Crear contrato
    const contrato = await prisma.$transaction(async (tx) => {
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
          MontoTotal: montoTotal,
          FrecuenciaMantenimiento: data.FrecuenciaMantenimiento || null,
          PenalizacionCancelacion: data.PenalizacionCancelacion || null,
          Observaciones: data.Observaciones || null,
          Estatus: 'EN_REVISION',
          UsuarioID: data.UsuarioID,
          IsActive: 1,
        },
      });

      // Crear registros en clientes_equipos para los equipos de RENTA
      for (const detalle of presupuesto.detalles) {
        for (let i = 0; i < detalle.Cantidad; i++) {
          await tx.clientes_equipos.create({
            data: {
              ClienteID: presupuesto.ClienteID,
              SucursalID: presupuesto.SucursalID,
              PlantillaEquipoID: detalle.PlantillaEquipoID,
              TipoPropiedad: 'RENTA',
              ContratoID: nuevoContrato.ContratoID,
              PresupuestoDetalleID: detalle.DetalleID,
              FechaAsignacion: new Date(),
              Estatus: 'PENDIENTE_INSTALACION',
              Observaciones: `Equipo de contrato ${numeroContrato}`,
              IsActive: 1,
            },
          });
        }
      }

      return nuevoContrato;
    });

    await this.registrarHistorial(
      contrato.ContratoID,
      'CREACION',
      `Contrato ${numeroContrato} creado desde presupuesto #${data.PresupuestoID}`,
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
          select: { clientes_equipos: true },
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
        // Equipos del cliente asociados a este contrato
        clientes_equipos: {
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
            plantilla: {
              select: { PlantillaEquipoID: true, NombreEquipo: true, Codigo: true, EsExterno: true },
            },
            presupuesto_detalle: {
              select: {
                DetalleID: true,
                Descripcion: true,
                PrecioUnitario: true,
                PeriodoRenta: true,
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
          select: { clientes_equipos: true },
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
      include: {
        clientes_equipos: {
          where: { IsActive: 1 },
        },
        cobros_configuracion: true,
      },
    });

    if (!contrato) {
      throw new HttpError('Contrato no encontrado', 404);
    }

    if (contrato.Estatus !== 'EN_REVISION') {
      throw new HttpError('Solo se pueden activar contratos en revisión', 300);
    }

    if (contrato.clientes_equipos.length === 0) {
      throw new HttpError('El contrato debe tener al menos un equipo asociado', 300);
    }

    const updated = await prisma.contratos.update({
      where: { ContratoID },
      data: {
        Estatus: 'ACTIVO',
      },
    });

    await this.registrarHistorial(
      ContratoID,
      'ACTIVACION',
      `Contrato activado con monto total: $${contrato.MontoTotal?.toFixed(2) || 0}`,
      UsuarioID
    );

    // Generar cobros automáticamente si hay configuración
    let cobrosGenerados = null;
    if (contrato.cobros_configuracion) {
      try {
        const resultadoCobros = await cobrosService.generarCobros(ContratoID, UsuarioID);
        cobrosGenerados = resultadoCobros.data;
      } catch (error) {
        // Si falla la generación de cobros, solo lo registramos pero no falla la activación
        console.error('Error al generar cobros automáticos:', error);
      }
    }

    return {
      message: 'Contrato activado' + (cobrosGenerados ? ` con ${cobrosGenerados.cobrosGenerados} cobros generados` : ''),
      data: {
        contrato: updated,
        cobros: cobrosGenerados,
      },
    };
  }

  async cancelar(ContratoID: number, data: CancelarContratoDto) {
    const contrato = await prisma.contratos.findUnique({
      where: { ContratoID },
      include: {
        clientes_equipos: {
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

    // Marcar equipos como retirados
    await prisma.$transaction(async (tx) => {
      for (const ce of contrato.clientes_equipos) {
        // Actualizar cliente_equipo
        await tx.clientes_equipos.update({
          where: { ClienteEquipoID: ce.ClienteEquipoID },
          data: {
            Estatus: 'RETIRADO',
            FechaRetiro: new Date(),
            MotivoRetiro: data.MotivosCancelacion,
          },
        });

        // Actualizar equipo físico si existe
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

      // Actualizar contrato
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
        clientes_equipos: {
          where: { IsActive: 1, Estatus: 'INSTALADO' },
          include: { equipo: true, presupuesto_detalle: true },
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
          MontoTotal: contrato.MontoTotal || 0,
          FrecuenciaMantenimiento: data.FrecuenciaMantenimiento !== undefined ? data.FrecuenciaMantenimiento : contrato.FrecuenciaMantenimiento,
          PenalizacionCancelacion: data.PenalizacionCancelacion !== undefined ? data.PenalizacionCancelacion : contrato.PenalizacionCancelacion,
          Observaciones: data.Observaciones || null,
          ContratoOrigenID: ContratoID,
          Estatus: 'ACTIVO',
          UsuarioID: data.UsuarioID,
          IsActive: 1,
        },
      });

      // Transferir equipos al nuevo contrato
      for (const ce of contrato.clientes_equipos) {
        // Actualizar el cliente_equipo existente para apuntar al nuevo contrato
        await tx.clientes_equipos.update({
          where: { ClienteEquipoID: ce.ClienteEquipoID },
          data: {
            ContratoID: nuevo.ContratoID,
            Observaciones: `Transferido de contrato ${contrato.NumeroContrato} a ${numeroContrato}`,
          },
        });

        // Actualizar referencia en equipo físico
        if (ce.EquipoID) {
          await tx.equipos.update({
            where: { EquipoID: ce.EquipoID },
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

  /**
   * Actualizar contrato activo (solo fechas y observaciones)
   */
  async updateContratoActivo(ContratoID: number, data: UpdateContratoActivoDto) {
    const contrato = await prisma.contratos.findUnique({
      where: { ContratoID },
    });

    if (!contrato) {
      throw new HttpError('Contrato no encontrado', 404);
    }

    if (contrato.Estatus !== 'ACTIVO') {
      throw new HttpError('Este endpoint es solo para contratos activos. Use PUT /contratos/:id para contratos en revisión', 300);
    }

    const valoresAnteriores = {
      FechaInicio: contrato.FechaInicio,
      FechaFin: contrato.FechaFin,
      Observaciones: contrato.Observaciones,
    };

    const updated = await prisma.contratos.update({
      where: { ContratoID },
      data: {
        FechaInicio: data.FechaInicio ? new Date(data.FechaInicio) : undefined,
        FechaFin: data.FechaFin ? new Date(data.FechaFin) : undefined,
        Observaciones: data.Observaciones !== undefined ? data.Observaciones : undefined,
      },
    });

    await this.registrarHistorial(
      ContratoID,
      'MODIFICACION',
      'Contrato activo actualizado (fechas/observaciones)',
      data.UsuarioID,
      valoresAnteriores,
      {
        FechaInicio: updated.FechaInicio,
        FechaFin: updated.FechaFin,
        Observaciones: updated.Observaciones,
      }
    );

    return this.findOne(ContratoID);
  }

  /**
   * Agregar equipo(s) a un contrato existente
   */
  async addEquipo(ContratoID: number, data: AddEquipoDto) {
    const contrato = await prisma.contratos.findUnique({
      where: { ContratoID },
      include: { cliente: true, sucursal: true },
    });

    if (!contrato) {
      throw new HttpError('Contrato no encontrado', 404);
    }

    if (contrato.Estatus !== 'EN_REVISION' && contrato.Estatus !== 'ACTIVO') {
      throw new HttpError('Solo se pueden agregar equipos a contratos en revisión o activos', 300);
    }

    // Validar plantilla
    const plantilla = await prisma.plantillas_equipo.findUnique({
      where: { PlantillaEquipoID: data.PlantillaEquipoID },
    });

    if (!plantilla || plantilla.IsActive !== 1) {
      throw new HttpError('La plantilla de equipo no existe o no está activa', 404);
    }

    // Si se proporciona EquipoID, validar que solo sea cantidad 1
    if (data.EquipoID && data.Cantidad > 1) {
      throw new HttpError('Cuando se asigna un equipo físico directamente, la cantidad debe ser 1', 300);
    }

    // Validar equipo físico si se proporciona
    let equipo = null;
    if (data.EquipoID) {
      equipo = await prisma.equipos.findUnique({
        where: { EquipoID: data.EquipoID },
      });

      if (!equipo || equipo.IsActive !== 1) {
        throw new HttpError('El equipo no existe o no está activo', 404);
      }

      if (equipo.Estatus !== 'Armado' && equipo.Estatus !== 'Reacondicionado' && equipo.Estatus !== 'Desmontado') {
        throw new HttpError(`El equipo debe estar en estado Armado, Reacondicionado o Desmontado. Estado actual: ${equipo.Estatus}`, 300);
      }

      if (equipo.PlantillaEquipoID !== data.PlantillaEquipoID) {
        throw new HttpError('El equipo no corresponde a la plantilla seleccionada', 300);
      }

      // Verificar que no esté asignado a otro cliente
      const equipoAsignado = await prisma.clientes_equipos.findFirst({
        where: {
          EquipoID: data.EquipoID,
          IsActive: 1,
          Estatus: { in: ['ACTIVO', 'INSTALADO', 'PENDIENTE_INSTALACION'] },
        },
      });

      if (equipoAsignado) {
        throw new HttpError('El equipo ya está asignado a otro cliente/contrato', 300);
      }
    }

    const equiposCreados = await prisma.$transaction(async (tx) => {
      const creados = [];

      for (let i = 0; i < data.Cantidad; i++) {
        const clienteEquipo = await tx.clientes_equipos.create({
          data: {
            ClienteID: contrato.ClienteID,
            SucursalID: contrato.SucursalID,
            PlantillaEquipoID: data.PlantillaEquipoID,
            EquipoID: i === 0 && data.EquipoID ? data.EquipoID : null, // Solo el primero si se proporciona
            TipoPropiedad: 'RENTA',
            ContratoID: ContratoID,
            FechaAsignacion: new Date(),
            Estatus: 'PENDIENTE_INSTALACION',
            Observaciones: data.Observaciones || `Equipo agregado manualmente al contrato ${contrato.NumeroContrato}`,
            IsActive: 1,
          },
        });
        creados.push(clienteEquipo);
      }

      // Recalcular monto si se proporciona precio
      if (data.PrecioUnitario && data.PrecioUnitario > 0) {
        const periodoMeses = data.PeriodoRenta || 12;
        const montoAdicional = data.PrecioUnitario * data.Cantidad * periodoMeses;
        const nuevoMonto = (contrato.MontoTotal || 0) + montoAdicional;

        await tx.contratos.update({
          where: { ContratoID },
          data: { MontoTotal: nuevoMonto },
        });
      }

      return creados;
    });

    await this.registrarHistorial(
      ContratoID,
      'AGREGAR_EQUIPO',
      `${data.Cantidad} equipo(s) agregado(s) al contrato: ${plantilla.NombreEquipo}`,
      data.UsuarioID,
      null,
      { cantidad: data.Cantidad, plantilla: plantilla.NombreEquipo, equiposCreados: equiposCreados.length }
    );

    return this.findOne(ContratoID);
  }

  /**
   * Eliminar equipo del contrato (solo si NO está instalado)
   * Si tiene equipo físico asignado, lo devuelve al inventario como estaba
   */
  async eliminarEquipo(ClienteEquipoID: number, data: EliminarEquipoDto) {
    const clienteEquipo = await prisma.clientes_equipos.findUnique({
      where: { ClienteEquipoID },
      include: {
        contrato: true,
        equipo: true,
        plantilla: true,
      },
    });

    if (!clienteEquipo) {
      throw new HttpError('Equipo del cliente no encontrado', 404);
    }

    if (!clienteEquipo.ContratoID || !clienteEquipo.contrato) {
      throw new HttpError('Este equipo no está asociado a un contrato', 300);
    }

    if (clienteEquipo.contrato.Estatus !== 'EN_REVISION' && clienteEquipo.contrato.Estatus !== 'ACTIVO') {
      throw new HttpError('Solo se pueden eliminar equipos de contratos en revisión o activos', 300);
    }

    // Validar que NO esté instalado
    if (clienteEquipo.Estatus === 'INSTALADO') {
      throw new HttpError('No se puede eliminar un equipo instalado. Debe desinstalarlo primero mediante un servicio', 300);
    }

    const equipoInfo = clienteEquipo.equipo?.NumeroSerie || clienteEquipo.plantilla?.NombreEquipo || 'Sin identificar';
    const contratoID = clienteEquipo.ContratoID;

    await prisma.$transaction(async (tx) => {
      // Si tiene equipo físico asignado, devolverlo al inventario
      if (clienteEquipo.EquipoID && clienteEquipo.equipo) {
        // Determinar estado a restaurar: si estaba Desmontado lo dejamos así,
        // si no, lo dejamos como estaba antes de asignar (Armado o Reacondicionado)
        // Por simplicidad, lo dejamos en el estado actual del equipo (no cambiamos nada)
        // ya que aún no fue instalado, solo asignado
      }

      // Eliminar el registro de cliente_equipo (soft delete)
      await tx.clientes_equipos.update({
        where: { ClienteEquipoID },
        data: {
          IsActive: 0,
          Estatus: 'RETIRADO',
          FechaRetiro: new Date(),
          MotivoRetiro: data.MotivoEliminacion || 'Eliminado del contrato antes de instalación',
          EquipoID: null, // Liberar el equipo físico
        },
      });
    });

    await this.registrarHistorial(
      contratoID,
      'RETIRAR_EQUIPO',
      `Equipo eliminado del contrato (no instalado): ${equipoInfo}. ${data.MotivoEliminacion || ''}`,
      data.UsuarioID
    );

    return this.findOne(contratoID);
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
  // EQUIPOS DEL CONTRATO (usando clientes_equipos)
  // =============================================

  /**
   * Asignar equipo físico a un equipo del cliente pendiente de instalación
   */
  async asignarEquipo(ClienteEquipoID: number, data: AsignarEquipoDto, UsuarioID: number) {
    const clienteEquipo = await prisma.clientes_equipos.findUnique({
      where: { ClienteEquipoID },
      include: {
        contrato: true,
        plantilla: true,
        cliente: { select: { NombreComercio: true } },
      },
    });

    if (!clienteEquipo) {
      throw new HttpError('Equipo del cliente no encontrado', 404);
    }

    if (clienteEquipo.EquipoID !== null) {
      throw new HttpError('Este registro ya tiene un equipo físico asignado', 300);
    }

    if (!clienteEquipo.ContratoID || !clienteEquipo.contrato) {
      throw new HttpError('Este equipo no está asociado a un contrato', 300);
    }

    if (clienteEquipo.contrato.Estatus !== 'EN_REVISION' && clienteEquipo.contrato.Estatus !== 'ACTIVO') {
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

    if (equipo.Estatus !== 'Armado' && equipo.Estatus !== 'Reacondicionado' && equipo.Estatus !== 'Desmontado') {
      throw new HttpError(`El equipo debe estar en estado Armado, Reacondicionado o Desmontado para asignarlo. Estado actual: ${equipo.Estatus}`, 300);
    }

    // Verificar que no esté asignado a otro cliente/contrato
    const equipoAsignado = await prisma.clientes_equipos.findFirst({
      where: {
        EquipoID: data.EquipoID,
        IsActive: 1,
        Estatus: { in: ['ACTIVO', 'INSTALADO', 'PENDIENTE_INSTALACION'] },
        ClienteEquipoID: { not: ClienteEquipoID },
      },
    });

    if (equipoAsignado) {
      throw new HttpError('El equipo ya está asignado a otro cliente', 300);
    }

    // Validar que el equipo corresponda a la plantilla esperada (si aplica)
    if (clienteEquipo.PlantillaEquipoID && equipo.PlantillaEquipoID !== clienteEquipo.PlantillaEquipoID) {
      const plantillaEsperada = clienteEquipo.plantilla?.NombreEquipo || `ID ${clienteEquipo.PlantillaEquipoID}`;
      const plantillaEquipo = equipo.plantilla?.NombreEquipo || 'desconocida';
      throw new HttpError(
        `El equipo es de plantilla "${plantillaEquipo}" pero se requiere plantilla "${plantillaEsperada}"`,
        300
      );
    }

    // Actualizar el registro de cliente_equipo con el equipo asignado
    await prisma.clientes_equipos.update({
      where: { ClienteEquipoID },
      data: {
        EquipoID: data.EquipoID,
        Observaciones: data.Observaciones || clienteEquipo.Observaciones,
      },
    });

    await this.registrarHistorial(
      clienteEquipo.ContratoID!,
      'AGREGAR_EQUIPO',
      `Equipo ${equipo.NumeroSerie} asignado para cliente ${clienteEquipo.cliente?.NombreComercio}`,
      UsuarioID
    );

    return this.findOne(clienteEquipo.ContratoID!);
  }

  /**
   * Marcar equipo como instalado
   */
  async instalarEquipo(ClienteEquipoID: number, UsuarioID: number) {
    const clienteEquipo = await prisma.clientes_equipos.findUnique({
      where: { ClienteEquipoID },
      include: {
        contrato: true,
        equipo: true,
        cliente: { select: { ClienteID: true, NombreComercio: true } },
        sucursal: { select: { SucursalID: true } },
      },
    });

    if (!clienteEquipo) {
      throw new HttpError('Equipo del cliente no encontrado', 404);
    }

    if (!clienteEquipo.EquipoID || !clienteEquipo.equipo) {
      throw new HttpError('El registro no tiene un equipo físico asignado', 300);
    }

    if (clienteEquipo.Estatus === 'INSTALADO') {
      throw new HttpError('El equipo ya está instalado', 300);
    }

    if (!clienteEquipo.ContratoID || !clienteEquipo.contrato) {
      throw new HttpError('Este equipo no está asociado a un contrato', 300);
    }

    if (clienteEquipo.contrato.Estatus !== 'ACTIVO') {
      throw new HttpError('Solo se pueden instalar equipos de contratos activos', 300);
    }

    const equipoNumeroSerie = clienteEquipo.equipo.NumeroSerie;

    await prisma.$transaction(async (tx) => {
      // Actualizar cliente_equipo
      await tx.clientes_equipos.update({
        where: { ClienteEquipoID },
        data: {
          Estatus: 'INSTALADO',
        },
      });

      // Actualizar equipo físico
      await tx.equipos.update({
        where: { EquipoID: clienteEquipo.EquipoID! },
        data: {
          Estatus: 'Instalado',
          FechaInstalacion: new Date(),
          ClienteID: clienteEquipo.ClienteID,
          SucursalID: clienteEquipo.SucursalID,
          ContratoID: clienteEquipo.ContratoID,
        },
      });
    });

    await this.registrarHistorial(
      clienteEquipo.ContratoID!,
      'MODIFICACION',
      `Equipo ${equipoNumeroSerie} instalado`,
      UsuarioID
    );

    return this.findOne(clienteEquipo.ContratoID!);
  }

  /**
   * Retirar equipo del contrato
   */
  async retirarEquipo(ClienteEquipoID: number, UsuarioID: number, motivoRetiro?: string) {
    const clienteEquipo = await prisma.clientes_equipos.findUnique({
      where: { ClienteEquipoID },
      include: {
        contrato: true,
        equipo: true,
      },
    });

    if (!clienteEquipo) {
      throw new HttpError('Equipo del cliente no encontrado', 404);
    }

    if (clienteEquipo.Estatus === 'RETIRADO') {
      throw new HttpError('El equipo ya está retirado', 300);
    }

    if (!clienteEquipo.ContratoID) {
      throw new HttpError('Este equipo no está asociado a un contrato', 300);
    }

    const equipoNumeroSerie = clienteEquipo.equipo?.NumeroSerie || 'Sin asignar';

    await prisma.$transaction(async (tx) => {
      // Actualizar cliente_equipo
      await tx.clientes_equipos.update({
        where: { ClienteEquipoID },
        data: {
          Estatus: 'RETIRADO',
          FechaRetiro: new Date(),
          MotivoRetiro: motivoRetiro || 'Retiro manual',
        },
      });

      // Actualizar equipo físico si existe
      if (clienteEquipo.EquipoID) {
        await tx.equipos.update({
          where: { EquipoID: clienteEquipo.EquipoID },
          data: {
            Estatus: 'Desmontado',
            FechaDesmontaje: new Date(),
            ClienteID: null,
            SucursalID: null,
            ContratoID: null,
          },
        });
      }
    });

    await this.registrarHistorial(
      clienteEquipo.ContratoID,
      'RETIRAR_EQUIPO',
      `Equipo ${equipoNumeroSerie} retirado del contrato`,
      UsuarioID
    );

    return this.findOne(clienteEquipo.ContratoID);
  }

  /**
   * Obtener equipos disponibles para asignar a un registro de cliente_equipo
   */
  async getEquiposDisponibles(ClienteEquipoID: number) {
    const clienteEquipo = await prisma.clientes_equipos.findUnique({
      where: { ClienteEquipoID },
      include: { contrato: true, plantilla: true },
    });

    if (!clienteEquipo) {
      throw new HttpError('Equipo del cliente no encontrado', 404);
    }

    // Buscar equipos disponibles que coincidan con la plantilla
    const where: any = {
      IsActive: 1,
      Estatus: { in: ['Armado', 'Reacondicionado', 'Desmontado'] },
    };

    // Si tiene una plantilla específica, filtrar por ella
    if (clienteEquipo.PlantillaEquipoID) {
      where.PlantillaEquipoID = clienteEquipo.PlantillaEquipoID;
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

    // Filtrar los que ya están asignados a algún cliente activo
    const equiposAsignados = await prisma.clientes_equipos.findMany({
      where: {
        EquipoID: { not: null },
        IsActive: 1,
        Estatus: { in: ['ACTIVO', 'INSTALADO', 'PENDIENTE_INSTALACION'] },
      },
      select: { EquipoID: true },
    });

    const idsAsignados = new Set(equiposAsignados.map(e => e.EquipoID));
    const equiposDisponibles = equipos.filter(e => !idsAsignados.has(e.EquipoID));

    return {
      message: 'Equipos disponibles obtenidos',
      data: {
        item: {
          ClienteEquipoID: clienteEquipo.ClienteEquipoID,
          PlantillaEquipoID: clienteEquipo.PlantillaEquipoID,
          plantilla: clienteEquipo.plantilla,
          TipoPropiedad: clienteEquipo.TipoPropiedad,
          Estatus: clienteEquipo.Estatus,
        },
        equipos: equiposDisponibles,
      },
    };
  }

  /**
   * Obtener equipos pendientes de asignación o instalación de un contrato
   */
  async getEquiposPendientes(ContratoID: number) {
    const contrato = await prisma.contratos.findUnique({
      where: { ContratoID },
    });

    if (!contrato) {
      throw new HttpError('Contrato no encontrado', 404);
    }

    const equipos = await prisma.clientes_equipos.findMany({
      where: {
        ContratoID,
        IsActive: 1,
        OR: [
          { EquipoID: null }, // Sin equipo físico asignado
          { Estatus: 'PENDIENTE_INSTALACION' }, // Con equipo pero pendiente de instalar
        ],
      },
      include: {
        plantilla: {
          select: { PlantillaEquipoID: true, NombreEquipo: true, Codigo: true, EsExterno: true },
        },
        equipo: {
          select: { EquipoID: true, NumeroSerie: true, Estatus: true },
        },
        presupuesto_detalle: {
          select: { DetalleID: true, Descripcion: true, PrecioUnitario: true },
        },
      },
      orderBy: { ClienteEquipoID: 'asc' },
    });

    return { message: 'Equipos pendientes obtenidos', data: equipos };
  }
}

export const contratosService = new ContratosService();
