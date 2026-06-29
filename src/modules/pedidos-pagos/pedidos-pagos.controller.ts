import { Request, Response } from 'express';
import { pedidosPagosService } from './pedidos-pagos.service';
import { success } from '../../utils/response';
import { CreatePedidoPagoDto } from './pedidos-pagos.schema';

class PedidosPagosController {
  /**
   * POST /pedidos-pagos - Registrar un nuevo pago de pedido
   */
  async create(req: Request, res: Response) {
    const dto: CreatePedidoPagoDto = req.body;
    const result = await pedidosPagosService.create(dto);
    return success(res, result.message, result.data, 201);
  }

  /**
   * GET /pedidos-pagos/pedido/:PedidoID - Obtener pagos de un pedido
   */
  async getByPedido(req: Request, res: Response) {
    const { PedidoID } = req.params;
    const result = await pedidosPagosService.getByPedido(Number(PedidoID));
    return success(res, result.message, result.data);
  }

  /**
   * DELETE /pedidos-pagos/:PedidoPagoID - Eliminar un pago (soft delete)
   */
  async remove(req: Request, res: Response) {
    const { PedidoPagoID } = req.params;
    const result = await pedidosPagosService.remove(Number(PedidoPagoID));
    return success(res, result.message, result.data);
  }
}

export const pedidosPagosController = new PedidosPagosController();
