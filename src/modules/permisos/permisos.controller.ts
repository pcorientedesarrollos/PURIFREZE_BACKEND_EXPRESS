import { Request, Response } from 'express';
import { permisosService } from './permisos.service';
import { success } from '../../utils/response';
import { UsuarioParam, GenerarPermisoInput } from './permisos.schema';

export class PermisosController {
  async getSideBar(req: Request<UsuarioParam>, res: Response) {
    const { UsuarioID } = req.params;
    const data = await permisosService.getSideBar(UsuarioID);
    success(res, 'Dashboard obtenido', data);
  }

  async getArbolPermisos(req: Request<UsuarioParam>, res: Response) {
    const { UsuarioID } = req.params;
    const data = await permisosService.getArbolPermisos(UsuarioID);
    success(res, 'Arbol de permisos obtenido', data);
  }

  async generarPermiso(req: Request<{}, {}, GenerarPermisoInput>, res: Response) {
    const data = await permisosService.generarPermiso(req.body);
    success(res, data.mensaje, data.permiso);
  }
}

export const permisosController = new PermisosController();
