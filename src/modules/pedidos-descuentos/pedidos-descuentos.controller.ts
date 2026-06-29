import { Request, Response } from 'express';
import { pedidosDescuentosService } from './pedidos-descuentos.service';
import { success } from '../../utils/response';
import { AplicarNotaCreditoDto } from './pedidos-descuentos.schema';

class PedidosDescuentosController {
  /**
   * POST /pedidos-descuentos/nota-credito
   */
  async aplicarNotaCredito(req: Request, res: Response) {
    const dto: AplicarNotaCreditoDto = req.body;
    const result = await pedidosDescuentosService.aplicarNotaCredito(dto);
    return success(res, result.message, result.data, 201);
  }

  /**
   * GET /pedidos-descuentos/pedido/:PedidoID
   */
  async findByPedido(req: Request, res: Response) {
    const { PedidoID } = req.params as unknown as { PedidoID: number };
    const result = await pedidosDescuentosService.findByPedido(PedidoID);
    return success(res, result.message, result.data);
  }

  /**
   * DELETE /pedidos-descuentos/:PedidoDescuentoID
   */
  async remove(req: Request, res: Response) {
    const { PedidoDescuentoID } = req.params as unknown as { PedidoDescuentoID: number };
    const result = await pedidosDescuentosService.remove(PedidoDescuentoID);
    return success(res, result.message, result.data);
  }
}

export const pedidosDescuentosController = new PedidosDescuentosController();
