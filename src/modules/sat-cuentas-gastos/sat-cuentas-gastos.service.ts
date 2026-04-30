import prisma from '../../config/database';
import { sat_cuentas_gastos } from '@prisma/client';

type SATNodo = sat_cuentas_gastos & { children?: SATNodo[] };

function buildTree(items: sat_cuentas_gastos[], parentId: number | null = null): SATNodo[] {
    return items
        .filter(i => i.ParentID === parentId)
        .map(i => ({ ...i, children: buildTree(items, i.SATCuentaID) }));
}

class SatCuentasGastosService {
    async findAll() {
        const data = await prisma.sat_cuentas_gastos.findMany({
            where: { IsActive: true },
            orderBy: [{ Nivel: 'asc' }, { Clave: 'asc' }],
        });
        return { message: 'Catálogo SAT obtenido', data };
    }

    async getTree() {
        const items = await prisma.sat_cuentas_gastos.findMany({
            where: { IsActive: true },
            orderBy: [{ Nivel: 'asc' }, { Clave: 'asc' }],
        });
        return { message: 'Árbol SAT obtenido', data: buildTree(items) };
    }
}

export const satCuentasGastosService = new SatCuentasGastosService();
