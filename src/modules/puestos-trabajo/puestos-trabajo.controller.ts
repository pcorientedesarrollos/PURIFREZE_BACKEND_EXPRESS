import { Request, Response } from 'express';
import { puestosTrabajoService } from './puestos-trabajo.service';
import { success } from '../../utils/response';

export class PuestosTrabajoController {
  async create(req: Request, res: Response) {
    const result = await puestosTrabajoService.create(req.body);
    return success(res, 'Puesto de trabajo creado', result);
  }

  async findAll(_req: Request, res: Response) {
    const result = await puestosTrabajoService.findAll();
    return success(res, 'Puestos de trabajo obtenidos', result);
  }

  async findOne(req: Request, res: Response) {
    const result = await puestosTrabajoService.findOne(Number(req.params.PuestoTrabajoID));
    return success(res, 'Puesto de trabajo obtenido', result);
  }

  async update(req: Request, res: Response) {
    const result = await puestosTrabajoService.update(Number(req.params.PuestoTrabajoID), req.body);
    return success(res, 'Puesto de trabajo actualizado', result);
  }

  async baja(req: Request, res: Response) {
    const result = await puestosTrabajoService.baja(Number(req.params.PuestoTrabajoID));
    return success(res, 'Puesto de trabajo dado de baja', result);
  }

  async activar(req: Request, res: Response) {
    const result = await puestosTrabajoService.activar(Number(req.params.PuestoTrabajoID));
    return success(res, 'Puesto de trabajo activado', result);
  }
}

export const puestosTrabajoController = new PuestosTrabajoController();
