import { Request, Response } from 'express';
import { plantillasEquipoService } from './plantillas-equipo.service';
import { success } from '../../utils/response';

class PlantillasEquipoController {
  async create(req: Request, res: Response) {
    const result = await plantillasEquipoService.create(req.body);
    return success(res, result.message, result.data, 201);
  }

  async findAll(req: Request, res: Response) {
    const { q } = req.query as { q?: string };
    const result = await plantillasEquipoService.findAll(q);
    return success(res, result.message, result.data);
  }

  async findOne(req: Request, res: Response) {
    const { PlantillaEquipoID } = req.params as unknown as { PlantillaEquipoID: number };
    const result = await plantillasEquipoService.findOne(PlantillaEquipoID);
    return success(res, result.message, result.data);
  }

  async update(req: Request, res: Response) {
    const { PlantillaEquipoID } = req.params as unknown as { PlantillaEquipoID: number };
    const result = await plantillasEquipoService.update(PlantillaEquipoID, req.body);
    return success(res, result.message, result.data);
  }

  async duplicate(req: Request, res: Response) {
    const { PlantillaEquipoID } = req.params as unknown as { PlantillaEquipoID: number };
    const result = await plantillasEquipoService.duplicate(PlantillaEquipoID);
    return success(res, result.message, result.data, 201);
  }

  async deactivate(req: Request, res: Response) {
    const { PlantillaEquipoID } = req.params as unknown as { PlantillaEquipoID: number };
    const result = await plantillasEquipoService.deactivate(PlantillaEquipoID);
    return success(res, result.message, result.data);
  }

  async activate(req: Request, res: Response) {
    const { PlantillaEquipoID } = req.params as unknown as { PlantillaEquipoID: number };
    const result = await plantillasEquipoService.activate(PlantillaEquipoID);
    return success(res, result.message, result.data);
  }

  async searchRefacciones(req: Request, res: Response) {
    const { q } = req.query as { q?: string };
    const result = await plantillasEquipoService.searchRefacciones(q);
    return success(res, result.message, result.data);
  }
}

export const plantillasEquipoController = new PlantillasEquipoController();
