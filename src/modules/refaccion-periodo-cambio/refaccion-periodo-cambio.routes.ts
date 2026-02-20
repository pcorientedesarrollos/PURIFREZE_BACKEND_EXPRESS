/**
 * ============================================================================
 * ROUTES: Refacción Periodo de Cambio
 * ============================================================================
 * Definición de rutas para el módulo de periodos de cambio de refacciones.
 * IMPORTANTE: Las rutas estáticas deben ir ANTES de las dinámicas (/:id)
 * ============================================================================
 */

import { Router } from 'express';
import { refaccionPeriodoCambioController } from './refaccion-periodo-cambio.controller';
import { validateBody, validateParams, validateQuery } from '../../middlewares/validateRequest';
import {
    createRefaccionPeriodoCambioSchema,
    updateRefaccionPeriodoCambioSchema,
    upsertPeriodosSchema,
    refaccionPeriodoCambioIdParamSchema,
    refaccionIdParamSchema,
    searchPeriodosSchema
} from './refaccion-periodo-cambio.schema';

const router = Router();

// ============================================================================
// RUTAS ESTÁTICAS (deben ir PRIMERO)
// ============================================================================

/** Obtener todos los periodos de cambio con filtros */
router.get('/', validateQuery(searchPeriodosSchema), (req, res) =>
    refaccionPeriodoCambioController.findAll(req, res)
);

/** Obtener refacciones agrupadas con sus periodos */
router.get('/agrupados', (req, res) =>
    refaccionPeriodoCambioController.getRefaccionesConPeriodos(req, res)
);

/** Obtener refacciones sin configuración completa */
router.get('/sin-configurar', (req, res) =>
    refaccionPeriodoCambioController.getRefaccionesSinConfigurar(req, res)
);

/** Obtener refacciones que deben cambiarse en un mantenimiento */
router.get('/a-cambiar', (req, res) =>
    refaccionPeriodoCambioController.getRefaccionesACambiar(req, res)
);

/** Obtener refacciones a cambiar para el PRÓXIMO mantenimiento (calcula automático) */
router.get('/proximo-mantenimiento/:contratoId', (req, res) =>
    refaccionPeriodoCambioController.getRefaccionesProximoMantenimiento(req, res)
);

/** Obtener vigencia de todas las refacciones de un contrato */
router.get('/vigencia/:contratoId', (req, res) =>
    refaccionPeriodoCambioController.getVigenciaContrato(req, res)
);

// ============================================================================
// RUTAS CON SUBRUTAS
// ============================================================================

/** Obtener todos los periodos de una refacción específica */
router.get('/refaccion/:refaccionId', validateParams(refaccionIdParamSchema), (req, res) =>
    refaccionPeriodoCambioController.findByRefaccion(req, res)
);

/** Crear o actualizar múltiples periodos para una refacción */
router.post('/upsert', validateBody(upsertPeriodosSchema), (req, res) =>
    refaccionPeriodoCambioController.upsertPeriodos(req, res)
);

// ============================================================================
// RUTAS CRUD BÁSICAS
// ============================================================================

/** Crear un nuevo periodo de cambio */
router.post('/', validateBody(createRefaccionPeriodoCambioSchema), (req, res) =>
    refaccionPeriodoCambioController.create(req, res)
);

// ============================================================================
// RUTAS DINÁMICAS (deben ir AL FINAL)
// ============================================================================

/** Obtener un periodo de cambio por ID */
router.get('/:id', validateParams(refaccionPeriodoCambioIdParamSchema), (req, res) =>
    refaccionPeriodoCambioController.findOne(req, res)
);

/** Actualizar un periodo de cambio */
router.put('/:id', validateParams(refaccionPeriodoCambioIdParamSchema), validateBody(updateRefaccionPeriodoCambioSchema), (req, res) =>
    refaccionPeriodoCambioController.update(req, res)
);

/** Eliminar un periodo de cambio (soft delete) */
router.delete('/:id', validateParams(refaccionPeriodoCambioIdParamSchema), (req, res) =>
    refaccionPeriodoCambioController.delete(req, res)
);

export default router;
