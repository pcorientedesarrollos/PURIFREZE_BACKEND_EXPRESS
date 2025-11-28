import { Request, Response } from 'express';
import { clientesCorreosService } from './clientes-correos.service';
import { success } from '../../utils/response';

class ClientesCorreosController {
  async create(req: Request, res: Response) {
    const result = await clientesCorreosService.create(req.body);
    return success(res, result.message, result.data, 201);
  }

  async findAll(_req: Request, res: Response) {
    const result = await clientesCorreosService.findAll();
    return success(res, result.message, result.data);
  }

  async findOne(req: Request, res: Response) {
    const { CorreoID } = req.params as unknown as { CorreoID: number };
    const result = await clientesCorreosService.findOne(CorreoID);
    return success(res, result.message, result.data);
  }

  async update(req: Request, res: Response) {
    const { CorreoID } = req.params as unknown as { CorreoID: number };
    const result = await clientesCorreosService.update(CorreoID, req.body);
    return success(res, result.message, result.data);
  }

  async baja(req: Request, res: Response) {
    const { CorreoID } = req.params as unknown as { CorreoID: number };
    const result = await clientesCorreosService.baja(CorreoID);
    return success(res, result.message, result.data);
  }

  async activar(req: Request, res: Response) {
    const { CorreoID } = req.params as unknown as { CorreoID: number };
    const result = await clientesCorreosService.activar(CorreoID);
    return success(res, result.message, result.data);
  }
}

export const clientesCorreosController = new ClientesCorreosController();
