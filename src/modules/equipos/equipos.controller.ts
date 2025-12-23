import { Request, Response } from 'express';
import { equiposService } from './equipos.service';
import { success } from '../../utils/response';
import { SearchEquiposQuery } from './equipos.schema';

class EquiposController {
  /**
   * Crear equipos desde plantilla
   * POST /equipos
   */
  async createFromPlantilla(req: Request, res: Response) {
    const usuarioId = (req as any).usuario?.UsuarioID;
    const result = await equiposService.createFromPlantilla(req.body, usuarioId);
    return success(res, result.message, result.data, 201);
  }

  /**
   * Obtener todos los equipos
   * GET /equipos
   */
  async findAll(req: Request, res: Response) {
    const query = req.query as unknown as SearchEquiposQuery;
    const result = await equiposService.findAll(query);
    return success(res, result.message, result.data);
  }

  /**
   * Obtener un equipo por ID
   * GET /equipos/:EquipoID
   */
  async findOne(req: Request, res: Response) {
    const { EquipoID } = req.params as unknown as { EquipoID: number };
    const result = await equiposService.findOne(EquipoID);
    return success(res, result.message, result.data);
  }

  /**
   * Actualizar observaciones del equipo
   * PUT /equipos/:EquipoID
   */
  async update(req: Request, res: Response) {
    const { EquipoID } = req.params as unknown as { EquipoID: number };
    const usuarioId = (req as any).usuario?.UsuarioID;
    const result = await equiposService.update(EquipoID, req.body, usuarioId);
    return success(res, result.message, result.data);
  }

  /**
   * Agregar refacción a equipo
   * POST /equipos/:EquipoID/refacciones
   */
  async agregarRefaccion(req: Request, res: Response) {
    const { EquipoID } = req.params as unknown as { EquipoID: number };
    const usuarioId = (req as any).usuario?.UsuarioID;
    const result = await equiposService.agregarRefaccion(EquipoID, req.body, usuarioId);
    return success(res, result.message, result.data, 201);
  }

  /**
   * Modificar cantidad de refacción
   * PATCH /equipos/:EquipoID/refacciones/:EquipoDetalleID/cantidad
   */
  async modificarCantidadRefaccion(req: Request, res: Response) {
    const { EquipoID, EquipoDetalleID } = req.params as unknown as { EquipoID: number; EquipoDetalleID: number };
    const usuarioId = (req as any).usuario?.UsuarioID;
    const result = await equiposService.modificarCantidadRefaccion(EquipoID, EquipoDetalleID, req.body, usuarioId);
    return success(res, result.message, result.data);
  }

  /**
   * Eliminar refacción de equipo
   * DELETE /equipos/:EquipoID/refacciones/:EquipoDetalleID
   */
  async eliminarRefaccion(req: Request, res: Response) {
    const { EquipoID, EquipoDetalleID } = req.params as unknown as { EquipoID: number; EquipoDetalleID: number };
    const usuarioId = (req as any).usuario?.UsuarioID;
    const result = await equiposService.eliminarRefaccion(EquipoID, EquipoDetalleID, req.body, usuarioId);
    return success(res, result.message, result.data);
  }

  /**
   * Instalar equipo (Armado/Reacondicionado → Instalado)
   * PATCH /equipos/:EquipoID/instalar
   */
  async instalar(req: Request, res: Response) {
    const { EquipoID } = req.params as unknown as { EquipoID: number };
    const usuarioId = (req as any).usuario?.UsuarioID;
    const result = await equiposService.instalar(EquipoID, req.body, usuarioId);
    return success(res, result.message, result.data);
  }

  /**
   * Desmontar equipo (Instalado → Desmontado)
   * PATCH /equipos/:EquipoID/desmontar
   */
  async desmontar(req: Request, res: Response) {
    const { EquipoID } = req.params as unknown as { EquipoID: number };
    const usuarioId = (req as any).usuario?.UsuarioID;
    const result = await equiposService.desmontar(EquipoID, req.body, usuarioId);
    return success(res, result.message, result.data);
  }

  /**
   * Finalizar reacondicionamiento (Reacondicionado → Armado)
   * PATCH /equipos/:EquipoID/finalizar-reacondicionamiento
   */
  async finalizarReacondicionamiento(req: Request, res: Response) {
    const { EquipoID } = req.params as unknown as { EquipoID: number };
    const usuarioId = (req as any).usuario?.UsuarioID;
    const result = await equiposService.finalizarReacondicionamiento(EquipoID, req.body, usuarioId);
    return success(res, result.message, result.data);
  }

  /**
   * Dar de baja equipo
   * PATCH /equipos/baja/:EquipoID
   */
  async deactivate(req: Request, res: Response) {
    const { EquipoID } = req.params as unknown as { EquipoID: number };
    const usuarioId = (req as any).usuario?.UsuarioID;
    const result = await equiposService.deactivate(EquipoID, usuarioId);
    return success(res, result.message, result.data);
  }

  /**
   * Activar equipo
   * PATCH /equipos/activar/:EquipoID
   */
  async activate(req: Request, res: Response) {
    const { EquipoID } = req.params as unknown as { EquipoID: number };
    const usuarioId = (req as any).usuario?.UsuarioID;
    const result = await equiposService.activate(EquipoID, usuarioId);
    return success(res, result.message, result.data);
  }

  /**
   * Buscar refacciones con stock disponible
   * GET /equipos/refacciones
   */
  async searchRefacciones(req: Request, res: Response) {
    const { q } = req.query as { q?: string };
    const result = await equiposService.searchRefaccionesConStock(q);
    return success(res, result.message, result.data);
  }
}

export const equiposController = new EquiposController();
