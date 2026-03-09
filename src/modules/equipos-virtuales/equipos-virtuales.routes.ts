import { Router } from 'express';
import { equiposVirtualesController } from './equipos-virtuales.controller';
import { validateBody, validateParams, validateQuery } from '../../middlewares/validateRequest';
import {
  createEquipoVirtualSchema,
  updateEquipoVirtualSchema,
  equipoVirtualIdParamSchema,
  searchEquipoVirtualQuerySchema,
} from './equipos-virtuales.schema';

const router = Router();

// POST /equipos-virtuales - Crear equipo virtual con detalles
router.post('/', validateBody(createEquipoVirtualSchema), (req, res) => equiposVirtualesController.create(req, res));

// GET /equipos-virtuales - Obtener todos los equipos virtuales
router.get('/', validateQuery(searchEquipoVirtualQuerySchema), (req, res) => equiposVirtualesController.findAll(req, res));

// GET /equipos-virtuales/:EquipoVirtualID - Obtener equipo por ID
router.get('/:EquipoVirtualID', validateParams(equipoVirtualIdParamSchema), (req, res) => equiposVirtualesController.findOne(req, res));

// GET /equipos-virtuales/:EquipoVirtualID/resumen - Obtener resumen para compras
router.get('/:EquipoVirtualID/resumen', validateParams(equipoVirtualIdParamSchema), (req, res) => equiposVirtualesController.getResumen(req, res));

// PUT /equipos-virtuales/:EquipoVirtualID - Actualizar equipo
router.put('/:EquipoVirtualID', validateParams(equipoVirtualIdParamSchema), validateBody(updateEquipoVirtualSchema), (req, res) => equiposVirtualesController.update(req, res));

// POST /equipos-virtuales/:EquipoVirtualID/duplicar - Duplicar equipo
router.post('/:EquipoVirtualID/duplicar', validateParams(equipoVirtualIdParamSchema), (req, res) => equiposVirtualesController.duplicate(req, res));

// PATCH /equipos-virtuales/baja/:EquipoVirtualID - Dar de baja
router.patch('/baja/:EquipoVirtualID', validateParams(equipoVirtualIdParamSchema), (req, res) => equiposVirtualesController.deactivate(req, res));

// PATCH /equipos-virtuales/activar/:EquipoVirtualID - Activar
router.patch('/activar/:EquipoVirtualID', validateParams(equipoVirtualIdParamSchema), (req, res) => equiposVirtualesController.activate(req, res));

export default router;
