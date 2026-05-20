import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { UpdateEmpresaDto } from './empresa.schema';

export class EmpresaService {
    async findOne() {
        const empresa = await prisma.configuracion_empresa.findFirst();

        if (!empresa) {
            throw new HttpError('No se encontró la configuración de empresa', 404);
        }

        return empresa;
    }

    async update(data: UpdateEmpresaDto) {
        const empresa = await prisma.configuracion_empresa.findFirst();

        if (!empresa) {
            throw new HttpError('No se encontró la configuración de empresa', 404);
        }

        const updated = await prisma.configuracion_empresa.update({
            where: { EmpresaID: empresa.EmpresaID },
            data,
        });

        return updated;
    }
}

export const empresaService = new EmpresaService();
