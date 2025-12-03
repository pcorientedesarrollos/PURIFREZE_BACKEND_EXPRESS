import { Request, Response } from 'express';
import { refaccionesDanadasService } from './refacciones-danadas.service';
import { success } from '../../utils/response';

class RefaccionesDanadasController {
  async create(req: Request, res: Response) {
    const result = await refaccionesDanadasService.create(req.body);
    return success(res, result.message, result.data, 201);
  }

  async findAll(_req: Request, res: Response) {
    const result = await refaccionesDanadasService.findAll();
    return success(res, result.message, result.data);
  }

  async findOne(req: Request, res: Response) {
    const { RefaccionDanadaID } = req.params as unknown as { RefaccionDanadaID: number };
    const result = await refaccionesDanadasService.findOne(RefaccionDanadaID);
    return success(res, result.message, result.data);
  }

  async reportePorProveedor(req: Request, res: Response) {
    const result = await refaccionesDanadasService.reportePorProveedor(req.query);
    return success(res, result.message, result.data);
  }

  async reportePorRefaccion(req: Request, res: Response) {
    const result = await refaccionesDanadasService.reportePorRefaccion(req.query);
    return success(res, result.message, result.data);
  }

  async reportePorTecnico(req: Request, res: Response) {
    const result = await refaccionesDanadasService.reportePorTecnico(req.query);
    return success(res, result.message, result.data);
  }

  async remove(req: Request, res: Response) {
    const { RefaccionDanadaID } = req.params as unknown as { RefaccionDanadaID: number };
    const result = await refaccionesDanadasService.remove(RefaccionDanadaID);
    return success(res, result.message, result.data);
  }
}

export const refaccionesDanadasController = new RefaccionesDanadasController();
