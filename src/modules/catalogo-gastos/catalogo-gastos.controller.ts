import { Request, Response } from 'express';
import { catalogoGastosService } from './catalogo-gastos.service';
import { success } from '../../utils/response';

class CatalogoGastosController {
    async getTree(_req: Request, res: Response) {
        const result = await catalogoGastosService.getTree();
        return success(res, result.message, result.data);
    }

    async getTreeAdmin(_req: Request, res: Response) {
        const result = await catalogoGastosService.getTreeAdmin();
        return success(res, result.message, result.data);
    }

    async getByNivel(req: Request, res: Response) {
        const result = await catalogoGastosService.getByNivel(Number(req.params.nivel));
        return success(res, result.message, result.data);
    }

    async getHijos(req: Request, res: Response) {
        const result = await catalogoGastosService.getHijos(Number(req.params.parentId));
        return success(res, result.message, result.data);
    }

    async create(req: Request, res: Response) {
        const result = await catalogoGastosService.create(req.body);
        return success(res, result.message, result.data);
    }

    async update(req: Request, res: Response) {
        const { CatalogoGastoID } = req.params;
        const result = await catalogoGastosService.update(Number(CatalogoGastoID), req.body);
        return success(res, result.message, result.data);
    }

    async baja(req: Request, res: Response) {
        const { CatalogoGastoID } = req.params;
        const result = await catalogoGastosService.baja(Number(CatalogoGastoID));
        return success(res, result.message, result.data);
    }

    async activar(req: Request, res: Response) {
        const { CatalogoGastoID } = req.params;
        const result = await catalogoGastosService.activar(Number(CatalogoGastoID));
        return success(res, result.message, result.data);
    }
}

export const catalogoGastosController = new CatalogoGastosController();
