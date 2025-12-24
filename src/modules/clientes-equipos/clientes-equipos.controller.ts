import { Request, Response } from 'express';
import { clientesEquiposService } from './clientes-equipos.service';
import { success } from '../../utils/response';

class ClientesEquiposController {
  // Crear asignación de equipo a cliente
  async create(req: Request, res: Response) {
    const result = await clientesEquiposService.create(req.body);
    return success(res, result.message, result.data, 201);
  }

  // Obtener todos los equipos de clientes
  async findAll(req: Request, res: Response) {
    const result = await clientesEquiposService.findAll(req.query);
    return success(res, result.message, result.data);
  }

  // Obtener equipos por cliente
  async findByCliente(req: Request, res: Response) {
    const { ClienteID } = req.params as any;
    const result = await clientesEquiposService.findByCliente(ClienteID, req.query);
    return success(res, result.message, result.data);
  }

  // Obtener un equipo de cliente por ID
  async findOne(req: Request, res: Response) {
    const { ClienteEquipoID } = req.params as any;
    const result = await clientesEquiposService.findOne(ClienteEquipoID);
    return success(res, result.message, result.data);
  }

  // Actualizar equipo de cliente
  async update(req: Request, res: Response) {
    const { ClienteEquipoID } = req.params as any;
    const result = await clientesEquiposService.update(ClienteEquipoID, req.body);
    return success(res, result.message, result.data);
  }

  // Retirar equipo de cliente
  async retirar(req: Request, res: Response) {
    const { ClienteEquipoID } = req.params as any;
    const result = await clientesEquiposService.retirar(ClienteEquipoID, req.body);
    return success(res, result.message, result.data);
  }

  // Reactivar equipo
  async activar(req: Request, res: Response) {
    const { ClienteEquipoID } = req.params as any;
    const result = await clientesEquiposService.activar(ClienteEquipoID);
    return success(res, result.message, result.data);
  }

  // Dar de baja (soft delete)
  async baja(req: Request, res: Response) {
    const { ClienteEquipoID } = req.params as any;
    const result = await clientesEquiposService.baja(ClienteEquipoID);
    return success(res, result.message, result.data);
  }
}

export const clientesEquiposController = new ClientesEquiposController();
