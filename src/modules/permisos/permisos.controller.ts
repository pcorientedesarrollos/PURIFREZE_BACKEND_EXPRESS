import { Request, Response } from 'express';
import { permisosService } from './permisos.service';
import { success } from '../../utils/response';
import { GenerarPermisoInput } from './permisos.schema';

export class PermisosController {
  async getSideBar(req: Request, res: Response) {
    const { UsuarioID } = req.params as unknown as { UsuarioID: number };
    const data = await permisosService.getSideBar(UsuarioID);
    success(res, 'Dashboard obtenido', data);
  }

  async getArbolPermisos(req: Request, res: Response) {
    const { UsuarioID } = req.params as unknown as { UsuarioID: number };
    const data = await permisosService.getArbolPermisos(UsuarioID);
    success(res, 'Arbol de permisos obtenido', data);
  }

  async generarPermiso(req: Request, res: Response) {
    const body = req.body as GenerarPermisoInput;
    const data = await permisosService.generarPermiso(body);
    success(res, data.mensaje, data.permiso);
  }
}

export const permisosController = new PermisosController();
