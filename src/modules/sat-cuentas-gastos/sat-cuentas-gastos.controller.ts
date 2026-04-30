import { Request, Response } from 'express';
import { satCuentasGastosService } from './sat-cuentas-gastos.service';
import { success } from '../../utils/response';

class SatCuentasGastosController {
    async findAll(_req: Request, res: Response) {
        const result = await satCuentasGastosService.findAll();
        return success(res, result.message, result.data);
    }

    async getTree(_req: Request, res: Response) {
        const result = await satCuentasGastosService.getTree();
        return success(res, result.message, result.data);
    }
}

export const satCuentasGastosController = new SatCuentasGastosController();
