import { Request, Response } from 'express';
import { serviciosService } from './servicios.service';
import { success } from '../../utils/response';
import { SearchServiciosQuery, AgendaQuery } from './servicios.schema';

class ServiciosController {
  // ═══════════════════════════════════════════════════════════════════════════
  // CRUD BÁSICO
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Crear servicio
   * POST /servicios
   */
  async create(req: Request, res: Response) {
    const usuarioId = (req as any).usuario?.UsuarioID;
    const result = await serviciosService.create(req.body, usuarioId);
    return success(res, result.message, result.data, 201);
  }

  /**
   * Obtener todos los servicios
   * GET /servicios
   */
  async findAll(req: Request, res: Response) {
    const query = req.query as unknown as SearchServiciosQuery;
    const result = await serviciosService.findAll(query);
    return success(res, result.message, result.data);
  }

  /**
   * Obtener servicio por ID
   * GET /servicios/:ServicioID
   */
  async findOne(req: Request, res: Response) {
    const { ServicioID } = req.params as unknown as { ServicioID: number };
    const result = await serviciosService.findOne(ServicioID);
    return success(res, result.message, result.data);
  }

  /**
   * Actualizar servicio
   * PUT /servicios/:ServicioID
   */
  async update(req: Request, res: Response) {
    const { ServicioID } = req.params as unknown as { ServicioID: number };
    const usuarioId = (req as any).usuario?.UsuarioID;
    const result = await serviciosService.update(ServicioID, req.body, usuarioId);
    return success(res, result.message, result.data);
  }

  /**
   * Obtener agenda de servicios
   * GET /servicios/agenda
   */
  async getAgenda(req: Request, res: Response) {
    const query = req.query as unknown as AgendaQuery;
    const result = await serviciosService.getAgenda(query);
    return success(res, result.message, result.data);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CAMBIO DE ESTATUS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Cambiar estatus del servicio
   * PATCH /servicios/:ServicioID/estatus
   */
  async cambiarEstatus(req: Request, res: Response) {
    const { ServicioID } = req.params as unknown as { ServicioID: number };
    const usuarioId = (req as any).usuario?.UsuarioID;
    const result = await serviciosService.cambiarEstatus(ServicioID, req.body, usuarioId);
    return success(res, result.message, result.data);
  }

  /**
   * Cancelar servicio
   * PATCH /servicios/:ServicioID/cancelar
   */
  async cancelar(req: Request, res: Response) {
    const { ServicioID } = req.params as unknown as { ServicioID: number };
    const usuarioId = (req as any).usuario?.UsuarioID;
    const result = await serviciosService.cancelar(ServicioID, req.body, usuarioId);
    return success(res, result.message, result.data);
  }

  /**
   * Reagendar servicio
   * POST /servicios/:ServicioID/reagendar
   */
  async reagendar(req: Request, res: Response) {
    const { ServicioID } = req.params as unknown as { ServicioID: number };
    const usuarioId = (req as any).usuario?.UsuarioID;
    const result = await serviciosService.reagendar(ServicioID, req.body, usuarioId);
    return success(res, result.message, result.data, 201);
  }

  /**
   * Finalizar servicio
   * POST /servicios/:ServicioID/finalizar
   */
  async finalizar(req: Request, res: Response) {
    const { ServicioID } = req.params as unknown as { ServicioID: number };
    const usuarioId = (req as any).usuario?.UsuarioID;
    const result = await serviciosService.finalizar(ServicioID, req.body, usuarioId);
    return success(res, result.message, result.data);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GESTIÓN DE REFACCIONES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Actualizar refacción en equipo
   * PATCH /servicios/:ServicioID/refacciones
   */
  async actualizarRefaccion(req: Request, res: Response) {
    const { ServicioID } = req.params as unknown as { ServicioID: number };
    const usuarioId = (req as any).usuario?.UsuarioID;
    const result = await serviciosService.actualizarRefaccion(ServicioID, req.body, usuarioId);
    return success(res, result.message, result.data);
  }

  /**
   * Agregar refacción a equipo
   * POST /servicios/:ServicioID/refacciones
   */
  async agregarRefaccion(req: Request, res: Response) {
    const { ServicioID } = req.params as unknown as { ServicioID: number };
    const usuarioId = (req as any).usuario?.UsuarioID;
    const result = await serviciosService.agregarRefaccionEquipo(ServicioID, req.body, usuarioId);
    return success(res, result.message, result.data, 201);
  }

  /**
   * Eliminar refacción de equipo
   * DELETE /servicios/:ServicioID/refacciones
   */
  async eliminarRefaccion(req: Request, res: Response) {
    const { ServicioID } = req.params as unknown as { ServicioID: number };
    const usuarioId = (req as any).usuario?.UsuarioID;
    const result = await serviciosService.eliminarRefaccionEquipo(ServicioID, req.body, usuarioId);
    return success(res, result.message, result.data);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GESTIÓN DE INSUMOS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Agregar insumo al servicio
   * POST /servicios/:ServicioID/insumos
   */
  async agregarInsumo(req: Request, res: Response) {
    const { ServicioID } = req.params as unknown as { ServicioID: number };
    const usuarioId = (req as any).usuario?.UsuarioID;
    const result = await serviciosService.agregarInsumo(ServicioID, req.body, usuarioId);
    return success(res, result.message, result.data, 201);
  }

  /**
   * Modificar insumo del servicio
   * PATCH /servicios/:ServicioID/insumos
   */
  async modificarInsumo(req: Request, res: Response) {
    const { ServicioID } = req.params as unknown as { ServicioID: number };
    const usuarioId = (req as any).usuario?.UsuarioID;
    const result = await serviciosService.modificarInsumo(ServicioID, req.body, usuarioId);
    return success(res, result.message, result.data);
  }

  /**
   * Eliminar insumo del servicio
   * DELETE /servicios/:ServicioID/insumos/:ServicioInsumoID
   */
  async eliminarInsumo(req: Request, res: Response) {
    const { ServicioID, ServicioInsumoID } = req.params as unknown as { ServicioID: number; ServicioInsumoID: number };
    const usuarioId = (req as any).usuario?.UsuarioID;
    const result = await serviciosService.eliminarInsumo(ServicioID, ServicioInsumoID, usuarioId);
    return success(res, result.message, result.data);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DESINSTALACIÓN
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Configurar desinstalación
   * PATCH /servicios/:ServicioID/desinstalacion
   */
  async configurarDesinstalacion(req: Request, res: Response) {
    const { ServicioID } = req.params as unknown as { ServicioID: number };
    const usuarioId = (req as any).usuario?.UsuarioID;
    const result = await serviciosService.configurarDesinstalacion(ServicioID, req.body, usuarioId);
    return success(res, result.message, result.data);
  }
}

export const serviciosController = new ServiciosController();
