import { Request, Response } from 'express';
import { traspasosService } from './traspasos.service';
import { success } from '../../utils/response';

class TraspasosController {
  async create(req: Request, res: Response) {
    const result = await traspasosService.create(req.body);
    return success(res, result.message, result.data, 201);
  }

  async findAll(req: Request, res: Response) {
    const { estatus, tipo } = req.query as { estatus?: string; tipo?: string };
    const result = await traspasosService.findAll(estatus, tipo);
    return success(res, result.message, result.data);
  }

  async findPendientes(_req: Request, res: Response) {
    const result = await traspasosService.findPendientes();
    return success(res, result.message, result.data);
  }

  async findOne(req: Request, res: Response) {
    const { TraspasoEncabezadoID } = req.params as unknown as { TraspasoEncabezadoID: number };
    const result = await traspasosService.findOne(TraspasoEncabezadoID);
    return success(res, result.message, result.data);
  }

  async autorizar(req: Request, res: Response) {
    const { TraspasoEncabezadoID } = req.params as unknown as { TraspasoEncabezadoID: number };
    const result = await traspasosService.autorizar(TraspasoEncabezadoID, req.body);
    return success(res, result.message, result.data);
  }

  async cancelar(req: Request, res: Response) {
    const { TraspasoEncabezadoID } = req.params as unknown as { TraspasoEncabezadoID: number };
    const result = await traspasosService.cancelar(TraspasoEncabezadoID);
    return success(res, result.message, result.data);
  }

  async findByTecnico(req: Request, res: Response) {
    const { TecnicoID } = req.params as unknown as { TecnicoID: number };
    const result = await traspasosService.findByTecnico(TecnicoID);
    return success(res, result.message, result.data);
  }
}

export const traspasosController = new TraspasosController();
