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
    private calcularOcurrencias(item: CatalogoItem, año: number, mes: number): Ocurrencia[] {
        const p = item.Periodicidad;
        if (p === 'semanal') return [
            { numero: 1, label: 'Semana 1' },
            { numero: 2, label: 'Semana 2' },
            { numero: 3, label: 'Semana 3' },
            { numero: 4, label: 'Semana 4' },
        ];
        if (p === 'quincenal') return [
            { numero: 1, label: '1ra quincena' },
            { numero: 2, label: '2da quincena' },
        ];
        if (p === 'mensual') return [{ numero: 1, label: null }];
        if (p === 'eventual') return [{ numero: 1, label: null }];

        const interval = p ? PERIODICIDADES_LARGAS[p] : null;
        if (!interval || !item.FechaInicio) return [];

        const startYear = item.FechaInicio.getUTCFullYear();
        const startMonth = item.FechaInicio.getUTCMonth() + 1;
        const diff = (año - startYear) * 12 + (mes - startMonth);
        if (diff < 0 || diff % interval !== 0) return [];

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
