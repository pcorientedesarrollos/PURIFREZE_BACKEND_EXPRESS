import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { GuardarProyeccionDto } from './gastos-proyeccion.schema';

type ParentRef = { CatalogoGastoID: number; Nombre: string; Codigo: string | null };

type CatalogoItem = {
    CatalogoGastoID: number;
    Nivel: number;
    Codigo: string | null;
    Nombre: string;
    Periodicidad: string | null;
    FechaInicio: Date | null;
    FechaFin: Date | null;
    IsActive: boolean;
    parent: (ParentRef & { parent: ParentRef | null }) | null;
};

type Ocurrencia = { numero: number; label: string | null };

const PERIODICIDADES_LARGAS: Record<string, number> = {
    bimestral: 2,
    trimestral: 3,
    semestral: 6,
    anual: 12,
};

class GastosProyeccionService {
    // Convierte Date de BD a Date UTC sin desfase de zona horaria
    private toUTC(d: Date): Date {
        return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    }

    // Filtra semanas del mes que intersectan con [FechaInicio, FechaFin]
    private calcularSemanasEnRango(año: number, mes: number, inicio: Date | null, fin: Date | null): Ocurrencia[] {
        const diasDelMes = new Date(año, mes, 0).getDate();
        const SEMANAS = [
            { numero: 1, label: 'Semana 1', diaIni: 1,  diaFin: 7 },
            { numero: 2, label: 'Semana 2', diaIni: 8,  diaFin: 14 },
            { numero: 3, label: 'Semana 3', diaIni: 15, diaFin: 21 },
            { numero: 4, label: 'Semana 4', diaIni: 22, diaFin: diasDelMes },
        ];

        const rangoIni = inicio ? this.toUTC(inicio) : null;
        const rangoFin = fin    ? this.toUTC(fin)    : null;

        return SEMANAS.filter(s => {
            const semIni = new Date(Date.UTC(año, mes - 1, s.diaIni));
            const semFin = new Date(Date.UTC(año, mes - 1, s.diaFin));
            if (rangoIni && semFin < rangoIni) return false;
            if (rangoFin && semIni > rangoFin) return false;
            return true;
        }).map(s => ({ numero: s.numero, label: s.label }));
    }

    // Filtra quincenas del mes que intersectan con [FechaInicio, FechaFin]
    private calcularQuincenasEnRango(año: number, mes: number, inicio: Date | null, fin: Date | null): Ocurrencia[] {
        const diasDelMes = new Date(año, mes, 0).getDate();
        const QUINCENAS = [
            { numero: 1, label: '1ra quincena', diaIni: 1,  diaFin: 15 },
            { numero: 2, label: '2da quincena', diaIni: 16, diaFin: diasDelMes },
        ];

        const rangoIni = inicio ? this.toUTC(inicio) : null;
        const rangoFin = fin    ? this.toUTC(fin)    : null;

        return QUINCENAS.filter(q => {
            const qIni = new Date(Date.UTC(año, mes - 1, q.diaIni));
            const qFin = new Date(Date.UTC(año, mes - 1, q.diaFin));
            if (rangoIni && qFin < rangoIni) return false;
            if (rangoFin && qIni > rangoFin) return false;
            return true;
        }).map(q => ({ numero: q.numero, label: q.label }));
    }

    private calcularOcurrencias(item: CatalogoItem, año: number, mes: number): Ocurrencia[] {
        const p = item.Periodicidad;

        if (p === 'semanal') {
            return this.calcularSemanasEnRango(año, mes, item.FechaInicio, item.FechaFin);
        }

        if (p === 'quincenal') {
            return this.calcularQuincenasEnRango(año, mes, item.FechaInicio, item.FechaFin);
        }

        if (p === 'mensual') return [{ numero: 1, label: null }];
        if (p === 'eventual') return [{ numero: 1, label: null }];

        const interval = p ? PERIODICIDADES_LARGAS[p] : null;
        if (!interval || !item.FechaInicio) return [];

        const startYear = item.FechaInicio.getUTCFullYear();
        const startMonth = item.FechaInicio.getUTCMonth() + 1;
        const diff = (año - startYear) * 12 + (mes - startMonth);
        if (diff < 0 || diff % interval !== 0) return [];

        // Si hay fecha fin, no mostrar el gasto después de ese mes
        if (item.FechaFin) {
            const finYear = item.FechaFin.getUTCFullYear();
            const finMonth = item.FechaFin.getUTCMonth() + 1;
            if (año > finYear || (año === finYear && mes > finMonth)) return [];
        }

        return [{ numero: 1, label: null }];
    }

    private getGrupo(item: CatalogoItem): { nombre: string; codigo: string | null } {
        if (item.parent?.parent) return { nombre: item.parent.parent.Nombre, codigo: item.parent.parent.Codigo };
        if (item.parent) return { nombre: item.parent.Nombre, codigo: item.parent.Codigo };
        return { nombre: item.Nombre, codigo: item.Codigo };
    }

    async getProyeccion(año: number, mes: number) {
        let proyeccion = await prisma.gastos_proyeccion.findFirst({ where: { Año: año, Mes: mes } });
        if (!proyeccion) {
            proyeccion = await prisma.gastos_proyeccion.create({ data: { Año: año, Mes: mes } });
        }

        const catalogo = await prisma.catalogo_gastos.findMany({
            where: { IsActive: true, Periodicidad: { not: null } },
            include: {
                parent: {
                    select: {
                        CatalogoGastoID: true, Nombre: true, Codigo: true,
                        parent: { select: { CatalogoGastoID: true, Nombre: true, Codigo: true } },
                    },
                },
            },
            orderBy: [{ Nivel: 'asc' }, { Codigo: 'asc' }],
        }) as unknown as CatalogoItem[];

        const savedItems = await prisma.gastos_proyeccion_item.findMany({
            where: { ProyeccionID: proyeccion.ProyeccionID },
        });
        const savedMap = new Map<string, typeof savedItems[0]>();
        savedItems.forEach(i => savedMap.set(`${i.CatalogoGastoID}-${i.Ocurrencia}`, i));

        const items: object[] = [];
        for (const cat of catalogo) {
            const ocurrencias = this.calcularOcurrencias(cat, año, mes);
            const grupo = this.getGrupo(cat);
            for (const ocu of ocurrencias) {
                const saved = savedMap.get(`${cat.CatalogoGastoID}-${ocu.numero}`);
                const isEventual = cat.Periodicidad === 'eventual';
                items.push({
                    catalogoGastoID: cat.CatalogoGastoID,
                    nombre: cat.Nombre,
                    codigo: cat.Codigo,
                    periodicidad: cat.Periodicidad,
                    grupo: grupo.nombre,
                    grupoCodigo: grupo.codigo,
                    ocurrencia: ocu.numero,
                    ocurrenciaLabel: ocu.label,
                    monto: saved?.Monto != null ? Number(saved.Monto) : null,
                    aplica: saved ? saved.Aplica : !isEventual,
                    itemId: saved?.ItemID ?? null,
                });
            }
        }

        const total = (items as any[])
            .filter(i => i.aplica && i.monto != null)
            .reduce((sum, i) => sum + i.monto, 0);

        return {
            message: 'Proyección obtenida',
            data: { proyeccionId: proyeccion.ProyeccionID, año, mes, items, total },
        };
    }

    async guardarItems(año: number, mes: number, dto: GuardarProyeccionDto) {
        const proyeccion = await prisma.gastos_proyeccion.findFirst({ where: { Año: año, Mes: mes } });
        if (!proyeccion) throw new HttpError('Proyección no encontrada. Consulta primero GET.', 404);

        await prisma.$transaction(
            dto.items.map(item =>
                prisma.gastos_proyeccion_item.upsert({
                    where: {
                        uk_item: {
                            ProyeccionID: proyeccion.ProyeccionID,
                            CatalogoGastoID: item.catalogoGastoID,
                            Ocurrencia: item.ocurrencia,
                        },
                    },
                    update: { Monto: item.monto ?? null, Aplica: item.aplica },
                    create: {
                        ProyeccionID: proyeccion.ProyeccionID,
                        CatalogoGastoID: item.catalogoGastoID,
                        Ocurrencia: item.ocurrencia,
                        Monto: item.monto ?? null,
                        Aplica: item.aplica,
                    },
                })
            )
        );

        return { message: 'Proyección guardada', data: { total: dto.items.length } };
    }
}

export const gastosProyeccionService = new GastosProyeccionService();
