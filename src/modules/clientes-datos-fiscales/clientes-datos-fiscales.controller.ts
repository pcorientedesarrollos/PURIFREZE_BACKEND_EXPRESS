import { Request, Response } from 'express';
import { clientesDatosFiscalesService } from './clientes-datos-fiscales.service';
import { success } from '../../utils/response';

class ClientesDatosFiscalesController {
  async create(req: Request, res: Response) {
    const result = await clientesDatosFiscalesService.create(req.body);
    return success(res, result.message, result.data, 201);
  }

  async findAll(_req: Request, res: Response) {
    const result = await clientesDatosFiscalesService.findAll();
    return success(res, result.message, result.data);
  }

  async findOne(req: Request, res: Response) {
    const { DatosFiscalesID } = req.params as unknown as { DatosFiscalesID: number };
    const result = await clientesDatosFiscalesService.findOne(DatosFiscalesID);
    return success(res, result.message, result.data);
  }

  async findByClienteID(req: Request, res: Response) {
    const { ClienteID } = req.params as unknown as { ClienteID: number };
    const result = await clientesDatosFiscalesService.findByClienteID(ClienteID);
    return success(res, result.message, result.data);
  }

  async update(req: Request, res: Response) {
    const { DatosFiscalesID } = req.params as unknown as { DatosFiscalesID: number };
    const result = await clientesDatosFiscalesService.update(DatosFiscalesID, req.body);
    return success(res, result.message, result.data);
  }

  async baja(req: Request, res: Response) {
    const { DatosFiscalesID } = req.params as unknown as { DatosFiscalesID: number };
    const result = await clientesDatosFiscalesService.baja(DatosFiscalesID);
    return success(res, result.message, result.data);
  }

  async activar(req: Request, res: Response) {
    const { DatosFiscalesID } = req.params as unknown as { DatosFiscalesID: number };
    const result = await clientesDatosFiscalesService.activar(DatosFiscalesID);
    return success(res, result.message, result.data);
  }
}

export const clientesDatosFiscalesController = new ClientesDatosFiscalesController();
