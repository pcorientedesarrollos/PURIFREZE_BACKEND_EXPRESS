import { Request, Response } from 'express';
import { clientesTelefonosService } from './clientes-telefonos.service';
import { success } from '../../utils/response';

class ClientesTelefonosController {
  async create(req: Request, res: Response) {
    const result = await clientesTelefonosService.create(req.body);
    return success(res, result.message, result.data, 201);
  }

  async findAll(_req: Request, res: Response) {
    const result = await clientesTelefonosService.findAll();
    return success(res, result.message, result.data);
  }

  async findOne(req: Request, res: Response) {
    const { TelefonoID } = req.params as unknown as { TelefonoID: number };
    const result = await clientesTelefonosService.findOne(TelefonoID);
    return success(res, result.message, result.data);
  }

  async update(req: Request, res: Response) {
    const { TelefonoID } = req.params as unknown as { TelefonoID: number };
    const result = await clientesTelefonosService.update(TelefonoID, req.body);
    return success(res, result.message, result.data);
  }

  async baja(req: Request, res: Response) {
    const { TelefonoID } = req.params as unknown as { TelefonoID: number };
    const result = await clientesTelefonosService.baja(TelefonoID);
    return success(res, result.message, result.data);
  }

  async activar(req: Request, res: Response) {
    const { TelefonoID } = req.params as unknown as { TelefonoID: number };
    const result = await clientesTelefonosService.activar(TelefonoID);
    return success(res, result.message, result.data);
  }
}

export const clientesTelefonosController = new ClientesTelefonosController();
