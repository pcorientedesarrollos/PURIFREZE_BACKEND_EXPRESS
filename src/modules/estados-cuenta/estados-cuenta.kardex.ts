import prisma from '../../config/database';

const MESES_NOMBRES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const formatFecha = (d: Date): string => {
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const dd   = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

const labelTipoServicio: Record<string, string> = {
    INSTALACION:    'Instalación',
    MANTENIMIENTO:  'Mantenimiento',
    REPARACION:     'Reparación',
    DESINSTALACION: 'Desinstalación',
};

export interface MovimientoKardex {
    fecha:        string;
    tipo:         'INGRESO' | 'EGRESO' | 'COSTO_OP';
    subcategoria: string;
    concepto:     string;
    monto:        number;
}

export async function getKardex(año: number, mes: number) {
    const inicio   = new Date(año, mes - 1, 1, 0, 0, 0, 0);
    const fin      = new Date(año, mes, 0, 23, 59, 59, 999);
    const diaInicio = formatFecha(inicio);

    const [cobrosRaw, gastosRaw, pagosProvRaw, proyeccionRaw, serviciosRaw] = await Promise.all([
        prisma.cobros.findMany({
            where: {
                IsActive: 1,
                Estatus: { in: ['PAGADO', 'PARCIAL'] as any },
                FechaPago: { gte: inicio, lte: fin },
            },
            select: {
                FechaPago: true, Estatus: true, MontoFinal: true, MontoPagado: true,
                ContratoID: true, VentaID: true, ServicioID: true,
                contrato: { select: { cliente: { select: { NombreComercio: true } } } },
                venta:    { select: { cliente: { select: { NombreComercio: true } } } },
                cliente_equipo: { select: { cliente: { select: { NombreComercio: true } } } },
            },
        }),

        prisma.gastos_encabezado.findMany({
            where: { IsActive: true, Fecha: { gte: inicio, lte: fin } },
            include: {
                detalles: {
                    where: { IsActive: true },
                    include: { catalogo: { select: { Nombre: true } } },
                },
            },
        }),

        prisma.compras_pagos.findMany({
            where: { IsActive: 1, FechaPago: { gte: inicio, lte: fin } },
            select: {
                Monto: true, FechaPago: true,
                compra: { select: { catalogo_proveedores: { select: { NombreProveedor: true } } } },
            },
        }),

        prisma.gastos_proyeccion.findFirst({
            where: { Año: año, Mes: mes },
            include: {
                items: {
                    where: { Aplica: true },
                    include: {
                        catalogo: {
                            select: {
                                Nombre: true, Codigo: true, Nivel: true, Monto: true,
                                parent: {
                                    select: {
                                        Nombre: true, Codigo: true, Nivel: true,
                                        parent: { select: { Nombre: true, Codigo: true } },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        }),

        prisma.servicios.findMany({
            where: {
                IsActive: 1,
                Estatus: 'REALIZADO' as any,
                FechaEjecucion: { gte: inicio, lte: fin },
            },
            select: { FechaEjecucion: true, TipoServicio: true, CostoTotal: true },
        }),
    ]);

    const movimientos: MovimientoKardex[] = [];

    // ── Ingresos: cobros ──────────────────────────────────────────────────
    for (const c of cobrosRaw) {
        if (!c.FechaPago) continue;
        const monto = c.Estatus === ('PARCIAL' as any) ? (c.MontoPagado ?? 0) : (c.MontoFinal ?? 0);

        let subcategoria = 'Otro';
        let nombreCliente = '';

        if (c.ContratoID) {
            subcategoria   = 'Renta';
            nombreCliente  = c.contrato?.cliente?.NombreComercio ?? '';
        } else if (c.VentaID) {
            subcategoria   = 'Venta';
            nombreCliente  = c.venta?.cliente?.NombreComercio ?? '';
        } else if (c.ServicioID) {
            subcategoria   = 'Servicio';
        }
        if (!nombreCliente) {
            nombreCliente = c.cliente_equipo?.cliente?.NombreComercio ?? '';
        }

        movimientos.push({
            fecha:        formatFecha(c.FechaPago),
            tipo:         'INGRESO',
            subcategoria,
            concepto:     nombreCliente ? `Cobro - ${nombreCliente}` : 'Cobro',
            monto,
        });
    }

    // ── Egresos: gastos_encabezado ────────────────────────────────────────
    for (const g of gastosRaw) {
        for (const d of g.detalles) {
            movimientos.push({
                fecha:        formatFecha(g.Fecha),
                tipo:         'EGRESO',
                subcategoria: 'Gasto',
                concepto:     d.catalogo?.Nombre ?? 'Gasto',
                monto:        d.Monto,
            });
        }
    }

    // ── Egresos: pagos a proveedores ──────────────────────────────────────
    for (const p of pagosProvRaw) {
        const nombreProv = p.compra?.catalogo_proveedores?.NombreProveedor ?? '';
        movimientos.push({
            fecha:        formatFecha(p.FechaPago),
            tipo:         'EGRESO',
            subcategoria: 'Proveedor',
            concepto:     nombreProv ? `Pago - ${nombreProv}` : 'Pago Proveedor',
            monto:        p.Monto ?? 0,
        });
    }

    // ── Egresos: gastos_proyeccion ────────────────────────────────────────
    if (proyeccionRaw) {
        for (const item of proyeccionRaw.items) {
            const monto = Number(item.Monto ?? item.catalogo.Monto ?? 0);
            const cat   = item.catalogo;

            let grupo = '';
            if (cat.Nivel === 1) {
                grupo = cat.Nombre;
            } else if (cat.Nivel === 2 && cat.parent) {
                grupo = cat.parent.Nombre;
            } else if (cat.Nivel === 3 && cat.parent?.parent) {
                grupo = cat.parent.parent.Nombre;
            } else if (cat.parent) {
                grupo = cat.parent.Nombre;
            }

            movimientos.push({
                fecha:        diaInicio,
                tipo:         'EGRESO',
                subcategoria: 'Proyección',
                concepto:     grupo ? `${grupo} — ${cat.Nombre}` : cat.Nombre,
                monto,
            });
        }
    }

    // ── Costo operacional: servicios ──────────────────────────────────────
    for (const s of serviciosRaw) {
        if (!s.FechaEjecucion) continue;
        const tipo = s.TipoServicio as string;
        movimientos.push({
            fecha:        formatFecha(s.FechaEjecucion),
            tipo:         'COSTO_OP',
            subcategoria: labelTipoServicio[tipo] ?? tipo,
            concepto:     'Servicio Técnico',
            monto:        s.CostoTotal ?? 0,
        });
    }

    // Ordenar por fecha ASC
    movimientos.sort((a, b) => a.fecha.localeCompare(b.fecha));

    const totales = {
        ingresos: movimientos.filter(m => m.tipo === 'INGRESO').reduce((s, m) => s + m.monto, 0),
        egresos:  movimientos.filter(m => m.tipo === 'EGRESO').reduce((s, m) => s + m.monto, 0),
        costoOp:  movimientos.filter(m => m.tipo === 'COSTO_OP').reduce((s, m) => s + m.monto, 0),
    };

    return {
        message: 'Kardex obtenido',
        data: {
            periodo: {
                año,
                mes,
                label:       `${MESES_NOMBRES[mes - 1]} ${año}`,
                fechaInicio: diaInicio,
                fechaFin:    formatFecha(fin),
            },
            movimientos,
            totales,
        },
    };
}
