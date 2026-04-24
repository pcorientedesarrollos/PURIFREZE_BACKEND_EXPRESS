import { Request, Response } from 'express';
import { gastosCategoriasService } from './gastos-categorias.service';
import { success } from '../../utils/response';

class GastosCategoriasController {
    async findAll(_req: Request, res: Response) {
        const result = await gastosCategoriasService.findAll();
        return success(res, result.message, result.data);
    }

    async findAllAdmin(_req: Request, res: Response) {
        const result = await gastosCategoriasService.findAllAdmin();
        return success(res, result.message, result.data);
    }

    async create(req: Request, res: Response) {
        const result = await gastosCategoriasService.create(req.body);
        return success(res, result.message, result.data);
    }

    async update(req: Request, res: Response) {
        const { CategoriaGastoID } = req.params;
        const result = await gastosCategoriasService.update(Number(CategoriaGastoID), req.body);
        return success(res, result.message, result.data);
    }

    async baja(req: Request, res: Response) {
        const { CategoriaGastoID } = req.params;
        const result = await gastosCategoriasService.baja(Number(CategoriaGastoID));
        return success(res, result.message, result.data);
    }

    async activar(req: Request, res: Response) {
        const { CategoriaGastoID } = req.params;
        const result = await gastosCategoriasService.activar(Number(CategoriaGastoID));
        return success(res, result.message, result.data);
    }

    async seed(_req: Request, res: Response) {
        const result = await gastosCategoriasService.seed();
        return success(res, result.message, result.data);
    }
}

export const gastosCategoriasController = new GastosCategoriasController();
