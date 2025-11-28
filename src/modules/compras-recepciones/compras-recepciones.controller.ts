import { Request, Response } from 'express';
import { comprasRecepcionesService } from './compras-recepciones.service';
import { success } from '../../utils/response';

class ComprasRecepcionesController {
  async create(req: Request, res: Response) {
    const result = await comprasRecepcionesService.create(req.body);
    return success(res, result.message, result.data, 201);
  }

  async findAll(_req: Request, res: Response) {
    const result = await comprasRecepcionesService.findAll();
    return success(res, result.message, result.data);
  }

  async findAllWithPagos(_req: Request, res: Response) {
    const result = await comprasRecepcionesService.findAllWithPagos();
    return success(res, result.message, result.data);
  }

  async findOne(req: Request, res: Response) {
    const { ComprasRecepcionesEncabezadoID } = req.params as unknown as { ComprasRecepcionesEncabezadoID: number };
    const result = await comprasRecepcionesService.findOne(ComprasRecepcionesEncabezadoID);
    return success(res, result.message, result.data);
  }

  async findByCompra(req: Request, res: Response) {
    const { CompraEncabezadoID } = req.params as unknown as { CompraEncabezadoID: number };
    const result = await comprasRecepcionesService.findByCompra(CompraEncabezadoID);
    return success(res, result.message, result.data);
  }

  async findByCompraWithPagos(req: Request, res: Response) {
    const { CompraEncabezadoID } = req.params as unknown as { CompraEncabezadoID: number };
    const result = await comprasRecepcionesService.findByCompraWithPagos(CompraEncabezadoID);
    return success(res, result.message, result.data);
  }
}

export const comprasRecepcionesController = new ComprasRecepcionesController();
