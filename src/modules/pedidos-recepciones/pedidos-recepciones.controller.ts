import { Request, Response } from 'express';
import { pedidosRecepcionesService } from './pedidos-recepciones.service';
import { success } from '../../utils/response';
import { CreatePedidoRecepcionDto, ReporteQueryDto } from './pedidos-recepciones.schema';

class PedidosRecepcionesController {
  /**
   * POST /pedidos-recepciones - Registrar una recepcion
   */
  async create(req: Request, res: Response) {
    const dto: CreatePedidoRecepcionDto = req.body;
    const result = await pedidosRecepcionesService.create(dto);
    return success(res, result.message, result.data, 201);
  }

  /**
   * GET /pedidos-recepciones/pedido/:PedidoID - Recepciones de un pedido
   */
  async findByPedido(req: Request, res: Response) {
    const { PedidoID } = req.params as unknown as { PedidoID: number };
    const result = await pedidosRecepcionesService.findByPedido(PedidoID);
    return success(res, result.message, result.data);
  }

  /**
   * GET /pedidos-recepciones/pedido/:PedidoID/with-pagos
   * Recepciones + pagos + items de un pedido (enriquecido)
   */
  async findByPedidoWithPagos(req: Request, res: Response) {
    const { PedidoID } = req.params as unknown as { PedidoID: number };
    const result = await pedidosRecepcionesService.findByPedidoWithPagos(PedidoID);
    return success(res, result.message, result.data);
  }

  /**
   * GET /pedidos-recepciones/reporte - Reporte de entregas
   */
  async getReporte(req: Request, res: Response) {
    const query: ReporteQueryDto = req.query as unknown as ReporteQueryDto;
    const result = await pedidosRecepcionesService.getReporte(query);
    return success(res, result.message, result.data);
  }

  /**
   * GET /pedidos-recepciones/:PedidoRecepcionID - Obtener una recepcion
   */
  async findOne(req: Request, res: Response) {
    const { PedidoRecepcionID } = req.params as unknown as { PedidoRecepcionID: number };
    const result = await pedidosRecepcionesService.findOne(PedidoRecepcionID);
    return success(res, result.message, result.data);
  }
}

export const pedidosRecepcionesController = new PedidosRecepcionesController();
