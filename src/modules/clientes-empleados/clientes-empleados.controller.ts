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

  // Alias con EmpleadosID (plural) para compatibilidad con frontend
  async findOneByEmpleadosID(req: Request, res: Response) {
    const { EmpleadosID } = req.params as unknown as { EmpleadosID: number };
    const result = await clientesEmpleadosService.findOne(EmpleadosID);
    return success(res, result.message, result.data);
  }

  async update(req: Request, res: Response) {
    const { EmpleadoID } = req.params as unknown as { EmpleadoID: number };
    const result = await clientesEmpleadosService.update(EmpleadoID, req.body);
    return success(res, result.message, result.data);
  }

  // Alias con EmpleadosID (plural) para compatibilidad con frontend
  async updateByEmpleadosID(req: Request, res: Response) {
    const { EmpleadosID } = req.params as unknown as { EmpleadosID: number };
    const result = await clientesEmpleadosService.update(EmpleadosID, req.body);
    return success(res, result.message, result.data);
  }

  // Asignar múltiples puestos (reemplaza los existentes)
  async asignarPuestos(req: Request, res: Response) {
    const { EmpleadoID } = req.params as unknown as { EmpleadoID: number };
    const result = await clientesEmpleadosService.asignarPuestos(EmpleadoID, req.body);
    return success(res, result.message, result.data);
  }

  // Agregar un puesto adicional
  async agregarPuesto(req: Request, res: Response) {
    const { EmpleadoID } = req.params as unknown as { EmpleadoID: number };
    const result = await clientesEmpleadosService.agregarPuesto(EmpleadoID, req.body);
    return success(res, result.message, result.data);
  }

  // Quitar un puesto del empleado
  async quitarPuesto(req: Request, res: Response) {
    const { EmpleadoID, PuestoTrabajoID } = req.params as unknown as { EmpleadoID: number; PuestoTrabajoID: number };
    const result = await clientesEmpleadosService.quitarPuesto(EmpleadoID, PuestoTrabajoID);
    return success(res, result.message, result.data);
  }

  // Obtener puestos de un empleado
  async getPuestos(req: Request, res: Response) {
    const { EmpleadoID } = req.params as unknown as { EmpleadoID: number };
    const result = await clientesEmpleadosService.getPuestos(EmpleadoID);
    return success(res, result.message, result.data);
  }

  async baja(req: Request, res: Response) {
    const { EmpleadoID } = req.params as unknown as { EmpleadoID: number };
    const result = await clientesEmpleadosService.baja(EmpleadoID);
    return success(res, result.message, result.data);
  }

  // Alias con EmpleadosID (plural) para compatibilidad con frontend
  async bajaByEmpleadosID(req: Request, res: Response) {
    const { EmpleadosID } = req.params as unknown as { EmpleadosID: number };
    const result = await clientesEmpleadosService.baja(EmpleadosID);
    return success(res, result.message, result.data);
  }

  async activar(req: Request, res: Response) {
    const { EmpleadoID } = req.params as unknown as { EmpleadoID: number };
    const result = await clientesEmpleadosService.activar(EmpleadoID);
    return success(res, result.message, result.data);
  }

  // Alias con EmpleadosID (plural) para compatibilidad con frontend
  async activarByEmpleadosID(req: Request, res: Response) {
    const { EmpleadosID } = req.params as unknown as { EmpleadosID: number };
    const result = await clientesEmpleadosService.activar(EmpleadosID);
    return success(res, result.message, result.data);
  }
}

export const clientesEmpleadosController = new ClientesEmpleadosController();
