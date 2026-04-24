import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { CreateGastoDto, UpdateGastoDto, GastosQueryDto } from './gastos.schema';

class GastosService {
    async findAll(query: GastosQueryDto) {
        const page = Number(query.page ?? 1);
        const pageSize = Number(query.pageSize ?? 20);
        const skip = (page - 1) * pageSize;

        const where: Record<string, unknown> = { IsActive: true };

        if (query.fechaDesde || query.fechaHasta) {
            where['Fecha'] = {
                ...(query.fechaDesde ? { gte: new Date(query.fechaDesde + 'T00:00:00') } : {}),
                ...(query.fechaHasta ? { lte: new Date(query.fechaHasta + 'T23:59:59') } : {}),
            };
        }

        if (query.categoriaId) {
            where['CategoriaGastoID'] = query.categoriaId;
        }

        if (query.search) {
            where['OR'] = [
                { Descripcion: { contains: query.search } },
                { Referencia: { contains: query.search } },
            ];
        }

        const [total, gastos] = await Promise.all([
            prisma.gastos_encabezado.count({ where }),
            prisma.gastos_encabezado.findMany({
                where,
                include: {
                    categoria: true,
                    detalles: { where: { IsActive: true } },
                },
                orderBy: [{ Fecha: 'desc' }, { GastoID: 'desc' }],
                skip,
                take: pageSize,
            }),
        ]);

        return {
            message: 'Gastos obtenidos',
            data: gastos,
            meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
        };
    }

    async findOne(GastoID: number) {
        const gasto = await prisma.gastos_encabezado.findUnique({
            where: { GastoID },
            include: {
                categoria: true,
                detalles: { where: { IsActive: true } },
            },
        });

        if (!gasto || !gasto.IsActive) throw new HttpError('Gasto no encontrado', 404);

        return { message: 'Gasto obtenido', data: gasto };
    }

    async create(data: CreateGastoDto) {
        const { Detalles, ...encabezado } = data;

        const gasto = await prisma.$transaction(async (tx) => {
            const nuevo = await tx.gastos_encabezado.create({
                data: {
                    ...encabezado,
                    Fecha: new Date(encabezado.Fecha + 'T12:00:00'),
                    IsActive: true,
                },
            });

            if (Detalles && Detalles.length > 0) {
                await tx.gastos_detalle.createMany({
                    data: Detalles.map(d => ({ ...d, GastoID: nuevo.GastoID, IsActive: true })),
                });
            }

            return tx.gastos_encabezado.findUnique({
                where: { GastoID: nuevo.GastoID },
                include: { categoria: true, detalles: { where: { IsActive: true } } },
            });
        });

        return { message: 'Gasto registrado', data: gasto };
    }

    async update(GastoID: number, data: UpdateGastoDto) {
        const exist = await prisma.gastos_encabezado.findUnique({ where: { GastoID } });
        if (!exist || !exist.IsActive) throw new HttpError('Gasto no encontrado', 404);

        const { Detalles, ...encabezado } = data;

        const gasto = await prisma.$transaction(async (tx) => {
            const updateData: Record<string, unknown> = { ...encabezado };
            if (encabezado.Fecha) {
                updateData['Fecha'] = new Date(encabezado.Fecha + 'T12:00:00');
            }

            await tx.gastos_encabezado.update({ where: { GastoID }, data: updateData });

            if (Detalles !== undefined) {
                await tx.gastos_detalle.updateMany({
                    where: { GastoID },
                    data: { IsActive: false },
                });

                if (Detalles.length > 0) {
                    await tx.gastos_detalle.createMany({
                        data: Detalles.map(d => ({ ...d, GastoID, IsActive: true })),
                    });
                }
            }

            return tx.gastos_encabezado.findUnique({
                where: { GastoID },
                include: { categoria: true, detalles: { where: { IsActive: true } } },
            });
        });

        return { message: 'Gasto actualizado', data: gasto };
    }

    async baja(GastoID: number) {
        const exist = await prisma.gastos_encabezado.findUnique({ where: { GastoID } });
        if (!exist || !exist.IsActive) throw new HttpError('Gasto no encontrado', 404);

        await prisma.gastos_encabezado.update({
            where: { GastoID },
            data: { IsActive: false },
        });

        return { message: 'Gasto eliminado', data: { GastoID } };
    }

    async getReporteSemanal() {
        const hoy = new Date();
        const diaSemana = hoy.getDay(); // 0=Dom, 1=Lun...
        const diasDesdeeLunes = diaSemana === 0 ? 6 : diaSemana - 1;

        const inicioSemanaActual = new Date(hoy);
        inicioSemanaActual.setDate(hoy.getDate() - diasDesdeeLunes);
        inicioSemanaActual.setHours(0, 0, 0, 0);

        const finSemanaActual = new Date(inicioSemanaActual);
        finSemanaActual.setDate(inicioSemanaActual.getDate() + 6);
        finSemanaActual.setHours(23, 59, 59, 999);

        const inicioSemanaAnterior = new Date(inicioSemanaActual);
        inicioSemanaAnterior.setDate(inicioSemanaActual.getDate() - 7);

        const finSemanaAnterior = new Date(inicioSemanaAnterior);
        finSemanaAnterior.setDate(inicioSemanaAnterior.getDate() + 6);
        finSemanaAnterior.setHours(23, 59, 59, 999);

        const [gastosActual, gastosAnterior] = await Promise.all([
            prisma.gastos_encabezado.findMany({
                where: { IsActive: true, Fecha: { gte: inicioSemanaActual, lte: finSemanaActual } },
                include: { categoria: { select: { Nombre: true, Grupo: true } } },
            }),
            prisma.gastos_encabezado.findMany({
                where: { IsActive: true, Fecha: { gte: inicioSemanaAnterior, lte: finSemanaAnterior } },
                include: { categoria: { select: { Nombre: true, Grupo: true } } },
            }),
        ]);

        const agruparPorDia = (gastos: typeof gastosActual) => {
            const mapa = new Map<string, number>();
            for (const g of gastos) {
                const fecha = g.Fecha.toISOString().substring(0, 10);
                mapa.set(fecha, (mapa.get(fecha) ?? 0) + g.Monto);
            }
            return Array.from(mapa.entries())
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([fecha, total]) => ({ fecha, total }));
        };

        const agruparPorCategoria = (actual: typeof gastosActual, anterior: typeof gastosActual) => {
            const mapa = new Map<string, { categoria: string; grupo: string; totalActual: number; totalAnterior: number }>();

            for (const g of actual) {
                const key = g.categoria.Nombre;
                const entry = mapa.get(key) ?? { categoria: g.categoria.Nombre, grupo: g.categoria.Grupo ?? '', totalActual: 0, totalAnterior: 0 };
                entry.totalActual += g.Monto;
                mapa.set(key, entry);
            }
            for (const g of anterior) {
                const key = g.categoria.Nombre;
                const entry = mapa.get(key) ?? { categoria: g.categoria.Nombre, grupo: g.categoria.Grupo ?? '', totalActual: 0, totalAnterior: 0 };
                entry.totalAnterior += g.Monto;
                mapa.set(key, entry);
            }

            return Array.from(mapa.values()).sort((a, b) => a.grupo.localeCompare(b.grupo) || a.categoria.localeCompare(b.categoria));
        };

        return {
            message: 'Reporte semanal obtenido',
            data: {
                semanaActual: {
                    total: gastosActual.reduce((s, g) => s + g.Monto, 0),
                    porDia: agruparPorDia(gastosActual),
                    inicio: inicioSemanaActual.toISOString().substring(0, 10),
                    fin: finSemanaActual.toISOString().substring(0, 10),
                },
                semanaAnterior: {
                    total: gastosAnterior.reduce((s, g) => s + g.Monto, 0),
                    porDia: agruparPorDia(gastosAnterior),
                    inicio: inicioSemanaAnterior.toISOString().substring(0, 10),
                    fin: finSemanaAnterior.toISOString().substring(0, 10),
                },
                porCategoria: agruparPorCategoria(gastosActual, gastosAnterior),
            },
        };
    }

    async getReporteMensual() {
        const hoy = new Date();

        const inicioMesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        const finMesActual = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59, 999);

        const inicioMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
        const finMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0, 23, 59, 59, 999);

        const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

        const [gastosActual, gastosAnterior] = await Promise.all([
            prisma.gastos_encabezado.findMany({
                where: { IsActive: true, Fecha: { gte: inicioMesActual, lte: finMesActual } },
                include: { categoria: { select: { Nombre: true, Grupo: true } } },
            }),
            prisma.gastos_encabezado.findMany({
                where: { IsActive: true, Fecha: { gte: inicioMesAnterior, lte: finMesAnterior } },
                include: { categoria: { select: { Nombre: true, Grupo: true } } },
            }),
        ]);

        const getNumSemana = (fecha: Date, inicioMes: Date) => {
            const diff = Math.floor((fecha.getTime() - inicioMes.getTime()) / (1000 * 60 * 60 * 24));
            return Math.floor(diff / 7) + 1;
        };

        const agruparPorSemana = (gastos: typeof gastosActual, inicioMes: Date, key: 'totalActual' | 'totalAnterior') => {
            const mapa = new Map<number, number>();
            for (const g of gastos) {
                const s = getNumSemana(g.Fecha, inicioMes);
                mapa.set(s, (mapa.get(s) ?? 0) + g.Monto);
            }
            return mapa;
        };

        const mapaActual = agruparPorSemana(gastosActual, inicioMesActual, 'totalActual');
        const mapaAnterior = agruparPorSemana(gastosAnterior, inicioMesAnterior, 'totalAnterior');
        const maxSemanas = Math.max(...[...mapaActual.keys(), ...mapaAnterior.keys(), 1]);

        const porSemana = Array.from({ length: maxSemanas }, (_, i) => ({
            semana: `Semana ${i + 1}`,
            totalActual: mapaActual.get(i + 1) ?? 0,
            totalAnterior: mapaAnterior.get(i + 1) ?? 0,
        }));

        const agruparPorCategoria = (actual: typeof gastosActual, anterior: typeof gastosActual) => {
            const mapa = new Map<string, { categoria: string; grupo: string; totalActual: number; totalAnterior: number }>();
            for (const g of actual) {
                const key = g.categoria.Nombre;
                const e = mapa.get(key) ?? { categoria: g.categoria.Nombre, grupo: g.categoria.Grupo ?? '', totalActual: 0, totalAnterior: 0 };
                e.totalActual += g.Monto;
                mapa.set(key, e);
            }
            for (const g of anterior) {
                const key = g.categoria.Nombre;
                const e = mapa.get(key) ?? { categoria: g.categoria.Nombre, grupo: g.categoria.Grupo ?? '', totalActual: 0, totalAnterior: 0 };
                e.totalAnterior += g.Monto;
                mapa.set(key, e);
            }
            return Array.from(mapa.values()).sort((a, b) => a.grupo.localeCompare(b.grupo) || a.categoria.localeCompare(b.categoria));
        };

        return {
            message: 'Reporte mensual obtenido',
            data: {
                mesActual: {
                    total: gastosActual.reduce((s, g) => s + g.Monto, 0),
                    label: `${MESES[hoy.getMonth()]} ${hoy.getFullYear()}`,
                },
                mesAnterior: {
                    total: gastosAnterior.reduce((s, g) => s + g.Monto, 0),
                    label: `${MESES[inicioMesAnterior.getMonth()]} ${inicioMesAnterior.getFullYear()}`,
                },
                porSemana,
                porCategoria: agruparPorCategoria(gastosActual, gastosAnterior),
            },
        };
    }
}

export const gastosService = new GastosService();
