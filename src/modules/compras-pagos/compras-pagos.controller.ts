import { Request, Response } from 'express';
import { comprasPagosService } from './compras-pagos.service';
import { success } from '../../utils/response';
import { CreateCompraPagoDto } from './compras-pagos.schema';

class ComprasPagosController {
  /**
   * POST /compras-pagos - Registrar un nuevo pago de compra
   */
  async create(req: Request, res: Response) {
    const dto: CreateCompraPagoDto = req.body;
    const result = await comprasPagosService.create(dto);
    return success(res, result.message, result.data, 201);
  }

  /**
   * GET /compras-pagos/compra/:CompraEncabezadoID - Obtener pagos de una compra
   */
  async getByCompra(req: Request, res: Response) {
    const { CompraEncabezadoID } = req.params;
    const result = await comprasPagosService.getByCompra(Number(CompraEncabezadoID));
    return success(res, result.message, result.data);
  }

  /**
   * DELETE /compras-pagos/:CompraPagoID - Eliminar un pago (soft delete)
   */
  async remove(req: Request, res: Response) {
    const { CompraPagoID } = req.params;
    const result = await comprasPagosService.remove(Number(CompraPagoID));
    return success(res, result.message, result.data);
  }
}

export const comprasPagosController = new ComprasPagosController();
