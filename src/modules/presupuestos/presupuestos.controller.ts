import { Request, Response } from 'express';
import { presupuestosService } from './presupuestos.service';
import { success } from '../../utils/response';

class PresupuestosController {
  async create(req: Request, res: Response) {
    const result = await presupuestosService.create(req.body);
    return success(res, result.message, result.data, 201);
  }

  async findAll(_req: Request, res: Response) {
    const result = await presupuestosService.findAll();
    return success(res, result.message, result.data);
  }

  async findOne(req: Request, res: Response) {
    const { PresupuestoID } = req.params as unknown as { PresupuestoID: number };
    const result = await presupuestosService.findOne(PresupuestoID);
    return success(res, result.message, result.data);
  }

  async findByCliente(req: Request, res: Response) {
    const { ClienteID } = req.params as unknown as { ClienteID: number };
    const result = await presupuestosService.findByCliente(ClienteID);
    return success(res, result.message, result.data);
  }

  async update(req: Request, res: Response) {
    const { PresupuestoID } = req.params as unknown as { PresupuestoID: number };
    const result = await presupuestosService.update(PresupuestoID, req.body);
    return success(res, result.message, result.data);
  }

  async updateEstatus(req: Request, res: Response) {
    const { PresupuestoID } = req.params as unknown as { PresupuestoID: number };
    const result = await presupuestosService.updateEstatus(PresupuestoID, req.body);
    return success(res, result.message, result.data);
  }

  async addDetalle(req: Request, res: Response) {
    const { PresupuestoID } = req.params as unknown as { PresupuestoID: number };
    const result = await presupuestosService.addDetalle(PresupuestoID, req.body);
    return success(res, result.message, result.data);
  }

  async updateDetalle(req: Request, res: Response) {
    const { DetalleID } = req.params as unknown as { DetalleID: number };
    const result = await presupuestosService.updateDetalle(DetalleID, req.body);
    return success(res, result.message, result.data);
  }

  async removeDetalle(req: Request, res: Response) {
    const { DetalleID } = req.params as unknown as { DetalleID: number };
    const result = await presupuestosService.removeDetalle(DetalleID);
    return success(res, result.message, result.data);
  }

  async baja(req: Request, res: Response) {
    const { PresupuestoID } = req.params as unknown as { PresupuestoID: number };
    const result = await presupuestosService.baja(PresupuestoID);
    return success(res, result.message, result.data);
  }

  async activar(req: Request, res: Response) {
    const { PresupuestoID } = req.params as unknown as { PresupuestoID: number };
    const result = await presupuestosService.activar(PresupuestoID);
    return success(res, result.message, result.data);
  }

  async getPrecioPlantilla(req: Request, res: Response) {
    const { PlantillaEquipoID } = req.params as unknown as { PlantillaEquipoID: number };
    const { modalidad } = req.query as { modalidad: 'VENTA' | 'RENTA' | 'MANTENIMIENTO' };
    const result = await presupuestosService.getPrecioPlantilla(PlantillaEquipoID, modalidad);
    return success(res, result.message, result.data);
  }
}

export const presupuestosController = new PresupuestosController();
