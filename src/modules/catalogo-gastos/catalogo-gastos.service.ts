import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { CreateCatalogoGastoDto, UpdateCatalogoGastoDto } from './catalogo-gastos.schema';
import { catalogo_gastos } from '@prisma/client';

type CatalogoNodo = catalogo_gastos & {
    children?: CatalogoNodo[];
    sat_cuenta?: { SATCuentaID: number; Clave: string; Descripcion: string } | null;
};

const INCLUDE_SAT = { sat_cuenta: { select: { SATCuentaID: true, Clave: true, Descripcion: true } } };

function buildTree(items: CatalogoNodo[], parentId: number | null = null): CatalogoNodo[] {
    return items
        .filter(i => i.ParentID === parentId)
        .map(i => ({ ...i, children: buildTree(items, i.CatalogoGastoID) }));
}

class CatalogoGastosService {
    async getTree() {
        const items = await prisma.catalogo_gastos.findMany({
            where: { IsActive: true },
            include: INCLUDE_SAT,
            orderBy: [{ Nivel: 'asc' }, { Codigo: 'asc' }],
        });
        return { message: 'Catálogo de gastos obtenido', data: buildTree(items as CatalogoNodo[]) };
    }

    async getTreeAdmin() {
        const items = await prisma.catalogo_gastos.findMany({
            include: INCLUDE_SAT,
            orderBy: [{ Nivel: 'asc' }, { Codigo: 'asc' }],
        });
        return { message: 'Catálogo de gastos (admin) obtenido', data: buildTree(items as CatalogoNodo[]) };
    }

    async getByNivel(nivel: number) {
        const data = await prisma.catalogo_gastos.findMany({
            where: { IsActive: true, Nivel: nivel },
            include: INCLUDE_SAT,
            orderBy: { Nombre: 'asc' },
        });
        return { message: `Catálogo nivel ${nivel} obtenido`, data };
    }

    async getHijos(parentId: number) {
        const data = await prisma.catalogo_gastos.findMany({
            where: { IsActive: true, ParentID: parentId },
            include: INCLUDE_SAT,
            orderBy: { Nombre: 'asc' },
        });
        return { message: 'Hijos obtenidos', data };
    }

    private async generarCodigo(nivel: number, parentId?: number | null): Promise<string> {
        if (nivel === 1) {
            const existentes = await prisma.catalogo_gastos.findMany({
                where: { Nivel: 1 },
                select: { Codigo: true },
            });
            const max = existentes.reduce((acc, c) => Math.max(acc, Number(c.Codigo) || 600), 600);
            return String(max + 1);
        }

        const parent = await prisma.catalogo_gastos.findUnique({
            where: { CatalogoGastoID: parentId! },
            select: { Codigo: true },
        });
        const parentCodigo = parent?.Codigo ?? String(parentId);

        const hermanos = await prisma.catalogo_gastos.findMany({
            where: { ParentID: parentId },
            select: { Codigo: true },
        });
        const maxSuffix = hermanos.reduce((acc, s) => {
            const partes = (s.Codigo ?? '').split('.');
            return Math.max(acc, Number(partes[partes.length - 1]) || 0);
        }, 0);
        const n = maxSuffix + 1;

        return nivel === 2
            ? `${parentCodigo}.${String(n).padStart(2, '0')}`
            : `${parentCodigo}.${String(n).padStart(3, '0')}`;
    }

    async create(dto: CreateCatalogoGastoDto) {
        if (dto.ParentID) {
            const parent = await prisma.catalogo_gastos.findUnique({ where: { CatalogoGastoID: dto.ParentID } });
            if (!parent || !parent.IsActive) throw new HttpError('Cuenta padre no encontrada', 404);
            if (dto.Nivel !== parent.Nivel + 1) throw new HttpError(`El nivel debe ser ${parent.Nivel + 1}`, 400);
        } else {
            if (dto.Nivel !== 1) throw new HttpError('Una cuenta raíz debe ser nivel 1', 400);
        }

        if (dto.SATCuentaID) {
            const sat = await prisma.sat_cuentas_gastos.findUnique({ where: { SATCuentaID: dto.SATCuentaID } });
            if (!sat) throw new HttpError('Cuenta SAT no encontrada', 404);
        }

        const Codigo = await this.generarCodigo(dto.Nivel, dto.ParentID);

        const data = await prisma.catalogo_gastos.create({
            data: {
                ParentID: dto.ParentID ?? null,
                Nivel: dto.Nivel,
                Codigo,
                Nombre: dto.Nombre,
                Descripcion: dto.Descripcion ?? null,
                Periodicidad: dto.Periodicidad ?? null,
                EsOpcional: dto.EsOpcional ?? false,
                SATCuentaID: dto.SATCuentaID ?? null,
                IsActive: true,
            },
            include: INCLUDE_SAT,
        });
        return { message: 'Catálogo creado', data };
    }

    async update(CatalogoGastoID: number, dto: UpdateCatalogoGastoDto) {
        const exist = await prisma.catalogo_gastos.findUnique({ where: { CatalogoGastoID } });
        if (!exist) throw new HttpError('Registro no encontrado', 404);

        if (dto.SATCuentaID) {
            const sat = await prisma.sat_cuentas_gastos.findUnique({ where: { SATCuentaID: dto.SATCuentaID } });
            if (!sat) throw new HttpError('Cuenta SAT no encontrada', 404);
        }

        const data = await prisma.catalogo_gastos.update({
            where: { CatalogoGastoID },
            data: {
                Nombre: dto.Nombre,
                Descripcion: dto.Descripcion,
                Periodicidad: dto.Periodicidad,
                EsOpcional: dto.EsOpcional,
                SATCuentaID: dto.SATCuentaID,
            },
            include: INCLUDE_SAT,
        });
        return { message: 'Catálogo actualizado', data };
    }

    async baja(CatalogoGastoID: number) {
        const exist = await prisma.catalogo_gastos.findUnique({ where: { CatalogoGastoID } });
        if (!exist) throw new HttpError('Registro no encontrado', 404);
        if (!exist.IsActive) throw new HttpError('Ya está inactivo', 400);

        await prisma.catalogo_gastos.update({ where: { CatalogoGastoID }, data: { IsActive: false } });
        return { message: 'Registro desactivado', data: { CatalogoGastoID } };
    }

    async activar(CatalogoGastoID: number) {
        const exist = await prisma.catalogo_gastos.findUnique({ where: { CatalogoGastoID } });
        if (!exist) throw new HttpError('Registro no encontrado', 404);
        if (exist.IsActive) throw new HttpError('Ya está activo', 400);

        await prisma.catalogo_gastos.update({ where: { CatalogoGastoID }, data: { IsActive: true } });
        return { message: 'Registro activado', data: { CatalogoGastoID } };
    }

    async backfillCodigos() {
        const todos = await prisma.catalogo_gastos.findMany({
            orderBy: [{ Nivel: 'asc' }, { CatalogoGastoID: 'asc' }],
        });

        const codigoMap = new Map<number, string>();

        todos.filter(i => i.Nivel === 1).forEach((item, idx) => {
            codigoMap.set(item.CatalogoGastoID, String(601 + idx));
        });

        const nivel2ByParent = new Map<number, typeof todos>();
        todos.filter(i => i.Nivel === 2).forEach(item => {
            const key = item.ParentID!;
            if (!nivel2ByParent.has(key)) nivel2ByParent.set(key, []);
            nivel2ByParent.get(key)!.push(item);
        });
        nivel2ByParent.forEach((items, parentId) => {
            const parentCodigo = codigoMap.get(parentId) ?? String(parentId);
            items.forEach((item, idx) => {
                codigoMap.set(item.CatalogoGastoID, `${parentCodigo}.${String(idx + 1).padStart(2, '0')}`);
            });
        });

        const nivel3ByParent = new Map<number, typeof todos>();
        todos.filter(i => i.Nivel === 3).forEach(item => {
            const key = item.ParentID!;
            if (!nivel3ByParent.has(key)) nivel3ByParent.set(key, []);
            nivel3ByParent.get(key)!.push(item);
        });
        nivel3ByParent.forEach((items, parentId) => {
            const parentCodigo = codigoMap.get(parentId) ?? String(parentId);
            items.forEach((item, idx) => {
                codigoMap.set(item.CatalogoGastoID, `${parentCodigo}.${String(idx + 1).padStart(3, '0')}`);
            });
        });

        await prisma.$transaction(
            Array.from(codigoMap.entries()).map(([id, codigo]) =>
                prisma.catalogo_gastos.update({ where: { CatalogoGastoID: id }, data: { Codigo: codigo } })
            )
        );

        return { message: `${codigoMap.size} registros actualizados`, data: { total: codigoMap.size } };
    }
}

export const catalogoGastosService = new CatalogoGastosService();
