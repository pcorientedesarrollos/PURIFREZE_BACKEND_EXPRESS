import prisma from '../../config/database';

const MESES_NOMBRES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const formatFecha = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

class EstadosCuentaService {
    async getEstadoCuenta(año: number, mes: number) {
        const inicio = new Date(año, mes - 1, 1, 0, 0, 0, 0);
        const fin = new Date(año, mes, 0, 23, 59, 59, 999);

        const [ingresos, egresos, consumoOperacional] = await Promise.all([
            this.getIngresos(inicio, fin),
            this.getEgresos(inicio, fin),
            this.getConsumoOperacional(inicio, fin),
        ]);

        const totalIngresos = ingresos.total;
        const totalEgresos = egresos.total;
        const costoOperacional = consumoOperacional.totalCostoOperacional;
        const balance = totalIngresos - totalEgresos;
        const margenOperacional = balance - costoOperacional;

        return {
            message: 'Estado de cuenta obtenido',
            data: {
                periodo: {
                    año,
                    mes,
                    label: `${MESES_NOMBRES[mes - 1]} ${año}`,
                    fechaInicio: formatFecha(inicio),
                    fechaFin: formatFecha(fin),
                },
                ingresos,
                egresos,
                consumoOperacional,
                resumen: {
                    totalIngresos,
                    totalEgresos,
                    costoOperacional,
                    balance,
                    margenOperacional,
                },
            },
        };
    }

    async getHistorico(meses: number = 12) {
        const maxMeses = Math.min(meses, 24);
        const hoy = new Date();

        const inicioRango = new Date(hoy.getFullYear(), hoy.getMonth() - maxMeses + 1, 1, 0, 0, 0, 0);
        const finRango = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59, 999);

        const [cobros, gastosRaw, pagosProveedoresRaw, serviciosRaw] = await Promise.all([
            prisma.cobros.findMany({
                where: {
                    IsActive: 1,
                    Estatus: { in: ['PAGADO', 'PARCIAL'] as any },
                    FechaPago: { gte: inicioRango, lte: finRango },
                },
                select: {
                    Estatus: true,
                    MontoFinal: true,
                    MontoPagado: true,
                    FechaPago: true,
                },
            }),
            prisma.gastos_encabezado.findMany({
                where: { IsActive: true, Fecha: { gte: inicioRango, lte: finRango } },
                include: {
                    detalles: { where: { IsActive: true }, select: { Monto: true } },
                },
            }),
            prisma.compras_pagos.findMany({
                where: { IsActive: 1, FechaPago: { gte: inicioRango, lte: finRango } },
                select: { Monto: true, FechaPago: true },
            }),
            prisma.servicios.findMany({
                where: {
                    IsActive: 1,
                    Estatus: 'REALIZADO' as any,
                    FechaEjecucion: { gte: inicioRango, lte: finRango },
                },
                select: { CostoTotal: true, FechaEjecucion: true },
            }),
        ]);

        const getMesKey = (fecha: Date | null) => {
            if (!fecha) return null;
            return `${fecha.getFullYear()}-${fecha.getMonth() + 1}`;
        };

        const mapaIngresos = new Map<string, number>();
        const mapaEgresos = new Map<string, number>();
        const mapaCostoOp = new Map<string, number>();

        for (const cobro of cobros) {
            const key = getMesKey(cobro.FechaPago);
            if (!key) continue;
            const monto = cobro.Estatus === ('PARCIAL' as any)
                ? (cobro.MontoPagado ?? 0)
                : (cobro.MontoFinal ?? 0);
            mapaIngresos.set(key, (mapaIngresos.get(key) ?? 0) + monto);
        }

        for (const gasto of gastosRaw) {
            const key = getMesKey(gasto.Fecha);
            if (!key) continue;
            const total = gasto.detalles.reduce((s, d) => s + d.Monto, 0);
            mapaEgresos.set(key, (mapaEgresos.get(key) ?? 0) + total);
        }

        for (const pago of pagosProveedoresRaw) {
            const key = getMesKey(pago.FechaPago);
            if (!key) continue;
            mapaEgresos.set(key, (mapaEgresos.get(key) ?? 0) + (pago.Monto ?? 0));
        }

        for (const servicio of serviciosRaw) {
            const key = getMesKey(servicio.FechaEjecucion);
            if (!key) continue;
            mapaCostoOp.set(key, (mapaCostoOp.get(key) ?? 0) + (servicio.CostoTotal ?? 0));
        }

        const resultados = [];
        for (let i = 0; i < maxMeses; i++) {
            const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
            const año = fecha.getFullYear();
            const mes = fecha.getMonth() + 1;
            const key = `${año}-${mes}`;

            const totalIngresos = mapaIngresos.get(key) ?? 0;
            const totalEgresos = mapaEgresos.get(key) ?? 0;
            const costoOperacional = mapaCostoOp.get(key) ?? 0;

            resultados.push({
                año,
                mes,
                label: `${MESES_NOMBRES[mes - 1]} ${año}`,
                totalIngresos,
                totalEgresos,
                costoOperacional,
                balance: totalIngresos - totalEgresos,
            });
        }

        return {
            message: 'Histórico de estados de cuenta obtenido',
            data: resultados,
        };
    }

    private async getIngresos(inicio: Date, fin: Date) {
        const cobros = await prisma.cobros.findMany({
            where: {
                IsActive: 1,
                Estatus: { in: ['PAGADO', 'PARCIAL'] as any },
                FechaPago: { gte: inicio, lte: fin },
            },
            select: {
                CobroID: true,
                ContratoID: true,
                VentaID: true,
                ServicioID: true,
                Estatus: true,
                MontoFinal: true,
                MontoPagado: true,
            },
        });

        const porTipo = { renta: 0, ventas: 0, servicios: 0, otros: 0 };
        let total = 0;

        for (const cobro of cobros) {
            const monto = cobro.Estatus === ('PARCIAL' as any)
                ? (cobro.MontoPagado ?? 0)
                : (cobro.MontoFinal ?? 0);
            total += monto;

            if (cobro.ContratoID) {
                porTipo.renta += monto;
            } else if (cobro.VentaID) {
                porTipo.ventas += monto;
            } else if (cobro.ServicioID) {
                porTipo.servicios += monto;
            } else {
                porTipo.otros += monto;
            }
        }

        return { total, porTipo, cantidad: cobros.length };
    }

    private async getEgresos(inicio: Date, fin: Date) {
        const [gastosRaw, pagosProveedoresRaw] = await Promise.all([
            prisma.gastos_encabezado.findMany({
                where: { IsActive: true, Fecha: { gte: inicio, lte: fin } },
                include: {
                    detalles: {
                        where: { IsActive: true },
                        include: {
                            catalogo: { select: { Nombre: true } },
                        },
                    },
                },
            }),
            prisma.compras_pagos.findMany({
                where: { IsActive: 1, FechaPago: { gte: inicio, lte: fin } },
                select: { CompraPagoID: true, Monto: true, FechaPago: true, CompraEncabezadoID: true },
            }),
        ]);

        const mapaCategoria = new Map<string, number>();
        let totalGastos = 0;

        for (const g of gastosRaw) {
            for (const d of g.detalles) {
                const nombre = d.catalogo?.Nombre ?? 'Sin categoría';
                totalGastos += d.Monto;
                mapaCategoria.set(nombre, (mapaCategoria.get(nombre) ?? 0) + d.Monto);
            }
        }

        const porCategoria = Array.from(mapaCategoria.entries())
            .map(([nombre, total]) => ({ nombre, total }))
            .sort((a, b) => b.total - a.total);

        const totalPagosProveedores = pagosProveedoresRaw.reduce((s, p) => s + (p.Monto ?? 0), 0);

        return {
            total: totalGastos + totalPagosProveedores,
            gastos: {
                total: totalGastos,
                cantidad: gastosRaw.length,
                porCategoria,
            },
            pagosProveedores: {
                total: totalPagosProveedores,
                cantidad: pagosProveedoresRaw.length,
            },
        };
    }

    private async getConsumoOperacional(inicio: Date, fin: Date) {
        const servicios = await prisma.servicios.findMany({
            where: {
                IsActive: 1,
                Estatus: 'REALIZADO' as any,
                FechaEjecucion: { gte: inicio, lte: fin },
            },
            select: {
                ServicioID: true,
                TipoServicio: true,
                CostoServicio: true,
                CostoRefacciones: true,
                CostoTotal: true,
            },
        });

        const porTipoServicio: Record<string, { cantidad: number; costoServicio: number; costoRefacciones: number; costoTotal: number }> = {
            INSTALACION:   { cantidad: 0, costoServicio: 0, costoRefacciones: 0, costoTotal: 0 },
            MANTENIMIENTO: { cantidad: 0, costoServicio: 0, costoRefacciones: 0, costoTotal: 0 },
            REPARACION:    { cantidad: 0, costoServicio: 0, costoRefacciones: 0, costoTotal: 0 },
            DESINSTALACION:{ cantidad: 0, costoServicio: 0, costoRefacciones: 0, costoTotal: 0 },
        };

        let totalCostoServicio = 0;
        let totalCostoRefacciones = 0;
        let totalCostoOperacional = 0;

        for (const s of servicios) {
            const tipo = s.TipoServicio as string;
            if (!porTipoServicio[tipo]) {
                porTipoServicio[tipo] = { cantidad: 0, costoServicio: 0, costoRefacciones: 0, costoTotal: 0 };
            }

            porTipoServicio[tipo].cantidad += 1;
            porTipoServicio[tipo].costoServicio += s.CostoServicio ?? 0;
            porTipoServicio[tipo].costoRefacciones += s.CostoRefacciones ?? 0;
            porTipoServicio[tipo].costoTotal += s.CostoTotal ?? 0;

            totalCostoServicio += s.CostoServicio ?? 0;
            totalCostoRefacciones += s.CostoRefacciones ?? 0;
            totalCostoOperacional += s.CostoTotal ?? 0;
        }

        return {
            totalCostoServicio,
            totalCostoRefacciones,
            totalCostoOperacional,
            cantidadServicios: servicios.length,
            porTipoServicio,
        };
    }
}

export const estadosCuentaService = new EstadosCuentaService();
