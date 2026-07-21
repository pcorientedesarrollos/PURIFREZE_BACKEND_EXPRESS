import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import {
  CreateServicioAdicionalDto,
  UpdateServicioAdicionalDto,
  AgregarServicioAdicionalAplicadoDto,
  AutorizarServicioAdicionalDto,
  ActualizarServicioAdicionalAplicadoDto,
  ToggleCobrarAdicionalDto
} from './servicios-adicionales.schema';
import { localDate } from '../../utils/date-utils';

export class ServiciosAdicionalesService {
  /**
   * Crear un nuevo servicio adicional
   */
  async create(data: CreateServicioAdicionalDto) {
    const { Nombre } = data;

    // Verificar si ya existe un servicio con el mismo nombre
    const existingServicio = await prisma.catalogo_servicios_adicionales.findFirst({
      where: { Nombre },
    });

    if (existingServicio) {
      throw new HttpError('Ya existe un servicio adicional con ese nombre', 300);
    }

    const servicio = await prisma.catalogo_servicios_adicionales.create({
      data: {
        ...data,
        IsActive: 1,
      },
    });

    return servicio;
  }

  /**
   * Obtener todos los servicios adicionales
   */
  async findAll() {
    const servicios = await prisma.catalogo_servicios_adicionales.findMany({
      orderBy: { ServicioAdicionalID: 'desc' },
    });

    return servicios;
  }

  /**
   * Obtener solo servicios adicionales activos
   */
  async findAllActive() {
    const servicios = await prisma.catalogo_servicios_adicionales.findMany({
      where: { IsActive: 1 },
      orderBy: { Nombre: 'asc' },
    });

    return servicios;
  }

  /**
   * Obtener un servicio adicional por ID
   */
  async findOne(ServicioAdicionalID: number) {
    const servicio = await prisma.catalogo_servicios_adicionales.findUnique({
      where: { ServicioAdicionalID },
    });

    if (!servicio) {
      throw new HttpError('Servicio adicional no encontrado', 404);
    }

    return servicio;
  }

  /**
   * Actualizar un servicio adicional
   */
  async update(ServicioAdicionalID: number, data: UpdateServicioAdicionalDto) {
    // Verificar que el servicio existe
    const servicioExist = await prisma.catalogo_servicios_adicionales.findUnique({
      where: { ServicioAdicionalID },
    });

    if (!servicioExist) {
      throw new HttpError('Servicio adicional no encontrado', 404);
    }

    // Verificar que el nombre no esté en uso por otro servicio
    if (data.Nombre) {
      const nameInUse = await prisma.catalogo_servicios_adicionales.findFirst({
        where: {
          Nombre: data.Nombre,
          ServicioAdicionalID: { not: ServicioAdicionalID },
        },
      });

      if (nameInUse) {
        throw new HttpError('Ya existe un servicio adicional con ese nombre', 300);
      }
    }

    const servicio = await prisma.catalogo_servicios_adicionales.update({
      where: { ServicioAdicionalID },
      data,
    });

    return servicio;
  }

  /**
   * Dar de baja un servicio adicional (soft delete)
   */
  async bajaServicio(ServicioAdicionalID: number) {
    const servicio = await prisma.catalogo_servicios_adicionales.findUnique({
      where: { ServicioAdicionalID },
    });

    if (!servicio) {
      throw new HttpError('Servicio adicional no encontrado', 404);
    }

    if (servicio.IsActive === 0) {
      throw new HttpError('El servicio adicional ya está dado de baja', 300);
    }

    const servicioUpdated = await prisma.catalogo_servicios_adicionales.update({
      where: { ServicioAdicionalID },
      data: { IsActive: 0 },
    });

    return servicioUpdated;
  }

  /**
   * Activar un servicio adicional
   */
  async activarServicio(ServicioAdicionalID: number) {
    const servicio = await prisma.catalogo_servicios_adicionales.findUnique({
      where: { ServicioAdicionalID },
    });

    if (!servicio) {
      throw new HttpError('Servicio adicional no encontrado', 404);
    }

    if (servicio.IsActive === 1) {
      throw new HttpError('El servicio adicional ya está activo', 300);
    }

    const servicioUpdated = await prisma.catalogo_servicios_adicionales.update({
      where: { ServicioAdicionalID },
      data: { IsActive: 1 },
    });

    return servicioUpdated;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SERVICIOS ADICIONALES APLICADOS A UN SERVICIO TÉCNICO
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Agregar un servicio adicional a un servicio técnico
   */
  async agregarAServicio(servicioId: number, data: AgregarServicioAdicionalAplicadoDto, usuarioId?: number) {
    // Verificar que el servicio existe y está activo
    const servicio = await prisma.servicios.findFirst({
      where: { ServicioID: servicioId, IsActive: 1 },
    });

    if (!servicio) {
      throw new HttpError('Servicio técnico no encontrado', 404);
    }

    // Solo permitir agregar si el servicio no está finalizado
    if (['REALIZADO', 'CANCELADO'].includes(servicio.Estatus)) {
      throw new HttpError('No se pueden agregar servicios adicionales a un servicio finalizado o cancelado', 400);
    }

    // Obtener el servicio adicional del catálogo
    const servicioAdicional = await prisma.catalogo_servicios_adicionales.findUnique({
      where: { ServicioAdicionalID: data.ServicioAdicionalID },
    });

    if (!servicioAdicional) {
      throw new HttpError('Servicio adicional no encontrado en el catálogo', 404);
    }

    if (servicioAdicional.IsActive === 0) {
      throw new HttpError('El servicio adicional no está activo', 400);
    }

    // Verificar que no esté ya agregado
    const yaAgregado = await prisma.servicios_adicionales_aplicados.findFirst({
      where: {
        ServicioID: servicioId,
        ServicioAdicionalID: data.ServicioAdicionalID,
        IsActive: 1,
      },
    });

    if (yaAgregado) {
      throw new HttpError('Este servicio adicional ya está agregado al servicio', 400);
    }

    // Crear el registro (siempre autorizado por defecto)
    const aplicado = await prisma.servicios_adicionales_aplicados.create({
      data: {
        ServicioID: servicioId,
        ServicioAdicionalID: data.ServicioAdicionalID,
        NombreServicio: servicioAdicional.Nombre,
        CostoOriginal: servicioAdicional.Costo,
        CostoAplicado: data.CostoAplicado ?? servicioAdicional.Costo,
        Autorizado: 1, // Siempre autorizado por defecto
        FechaAutorizacion: localDate(),
        NombreAutorizante: 'Auto',
        Observaciones: data.Observaciones || null,
        UsuarioAgregaID: usuarioId || null,
        UsuarioAutorizaID: usuarioId || null,
        IsActive: 1,
      },
      include: {
        servicio_adicional: true,
      },
    });

    return aplicado;
  }

  /**
   * Obtener servicios adicionales de un servicio técnico
   */
  async obtenerDeServicio(servicioId: number) {
    const servicio = await prisma.servicios.findFirst({
      where: { ServicioID: servicioId, IsActive: 1 },
    });

    if (!servicio) {
      throw new HttpError('Servicio técnico no encontrado', 404);
    }

    const serviciosAplicados = await prisma.servicios_adicionales_aplicados.findMany({
      where: {
        ServicioID: servicioId,
        IsActive: 1,
      },
      include: {
        servicio_adicional: {
          select: {
            ServicioAdicionalID: true,
            Nombre: true,
            Costo: true,
          },
        },
      },
      orderBy: { FechaCreacion: 'asc' },
    });

    return serviciosAplicados;
  }

  /**
   * Autorizar un servicio adicional (requiere nombre del cliente que autoriza)
   */
  async autorizarServicioAplicado(
    servicioAdicionalAplicadoId: number,
    data: AutorizarServicioAdicionalDto,
    usuarioId?: number
  ) {
    const aplicado = await prisma.servicios_adicionales_aplicados.findFirst({
      where: { ServicioAdicionalAplicadoID: servicioAdicionalAplicadoId, IsActive: 1 },
      include: { servicio: true },
    });

    if (!aplicado) {
      throw new HttpError('Servicio adicional aplicado no encontrado', 404);
    }

    // Verificar que el servicio no esté finalizado
    if (['REALIZADO', 'CANCELADO'].includes(aplicado.servicio.Estatus)) {
      throw new HttpError('No se puede autorizar en un servicio finalizado o cancelado', 400);
    }

    if (aplicado.Autorizado === 1) {
      throw new HttpError('Este servicio adicional ya está autorizado', 400);
    }

    const actualizado = await prisma.servicios_adicionales_aplicados.update({
      where: { ServicioAdicionalAplicadoID: servicioAdicionalAplicadoId },
      data: {
        Autorizado: 1,
        FechaAutorizacion: localDate(),
        NombreAutorizante: data.NombreAutorizante,
        Observaciones: data.Observaciones || aplicado.Observaciones,
        UsuarioAutorizaID: usuarioId || null,
      },
      include: {
        servicio_adicional: true,
      },
    });

    return actualizado;
  }

  /**
   * Revocar autorización de un servicio adicional
   */
  async revocarAutorizacion(servicioAdicionalAplicadoId: number, usuarioId?: number) {
    const aplicado = await prisma.servicios_adicionales_aplicados.findFirst({
      where: { ServicioAdicionalAplicadoID: servicioAdicionalAplicadoId, IsActive: 1 },
      include: { servicio: true },
    });

    if (!aplicado) {
      throw new HttpError('Servicio adicional aplicado no encontrado', 404);
    }

    // Verificar que el servicio no esté finalizado
    if (['REALIZADO', 'CANCELADO'].includes(aplicado.servicio.Estatus)) {
      throw new HttpError('No se puede revocar en un servicio finalizado o cancelado', 400);
    }

    if (aplicado.Autorizado === 0) {
      throw new HttpError('Este servicio adicional no está autorizado', 400);
    }

    if (aplicado.CobroGenerado === 1) {
      throw new HttpError('No se puede revocar, ya se generó un cobro para este servicio', 400);
    }

    const actualizado = await prisma.servicios_adicionales_aplicados.update({
      where: { ServicioAdicionalAplicadoID: servicioAdicionalAplicadoId },
      data: {
        Autorizado: 0,
        FechaAutorizacion: null,
        NombreAutorizante: null,
        UsuarioAutorizaID: null,
      },
      include: {
        servicio_adicional: true,
      },
    });

    return actualizado;
  }

  /**
   * Actualizar un servicio adicional aplicado (cambiar costo u observaciones)
   */
  async actualizarServicioAplicado(
    servicioAdicionalAplicadoId: number,
    data: ActualizarServicioAdicionalAplicadoDto
  ) {
    const aplicado = await prisma.servicios_adicionales_aplicados.findFirst({
      where: { ServicioAdicionalAplicadoID: servicioAdicionalAplicadoId, IsActive: 1 },
      include: { servicio: true },
    });

    if (!aplicado) {
      throw new HttpError('Servicio adicional aplicado no encontrado', 404);
    }

    // Verificar que el servicio no esté finalizado
    if (['REALIZADO', 'CANCELADO'].includes(aplicado.servicio.Estatus)) {
      throw new HttpError('No se puede modificar en un servicio finalizado o cancelado', 400);
    }

    if (aplicado.CobroGenerado === 1) {
      throw new HttpError('No se puede modificar, ya se generó un cobro para este servicio', 400);
    }

    const actualizado = await prisma.servicios_adicionales_aplicados.update({
      where: { ServicioAdicionalAplicadoID: servicioAdicionalAplicadoId },
      data: {
        CostoAplicado: data.CostoAplicado ?? aplicado.CostoAplicado,
        Observaciones: data.Observaciones !== undefined ? data.Observaciones : aplicado.Observaciones,
      },
      include: {
        servicio_adicional: true,
      },
    });

    return actualizado;
  }

  /**
   * Eliminar un servicio adicional de un servicio técnico
   */
  async eliminarDeServicio(servicioAdicionalAplicadoId: number) {
    const aplicado = await prisma.servicios_adicionales_aplicados.findFirst({
      where: { ServicioAdicionalAplicadoID: servicioAdicionalAplicadoId, IsActive: 1 },
      include: { servicio: true },
    });

    if (!aplicado) {
      throw new HttpError('Servicio adicional aplicado no encontrado', 404);
    }

    // Verificar que el servicio no esté finalizado
    if (['REALIZADO', 'CANCELADO'].includes(aplicado.servicio.Estatus)) {
      throw new HttpError('No se puede eliminar de un servicio finalizado o cancelado', 400);
    }

    if (aplicado.CobroGenerado === 1) {
      throw new HttpError('No se puede eliminar, ya se generó un cobro para este servicio', 400);
    }

    await prisma.servicios_adicionales_aplicados.update({
      where: { ServicioAdicionalAplicadoID: servicioAdicionalAplicadoId },
      data: { IsActive: 0 },
    });

    return { message: 'Servicio adicional eliminado del servicio' };
  }

  /**
   * Toggle Cobrar de un servicio adicional aplicado
   */
  async toggleCobrar(
    servicioAdicionalAplicadoId: number,
    data: ToggleCobrarAdicionalDto
  ) {
    const aplicado = await prisma.servicios_adicionales_aplicados.findFirst({
      where: { ServicioAdicionalAplicadoID: servicioAdicionalAplicadoId, IsActive: 1 },
      include: { servicio: true },
    });

    if (!aplicado) {
      throw new HttpError('Servicio adicional aplicado no encontrado', 404);
    }

    if (['REALIZADO', 'CANCELADO'].includes(aplicado.servicio.Estatus)) {
      throw new HttpError('No se puede modificar en un servicio finalizado o cancelado', 400);
    }

    if (aplicado.CobroGenerado === 1) {
      throw new HttpError('No se puede modificar, ya se generó un cobro para este servicio', 400);
    }

    const actualizado = await prisma.servicios_adicionales_aplicados.update({
      where: { ServicioAdicionalAplicadoID: servicioAdicionalAplicadoId },
      data: { Cobrar: data.Cobrar ? 1 : 0 },
      include: {
        servicio_adicional: true,
      },
    });

    return actualizado;
  }

  /**
   * Obtener resumen de servicios adicionales para un servicio
   * (útil para mostrar totales antes de finalizar)
   */
  async obtenerResumen(servicioId: number) {
    const aplicados = await prisma.servicios_adicionales_aplicados.findMany({
      where: {
        ServicioID: servicioId,
        IsActive: 1,
      },
    });

    const total = aplicados.length;
    const autorizados = aplicados.filter(a => a.Autorizado === 1);
    const noAutorizados = aplicados.filter(a => a.Autorizado === 0);
    const totalAutorizado = autorizados.reduce((sum, a) => sum + a.CostoAplicado, 0);
    const totalNoAutorizado = noAutorizados.reduce((sum, a) => sum + a.CostoAplicado, 0);

    return {
      Total: total,
      Autorizados: autorizados.length,
      NoAutorizados: noAutorizados.length,
      MontoAutorizado: totalAutorizado,
      MontoNoAutorizado: totalNoAutorizado,
      MontoPotencial: totalAutorizado + totalNoAutorizado,
    };
  }
}

// Exportar instancia singleton
export const serviciosAdicionalesService = new ServiciosAdicionalesService();
