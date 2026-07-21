/**
 * ============================================================================
 * SERVICE: Refacción Periodo de Cambio
 * ============================================================================
 * Lógica de negocio para gestionar los periodos de cambio de refacciones.
 * ============================================================================
 */

import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import {
    CreateRefaccionPeriodoCambioDto,
    UpdateRefaccionPeriodoCambioDto,
    UpsertPeriodosDto,
    SearchPeriodosQuery
} from './refaccion-periodo-cambio.schema';
import { localDate } from '../../utils/date-utils';

class RefaccionPeriodoCambioService {
    // ============================================================================
    // CRUD BÁSICO
    // ============================================================================

    /**
     * Obtener todos los periodos de cambio con filtros
     */
    async findAll(query?: SearchPeriodosQuery) {
        const where: any = {};

        if (query?.refaccionId) {
            where.RefaccionID = query.refaccionId;
        }

        if (query?.periodoContrato) {
            where.PeriodoContrato = query.periodoContrato;
        }

        if (query?.isActive !== undefined) {
            where.IsActive = query.isActive;
        }

        if (query?.search) {
            where.refaccion = {
                OR: [
                    { NombrePieza: { contains: query.search } },
                    { Codigo: { contains: query.search } },
                    { NombreCorto: { contains: query.search } }
                ]
            };
        }

        const periodos = await prisma.refaccion_periodo_cambio.findMany({
            where,
            include: {
                refaccion: {
                    select: {
                        RefaccionID: true,
                        NombrePieza: true,
                        NombreCorto: true,
                        Codigo: true
                    }
                }
            },
            orderBy: [
                { RefaccionID: 'asc' },
                { PeriodoContrato: 'asc' }
            ],
            skip: query?.page ? (query.page - 1) * (query.pageSize || 50) : undefined,
            take: query?.pageSize || 50
        });

        return periodos;
    }

    /**
     * Obtener un periodo por ID
     */
    async findOne(id: number) {
        const periodo = await prisma.refaccion_periodo_cambio.findUnique({
            where: { RefaccionPeriodoCambioID: id },
            include: {
                refaccion: {
                    select: {
                        RefaccionID: true,
                        NombrePieza: true,
                        NombreCorto: true,
                        Codigo: true
                    }
                }
            }
        });

        if (!periodo) {
            throw new HttpError('Periodo de cambio no encontrado', 404);
        }

        return periodo;
    }

    /**
     * Crear un nuevo periodo de cambio
     */
    async create(data: CreateRefaccionPeriodoCambioDto) {
        // Verificar que la refacción exista
        const refaccion = await prisma.catalogo_refacciones.findUnique({
            where: { RefaccionID: data.RefaccionID }
        });

        if (!refaccion) {
            throw new HttpError('Refacción no encontrada', 404);
        }

        // Verificar que no exista ya para ese periodo de contrato
        const existing = await prisma.refaccion_periodo_cambio.findUnique({
            where: {
                RefaccionID_PeriodoContrato: {
                    RefaccionID: data.RefaccionID,
                    PeriodoContrato: data.PeriodoContrato
                }
            }
        });

        if (existing) {
            throw new HttpError(
                `Ya existe configuración para periodo de contrato ${data.PeriodoContrato} meses`,
                400
            );
        }

        const periodo = await prisma.refaccion_periodo_cambio.create({
            data: {
                RefaccionID: data.RefaccionID,
                PeriodoContrato: data.PeriodoContrato,
                PeriodoCambioMeses: data.PeriodoCambioMeses,
                Observaciones: data.Observaciones,
                IsActive: 1
            },
            include: {
                refaccion: {
                    select: {
                        RefaccionID: true,
                        NombrePieza: true,
                        Codigo: true
                    }
                }
            }
        });

        return periodo;
    }

    /**
     * Actualizar un periodo de cambio
     */
    async update(id: number, data: UpdateRefaccionPeriodoCambioDto) {
        const existing = await prisma.refaccion_periodo_cambio.findUnique({
            where: { RefaccionPeriodoCambioID: id }
        });

        if (!existing) {
            throw new HttpError('Periodo de cambio no encontrado', 404);
        }

        // Validar que el nuevo periodo de cambio sea múltiplo del periodo de contrato
        if (data.PeriodoCambioMeses) {
            if (data.PeriodoCambioMeses % existing.PeriodoContrato !== 0) {
                throw new HttpError(
                    `PeriodoCambioMeses debe ser múltiplo de ${existing.PeriodoContrato}`,
                    400
                );
            }
        }

        const periodo = await prisma.refaccion_periodo_cambio.update({
            where: { RefaccionPeriodoCambioID: id },
            data,
            include: {
                refaccion: {
                    select: {
                        RefaccionID: true,
                        NombrePieza: true,
                        Codigo: true
                    }
                }
            }
        });

        return periodo;
    }

    /**
     * Eliminar un periodo de cambio (soft delete)
     */
    async delete(id: number) {
        const existing = await prisma.refaccion_periodo_cambio.findUnique({
            where: { RefaccionPeriodoCambioID: id }
        });

        if (!existing) {
            throw new HttpError('Periodo de cambio no encontrado', 404);
        }

        const periodo = await prisma.refaccion_periodo_cambio.update({
            where: { RefaccionPeriodoCambioID: id },
            data: { IsActive: 0 }
        });

        return periodo;
    }

    // ============================================================================
    // OPERACIONES POR REFACCIÓN
    // ============================================================================

    /**
     * Obtener todos los periodos de una refacción
     */
    async findByRefaccion(refaccionId: number) {
        const refaccion = await prisma.catalogo_refacciones.findUnique({
            where: { RefaccionID: refaccionId }
        });

        if (!refaccion) {
            throw new HttpError('Refacción no encontrada', 404);
        }

        const periodos = await prisma.refaccion_periodo_cambio.findMany({
            where: {
                RefaccionID: refaccionId,
                IsActive: 1
            },
            orderBy: { PeriodoContrato: 'asc' }
        });

        return {
            refaccion: {
                RefaccionID: refaccion.RefaccionID,
                NombrePieza: refaccion.NombrePieza,
                Codigo: refaccion.Codigo
            },
            periodos
        };
    }

    /**
     * Crear o actualizar múltiples periodos para una refacción
     */
    async upsertPeriodos(data: UpsertPeriodosDto) {
        // Verificar que la refacción exista
        const refaccion = await prisma.catalogo_refacciones.findUnique({
            where: { RefaccionID: data.RefaccionID }
        });

        if (!refaccion) {
            throw new HttpError('Refacción no encontrada', 404);
        }

        // Validar que todos los periodos de cambio sean múltiplos del periodo de contrato
        for (const periodo of data.Periodos) {
            if (periodo.PeriodoCambioMeses % periodo.PeriodoContrato !== 0) {
                throw new HttpError(
                    `PeriodoCambioMeses (${periodo.PeriodoCambioMeses}) debe ser múltiplo de PeriodoContrato (${periodo.PeriodoContrato})`,
                    400
                );
            }
        }

        // Usar transacción para upsert
        const result = await prisma.$transaction(async (tx) => {
            const upserted = [];

            for (const periodo of data.Periodos) {
                const record = await tx.refaccion_periodo_cambio.upsert({
                    where: {
                        RefaccionID_PeriodoContrato: {
                            RefaccionID: data.RefaccionID,
                            PeriodoContrato: periodo.PeriodoContrato
                        }
                    },
                    create: {
                        RefaccionID: data.RefaccionID,
                        PeriodoContrato: periodo.PeriodoContrato,
                        PeriodoCambioMeses: periodo.PeriodoCambioMeses,
                        Observaciones: periodo.Observaciones,
                        IsActive: 1
                    },
                    update: {
                        PeriodoCambioMeses: periodo.PeriodoCambioMeses,
                        Observaciones: periodo.Observaciones,
                        IsActive: 1
                    }
                });
                upserted.push(record);
            }

            return upserted;
        });

        return {
            refaccion: {
                RefaccionID: refaccion.RefaccionID,
                NombrePieza: refaccion.NombrePieza,
                Codigo: refaccion.Codigo
            },
            periodosActualizados: result.length,
            periodos: result
        };
    }

    // ============================================================================
    // CONSULTAS ESPECIALES
    // ============================================================================

    /**
     * Obtener refacciones agrupadas con todos sus periodos
     */
    async getRefaccionesConPeriodos() {
        const refacciones = await prisma.catalogo_refacciones.findMany({
            where: { IsActive: true },
            select: {
                RefaccionID: true,
                NombrePieza: true,
                NombreCorto: true,
                Codigo: true,
                periodos_cambio: {
                    where: { IsActive: 1 },
                    orderBy: { PeriodoContrato: 'asc' }
                }
            },
            orderBy: { NombrePieza: 'asc' }
        });

        return refacciones;
    }

    /**
     * Obtener refacciones sin configuración completa de periodos
     */
    async getRefaccionesSinConfigurar() {
        const periodosEstandar = [3, 4, 6, 12];

        const refacciones = await prisma.catalogo_refacciones.findMany({
            where: { IsActive: true },
            select: {
                RefaccionID: true,
                NombrePieza: true,
                NombreCorto: true,
                Codigo: true,
                periodos_cambio: {
                    where: { IsActive: 1 }
                }
            },
            orderBy: { NombrePieza: 'asc' }
        });

        // Filtrar las que no tienen todos los periodos configurados
        const sinConfigurar = refacciones.filter(r => {
            const periodosConfigured = r.periodos_cambio.map(p => p.PeriodoContrato);
            return periodosEstandar.some(p => !periodosConfigured.includes(p));
        });

        return sinConfigurar;
    }

    /**
     * Obtener las refacciones que deben cambiarse en un mantenimiento
     * basándose en el periodo del contrato y el número de mantenimiento
     */
    async getRefaccionesACambiar(contratoId: number, numeroMantenimiento: number) {
        // Obtener el contrato con su frecuencia de mantenimiento
        const contrato = await prisma.contratos.findUnique({
            where: { ContratoID: contratoId },
            select: {
                ContratoID: true,
                FrecuenciaMantenimiento: true,
                equipos: {
                    where: { IsActive: 1 },
                    include: {
                        equipo: {
                            include: {
                                detalles: {
                                    include: {
                                        refaccion: {
                                            include: {
                                                periodos_cambio: {
                                                    where: { IsActive: 1 }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!contrato) {
            throw new HttpError('Contrato no encontrado', 404);
        }

        if (!contrato.FrecuenciaMantenimiento) {
            throw new HttpError('El contrato no tiene frecuencia de mantenimiento configurada', 400);
        }

        const periodoContrato = contrato.FrecuenciaMantenimiento;
        const refaccionesACambiar: any[] = [];

        // Para cada equipo del contrato
        for (const contratoEquipo of contrato.equipos) {
            if (!contratoEquipo.equipo) continue;

            const equipo = contratoEquipo.equipo;

            // Para cada refacción del equipo
            for (const detalle of equipo.detalles) {
                const refaccion = detalle.refaccion;

                // Buscar la configuración de periodo para este periodo de contrato
                const config = refaccion.periodos_cambio.find(
                    p => p.PeriodoContrato === periodoContrato
                );

                if (config) {
                    // Calcular si toca cambiar
                    const cadaCuantosMantenimientos = config.PeriodoCambioMeses / periodoContrato;

                    if (numeroMantenimiento % cadaCuantosMantenimientos === 0) {
                        refaccionesACambiar.push({
                            EquipoID: equipo.EquipoID,
                            NumeroSerie: equipo.NumeroSerie,
                            RefaccionID: refaccion.RefaccionID,
                            NombrePieza: refaccion.NombrePieza,
                            Codigo: refaccion.Codigo,
                            Cantidad: detalle.Cantidad,
                            PeriodoCambioMeses: config.PeriodoCambioMeses,
                            MantenimientosParaCambio: cadaCuantosMantenimientos
                        });
                    }
                }
            }
        }

        return {
            ContratoID: contratoId,
            PeriodoContrato: periodoContrato,
            NumeroMantenimiento: numeroMantenimiento,
            RefaccionesACambiar: refaccionesACambiar
        };
    }

    /**
     * Obtener el próximo número de mantenimiento para un contrato
     * basándose en los servicios de mantenimiento finalizados
     */
    async getProximoNumeroMantenimiento(contratoId: number): Promise<number> {
        const count = await prisma.servicios.count({
            where: {
                ContratoID: contratoId,
                TipoServicio: 'MANTENIMIENTO',
                Estatus: 'REALIZADO',
                IsActive: 1
            }
        });

        return count + 1;
    }

    /**
     * Obtener refacciones a cambiar para el PRÓXIMO mantenimiento de un contrato
     * Calcula automáticamente el número de mantenimiento
     */
    async getRefaccionesParaProximoMantenimiento(contratoId: number) {
        const proximoNumero = await this.getProximoNumeroMantenimiento(contratoId);
        const resultado = await this.getRefaccionesACambiar(contratoId, proximoNumero);

        // Agregar información adicional de vigencias
        const contrato = await prisma.contratos.findUnique({
            where: { ContratoID: contratoId },
            select: {
                FechaInicio: true,
                FrecuenciaMantenimiento: true
            }
        });

        if (contrato && contrato.FrecuenciaMantenimiento && contrato.FechaInicio) {
            const fechaInicio = new Date(contrato.FechaInicio);
            const frecuencia = contrato.FrecuenciaMantenimiento;

            // Calcular fecha del próximo mantenimiento
            const fechaProximoMant = new Date(fechaInicio);
            fechaProximoMant.setMonth(fechaProximoMant.getMonth() + (proximoNumero * frecuencia));

            return {
                ...resultado,
                FechaProximoMantenimiento: fechaProximoMant.toISOString().split('T')[0],
                DiasParaProximo: this.calcularDiasRestantes(fechaProximoMant)
            };
        }

        return resultado;
    }

    /**
     * Obtener vigencia de todas las refacciones de un contrato
     * con fechas y días restantes para cada cambio
     */
    async getVigenciaRefaccionesContrato(contratoId: number) {
        const contrato = await prisma.contratos.findUnique({
            where: { ContratoID: contratoId },
            select: {
                ContratoID: true,
                FechaInicio: true,
                FrecuenciaMantenimiento: true,
                clientes_equipos: {
                    where: { IsActive: 1, Estatus: 'INSTALADO' },
                    include: {
                        equipo: {
                            include: {
                                plantilla: {
                                    select: {
                                        NombreEquipo: true,
                                        Codigo: true
                                    }
                                },
                                detalles: {
                                    include: {
                                        refaccion: {
                                            include: {
                                                periodos_cambio: {
                                                    where: { IsActive: 1 }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!contrato) {
            throw new HttpError('Contrato no encontrado', 404);
        }

        if (!contrato.FrecuenciaMantenimiento) {
            throw new HttpError('El contrato no tiene frecuencia de mantenimiento configurada', 400);
        }

        const proximoNumero = await this.getProximoNumeroMantenimiento(contratoId);
        const periodoContrato = contrato.FrecuenciaMantenimiento;
        const fechaInicio = new Date(contrato.FechaInicio);
        const hoy = localDate();

        const equiposConVigencia: any[] = [];

        for (const clienteEquipo of contrato.clientes_equipos) {
            if (!clienteEquipo.equipo) continue;

            const equipo = clienteEquipo.equipo;
            const refaccionesVigencia: any[] = [];

            for (const detalle of equipo.detalles) {
                const refaccion = detalle.refaccion;
                const config = refaccion.periodos_cambio.find(
                    p => p.PeriodoContrato === periodoContrato
                );

                if (config) {
                    const cadaCuantosMantenimientos = config.PeriodoCambioMeses / periodoContrato;

                    // Calcular en qué mantenimiento toca el próximo cambio
                    let proximoCambioEnMant = cadaCuantosMantenimientos;
                    while (proximoCambioEnMant < proximoNumero) {
                        proximoCambioEnMant += cadaCuantosMantenimientos;
                    }

                    // Calcular fecha del próximo cambio
                    const fechaProximoCambio = new Date(fechaInicio);
                    fechaProximoCambio.setMonth(fechaProximoCambio.getMonth() + (proximoCambioEnMant * periodoContrato));

                    const diasRestantes = this.calcularDiasRestantes(fechaProximoCambio);
                    const mantenimientosRestantes = proximoCambioEnMant - proximoNumero + 1;

                    refaccionesVigencia.push({
                        RefaccionID: refaccion.RefaccionID,
                        NombrePieza: refaccion.NombrePieza,
                        NombreCorto: refaccion.NombreCorto,
                        Codigo: refaccion.Codigo,
                        Cantidad: detalle.Cantidad,
                        PeriodoCambioMeses: config.PeriodoCambioMeses,
                        CadaCuantosMantenimientos: cadaCuantosMantenimientos,
                        ProximoCambioEnMantenimiento: proximoCambioEnMant,
                        MantenimientosRestantes: mantenimientosRestantes,
                        FechaProximoCambio: fechaProximoCambio.toISOString().split('T')[0],
                        DiasRestantes: diasRestantes,
                        DiasRestantesTexto: this.formatearDiasRestantes(diasRestantes),
                        TocaCambiarAhora: proximoCambioEnMant === proximoNumero
                    });
                }
            }

            // Ordenar por días restantes (los más urgentes primero)
            refaccionesVigencia.sort((a, b) => a.DiasRestantes - b.DiasRestantes);

            equiposConVigencia.push({
                ClienteEquipoID: clienteEquipo.ClienteEquipoID,
                EquipoID: equipo.EquipoID,
                NumeroSerie: equipo.NumeroSerie,
                NombreEquipo: equipo.plantilla?.NombreEquipo || 'Sin nombre',
                Codigo: equipo.plantilla?.Codigo,
                Refacciones: refaccionesVigencia
            });
        }

        return {
            ContratoID: contratoId,
            FechaInicio: contrato.FechaInicio,
            FrecuenciaMantenimiento: periodoContrato,
            ProximoNumeroMantenimiento: proximoNumero,
            Equipos: equiposConVigencia
        };
    }

    /**
     * Calcular días restantes desde hoy hasta una fecha
     */
    private calcularDiasRestantes(fecha: Date): number {
        const hoy = localDate();
        hoy.setHours(0, 0, 0, 0);
        const fechaTarget = new Date(fecha);
        fechaTarget.setHours(0, 0, 0, 0);

        const diffTime = fechaTarget.getTime() - hoy.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays;
    }

    /**
     * Formatear días restantes a texto legible
     * Ej: "30 días", "1 mes y 15 días", "Vencido hace 5 días"
     */
    private formatearDiasRestantes(dias: number): string {
        if (dias < 0) {
            const diasVencidos = Math.abs(dias);
            if (diasVencidos === 1) return 'Vencido hace 1 día';
            if (diasVencidos < 30) return `Vencido hace ${diasVencidos} días`;
            const meses = Math.floor(diasVencidos / 30);
            const diasRestantes = diasVencidos % 30;
            if (diasRestantes === 0) return `Vencido hace ${meses} ${meses === 1 ? 'mes' : 'meses'}`;
            return `Vencido hace ${meses} ${meses === 1 ? 'mes' : 'meses'} y ${diasRestantes} días`;
        }

        if (dias === 0) return 'Hoy';
        if (dias === 1) return '1 día';
        if (dias < 30) return `${dias} días`;

        const meses = Math.floor(dias / 30);
        const diasRestantes = dias % 30;

        if (diasRestantes === 0) {
            return `${meses} ${meses === 1 ? 'mes' : 'meses'}`;
        }

        return `${meses} ${meses === 1 ? 'mes' : 'meses'} y ${diasRestantes} días`;
    }
}

export const refaccionPeriodoCambioService = new RefaccionPeriodoCambioService();
