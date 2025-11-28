import { Request, Response } from 'express';
import { cuentasBancariasService } from './cuentas-bancarias.service';
import { success } from '../../utils/response';

class CuentasBancariasController {
  async create(req: Request, res: Response) {
    const result = await cuentasBancariasService.create(req.body);
    return success(res, result.message, result.data, 201);
  }

  async findAll(_req: Request, res: Response) {
    const result = await cuentasBancariasService.findAll();
    return success(res, result.message, result.data);
  }

  async findOne(req: Request, res: Response) {
    const { CuentaBancariaID } = req.params as unknown as { CuentaBancariaID: number };
    const result = await cuentasBancariasService.findOne(CuentaBancariaID);
    return success(res, result.message, result.data);
  }

  async update(req: Request, res: Response) {
    const { CuentaBancariaID } = req.params as unknown as { CuentaBancariaID: number };
    const result = await cuentasBancariasService.update(CuentaBancariaID, req.body);
    return success(res, result.message, result.data);
  }

  async baja(req: Request, res: Response) {
    const { CuentaBancariaID } = req.params as unknown as { CuentaBancariaID: number };
    const result = await cuentasBancariasService.baja(CuentaBancariaID);
    return success(res, result.message, result.data);
  }

  async activar(req: Request, res: Response) {
    const { CuentaBancariaID } = req.params as unknown as { CuentaBancariaID: number };
    const result = await cuentasBancariasService.activar(CuentaBancariaID);
    return success(res, result.message, result.data);
  }
}

export const cuentasBancariasController = new CuentasBancariasController();
