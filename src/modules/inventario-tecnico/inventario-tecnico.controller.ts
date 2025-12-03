import { Request, Response } from 'express';
import { inventarioTecnicoService } from './inventario-tecnico.service';
import { success } from '../../utils/response';

class InventarioTecnicoController {
  async upsert(req: Request, res: Response) {
    const result = await inventarioTecnicoService.upsert(req.body);
    return success(res, result.message, result.data, 200);
  }

  async findAll(_req: Request, res: Response) {
    const result = await inventarioTecnicoService.findAll();
    return success(res, result.message, result.data);
  }

  async findByTecnico(req: Request, res: Response) {
    const { TecnicoID } = req.params as unknown as { TecnicoID: number };
    const result = await inventarioTecnicoService.findByTecnico(TecnicoID);
    return success(res, result.message, result.data);
  }

  async findOne(req: Request, res: Response) {
    const { TecnicoID, RefaccionID } = req.params as unknown as { TecnicoID: number; RefaccionID: number };
    const result = await inventarioTecnicoService.findOne(TecnicoID, RefaccionID);
    return success(res, result.message, result.data);
  }

  async updateStock(req: Request, res: Response) {
    const { TecnicoID, RefaccionID } = req.params as unknown as { TecnicoID: number; RefaccionID: number };
    const result = await inventarioTecnicoService.updateStock(TecnicoID, RefaccionID, req.body);
    return success(res, result.message, result.data);
  }

  async remove(req: Request, res: Response) {
    const { TecnicoID, RefaccionID } = req.params as unknown as { TecnicoID: number; RefaccionID: number };
    const result = await inventarioTecnicoService.remove(TecnicoID, RefaccionID);
    return success(res, result.message, result.data);
  }

  async getSugerencias(req: Request, res: Response) {
    const { TecnicoID } = req.params as unknown as { TecnicoID: number };
    const result = await inventarioTecnicoService.getSugerencias(TecnicoID);
    return success(res, result.message, result.data);
  }

  async buscarRefacciones(req: Request, res: Response) {
    const { TecnicoID } = req.params as unknown as { TecnicoID: number };
    const { q } = req.query as { q: string };
    const result = await inventarioTecnicoService.buscarRefacciones(TecnicoID, q || '');
    return success(res, result.message, result.data);
  }
}

export const inventarioTecnicoController = new InventarioTecnicoController();
