import { Request, Response } from 'express';
import { clasificacionRefaccionesService } from './clasificacion-refacciones.service';
import { success } from '../../utils/response';

class ClasificacionRefaccionesController {
  async create(req: Request, res: Response) {
    const result = await clasificacionRefaccionesService.create(req.body);
    return success(res, result.message, result.data, 201);
  }

  async findAll(_req: Request, res: Response) {
    const result = await clasificacionRefaccionesService.findAll();
    return success(res, result.message, result.data);
  }

  async findOne(req: Request, res: Response) {
    const { ClasificacionRefaccionID } = req.params as unknown as { ClasificacionRefaccionID: number };
    const result = await clasificacionRefaccionesService.findOne(ClasificacionRefaccionID);
    return success(res, result.message, result.data);
  }

  async update(req: Request, res: Response) {
    const { ClasificacionRefaccionID } = req.params as unknown as { ClasificacionRefaccionID: number };
    const result = await clasificacionRefaccionesService.update(ClasificacionRefaccionID, req.body);
    return success(res, result.message, result.data);
  }

  async baja(req: Request, res: Response) {
    const { ClasificacionRefaccionID } = req.params as unknown as { ClasificacionRefaccionID: number };
    const result = await clasificacionRefaccionesService.baja(ClasificacionRefaccionID);
    return success(res, result.message, result.data);
  }

  async activar(req: Request, res: Response) {
    const { ClasificacionRefaccionID } = req.params as unknown as { ClasificacionRefaccionID: number };
    const result = await clasificacionRefaccionesService.activar(ClasificacionRefaccionID);
    return success(res, result.message, result.data);
  }
}

export const clasificacionRefaccionesController = new ClasificacionRefaccionesController();
