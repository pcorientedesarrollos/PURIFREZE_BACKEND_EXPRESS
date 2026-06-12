import { Request, Response } from 'express';
import { estadosCuentaService } from './estados-cuenta.service';
import { getKardex } from './estados-cuenta.kardex';
import { success } from '../../utils/response';
import { EstadoCuentaParamDto, EstadoCuentaQueryDto } from './estados-cuenta.schema';

class EstadosCuentaController {
    async getEstadoCuenta(req: Request, res: Response) {
        const { anio, mes } = req.params as unknown as EstadoCuentaParamDto;
        const result = await estadosCuentaService.getEstadoCuenta(Number(anio), Number(mes));
        return success(res, result.message, result.data);
    }

    async getHistorico(req: Request, res: Response) {
        const query = req.query as unknown as EstadoCuentaQueryDto;
        const result = await estadosCuentaService.getHistorico(query.meses);
        return success(res, result.message, result.data);
    }

    async getKardex(req: Request, res: Response) {
        const { anio, mes } = req.params as unknown as EstadoCuentaParamDto;
        const result = await getKardex(Number(anio), Number(mes));
        return success(res, result.message, result.data);
    }
}

export const estadosCuentaController = new EstadosCuentaController();
