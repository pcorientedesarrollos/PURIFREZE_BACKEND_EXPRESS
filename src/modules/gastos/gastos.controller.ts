import { Request, Response } from 'express';
import { gastosService } from './gastos.service';
import { success } from '../../utils/response';
import { GastosQueryDto } from './gastos.schema';

class GastosController {
    async findAll(req: Request, res: Response) {
        const result = await gastosService.findAll(req.query as unknown as GastosQueryDto);
        return success(res, result.message, { data: result.data, meta: result.meta });
    }

    async findOne(req: Request, res: Response) {
        const { GastoID } = req.params;
        const result = await gastosService.findOne(Number(GastoID));
        return success(res, result.message, result.data);
    }

    async create(req: Request, res: Response) {
        const result = await gastosService.create(req.body);
        return success(res, result.message, result.data);
    }

    async update(req: Request, res: Response) {
        const { GastoID } = req.params;
        const result = await gastosService.update(Number(GastoID), req.body);
        return success(res, result.message, result.data);
    }

    async baja(req: Request, res: Response) {
        const { GastoID } = req.params;
        const result = await gastosService.baja(Number(GastoID));
        return success(res, result.message, result.data);
    }

    async getReporteSemanal(_req: Request, res: Response) {
        const result = await gastosService.getReporteSemanal();
        return success(res, result.message, result.data);
    }

    async getReporteMensual(_req: Request, res: Response) {
        const result = await gastosService.getReporteMensual();
        return success(res, result.message, result.data);
    }
}

export const gastosController = new GastosController();
