import { Request, Response } from 'express';
import { empresaService } from './empresa.service';
import { success } from '../../utils/response';
import { UpdateEmpresaDto } from './empresa.schema';

export class EmpresaController {
    async get(_req: Request, res: Response) {
        const empresa = await empresaService.findOne();
        return success(res, 'Datos de empresa obtenidos', empresa);
    }

    async update(req: Request, res: Response) {
        const data = req.body as UpdateEmpresaDto;
        const empresa = await empresaService.update(data);
        return success(res, 'Datos de empresa actualizados', empresa);
    }
}

export const empresaController = new EmpresaController();
