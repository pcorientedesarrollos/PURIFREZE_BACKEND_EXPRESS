import { Request, Response } from 'express';
import { equiposVirtualesService } from './equipos-virtuales.service';
import { success } from '../../utils/response';

class EquiposVirtualesController {
  async create(req: Request, res: Response) {
    const result = await equiposVirtualesService.create(req.body);
    return success(res, result.message, result.data, 201);
  }

  async findAll(req: Request, res: Response) {
    const { q } = req.query as { q?: string };
    const result = await equiposVirtualesService.findAll(q);
    return success(res, result.message, result.data);
  }

  async findOne(req: Request, res: Response) {
    const { EquipoVirtualID } = req.params as unknown as { EquipoVirtualID: number };
    const result = await equiposVirtualesService.findOne(EquipoVirtualID);
    return success(res, result.message, result.data);
  }

  async update(req: Request, res: Response) {
    const { EquipoVirtualID } = req.params as unknown as { EquipoVirtualID: number };
    const result = await equiposVirtualesService.update(EquipoVirtualID, req.body);
    return success(res, result.message, result.data);
  }

  async duplicate(req: Request, res: Response) {
    const { EquipoVirtualID } = req.params as unknown as { EquipoVirtualID: number };
    const result = await equiposVirtualesService.duplicate(EquipoVirtualID);
    return success(res, result.message, result.data, 201);
  }

  async deactivate(req: Request, res: Response) {
    const { EquipoVirtualID } = req.params as unknown as { EquipoVirtualID: number };
    const result = await equiposVirtualesService.deactivate(EquipoVirtualID);
    return success(res, result.message, result.data);
  }

  async activate(req: Request, res: Response) {
    const { EquipoVirtualID } = req.params as unknown as { EquipoVirtualID: number };
    const result = await equiposVirtualesService.activate(EquipoVirtualID);
    return success(res, result.message, result.data);
  }

  async getResumen(req: Request, res: Response) {
    const { EquipoVirtualID } = req.params as unknown as { EquipoVirtualID: number };
    const result = await equiposVirtualesService.getResumen(EquipoVirtualID);
    return success(res, result.message, result.data);
  }

  async getHistorial(req: Request, res: Response) {
    const { EquipoVirtualID } = req.params as unknown as { EquipoVirtualID: number };
    const result = await equiposVirtualesService.getHistorial(EquipoVirtualID);
    return success(res, result.message, result.data);
  }
}

export const equiposVirtualesController = new EquiposVirtualesController();
