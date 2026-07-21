import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { CreateGastoDto, UpdateGastoDto, GastosQueryDto } from './gastos.schema';
import { localDate } from '../../utils/date-utils';

const INCLUDE_DETALLES = {
    detalles: {
        where: { IsActive: true },
        include: {
            catalogo: {
                select: {
                    CatalogoGastoID: true,
                    Nombre: true,
                    Nivel: true,
                    Periodicidad: true,
                    parent: { select: { CatalogoGastoID: true, Nombre: true, Nivel: true } },
                },
            },
        },
    },
};

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

        if (query.catalogoGastoId) {
            where['detalles'] = { some: { CatalogoGastoID: query.catalogoGastoId, IsActive: true } };
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
                include: INCLUDE_DETALLES,
                orderBy: [{ Fecha: 'desc' }, { GastoID: 'desc' }],
                skip,
                take: pageSize,
            }),
        ]);

        const data = gastos.map(g => ({
            ...g,
            total: g.detalles.reduce((s, d) => s + d.Monto, 0),
        }));

        return {
            message: 'Gastos obtenidos',
            data,
            meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
        };
    }

    async findOne(GastoID: number) {
        const gasto = await prisma.gastos_encabezado.findUnique({
            where: { GastoID },
            include: INCLUDE_DETALLES,
        });

        if (!gasto || !gasto.IsActive) throw new HttpError('Gasto no encontrado', 404);

        return {
            message: 'Gasto obtenido',
            data: { ...gasto, total: gasto.detalles.reduce((s, d) => s + d.Monto, 0) },
        };
    }

    async create(data: CreateGastoDto) {
        const { Detalles, ...encabezado } = data;

        const gasto = await prisma.$transaction(async (tx) => {
            const nuevo = await tx.gastos_encabezado.create({
                data: {
                    Fecha: new Date(encabezado.Fecha + 'T12:00:00'),
                    Descripcion: encabezado.Descripcion,
                    Referencia: encabezado.Referencia ?? null,
                    UsuarioID: encabezado.UsuarioID ?? null,
                    IsActive: true,
                },
            });

            await tx.gastos_detalle.createMany({
                data: Detalles.map(d => ({
                    GastoID: nuevo.GastoID,
                    CatalogoGastoID: d.CatalogoGastoID ?? null,
                    Concepto: d.Concepto,
                    Monto: d.Monto,
                    IsActive: true,
                })),
            });

            return tx.gastos_encabezado.findUnique({
                where: { GastoID: nuevo.GastoID },
                include: INCLUDE_DETALLES,
            });
        });

        return {
            message: 'Gasto registrado',
            data: gasto ? { ...gasto, total: gasto.detalles.reduce((s, d) => s + d.Monto, 0) } : gasto,
        };
    }

    async update(GastoID: number, data: UpdateGastoDto) {
        const exist = await prisma.gastos_encabezado.findUnique({ where: { GastoID } });
        if (!exist || !exist.IsActive) throw new HttpError('Gasto no encontrado', 404);

        const { Detalles, ...encabezado } = data;

        const gasto = await prisma.$transaction(async (tx) => {
            const updateData: Record<string, unknown> = { ...encabezado };
            if (encabezado.Fecha) updateData['Fecha'] = new Date(encabezado.Fecha + 'T12:00:00');

            await tx.gastos_encabezado.update({ where: { GastoID }, data: updateData });

            if (Detalles !== undefined) {
                await tx.gastos_detalle.updateMany({ where: { GastoID }, data: { IsActive: false } });
                await tx.gastos_detalle.createMany({
                    data: Detalles.map(d => ({
                        GastoID,
                        CatalogoGastoID: d.CatalogoGastoID ?? null,
                        Concepto: d.Concepto,
                        Monto: d.Monto,
                        IsActive: true,
                    })),
                });
            }

            return tx.gastos_encabezado.findUnique({ where: { GastoID }, include: INCLUDE_DETALLES });
        });

        return {
            message: 'Gasto actualizado',
            data: gasto ? { ...gasto, total: gasto.detalles.reduce((s, d) => s + d.Monto, 0) } : gasto,
        };
    }

    async baja(GastoID: number) {
        const exist = await prisma.gastos_encabezado.findUnique({ where: { GastoID } });
        if (!exist || !exist.IsActive) throw new HttpError('Gasto no encontrado', 404);

        await prisma.gastos_encabezado.update({ where: { GastoID }, data: { IsActive: false } });
        return { message: 'Gasto eliminado', data: { GastoID } };
    }

    async getReporteSemanal() {
        const hoy = localDate();
        const diasDesdeeLunes = hoy.getDay() === 0 ? 6 : hoy.getDay() - 1;

        const inicioActual = new Date(hoy);
        inicioActual.setDate(hoy.getDate() - diasDesdeeLunes);
        inicioActual.setHours(0, 0, 0, 0);

        const finActual = new Date(inicioActual);
        finActual.setDate(inicioActual.getDate() + 6);
        finActual.setHours(23, 59, 59, 999);

        const inicioAnterior = new Date(inicioActual);
        inicioAnterior.setDate(inicioActual.getDate() - 7);

        const finAnterior = new Date(inicioAnterior);
        finAnterior.setDate(inicioAnterior.getDate() + 6);
        finAnterior.setHours(23, 59, 59, 999);

        const [gastosActual, gastosAnterior] = await Promise.all([
            this.getGastosConDetalles(inicioActual, finActual),
            this.getGastosConDetalles(inicioAnterior, finAnterior),
        ]);

        const agruparPorDia = (gastos: typeof gastosActual) => {
            const mapa = new Map<string, number>();
            for (const g of gastos) {
                const fecha = g.Fecha.toISOString().substring(0, 10);
                const total = g.detalles.reduce((s, d) => s + d.Monto, 0);
                mapa.set(fecha, (mapa.get(fecha) ?? 0) + total);
            }
            return Array.from(mapa.entries())
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([fecha, total]) => ({ fecha, total }));
        };

        return {
            message: 'Reporte semanal obtenido',
            data: {
                semanaActual: {
                    total: gastosActual.reduce((s, g) => s + g.detalles.reduce((ds, d) => ds + d.Monto, 0), 0),
                    porDia: agruparPorDia(gastosActual),
                    inicio: inicioActual.toISOString().substring(0, 10),
                    fin: finActual.toISOString().substring(0, 10),
                },
                semanaAnterior: {
                    total: gastosAnterior.reduce((s, g) => s + g.detalles.reduce((ds, d) => ds + d.Monto, 0), 0),
                    porDia: agruparPorDia(gastosAnterior),
                    inicio: inicioAnterior.toISOString().substring(0, 10),
                    fin: finAnterior.toISOString().substring(0, 10),
                },
                porCategoria: this.agruparPorCatalogo(gastosActual, gastosAnterior),
            },
        };
    }

    async getReporteMensual() {
        const hoy = localDate();
        const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

        const inicioActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        const finActual = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59, 999);
        const inicioAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
        const finAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0, 23, 59, 59, 999);

        const [gastosActual, gastosAnterior] = await Promise.all([
            this.getGastosConDetalles(inicioActual, finActual),
            this.getGastosConDetalles(inicioAnterior, finAnterior),
        ]);

        const getNumSemana = (fecha: Date, inicioMes: Date) =>
            Math.floor((fecha.getTime() - inicioMes.getTime()) / (1000 * 60 * 60 * 24 * 7)) + 1;

        const mapaActual = new Map<number, number>();
        const mapaAnterior = new Map<number, number>();

        for (const g of gastosActual) {
            const s = getNumSemana(g.Fecha, inicioActual);
            const t = g.detalles.reduce((ds, d) => ds + d.Monto, 0);
            mapaActual.set(s, (mapaActual.get(s) ?? 0) + t);
        }
        for (const g of gastosAnterior) {
            const s = getNumSemana(g.Fecha, inicioAnterior);
            const t = g.detalles.reduce((ds, d) => ds + d.Monto, 0);
            mapaAnterior.set(s, (mapaAnterior.get(s) ?? 0) + t);
        }

        const maxSemanas = Math.max(...[...mapaActual.keys(), ...mapaAnterior.keys(), 1]);
        const porSemana = Array.from({ length: maxSemanas }, (_, i) => ({
            semana: `Semana ${i + 1}`,
            totalActual: mapaActual.get(i + 1) ?? 0,
            totalAnterior: mapaAnterior.get(i + 1) ?? 0,
        }));

        return {
            message: 'Reporte mensual obtenido',
            data: {
                mesActual: {
                    total: gastosActual.reduce((s, g) => s + g.detalles.reduce((ds, d) => ds + d.Monto, 0), 0),
                    label: `${MESES[hoy.getMonth()]} ${hoy.getFullYear()}`,
                },
                mesAnterior: {
                    total: gastosAnterior.reduce((s, g) => s + g.detalles.reduce((ds, d) => ds + d.Monto, 0), 0),
                    label: `${MESES[inicioAnterior.getMonth()]} ${inicioAnterior.getFullYear()}`,
                },
                porSemana,
                porCategoria: this.agruparPorCatalogo(gastosActual, gastosAnterior),
            },
        };
    }

    private async getGastosConDetalles(desde: Date, hasta: Date) {
        return prisma.gastos_encabezado.findMany({
            where: { IsActive: true, Fecha: { gte: desde, lte: hasta } },
            include: {
                detalles: {
                    where: { IsActive: true },
                    include: {
                        catalogo: {
                            select: {
                                CatalogoGastoID: true,
                                Nombre: true,
                                Nivel: true,
                                parent: { select: { Nombre: true } },
                            },
                        },
                    },
                },
            },
        });
    }

    private agruparPorCatalogo(
        actual: Awaited<ReturnType<typeof this.getGastosConDetalles>>,
        anterior: Awaited<ReturnType<typeof this.getGastosConDetalles>>
    ) {
        const mapa = new Map<string, { cuenta: string; totalActual: number; totalAnterior: number }>();

        const agregar = (gastos: typeof actual, campo: 'totalActual' | 'totalAnterior') => {
            for (const g of gastos) {
                for (const d of g.detalles) {
                    const nombre = d.catalogo?.parent?.Nombre ?? d.catalogo?.Nombre ?? d.Concepto;
                    const entry = mapa.get(nombre) ?? { cuenta: nombre, totalActual: 0, totalAnterior: 0 };
                    entry[campo] += d.Monto;
                    mapa.set(nombre, entry);
                }
            }
        };

        agregar(actual, 'totalActual');
        agregar(anterior, 'totalAnterior');
        return Array.from(mapa.values()).sort((a, b) => a.cuenta.localeCompare(b.cuenta));
    }
}

export const gastosService = new GastosService();
