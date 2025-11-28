import { Request, Response } from 'express';
import { clientesDireccionesService } from './clientes-direcciones.service';
import { success } from '../../utils/response';

class ClientesDireccionesController {
  async create(req: Request, res: Response) {
    const result = await clientesDireccionesService.create(req.body);
    return success(res, result.message, result.data, 201);
  }

  async findAll(_req: Request, res: Response) {
    const result = await clientesDireccionesService.findAll();
    return success(res, result.message, result.data);
  }

  async findOne(req: Request, res: Response) {
    const { DireccionID } = req.params as unknown as { DireccionID: number };
    const result = await clientesDireccionesService.findOne(DireccionID);
    return success(res, result.message, result.data);
  }

  async findByClienteID(req: Request, res: Response) {
    const { ClienteID } = req.params as unknown as { ClienteID: number };
    const result = await clientesDireccionesService.findByClienteID(ClienteID);
    return success(res, result.message, result.data);
  }

  async update(req: Request, res: Response) {
    const { DireccionID } = req.params as unknown as { DireccionID: number };
    const result = await clientesDireccionesService.update(DireccionID, req.body);
    return success(res, result.message, result.data);
  }

  async baja(req: Request, res: Response) {
    const { DireccionID } = req.params as unknown as { DireccionID: number };
    const result = await clientesDireccionesService.baja(DireccionID);
    return success(res, result.message, result.data);
  }

  async activar(req: Request, res: Response) {
    const { DireccionID } = req.params as unknown as { DireccionID: number };
    const result = await clientesDireccionesService.activar(DireccionID);
    return success(res, result.message, result.data);
  }
}

export const clientesDireccionesController = new ClientesDireccionesController();
