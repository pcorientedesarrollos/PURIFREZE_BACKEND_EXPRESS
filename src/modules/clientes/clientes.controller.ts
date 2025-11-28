import { Request, Response } from 'express';
import { clientesService } from './clientes.service';
import { success } from '../../utils/response';

class ClientesController {
  async create(req: Request, res: Response) {
    const result = await clientesService.create(req.body);
    return success(res, result.message, result.data, 201);
  }

  async findAll(_req: Request, res: Response) {
    const result = await clientesService.findAll();
    return success(res, result.message, result.data);
  }

  async findOne(req: Request, res: Response) {
    const { ClienteID } = req.params as unknown as { ClienteID: number };
    const result = await clientesService.findOne(ClienteID);
    return success(res, result.message, result.data);
  }

  async update(req: Request, res: Response) {
    const { ClienteID } = req.params as unknown as { ClienteID: number };
    const result = await clientesService.update(ClienteID, req.body);
    return success(res, result.message, result.data);
  }

  async baja(req: Request, res: Response) {
    const { ClienteID } = req.params as unknown as { ClienteID: number };
    const result = await clientesService.baja(ClienteID);
    return success(res, result.message, result.data);
  }

  async activar(req: Request, res: Response) {
    const { ClienteID } = req.params as unknown as { ClienteID: number };
    const result = await clientesService.activar(ClienteID);
    return success(res, result.message, result.data);
  }
}

export const clientesController = new ClientesController();
