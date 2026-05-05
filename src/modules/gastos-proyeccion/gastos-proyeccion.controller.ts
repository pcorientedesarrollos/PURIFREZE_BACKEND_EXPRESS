import { Request, Response } from 'express';
import { gastosProyeccionService } from './gastos-proyeccion.service';
import { success } from '../../utils/response';

class GastosProyeccionController {
    async getProyeccion(req: Request, res: Response) {
        const { anio, mes } = req.params;
        const result = await gastosProyeccionService.getProyeccion(Number(anio), Number(mes));
        return success(res, result.message, result.data);
    }

    async guardarItems(req: Request, res: Response) {
        const { anio, mes } = req.params;
        const result = await gastosProyeccionService.guardarItems(Number(anio), Number(mes), req.body);
        return success(res, result.message, result.data);
    }
}

export const gastosProyeccionController = new GastosProyeccionController();
