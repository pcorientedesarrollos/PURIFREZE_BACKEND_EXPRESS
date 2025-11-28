import { Request, Response } from 'express';
import { refaccionesService } from './refacciones.service';
import { success } from '../../utils/response';

class RefaccionesController {
  async create(req: Request, res: Response) {
    const result = await refaccionesService.create(req.body);
    return success(res, result.message, result.data, 201);
  }

  async findAll(_req: Request, res: Response) {
    const result = await refaccionesService.findAll();
    return success(res, result.message, result.data);
  }

  async findOne(req: Request, res: Response) {
    const { RefaccionID } = req.params as unknown as { RefaccionID: number };
    const result = await refaccionesService.findOne(RefaccionID);
    return success(res, result.message, result.data);
  }

  async update(req: Request, res: Response) {
    const { RefaccionID } = req.params as unknown as { RefaccionID: number };
    const result = await refaccionesService.update(RefaccionID, req.body);
    return success(res, result.message, result.data);
  }

  async baja(req: Request, res: Response) {
    const { RefaccionID } = req.params as unknown as { RefaccionID: number };
    const result = await refaccionesService.baja(RefaccionID);
    return success(res, result.message, result.data);
  }

  async activar(req: Request, res: Response) {
    const { RefaccionID } = req.params as unknown as { RefaccionID: number };
    const result = await refaccionesService.activar(RefaccionID);
    return success(res, result.message, result.data);
  }
}

export const refaccionesController = new RefaccionesController();
