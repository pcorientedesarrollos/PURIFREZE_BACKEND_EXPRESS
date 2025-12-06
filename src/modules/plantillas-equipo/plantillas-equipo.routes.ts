import { Router } from 'express';
import { plantillasEquipoController } from './plantillas-equipo.controller';
import { validateBody, validateParams, validateQuery } from '../../middlewares/validateRequest';
import {
  createPlantillaEquipoSchema,
  updatePlantillaEquipoSchema,
  plantillaEquipoIdParamSchema,
  searchPlantillaQuerySchema,
} from './plantillas-equipo.schema';

const router = Router();

// POST /plantillas-equipo - Crear plantilla con detalles
router.post('/', validateBody(createPlantillaEquipoSchema), (req, res) => plantillasEquipoController.create(req, res));

// GET /plantillas-equipo - Obtener todas las plantillas (con búsqueda opcional)
router.get('/', validateQuery(searchPlantillaQuerySchema), (req, res) => plantillasEquipoController.findAll(req, res));

// GET /plantillas-equipo/refacciones - Buscar refacciones disponibles
router.get('/refacciones', validateQuery(searchPlantillaQuerySchema), (req, res) => plantillasEquipoController.searchRefacciones(req, res));

// GET /plantillas-equipo/:PlantillaEquipoID - Obtener plantilla por ID
router.get('/:PlantillaEquipoID', validateParams(plantillaEquipoIdParamSchema), (req, res) => plantillasEquipoController.findOne(req, res));

// PUT /plantillas-equipo/:PlantillaEquipoID - Actualizar plantilla
router.put('/:PlantillaEquipoID', validateParams(plantillaEquipoIdParamSchema), validateBody(updatePlantillaEquipoSchema), (req, res) => plantillasEquipoController.update(req, res));

// POST /plantillas-equipo/:PlantillaEquipoID/duplicar - Duplicar plantilla
router.post('/:PlantillaEquipoID/duplicar', validateParams(plantillaEquipoIdParamSchema), (req, res) => plantillasEquipoController.duplicate(req, res));

// PATCH /plantillas-equipo/baja/:PlantillaEquipoID - Dar de baja
router.patch('/baja/:PlantillaEquipoID', validateParams(plantillaEquipoIdParamSchema), (req, res) => plantillasEquipoController.deactivate(req, res));

// PATCH /plantillas-equipo/activar/:PlantillaEquipoID - Activar
router.patch('/activar/:PlantillaEquipoID', validateParams(plantillaEquipoIdParamSchema), (req, res) => plantillasEquipoController.activate(req, res));

export default router;
