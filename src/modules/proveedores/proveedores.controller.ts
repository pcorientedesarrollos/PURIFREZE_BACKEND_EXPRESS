import { Request, Response } from 'express';
import { proveedoresService } from './proveedores.service';
import { success } from '../../utils/response';

class ProveedoresController {
  async create(req: Request, res: Response) {
    const result = await proveedoresService.create(req.body);
    return success(res, result.message, result.data, 201);
  }

  async findAll(_req: Request, res: Response) {
    const result = await proveedoresService.findAll();
    return success(res, result.message, result.data);
  }

  async findOne(req: Request, res: Response) {
    const { ProveedorID } = req.params as unknown as { ProveedorID: number };
    const result = await proveedoresService.findOne(ProveedorID);
    return success(res, result.message, result.data);
  }

  async update(req: Request, res: Response) {
    const { ProveedorID } = req.params as unknown as { ProveedorID: number };
    const result = await proveedoresService.update(ProveedorID, req.body);
    return success(res, result.message, result.data);
  }

  async baja(req: Request, res: Response) {
    const { ProveedorID } = req.params as unknown as { ProveedorID: number };
    const result = await proveedoresService.baja(ProveedorID);
    return success(res, result.message, result.data);
  }

  async activar(req: Request, res: Response) {
    const { ProveedorID } = req.params as unknown as { ProveedorID: number };
    const result = await proveedoresService.activar(ProveedorID);
    return success(res, result.message, result.data);
  }
}

export const proveedoresController = new ProveedoresController();
