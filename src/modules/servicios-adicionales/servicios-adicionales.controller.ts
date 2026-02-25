import { Request, Response } from 'express';
import { serviciosAdicionalesService } from './servicios-adicionales.service';
import { success } from '../../utils/response';
import {
  CreateServicioAdicionalDto,
  UpdateServicioAdicionalDto,
  AgregarServicioAdicionalAplicadoDto,
  AutorizarServicioAdicionalDto,
  ActualizarServicioAdicionalAplicadoDto,
  ToggleCobrarAdicionalDto
} from './servicios-adicionales.schema';

export class ServiciosAdicionalesController {
  /**
   * POST /servicios-adicionales
   */
  async create(req: Request, res: Response) {
    const data = req.body as CreateServicioAdicionalDto;
    const servicio = await serviciosAdicionalesService.create(data);
    return success(res, 'Servicio adicional creado', servicio);
  }

  /**
   * GET /servicios-adicionales
   */
  async findAll(_req: Request, res: Response) {
    const servicios = await serviciosAdicionalesService.findAll();
    return success(res, 'Servicios adicionales obtenidos', servicios);
  }

  /**
   * GET /servicios-adicionales/activos
   */
  async findAllActive(_req: Request, res: Response) {
    const servicios = await serviciosAdicionalesService.findAllActive();
    return success(res, 'Servicios adicionales activos obtenidos', servicios);
  }

  /**
   * GET /servicios-adicionales/:ServicioAdicionalID
   */
  async findOne(req: Request, res: Response) {
    const ServicioAdicionalID = Number(req.params.ServicioAdicionalID);
    const servicio = await serviciosAdicionalesService.findOne(ServicioAdicionalID);
    return success(res, 'Servicio adicional obtenido', servicio);
  }

  /**
   * PUT /servicios-adicionales/:ServicioAdicionalID
   */
  async update(req: Request, res: Response) {
    const ServicioAdicionalID = Number(req.params.ServicioAdicionalID);
    const data = req.body as UpdateServicioAdicionalDto;
    const servicio = await serviciosAdicionalesService.update(ServicioAdicionalID, data);
    return success(res, 'Servicio adicional actualizado', servicio);
  }

  /**
   * PATCH /servicios-adicionales/baja/:ServicioAdicionalID
   */
  async bajaServicio(req: Request, res: Response) {
    const ServicioAdicionalID = Number(req.params.ServicioAdicionalID);
    const servicio = await serviciosAdicionalesService.bajaServicio(ServicioAdicionalID);
    return success(res, 'Servicio adicional dado de baja', servicio);
  }

  /**
   * PATCH /servicios-adicionales/activar/:ServicioAdicionalID
   */
  async activarServicio(req: Request, res: Response) {
    const ServicioAdicionalID = Number(req.params.ServicioAdicionalID);
    const servicio = await serviciosAdicionalesService.activarServicio(ServicioAdicionalID);
    return success(res, 'Servicio adicional activado', servicio);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SERVICIOS ADICIONALES APLICADOS A SERVICIOS TÉCNICOS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * POST /servicios/:ServicioID/adicionales
   * Agregar un servicio adicional a un servicio técnico
   */
  async agregarAServicio(req: Request, res: Response) {
    const servicioId = Number(req.params.ServicioID);
    const usuarioId = (req as any).user?.UsuarioID;
    const data = req.body as AgregarServicioAdicionalAplicadoDto;
    const aplicado = await serviciosAdicionalesService.agregarAServicio(servicioId, data, usuarioId);
    return success(res, 'Servicio adicional agregado al servicio', aplicado);
  }

  /**
   * GET /servicios/:ServicioID/adicionales
   * Obtener servicios adicionales de un servicio técnico
   */
  async obtenerDeServicio(req: Request, res: Response) {
    const servicioId = Number(req.params.ServicioID);
    const aplicados = await serviciosAdicionalesService.obtenerDeServicio(servicioId);
    return success(res, 'Servicios adicionales del servicio obtenidos', aplicados);
  }

  /**
   * GET /servicios/:ServicioID/adicionales/resumen
   * Obtener resumen de servicios adicionales de un servicio
   */
  async obtenerResumen(req: Request, res: Response) {
    const servicioId = Number(req.params.ServicioID);
    const resumen = await serviciosAdicionalesService.obtenerResumen(servicioId);
    return success(res, 'Resumen de servicios adicionales obtenido', resumen);
  }

  /**
   * PATCH /servicios/adicionales-aplicados/:ServicioAdicionalAplicadoID/autorizar
   * Autorizar un servicio adicional
   */
  async autorizarServicioAplicado(req: Request, res: Response) {
    const aplicadoId = Number(req.params.ServicioAdicionalAplicadoID);
    const usuarioId = (req as any).user?.UsuarioID;
    const data = req.body as AutorizarServicioAdicionalDto;
    const autorizado = await serviciosAdicionalesService.autorizarServicioAplicado(aplicadoId, data, usuarioId);
    return success(res, 'Servicio adicional autorizado', autorizado);
  }

  /**
   * PATCH /servicios/adicionales-aplicados/:ServicioAdicionalAplicadoID/revocar
   * Revocar autorización de un servicio adicional
   */
  async revocarAutorizacion(req: Request, res: Response) {
    const aplicadoId = Number(req.params.ServicioAdicionalAplicadoID);
    const usuarioId = (req as any).user?.UsuarioID;
    const revocado = await serviciosAdicionalesService.revocarAutorizacion(aplicadoId, usuarioId);
    return success(res, 'Autorización revocada', revocado);
  }

  /**
   * PUT /servicios/adicionales-aplicados/:ServicioAdicionalAplicadoID
   * Actualizar un servicio adicional aplicado
   */
  async actualizarServicioAplicado(req: Request, res: Response) {
    const aplicadoId = Number(req.params.ServicioAdicionalAplicadoID);
    const data = req.body as ActualizarServicioAdicionalAplicadoDto;
    const actualizado = await serviciosAdicionalesService.actualizarServicioAplicado(aplicadoId, data);
    return success(res, 'Servicio adicional actualizado', actualizado);
  }

  /**
   * PATCH /servicios/adicionales-aplicados/:ServicioAdicionalAplicadoID/cobrar
   * Toggle Cobrar de un servicio adicional aplicado
   */
  async toggleCobrar(req: Request, res: Response) {
    const aplicadoId = Number(req.params.ServicioAdicionalAplicadoID);
    const data = req.body as ToggleCobrarAdicionalDto;
    const actualizado = await serviciosAdicionalesService.toggleCobrar(aplicadoId, data);
    return success(res, `Cobrar ${data.Cobrar ? 'activado' : 'desactivado'}`, actualizado);
  }

  /**
   * DELETE /servicios/adicionales-aplicados/:ServicioAdicionalAplicadoID
   * Eliminar un servicio adicional de un servicio técnico
   */
  async eliminarDeServicio(req: Request, res: Response) {
    const aplicadoId = Number(req.params.ServicioAdicionalAplicadoID);
    const resultado = await serviciosAdicionalesService.eliminarDeServicio(aplicadoId);
    return success(res, resultado.message, null);
  }
}

// Exportar instancia singleton
export const serviciosAdicionalesController = new ServiciosAdicionalesController();
