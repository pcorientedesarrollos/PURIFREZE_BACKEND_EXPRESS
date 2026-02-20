/**
 * ============================================================================
 * CONTROLLER: Refacción Periodo de Cambio
 * ============================================================================
 * Handlers para las rutas del módulo de periodos de cambio de refacciones.
 * ============================================================================
 */

import { Request, Response } from 'express';
import { refaccionPeriodoCambioService } from './refaccion-periodo-cambio.service';
import { success } from '../../utils/response';

class RefaccionPeriodoCambioController {
    // ============================================================================
    // CRUD BÁSICO
    // ============================================================================

    /**
     * GET /refaccion-periodo-cambio
     * Obtener todos los periodos de cambio
     */
    async findAll(req: Request, res: Response) {
        const query = req.query as any;
        const periodos = await refaccionPeriodoCambioService.findAll(query);
        return success(res, 'Periodos de cambio obtenidos', periodos);
    }

    /**
     * GET /refaccion-periodo-cambio/:id
     * Obtener un periodo por ID
     */
    async findOne(req: Request, res: Response) {
        const id = Number(req.params.id);
        const periodo = await refaccionPeriodoCambioService.findOne(id);
        return success(res, 'Periodo de cambio obtenido', periodo);
    }

    /**
     * POST /refaccion-periodo-cambio
     * Crear un nuevo periodo de cambio
     */
    async create(req: Request, res: Response) {
        const data = req.body;
        const periodo = await refaccionPeriodoCambioService.create(data);
        return success(res, 'Periodo de cambio creado', periodo, 201);
    }

    /**
     * PUT /refaccion-periodo-cambio/:id
     * Actualizar un periodo de cambio
     */
    async update(req: Request, res: Response) {
        const id = Number(req.params.id);
        const data = req.body;
        const periodo = await refaccionPeriodoCambioService.update(id, data);
        return success(res, 'Periodo de cambio actualizado', periodo);
    }

    /**
     * DELETE /refaccion-periodo-cambio/:id
     * Eliminar un periodo de cambio (soft delete)
     */
    async delete(req: Request, res: Response) {
        const id = Number(req.params.id);
        const periodo = await refaccionPeriodoCambioService.delete(id);
        return success(res, 'Periodo de cambio eliminado', periodo);
    }

    // ============================================================================
    // OPERACIONES POR REFACCIÓN
    // ============================================================================

    /**
     * GET /refaccion-periodo-cambio/refaccion/:refaccionId
     * Obtener todos los periodos de una refacción
     */
    async findByRefaccion(req: Request, res: Response) {
        const refaccionId = Number(req.params.refaccionId);
        const result = await refaccionPeriodoCambioService.findByRefaccion(refaccionId);
        return success(res, 'Periodos de refacción obtenidos', result);
    }

    /**
     * POST /refaccion-periodo-cambio/upsert
     * Crear o actualizar múltiples periodos para una refacción
     */
    async upsertPeriodos(req: Request, res: Response) {
        const data = req.body;
        const result = await refaccionPeriodoCambioService.upsertPeriodos(data);
        return success(res, 'Periodos actualizados correctamente', result);
    }

    // ============================================================================
    // CONSULTAS ESPECIALES
    // ============================================================================

    /**
     * GET /refaccion-periodo-cambio/agrupados
     * Obtener refacciones agrupadas con sus periodos
     */
    async getRefaccionesConPeriodos(req: Request, res: Response) {
        const result = await refaccionPeriodoCambioService.getRefaccionesConPeriodos();
        return success(res, 'Refacciones con periodos obtenidas', result);
    }

    /**
     * GET /refaccion-periodo-cambio/sin-configurar
     * Obtener refacciones sin configuración completa
     */
    async getRefaccionesSinConfigurar(req: Request, res: Response) {
        const result = await refaccionPeriodoCambioService.getRefaccionesSinConfigurar();
        return success(res, 'Refacciones sin configurar obtenidas', result);
    }

    /**
     * GET /refaccion-periodo-cambio/a-cambiar
     * Obtener refacciones que deben cambiarse en un mantenimiento
     */
    async getRefaccionesACambiar(req: Request, res: Response) {
        const contratoId = Number(req.query.contratoId);
        const numeroMantenimiento = Number(req.query.numeroMantenimiento);

        if (!contratoId || !numeroMantenimiento) {
            return success(res, 'Parámetros contratoId y numeroMantenimiento son requeridos', null, 400);
        }

        const result = await refaccionPeriodoCambioService.getRefaccionesACambiar(
            contratoId,
            numeroMantenimiento
        );
        return success(res, 'Refacciones a cambiar obtenidas', result);
    }

    /**
     * GET /refaccion-periodo-cambio/proximo-mantenimiento/:contratoId
     * Obtener refacciones a cambiar para el PRÓXIMO mantenimiento (calcula automáticamente)
     */
    async getRefaccionesProximoMantenimiento(req: Request, res: Response) {
        const contratoId = Number(req.params.contratoId);

        if (!contratoId) {
            return success(res, 'ContratoID es requerido', null, 400);
        }

        const result = await refaccionPeriodoCambioService.getRefaccionesParaProximoMantenimiento(contratoId);
        return success(res, 'Refacciones para próximo mantenimiento obtenidas', result);
    }

    /**
     * GET /refaccion-periodo-cambio/vigencia/:contratoId
     * Obtener vigencia de todas las refacciones de un contrato
     */
    async getVigenciaContrato(req: Request, res: Response) {
        const contratoId = Number(req.params.contratoId);

        if (!contratoId) {
            return success(res, 'ContratoID es requerido', null, 400);
        }

        const result = await refaccionPeriodoCambioService.getVigenciaRefaccionesContrato(contratoId);
        return success(res, 'Vigencia de refacciones obtenida', result);
    }
}

export const refaccionPeriodoCambioController = new RefaccionPeriodoCambioController();
