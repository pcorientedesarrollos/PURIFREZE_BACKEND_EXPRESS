import { Request, Response } from 'express';
import { clientesSucursalesService } from './clientes-sucursales.service';
import { success } from '../../utils/response';

class ClientesSucursalesController {
  async create(req: Request, res: Response) {
    const result = await clientesSucursalesService.create(req.body);
    return success(res, result.message, result.data, 201);
  }

  async findAll(_req: Request, res: Response) {
    const result = await clientesSucursalesService.findAll();
    return success(res, result.message, result.data);
  }

  async findOne(req: Request, res: Response) {
    const { SucursalID } = req.params as unknown as { SucursalID: number };
    const result = await clientesSucursalesService.findOne(SucursalID);
    return success(res, result.message, result.data);
  }

  async findByClienteID(req: Request, res: Response) {
    const { ClienteID } = req.params as unknown as { ClienteID: number };
    const result = await clientesSucursalesService.findByClienteID(ClienteID);
    return success(res, result.message, result.data);
  }

  async update(req: Request, res: Response) {
    const { SucursalID } = req.params as unknown as { SucursalID: number };
    const result = await clientesSucursalesService.update(SucursalID, req.body);
    return success(res, result.message, result.data);
  }

  async baja(req: Request, res: Response) {
    const { SucursalID } = req.params as unknown as { SucursalID: number };
    const result = await clientesSucursalesService.baja(SucursalID);
    return success(res, result.message, result.data);
  }

  async activar(req: Request, res: Response) {
    const { SucursalID } = req.params as unknown as { SucursalID: number };
    const result = await clientesSucursalesService.activar(SucursalID);
    return success(res, result.message, result.data);
  }
}

export const clientesSucursalesController = new ClientesSucursalesController();
