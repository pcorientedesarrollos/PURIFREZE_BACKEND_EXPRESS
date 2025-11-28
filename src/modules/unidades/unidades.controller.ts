import { Request, Response } from 'express';
import { unidadesService } from './unidades.service';
import { success } from '../../utils/response';

export class UnidadesController {
  async create(req: Request, res: Response) {
    const result = await unidadesService.create(req.body);
    return success(res, 'Unidad Creada', result);
  }

  async findAll(_req: Request, res: Response) {
    const result = await unidadesService.findAll();
    return success(res, 'Unidades obtenidas', result);
  }

  async findOne(req: Request, res: Response) {
    const result = await unidadesService.findOne(Number(req.params.UnidadID));
    return success(res, 'Unidad obtenida', result);
  }

  async update(req: Request, res: Response) {
    const result = await unidadesService.update(Number(req.params.UnidadID), req.body);
    return success(res, 'Unidad Actualizada', result);
  }

  async baja(req: Request, res: Response) {
    const result = await unidadesService.baja(Number(req.params.UnidadID));
    return success(res, 'Unidad dada de baja', result);
  }

  async activar(req: Request, res: Response) {
    const result = await unidadesService.activar(Number(req.params.UnidadID));
    return success(res, 'Unidad activada', result);
  }
}

export const unidadesController = new UnidadesController();
