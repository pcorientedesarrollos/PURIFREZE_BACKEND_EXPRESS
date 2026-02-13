import { Request, Response } from 'express';
import { girosNegocioService } from './giros-negocio.service';
import { success } from '../../utils/response';

class GirosNegocioController {
  async create(req: Request, res: Response) {
    const result = await girosNegocioService.create(req.body);
    return success(res, result.message, result.data);
  }

  async findAll(_req: Request, res: Response) {
    const result = await girosNegocioService.findAll();
    return success(res, result.message, result.data);
  }

  async findOne(req: Request, res: Response) {
    const { GiroNegocioID } = req.params;
    const result = await girosNegocioService.findOne(Number(GiroNegocioID));
    return success(res, result.message, result.data);
  }

  async update(req: Request, res: Response) {
    const { GiroNegocioID } = req.params;
    const result = await girosNegocioService.update(Number(GiroNegocioID), req.body);
    return success(res, result.message, result.data);
  }

  async baja(req: Request, res: Response) {
    const { GiroNegocioID } = req.params;
    const result = await girosNegocioService.baja(Number(GiroNegocioID));
    return success(res, result.message, result.data);
  }

  async activar(req: Request, res: Response) {
    const { GiroNegocioID } = req.params;
    const result = await girosNegocioService.activar(Number(GiroNegocioID));
    return success(res, result.message, result.data);
  }
}

export const girosNegocioController = new GirosNegocioController();
