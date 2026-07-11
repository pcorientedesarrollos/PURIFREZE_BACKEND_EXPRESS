import { Request, Response } from 'express';
import { controlService } from './control.service';
import { success } from '../../utils/response';

class ControlController {
  async listPedidos(req: Request, res: Response) {
    const filters = {
      texto: req.query.texto as string | undefined,
      proveedorId: req.query.proveedorId != null ? Number(req.query.proveedorId) : undefined,
      fechaDesde: req.query.fechaDesde as string | undefined,
      fechaHasta: req.query.fechaHasta as string | undefined,
      page: req.query.page != null ? Number(req.query.page) : undefined,
      pageSize: req.query.pageSize != null ? Number(req.query.pageSize) : undefined,
    };
    const result = await controlService.listPedidos(filters);
    return success(res, result.message, result.data);
  }
}

export const controlController = new ControlController();
