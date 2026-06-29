import { Request, Response } from 'express';
import { pedidosService } from './pedidos.service';
import { success } from '../../utils/response';

class PedidosController {
  async create(req: Request, res: Response) {
    const result = await pedidosService.create(req.body);
    return success(res, result.message, result.data, 201);
  }

  async findAll(_req: Request, res: Response) {
    const result = await pedidosService.findAll();
    return success(res, result.message, result.data);
  }

  async findOne(req: Request, res: Response) {
    const { PedidoID } = req.params as unknown as { PedidoID: number };
    const result = await pedidosService.findOne(PedidoID);
    return success(res, result.message, result.data);
  }

  async update(req: Request, res: Response) {
    const { PedidoID } = req.params as unknown as { PedidoID: number };
    const result = await pedidosService.update(PedidoID, req.body);
    return success(res, result.message, result.data);
  }

  async remove(req: Request, res: Response) {
    const { PedidoID } = req.params as unknown as { PedidoID: number };
    const result = await pedidosService.remove(PedidoID);
    return success(res, result.message, result.data);
  }

  async asociarFactura(req: Request, res: Response) {
    const { PedidoID } = req.params as unknown as { PedidoID: number };
    const { FacturaID } = req.body;
    const result = await pedidosService.asociarFactura(PedidoID, FacturaID);
    return success(res, result.message, result.data, 201);
  }

  async desasociarFactura(req: Request, res: Response) {
    const { PedidoID, FacturaID } = req.params as unknown as { PedidoID: number; FacturaID: number };
    const result = await pedidosService.desasociarFactura(PedidoID, FacturaID);
    return success(res, result.message, result.data);
  }

  async findFacturas(req: Request, res: Response) {
    const { PedidoID } = req.params as unknown as { PedidoID: number };
    const result = await pedidosService.findFacturas(PedidoID);
    return success(res, result.message, result.data);
  }
}

export const pedidosController = new PedidosController();
