import { Request, Response } from 'express';
import { reportesBancariosService } from './reportes-bancarios.service';
import { success } from '../../utils/response';
import { ReporteQueryDto } from './reportes-bancarios.schema';

class ReportesBancariosController {
  async findResumen(_req: Request, res: Response) {
    const result = await reportesBancariosService.findResumen();
    return success(res, result.message, result.data);
  }

  async findDetalle(req: Request, res: Response) {
    const CuentaBancariaID = Number(req.params.CuentaBancariaID);
    const query = req.query as unknown as ReporteQueryDto;
    const result = await reportesBancariosService.findDetalle(CuentaBancariaID, query);
    return success(res, result.message, result.data);
  }
}

export const reportesBancariosController = new ReportesBancariosController();
