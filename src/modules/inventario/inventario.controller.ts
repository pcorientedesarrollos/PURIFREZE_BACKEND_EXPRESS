import { Request, Response } from 'express';
import { inventarioService } from './inventario.service';
import { success } from '../../utils/response';
import { KardexQueryDto } from './inventario.schema';

class InventarioController {
  // ==================== INVENTARIO ====================

  async findAll(_req: Request, res: Response) {
    const result = await inventarioService.findAll();
    return success(res, result.message, result.data);
  }

  async findByRefaccion(req: Request, res: Response) {
    const { RefaccionID } = req.params as unknown as { RefaccionID: number };
    const result = await inventarioService.findByRefaccion(RefaccionID);
    return success(res, result.message, result.data);
  }

  async getResumen(_req: Request, res: Response) {
    const result = await inventarioService.getResumen();
    return success(res, result.message, result.data);
  }

  // ==================== KARDEX ====================

  async findAllKardex(req: Request, res: Response) {
    const query = req.query as unknown as KardexQueryDto;
    const result = await inventarioService.findAllKardex(query);
    return success(res, result.message, result.data);
  }

  async findKardexByRefaccion(req: Request, res: Response) {
    const { RefaccionID } = req.params as unknown as { RefaccionID: number };
    const query = req.query as unknown as KardexQueryDto;
    const result = await inventarioService.findKardexByRefaccion(RefaccionID, query);
    return success(res, result.message, result.data);
  }

  async getTiposMovimiento(_req: Request, res: Response) {
    const result = await inventarioService.getTiposMovimiento();
    return success(res, result.message, result.data);
  }
}

export const inventarioController = new InventarioController();
