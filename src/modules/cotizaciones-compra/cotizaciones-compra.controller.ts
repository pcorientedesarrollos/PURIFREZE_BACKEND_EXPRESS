import { Request, Response } from 'express';
import { cotizacionesCompraService } from './cotizaciones-compra.service';
import { success } from '../../utils/response';

class CotizacionesCompraController {
  async create(req: Request, res: Response) {
    const result = await cotizacionesCompraService.create(req.body);
    return success(res, result.message, result.data, 201);
  }

  async findAll(_req: Request, res: Response) {
    const result = await cotizacionesCompraService.findAll();
    return success(res, result.message, result.data);
  }

  async findOne(req: Request, res: Response) {
    const { CotizacionCompraID } = req.params as unknown as { CotizacionCompraID: number };
    const result = await cotizacionesCompraService.findOne(CotizacionCompraID);
    return success(res, result.message, result.data);
  }

  async update(req: Request, res: Response) {
    const { CotizacionCompraID } = req.params as unknown as { CotizacionCompraID: number };
    const result = await cotizacionesCompraService.update(CotizacionCompraID, req.body);
    return success(res, result.message, result.data);
  }

  async remove(req: Request, res: Response) {
    const { CotizacionCompraID } = req.params as unknown as { CotizacionCompraID: number };
    const result = await cotizacionesCompraService.remove(CotizacionCompraID);
    return success(res, result.message, result.data);
  }

  async registrarEnvio(req: Request, res: Response) {
    const { CotizacionCompraID } = req.params as unknown as { CotizacionCompraID: number };
    const result = await cotizacionesCompraService.registrarEnvio(CotizacionCompraID, req.body);
    return success(res, result.message, result.data);
  }

  async convertirACompra(req: Request, res: Response) {
    const { CotizacionCompraID } = req.params as unknown as { CotizacionCompraID: number };
    const result = await cotizacionesCompraService.convertirACompra(CotizacionCompraID, req.body);
    return success(res, result.message, result.data, 201);
  }

  async getPdf(req: Request, res: Response) {
    const { CotizacionCompraID } = req.params as unknown as { CotizacionCompraID: number };
    const datos = await cotizacionesCompraService.getDatosParaPdf(CotizacionCompraID);
    return success(res, 'Datos para PDF obtenidos', datos);
  }
}

export const cotizacionesCompraController = new CotizacionesCompraController();
