import { Request, Response } from 'express';
import { tecnicosService } from './tecnicos.service';
import { success } from '../../utils/response';

class TecnicosController {
  async create(req: Request, res: Response) {
    const result = await tecnicosService.create(req.body);
    return success(res, result.message, result.data, 201);
  }

  async findAll(_req: Request, res: Response) {
    const result = await tecnicosService.findAll();
    return success(res, result.message, result.data);
  }

  async findAllActivos(_req: Request, res: Response) {
    const result = await tecnicosService.findAllActivos();
    return success(res, result.message, result.data);
  }

  async findOne(req: Request, res: Response) {
    const { TecnicoID } = req.params as unknown as { TecnicoID: number };
    const result = await tecnicosService.findOne(TecnicoID);
    return success(res, result.message, result.data);
  }

  async update(req: Request, res: Response) {
    const { TecnicoID } = req.params as unknown as { TecnicoID: number };
    const result = await tecnicosService.update(TecnicoID, req.body);
    return success(res, result.message, result.data);
  }

  async baja(req: Request, res: Response) {
    const { TecnicoID } = req.params as unknown as { TecnicoID: number };
    const result = await tecnicosService.baja(TecnicoID);
    return success(res, result.message, result.data);
  }

  async activar(req: Request, res: Response) {
    const { TecnicoID } = req.params as unknown as { TecnicoID: number };
    const result = await tecnicosService.activar(TecnicoID);
    return success(res, result.message, result.data);
  }

  async getUsuariosDisponibles(_req: Request, res: Response) {
    const result = await tecnicosService.getUsuariosDisponibles();
    return success(res, result.message, result.data);
  }
}

export const tecnicosController = new TecnicosController();
