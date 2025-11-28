import { Request, Response } from 'express';
import { usuariosService } from './usuarios.service';
import { success } from '../../utils/response';

class UsuariosController {
  async create(req: Request, res: Response) {
    const result = await usuariosService.create(req.body);
    return success(res, result.message, result.data, 201);
  }

  async findAll(_req: Request, res: Response) {
    const result = await usuariosService.findAll();
    return success(res, result.message, result.data);
  }

  async findOne(req: Request, res: Response) {
    const { UsuarioID } = req.params as unknown as { UsuarioID: number };
    const result = await usuariosService.findOne(UsuarioID);
    return success(res, result.message, result.data);
  }

  async update(req: Request, res: Response) {
    const { UsuarioID } = req.params as unknown as { UsuarioID: number };
    const result = await usuariosService.update(UsuarioID, req.body);
    return success(res, result.message, result.data);
  }

  async baja(req: Request, res: Response) {
    const { UsuarioID } = req.params as unknown as { UsuarioID: number };
    const result = await usuariosService.baja(UsuarioID);
    return success(res, result.message, result.data);
  }

  async activar(req: Request, res: Response) {
    const { UsuarioID } = req.params as unknown as { UsuarioID: number };
    const result = await usuariosService.activar(UsuarioID);
    return success(res, result.message, result.data);
  }
}

export const usuariosController = new UsuariosController();
