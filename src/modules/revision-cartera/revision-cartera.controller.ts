import { Request, Response } from 'express';
import { revisionCarteraService } from './revision-cartera.service';
import { success } from '../../utils/response';

export class RevisionCarteraController {

  async getClientes(_req: Request, res: Response) {
    const clientes = await revisionCarteraService.getClientes();
    return success(res, 'Clientes obtenidos', clientes);
  }

  async guardarSeleccion(req: Request, res: Response) {
    const clientes = req.body;
    const resultado = await revisionCarteraService.guardarSeleccion(clientes);
    return success(res, 'Revisión guardada correctamente', resultado);
  }

  async getResumen(_req: Request, res: Response) {
    const resumen = await revisionCarteraService.getResumen();
    return success(res, 'Resumen obtenido', resumen);
  }
}

export const revisionCarteraController = new RevisionCarteraController();
