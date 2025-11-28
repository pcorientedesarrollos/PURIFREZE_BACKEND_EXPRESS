import { Request, Response } from 'express';
import { clientesEmpleadosService } from './clientes-empleados.service';
import { success } from '../../utils/response';

class ClientesEmpleadosController {
  async create(req: Request, res: Response) {
    const result = await clientesEmpleadosService.create(req.body);
    return success(res, result.message, result.data, 201);
  }

  async findAll(_req: Request, res: Response) {
    const result = await clientesEmpleadosService.findAll();
    return success(res, result.message, result.data);
  }

  async findOne(req: Request, res: Response) {
    const { EmpleadoID } = req.params as unknown as { EmpleadoID: number };
    const result = await clientesEmpleadosService.findOne(EmpleadoID);
    return success(res, result.message, result.data);
  }

  async update(req: Request, res: Response) {
    const { EmpleadoID } = req.params as unknown as { EmpleadoID: number };
    const result = await clientesEmpleadosService.update(EmpleadoID, req.body);
    return success(res, result.message, result.data);
  }

  async baja(req: Request, res: Response) {
    const { EmpleadoID } = req.params as unknown as { EmpleadoID: number };
    const result = await clientesEmpleadosService.baja(EmpleadoID);
    return success(res, result.message, result.data);
  }

  async activar(req: Request, res: Response) {
    const { EmpleadoID } = req.params as unknown as { EmpleadoID: number };
    const result = await clientesEmpleadosService.activar(EmpleadoID);
    return success(res, result.message, result.data);
  }
}

export const clientesEmpleadosController = new ClientesEmpleadosController();
