import { Request, Response } from 'express';
import { publicService } from './public.service';
import { success } from '../../utils/response';

class PublicController {
  async getCotizacion(req: Request, res: Response) {
    const id = Number(req.params.id);
    const proveedorId = req.query.proveedorId ? Number(req.query.proveedorId) : undefined;
    const result = await publicService.getCotizacionPreview(id, proveedorId);
    return success(res, result.message, result.data);
  }

  async getCompra(req: Request, res: Response) {
    const id = Number(req.params.id);
    const result = await publicService.getCompraPreview(id);
    return success(res, result.message, result.data);
  }

  async getPedido(req: Request, res: Response) {
    const id = Number(req.params.id);
    const result = await publicService.getPedidoPreview(id);
    return success(res, result.message, result.data);
  }
}

export const publicController = new PublicController();
