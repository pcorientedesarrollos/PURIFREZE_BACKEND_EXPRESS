import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import {
  ConfigurarCobrosDto,
  RegistrarPagoDto,
  AplicarRegaloDto,
  AplicarDescuentoDto,
  CancelarCobroDto,
  ModificarMontoDto,
  CobrosQueryDto,
  PagarConDescuentoDto,
} from './cobros.schema';

class CobrosService {
  // =============================================
  // CONFIGURACIÓN Y GENERACIÓN DE COBROS
  // =============================================

  /**
   * Configurar la generación de cobros para un contrato
   * Solo se puede configurar si el contrato está EN_REVISION o ACTIVO
   */
  async configurarCobros(contratoId: number, data: ConfigurarCobrosDto) {
    // Verificar que el contrato existe y está en estado válido
    const contrato = await prisma.contratos.findUnique({
      where: { ContratoID: contratoId },
      include: { cobros_configuracion: true },
    });

    if (!contrato) {
      throw new HttpError('El contrato no existe', 404);
    }

    if (!['EN_REVISION', 'ACTIVO'].includes(contrato.Estatus)) {
      throw new HttpError('Solo se pueden configurar cobros para contratos EN_REVISION o ACTIVO', 300);
    }

    // Calcular el número total de cobros
    const totalCobros = this.calcularTotalCobros(
      data.TipoTiempoContrato,
      data.TiempoContrato,
      data.FrecuenciaCobro,
      data.TiempoFrecuencia
    );

    // Crear o actualizar la configuración
    const configuracion = await prisma.cobros_configuracion.upsert({
      where: { ContratoID: contratoId },
      create: {
        ContratoID: contratoId,
        FechaInicialCobros: new Date(data.FechaInicialCobros),
        MontoCobro: data.MontoCobro,
        TipoTiempoContrato: data.TipoTiempoContrato,
        TiempoContrato: data.TiempoContrato,
        FrecuenciaCobro: data.FrecuenciaCobro,
        TiempoFrecuencia: data.TiempoFrecuencia,
        TotalCobros: totalCobros,
        CobrosGenerados: 0,
        Observaciones: data.Observaciones,
        UsuarioID: data.UsuarioID,
      },
      update: {
        FechaInicialCobros: new Date(data.FechaInicialCobros),
        MontoCobro: data.MontoCobro,
        TipoTiempoContrato: data.TipoTiempoContrato,
        TiempoContrato: data.TiempoContrato,
        FrecuenciaCobro: data.FrecuenciaCobro,
        TiempoFrecuencia: data.TiempoFrecuencia,
        TotalCobros: totalCobros,
        Observaciones: data.Observaciones,
      },
    });

    return {
      message: 'Configuración de cobros guardada exitosamente',
      data: {
        configuracion,
        totalCobrosAGenerar: totalCobros,
      },
    };
  }

  /**
   * Generar los cobros para un contrato según su configuración
   * Se ejecuta típicamente al activar el contrato
   */
  async generarCobros(contratoId: number, usuarioId: number) {
    // Obtener configuración
    const configuracion = await prisma.cobros_configuracion.findUnique({
      where: { ContratoID: contratoId },
      include: { contrato: true },
    });

    if (!configuracion) {
      throw new HttpError('No hay configuración de cobros para este contrato', 404);
    }

    if (configuracion.CobrosGenerados >= configuracion.TotalCobros) {
      throw new HttpError('Todos los cobros ya han sido generados', 300);
    }

    // Generar cobros pendientes
    const cobrosAGenerar = configuracion.TotalCobros - configuracion.CobrosGenerados;
    const cobrosCreados = [];

    let fechaVencimiento = new Date(configuracion.FechaInicialCobros);

    // Si ya hay cobros generados, calcular la siguiente fecha
    if (configuracion.CobrosGenerados > 0) {
      fechaVencimiento = this.calcularSiguienteFecha(
        new Date(configuracion.FechaInicialCobros),
        configuracion.FrecuenciaCobro,
        configuracion.TiempoFrecuencia,
        configuracion.CobrosGenerados
      );
    }

    // Generar el número de contrato base para los cobros
    const numeroContratoBase = configuracion.contrato.NumeroContrato;

    for (let i = 0; i < cobrosAGenerar; i++) {
      const numeroPeriodo = configuracion.CobrosGenerados + i + 1;
      const numeroCobro = `${numeroContratoBase}-C${numeroPeriodo.toString().padStart(3, '0')}`;

      const cobro = await prisma.cobros.create({
        data: {
          ContratoID: contratoId,
          NumeroCobro: numeroCobro,
          NumeroPeriodo: numeroPeriodo,
          FechaVencimiento: fechaVencimiento,
          MontoOriginal: configuracion.MontoCobro,
          MontoFinal: configuracion.MontoCobro,
          Estatus: 'PENDIENTE',
          UsuarioCreadorID: usuarioId,
        },
      });

      // Registrar en historial
      await prisma.cobros_historial.create({
        data: {
          CobroID: cobro.CobroID,
          TipoAccion: 'CREACION',
          Descripcion: `Cobro generado automáticamente - Periodo ${numeroPeriodo}/${configuracion.TotalCobros}`,
          UsuarioID: usuarioId,
        },
      });

      cobrosCreados.push(cobro);

      // Calcular siguiente fecha
      fechaVencimiento = this.calcularSiguienteFecha(
        fechaVencimiento,
        configuracion.FrecuenciaCobro,
        configuracion.TiempoFrecuencia,
        1
      );
    }

    // Actualizar contador de cobros generados
    await prisma.cobros_configuracion.update({
      where: { ConfiguracionID: configuracion.ConfiguracionID },
      data: { CobrosGenerados: configuracion.TotalCobros },
    });

    return {
      message: `Se generaron ${cobrosCreados.length} cobros exitosamente`,
      data: {
        cobrosGenerados: cobrosCreados.length,
        totalCobros: configuracion.TotalCobros,
        cobros: cobrosCreados,
      },
    };
  }

  /**
   * Obtener configuración de cobros de un contrato
   */
  async getConfiguracion(contratoId: number) {
    const configuracion = await prisma.cobros_configuracion.findUnique({
      where: { ContratoID: contratoId },
    });

    if (!configuracion) {
      throw new HttpError('No hay configuración de cobros para este contrato', 404);
    }

    return {
      message: 'Configuración obtenida exitosamente',
      data: configuracion,
    };
  }

  // =============================================
  // CONSULTAS
  // =============================================

  /**
   * Obtener todos los cobros con filtros
   */
  async findAll(query: CobrosQueryDto) {
    const { ContratoID, ClienteID, Estatus, FechaDesde, FechaHasta, Vencidos, page = 1, limit = 20 } = query;

    const where: any = { IsActive: 1 };

    if (ContratoID) {
      where.ContratoID = ContratoID;
    }

    if (ClienteID) {
      where.contrato = { ClienteID: ClienteID };
    }

    if (Estatus) {
      where.Estatus = Estatus;
    }

    if (FechaDesde || FechaHasta) {
      where.FechaVencimiento = {};
      if (FechaDesde) {
        where.FechaVencimiento.gte = new Date(FechaDesde);
      }
      if (FechaHasta) {
        where.FechaVencimiento.lte = new Date(FechaHasta);
      }
    }

    if (Vencidos) {
      where.Estatus = 'PENDIENTE';
      where.FechaVencimiento = { lt: new Date() };
    }

    const [cobros, total] = await Promise.all([
      prisma.cobros.findMany({
        where,
        include: {
          contrato: {
            include: {
              cliente: { select: { ClienteID: true, NombreComercio: true } },
            },
          },
          cliente_equipo: {
            include: {
              plantilla: { select: { PlantillaEquipoID: true, NombreEquipo: true } },
            },
          },
        },
        orderBy: { FechaVencimiento: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.cobros.count({ where }),
    ]);

    return {
      message: 'Cobros obtenidos exitosamente',
      data: {
        cobros,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  /**
   * Obtener un cobro por ID
   */
  async findOne(cobroId: number) {
    const cobro = await prisma.cobros.findUnique({
      where: { CobroID: cobroId },
      include: {
        contrato: {
          include: {
            cliente: true,
            sucursal: true,
          },
        },
        cliente_equipo: {
          include: {
            plantilla: true,
            equipo: true,
          },
        },
        historial: {
          orderBy: { FechaAccion: 'desc' },
        },
      },
    });

    if (!cobro) {
      throw new HttpError('El cobro no existe', 404);
    }

    return {
      message: 'Cobro obtenido exitosamente',
      data: cobro,
    };
  }

  /**
   * Obtener cobros de un contrato
   */
  async findByContrato(contratoId: number) {
    const contrato = await prisma.contratos.findUnique({
      where: { ContratoID: contratoId },
    });

    if (!contrato) {
      throw new HttpError('El contrato no existe', 404);
    }

    const cobros = await prisma.cobros.findMany({
      where: {
        ContratoID: contratoId,
        IsActive: 1,
      },
      include: {
        cliente_equipo: {
          include: {
            plantilla: { select: { PlantillaEquipoID: true, NombreEquipo: true } },
          },
        },
      },
      orderBy: { NumeroPeriodo: 'asc' },
    });

    // Calcular resumen
    const resumen = {
      totalCobros: cobros.length,
      pendientes: cobros.filter((c) => c.Estatus === 'PENDIENTE').length,
      pagados: cobros.filter((c) => c.Estatus === 'PAGADO').length,
      parciales: cobros.filter((c) => c.Estatus === 'PARCIAL').length,
      vencidos: cobros.filter((c) => c.Estatus === 'PENDIENTE' && new Date(c.FechaVencimiento) < new Date()).length,
      regalados: cobros.filter((c) => c.Estatus === 'REGALADO').length,
      promociones: cobros.filter((c) => c.Estatus === 'PROMOCION').length,
      cancelados: cobros.filter((c) => c.Estatus === 'CANCELADO').length,
      montoTotalEsperado: cobros.reduce((sum, c) => sum + c.MontoOriginal, 0),
      montoTotalCobrado: cobros.reduce((sum, c) => sum + (c.MontoPagado || 0), 0),
    };

    return {
      message: 'Cobros del contrato obtenidos exitosamente',
      data: {
        cobros,
        resumen,
      },
    };
  }

  /**
   * Obtener cobros vencidos
   */
  async getVencidos() {
    const cobros = await prisma.cobros.findMany({
      where: {
        Estatus: 'PENDIENTE',
        FechaVencimiento: { lt: new Date() },
        IsActive: 1,
      },
      include: {
        contrato: {
          include: {
            cliente: { select: { ClienteID: true, NombreComercio: true } },
          },
        },
      },
      orderBy: { FechaVencimiento: 'asc' },
    });

    return {
      message: 'Cobros vencidos obtenidos exitosamente',
      data: cobros,
    };
  }

  /**
   * Obtener resumen de cobros por cliente
   */
  async getResumenCliente(clienteId: number) {
    const cliente = await prisma.catalogo_clientes.findUnique({
      where: { ClienteID: clienteId },
    });

    if (!cliente) {
      throw new HttpError('El cliente no existe', 404);
    }

    const cobros = await prisma.cobros.findMany({
      where: {
        contrato: { ClienteID: clienteId },
        IsActive: 1,
      },
      include: {
        contrato: { select: { ContratoID: true, NumeroContrato: true } },
      },
    });

    const resumen = {
      cliente: {
        ClienteID: cliente.ClienteID,
        NombreComercio: cliente.NombreComercio,
      },
      totalCobros: cobros.length,
      pendientes: cobros.filter((c) => c.Estatus === 'PENDIENTE').length,
      vencidos: cobros.filter((c) => c.Estatus === 'PENDIENTE' && new Date(c.FechaVencimiento) < new Date()).length,
      pagados: cobros.filter((c) => c.Estatus === 'PAGADO').length,
      montoTotalPendiente: cobros.filter((c) => c.Estatus === 'PENDIENTE').reduce((sum, c) => sum + c.MontoFinal, 0),
      montoTotalPagado: cobros.reduce((sum, c) => sum + (c.MontoPagado || 0), 0),
    };

    return {
      message: 'Resumen del cliente obtenido exitosamente',
      data: resumen,
    };
  }

  // =============================================
  // ACCIONES SOBRE COBROS
  // =============================================

  /**
   * Registrar pago completo
   */
  async registrarPago(cobroId: number, data: RegistrarPagoDto) {
    const cobro = await prisma.cobros.findUnique({
      where: { CobroID: cobroId },
    });

    if (!cobro) {
      throw new HttpError('El cobro no existe', 404);
    }

    if (['PAGADO', 'REGALADO', 'CANCELADO'].includes(cobro.Estatus)) {
      throw new HttpError(`No se puede registrar pago en un cobro con estatus ${cobro.Estatus}`, 300);
    }

    const fechaPago = data.FechaPago ? new Date(data.FechaPago) : new Date();

    const cobroActualizado = await prisma.$transaction(async (tx) => {
      // Actualizar cobro
      const updated = await tx.cobros.update({
        where: { CobroID: cobroId },
        data: {
          Estatus: 'PAGADO',
          FechaPago: fechaPago,
          MetodoPagoID: data.MetodoPagoID,
          MontoPagado: data.MontoPagado,
          Referencia: data.Referencia,
          Observaciones: data.Observaciones,
          UsuarioPagoID: data.UsuarioID,
        },
      });

      // Registrar historial
      await tx.cobros_historial.create({
        data: {
          CobroID: cobroId,
          TipoAccion: 'PAGO',
          Descripcion: `Pago registrado por $${data.MontoPagado}`,
          ValorAnterior: JSON.stringify({ Estatus: cobro.Estatus }),
          ValorNuevo: JSON.stringify({ Estatus: 'PAGADO', MontoPagado: data.MontoPagado }),
          UsuarioID: data.UsuarioID,
        },
      });

      return updated;
    });

    return {
      message: 'Pago registrado exitosamente',
      data: cobroActualizado,
    };
  }

  /**
   * Registrar pago parcial
   */
  async registrarPagoParcial(cobroId: number, data: RegistrarPagoDto) {
    const cobro = await prisma.cobros.findUnique({
      where: { CobroID: cobroId },
    });

    if (!cobro) {
      throw new HttpError('El cobro no existe', 404);
    }

    if (['PAGADO', 'REGALADO', 'CANCELADO'].includes(cobro.Estatus)) {
      throw new HttpError(`No se puede registrar pago en un cobro con estatus ${cobro.Estatus}`, 300);
    }

    const montoAcumulado = (cobro.MontoPagado || 0) + data.MontoPagado;
    const fechaPago = data.FechaPago ? new Date(data.FechaPago) : new Date();

    // Determinar si es pago completo o parcial
    const nuevoEstatus = montoAcumulado >= cobro.MontoFinal ? 'PAGADO' : 'PARCIAL';

    const cobroActualizado = await prisma.$transaction(async (tx) => {
      const updated = await tx.cobros.update({
        where: { CobroID: cobroId },
        data: {
          Estatus: nuevoEstatus,
          FechaPago: fechaPago,
          MetodoPagoID: data.MetodoPagoID,
          MontoPagado: montoAcumulado,
          Referencia: data.Referencia,
          Observaciones: data.Observaciones,
          UsuarioPagoID: data.UsuarioID,
        },
      });

      await tx.cobros_historial.create({
        data: {
          CobroID: cobroId,
          TipoAccion: nuevoEstatus === 'PAGADO' ? 'PAGO' : 'PAGO_PARCIAL',
          Descripcion: `Pago ${nuevoEstatus === 'PAGADO' ? 'completo' : 'parcial'} registrado por $${data.MontoPagado}. Acumulado: $${montoAcumulado}`,
          ValorAnterior: JSON.stringify({ Estatus: cobro.Estatus, MontoPagado: cobro.MontoPagado }),
          ValorNuevo: JSON.stringify({ Estatus: nuevoEstatus, MontoPagado: montoAcumulado }),
          UsuarioID: data.UsuarioID,
        },
      });

      return updated;
    });

    return {
      message: nuevoEstatus === 'PAGADO' ? 'Pago completo registrado exitosamente' : 'Pago parcial registrado exitosamente',
      data: cobroActualizado,
    };
  }

  /**
   * Aplicar regalo (cobro gratis)
   */
  async aplicarRegalo(cobroId: number, data: AplicarRegaloDto) {
    const cobro = await prisma.cobros.findUnique({
      where: { CobroID: cobroId },
    });

    if (!cobro) {
      throw new HttpError('El cobro no existe', 404);
    }

    if (['PAGADO', 'REGALADO', 'CANCELADO'].includes(cobro.Estatus)) {
      throw new HttpError(`No se puede regalar un cobro con estatus ${cobro.Estatus}`, 300);
    }

    const cobroActualizado = await prisma.$transaction(async (tx) => {
      const updated = await tx.cobros.update({
        where: { CobroID: cobroId },
        data: {
          Estatus: 'REGALADO',
          MotivoEspecial: data.MotivoEspecial,
          DescripcionMotivo: data.DescripcionMotivo,
          MontoFinal: 0,
          MontoPagado: 0,
          Observaciones: data.Observaciones,
          FechaPago: new Date(),
          UsuarioPagoID: data.UsuarioID,
        },
      });

      await tx.cobros_historial.create({
        data: {
          CobroID: cobroId,
          TipoAccion: 'REGALO',
          Descripcion: `Cobro marcado como regalo/cortesía: ${data.DescripcionMotivo || data.MotivoEspecial}`,
          ValorAnterior: JSON.stringify({ Estatus: cobro.Estatus, MontoFinal: cobro.MontoFinal }),
          ValorNuevo: JSON.stringify({ Estatus: 'REGALADO', MontoFinal: 0 }),
          UsuarioID: data.UsuarioID,
        },
      });

      return updated;
    });

    return {
      message: 'Cobro marcado como regalo exitosamente',
      data: cobroActualizado,
    };
  }

  /**
   * Aplicar descuento o promoción
   */
  async aplicarDescuento(cobroId: number, data: AplicarDescuentoDto) {
    const cobro = await prisma.cobros.findUnique({
      where: { CobroID: cobroId },
    });

    if (!cobro) {
      throw new HttpError('El cobro no existe', 404);
    }

    if (['PAGADO', 'REGALADO', 'CANCELADO'].includes(cobro.Estatus)) {
      throw new HttpError(`No se puede aplicar descuento a un cobro con estatus ${cobro.Estatus}`, 300);
    }

    let montoDescuento: number;
    let montoPromocion: number | null = null;

    if (data.TipoDescuento === 'PORCENTAJE') {
      if (data.ValorDescuento > 100) {
        throw new HttpError('El porcentaje de descuento no puede ser mayor a 100', 300);
      }
      montoDescuento = cobro.MontoOriginal * (data.ValorDescuento / 100);
    } else {
      if (data.ValorDescuento > cobro.MontoOriginal) {
        throw new HttpError('El monto del descuento no puede ser mayor al monto original', 300);
      }
      montoDescuento = data.ValorDescuento;
    }

    const nuevoMontoFinal = cobro.MontoOriginal - montoDescuento;

    // Determinar si es promoción o descuento
    if (data.MotivoEspecial === 'PROMOCION') {
      montoPromocion = montoDescuento;
      montoDescuento = 0;
    }

    const cobroActualizado = await prisma.$transaction(async (tx) => {
      const updated = await tx.cobros.update({
        where: { CobroID: cobroId },
        data: {
          Estatus: nuevoMontoFinal === 0 ? 'PROMOCION' : cobro.Estatus,
          MontoDescuento: montoDescuento > 0 ? montoDescuento : cobro.MontoDescuento,
          MontoPromocion: montoPromocion,
          MontoFinal: nuevoMontoFinal,
          MotivoEspecial: data.MotivoEspecial,
          DescripcionMotivo: data.DescripcionMotivo,
          Observaciones: data.Observaciones,
        },
      });

      await tx.cobros_historial.create({
        data: {
          CobroID: cobroId,
          TipoAccion: data.MotivoEspecial === 'PROMOCION' ? 'PROMOCION' : 'DESCUENTO',
          Descripcion: `Aplicado ${data.TipoDescuento === 'PORCENTAJE' ? data.ValorDescuento + '%' : '$' + data.ValorDescuento} de ${data.MotivoEspecial || 'descuento'}`,
          ValorAnterior: JSON.stringify({ MontoFinal: cobro.MontoFinal }),
          ValorNuevo: JSON.stringify({ MontoFinal: nuevoMontoFinal, MontoDescuento: montoDescuento }),
          UsuarioID: data.UsuarioID,
        },
      });

      return updated;
    });

    return {
      message: 'Descuento aplicado exitosamente',
      data: cobroActualizado,
    };
  }

  /**
   * Pagar con descuento (descuento + pago en una sola operación)
   * Ejemplo: Cobro de $550, descuento 50%, cliente paga $275 → PAGADO
   */
  async pagarConDescuento(cobroId: number, data: PagarConDescuentoDto) {
    const cobro = await prisma.cobros.findUnique({
      where: { CobroID: cobroId },
    });

    if (!cobro) {
      throw new HttpError('El cobro no existe', 404);
    }

    if (['PAGADO', 'REGALADO', 'CANCELADO'].includes(cobro.Estatus)) {
      throw new HttpError(`No se puede procesar un cobro con estatus ${cobro.Estatus}`, 300);
    }

    // Calcular descuento
    let montoDescuento: number;

    if (data.TipoDescuento === 'PORCENTAJE') {
      if (data.ValorDescuento > 100) {
        throw new HttpError('El porcentaje de descuento no puede ser mayor a 100', 300);
      }
      montoDescuento = cobro.MontoOriginal * (data.ValorDescuento / 100);
    } else {
      if (data.ValorDescuento > cobro.MontoOriginal) {
        throw new HttpError('El monto del descuento no puede ser mayor al monto original', 300);
      }
      montoDescuento = data.ValorDescuento;
    }

    const montoFinal = cobro.MontoOriginal - montoDescuento;
    const fechaPago = data.FechaPago ? new Date(data.FechaPago) : new Date();

    // Si el descuento es 100%, es un regalo
    const esRegalo = montoFinal === 0;

    const cobroActualizado = await prisma.$transaction(async (tx) => {
      const updated = await tx.cobros.update({
        where: { CobroID: cobroId },
        data: {
          Estatus: esRegalo ? 'REGALADO' : 'PAGADO',
          MontoDescuento: montoDescuento,
          MontoFinal: montoFinal,
          MontoPagado: montoFinal,
          FechaPago: fechaPago,
          MetodoPagoID: esRegalo ? null : data.MetodoPagoID,
          Referencia: data.Referencia,
          MotivoEspecial: data.MotivoEspecial || 'DESCUENTO',
          DescripcionMotivo: data.DescripcionMotivo,
          Observaciones: data.Observaciones,
          UsuarioPagoID: data.UsuarioID,
        },
      });

      // Registrar historial del descuento
      await tx.cobros_historial.create({
        data: {
          CobroID: cobroId,
          TipoAccion: 'DESCUENTO',
          Descripcion: `Descuento aplicado: ${data.TipoDescuento === 'PORCENTAJE' ? data.ValorDescuento + '%' : '$' + data.ValorDescuento} (-$${montoDescuento.toFixed(2)})`,
          ValorAnterior: JSON.stringify({ MontoOriginal: cobro.MontoOriginal, MontoFinal: cobro.MontoFinal }),
          ValorNuevo: JSON.stringify({ MontoDescuento: montoDescuento, MontoFinal: montoFinal }),
          UsuarioID: data.UsuarioID,
        },
      });

      // Registrar historial del pago
      await tx.cobros_historial.create({
        data: {
          CobroID: cobroId,
          TipoAccion: esRegalo ? 'REGALO' : 'PAGO',
          Descripcion: esRegalo
            ? `Cobro liquidado como regalo (descuento 100%)`
            : `Pago registrado por $${montoFinal.toFixed(2)} (con descuento de $${montoDescuento.toFixed(2)})`,
          ValorAnterior: JSON.stringify({ Estatus: cobro.Estatus }),
          ValorNuevo: JSON.stringify({ Estatus: esRegalo ? 'REGALADO' : 'PAGADO', MontoPagado: montoFinal }),
          UsuarioID: data.UsuarioID,
        },
      });

      return updated;
    });

    return {
      message: esRegalo
        ? 'Cobro liquidado como regalo exitosamente'
        : `Cobro pagado con descuento exitosamente. Original: $${cobro.MontoOriginal}, Descuento: $${montoDescuento.toFixed(2)}, Pagado: $${montoFinal.toFixed(2)}`,
      data: cobroActualizado,
    };
  }

  /**
   * Cancelar cobro
   */
  async cancelar(cobroId: number, data: CancelarCobroDto) {
    const cobro = await prisma.cobros.findUnique({
      where: { CobroID: cobroId },
    });

    if (!cobro) {
      throw new HttpError('El cobro no existe', 404);
    }

    if (['PAGADO', 'CANCELADO'].includes(cobro.Estatus)) {
      throw new HttpError(`No se puede cancelar un cobro con estatus ${cobro.Estatus}`, 300);
    }

    const cobroActualizado = await prisma.$transaction(async (tx) => {
      const updated = await tx.cobros.update({
        where: { CobroID: cobroId },
        data: {
          Estatus: 'CANCELADO',
          MotivoCancelacion: data.MotivoCancelacion,
          Observaciones: data.Observaciones,
        },
      });

      await tx.cobros_historial.create({
        data: {
          CobroID: cobroId,
          TipoAccion: 'CANCELACION',
          Descripcion: `Cobro cancelado: ${data.MotivoCancelacion}`,
          ValorAnterior: JSON.stringify({ Estatus: cobro.Estatus }),
          ValorNuevo: JSON.stringify({ Estatus: 'CANCELADO' }),
          UsuarioID: data.UsuarioID,
        },
      });

      return updated;
    });

    return {
      message: 'Cobro cancelado exitosamente',
      data: cobroActualizado,
    };
  }

  /**
   * Modificar monto de un cobro
   */
  async modificarMonto(cobroId: number, data: ModificarMontoDto) {
    const cobro = await prisma.cobros.findUnique({
      where: { CobroID: cobroId },
    });

    if (!cobro) {
      throw new HttpError('El cobro no existe', 404);
    }

    if (['PAGADO', 'REGALADO', 'CANCELADO'].includes(cobro.Estatus)) {
      throw new HttpError(`No se puede modificar el monto de un cobro con estatus ${cobro.Estatus}`, 300);
    }

    const cobroActualizado = await prisma.$transaction(async (tx) => {
      const updated = await tx.cobros.update({
        where: { CobroID: cobroId },
        data: {
          MontoOriginal: data.MontoNuevo,
          MontoFinal: data.MontoNuevo - (cobro.MontoDescuento || 0) - (cobro.MontoPromocion || 0),
        },
      });

      await tx.cobros_historial.create({
        data: {
          CobroID: cobroId,
          TipoAccion: 'MODIFICACION',
          Descripcion: `Monto modificado${data.Motivo ? ': ' + data.Motivo : ''}`,
          ValorAnterior: JSON.stringify({ MontoOriginal: cobro.MontoOriginal }),
          ValorNuevo: JSON.stringify({ MontoOriginal: data.MontoNuevo }),
          UsuarioID: data.UsuarioID,
        },
      });

      return updated;
    });

    return {
      message: 'Monto modificado exitosamente',
      data: cobroActualizado,
    };
  }

  /**
   * Marcar cobros vencidos (tarea programada)
   */
  async marcarVencidos() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const cobrosActualizados = await prisma.cobros.updateMany({
      where: {
        Estatus: 'PENDIENTE',
        FechaVencimiento: { lt: hoy },
        IsActive: 1,
      },
      data: {
        Estatus: 'VENCIDO',
      },
    });

    return {
      message: `Se marcaron ${cobrosActualizados.count} cobros como vencidos`,
      data: { cobrosActualizados: cobrosActualizados.count },
    };
  }

  // =============================================
  // HELPERS
  // =============================================

  /**
   * Calcular el total de cobros según la configuración
   */
  private calcularTotalCobros(
    tipoTiempo: string,
    tiempo: number,
    frecuencia: string,
    tiempoFrecuencia: number
  ): number {
    // Convertir todo a meses
    let mesesTotales: number;
    switch (tipoTiempo) {
      case 'ANIOS':
        mesesTotales = tiempo * 12;
        break;
      case 'MESES':
        mesesTotales = tiempo;
        break;
      case 'SEMANAS':
        mesesTotales = (tiempo * 7) / 30;
        break;
      case 'DIAS':
        mesesTotales = tiempo / 30;
        break;
      default:
        mesesTotales = tiempo;
    }

    // Calcular frecuencia en meses
    let mesesPorCobro: number;
    switch (frecuencia) {
      case 'SEMANAL':
        mesesPorCobro = 0.25 * tiempoFrecuencia;
        break;
      case 'QUINCENAL':
        mesesPorCobro = 0.5 * tiempoFrecuencia;
        break;
      case 'MENSUAL':
        mesesPorCobro = 1 * tiempoFrecuencia;
        break;
      case 'BIMESTRAL':
        mesesPorCobro = 2 * tiempoFrecuencia;
        break;
      case 'TRIMESTRAL':
        mesesPorCobro = 3 * tiempoFrecuencia;
        break;
      case 'SEMESTRAL':
        mesesPorCobro = 6 * tiempoFrecuencia;
        break;
      case 'ANUAL':
        mesesPorCobro = 12 * tiempoFrecuencia;
        break;
      default:
        mesesPorCobro = 1;
    }

    return Math.ceil(mesesTotales / mesesPorCobro);
  }

  /**
   * Calcular la siguiente fecha de vencimiento
   */
  private calcularSiguienteFecha(
    fechaBase: Date,
    frecuencia: string,
    tiempoFrecuencia: number,
    periodos: number
  ): Date {
    const fecha = new Date(fechaBase);

    let diasASumar: number;
    switch (frecuencia) {
      case 'SEMANAL':
        diasASumar = 7 * tiempoFrecuencia * periodos;
        break;
      case 'QUINCENAL':
        diasASumar = 15 * tiempoFrecuencia * periodos;
        break;
      case 'MENSUAL':
        fecha.setMonth(fecha.getMonth() + tiempoFrecuencia * periodos);
        return fecha;
      case 'BIMESTRAL':
        fecha.setMonth(fecha.getMonth() + 2 * tiempoFrecuencia * periodos);
        return fecha;
      case 'TRIMESTRAL':
        fecha.setMonth(fecha.getMonth() + 3 * tiempoFrecuencia * periodos);
        return fecha;
      case 'SEMESTRAL':
        fecha.setMonth(fecha.getMonth() + 6 * tiempoFrecuencia * periodos);
        return fecha;
      case 'ANUAL':
        fecha.setFullYear(fecha.getFullYear() + tiempoFrecuencia * periodos);
        return fecha;
      default:
        diasASumar = 30 * tiempoFrecuencia * periodos;
    }

    fecha.setDate(fecha.getDate() + diasASumar);
    return fecha;
  }
}

export const cobrosService = new CobrosService();
