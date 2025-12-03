import { Request, Response } from 'express';
import { ajustesInventarioService } from './ajustes-inventario.service';
import { success } from '../../utils/response';

class AjustesInventarioController {
  async create(req: Request, res: Response) {
    const result = await ajustesInventarioService.create(req.body);
    return success(res, result.message, result.data, 201);
  }

  async findAll(req: Request, res: Response) {
    const { estatus } = req.query as { estatus?: string };
    const result = await ajustesInventarioService.findAll(estatus);
    return success(res, result.message, result.data);
  }

  async findPendientes(_req: Request, res: Response) {
    const result = await ajustesInventarioService.findPendientes();
    return success(res, result.message, result.data);
  }

  async findOne(req: Request, res: Response) {
    const { AjusteID } = req.params as unknown as { AjusteID: number };
    const result = await ajustesInventarioService.findOne(AjusteID);
    return success(res, result.message, result.data);
  }

  async autorizar(req: Request, res: Response) {
    const { AjusteID } = req.params as unknown as { AjusteID: number };
    const result = await ajustesInventarioService.autorizar(AjusteID, req.body);
    return success(res, result.message, result.data);
  }

  async findByTecnico(req: Request, res: Response) {
    const { TecnicoID } = req.params as unknown as { TecnicoID: number };
    const result = await ajustesInventarioService.findByTecnico(TecnicoID);
    return success(res, result.message, result.data);
  }

  async cancelar(req: Request, res: Response) {
    const { AjusteID } = req.params as unknown as { AjusteID: number };
    const result = await ajustesInventarioService.cancelar(AjusteID);
    return success(res, result.message, result.data);
  }

  async reporteAjustes(req: Request, res: Response) {
    const result = await ajustesInventarioService.reporteAjustes(req.query);
    return success(res, result.message, result.data);
  }
}

export const ajustesInventarioController = new AjustesInventarioController();
