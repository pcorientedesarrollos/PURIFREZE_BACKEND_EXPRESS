import { Request, Response } from 'express';
import { metodosPagoService } from './metodos-pago.service';
import { success } from '../../utils/response';

export class MetodosPagoController {
  async create(req: Request, res: Response) {
    const result = await metodosPagoService.create(req.body);
    return success(res, 'Método de pago creado', result);
  }

  async findAll(_req: Request, res: Response) {
    const result = await metodosPagoService.findAll();
    return success(res, 'Métodos de pago obtenidos', result);
  }

  async findOne(req: Request, res: Response) {
    const result = await metodosPagoService.findOne(Number(req.params.MetodosDePagoID));
    return success(res, 'Método de pago obtenido', result);
  }

  async update(req: Request, res: Response) {
    const result = await metodosPagoService.update(Number(req.params.MetodosDePagoID), req.body);
    return success(res, 'Método de pago actualizado', result);
  }

  async baja(req: Request, res: Response) {
    const result = await metodosPagoService.baja(Number(req.params.MetodosDePagoID));
    return success(res, 'Método de pago dado de baja', result);
  }

  async activar(req: Request, res: Response) {
    const result = await metodosPagoService.activar(Number(req.params.MetodosDePagoID));
    return success(res, 'Método de pago activado', result);
  }
}

export const metodosPagoController = new MetodosPagoController();
