import { Request, Response } from 'express';
import { comprasService } from './compras.service';
import { success } from '../../utils/response';

class ComprasController {
  async create(req: Request, res: Response) {
    const result = await comprasService.create(req.body);
    return success(res, result.message, result.data, 201);
  }

  async findAll(_req: Request, res: Response) {
    const result = await comprasService.findAll();
    return success(res, result.message, result.data);
  }

  async findOne(req: Request, res: Response) {
    const { CompraEncabezadoID } = req.params as unknown as { CompraEncabezadoID: number };
    const result = await comprasService.findOne(CompraEncabezadoID);
    return success(res, result.message, result.data);
  }

  async findEstatus(_req: Request, res: Response) {
    const result = await comprasService.findEstatus();
    return success(res, result.message, result.data);
  }

  async update(req: Request, res: Response) {
    const { CompraEncabezadoID } = req.params as unknown as { CompraEncabezadoID: number };
    const result = await comprasService.update(CompraEncabezadoID, req.body);
    return success(res, result.message, result.data);
  }

  async remove(req: Request, res: Response) {
    const { CompraEncabezadoID } = req.params as unknown as { CompraEncabezadoID: number };
    const result = await comprasService.remove(CompraEncabezadoID);
    return success(res, result.message, result.data);
  }
}

export const comprasController = new ComprasController();
