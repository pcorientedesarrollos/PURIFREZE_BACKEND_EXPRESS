import { Router } from 'express';
import { girosNegocioController } from './giros-negocio.controller';
import { validateBody, validateParams } from '../../middlewares/validateRequest';
import {
  createGiroNegocioSchema,
  updateGiroNegocioSchema,
  giroNegocioIdParamSchema,
} from './giros-negocio.schema';

const router = Router();

// POST /giros-negocio - Crear giro de negocio
router.post('/', validateBody(createGiroNegocioSchema), (req, res) =>
  girosNegocioController.create(req, res)
);

// GET /giros-negocio - Obtener todos
router.get('/', (req, res) => girosNegocioController.findAll(req, res));

// GET /giros-negocio/:GiroNegocioID - Obtener por ID
router.get('/:GiroNegocioID', validateParams(giroNegocioIdParamSchema), (req, res) =>
  girosNegocioController.findOne(req, res)
);

// PUT /giros-negocio/:GiroNegocioID - Actualizar
router.put(
  '/:GiroNegocioID',
  validateParams(giroNegocioIdParamSchema),
  validateBody(updateGiroNegocioSchema),
  (req, res) => girosNegocioController.update(req, res)
);

// PATCH /giros-negocio/:GiroNegocioID - Actualizar (alias)
router.patch(
  '/:GiroNegocioID',
  validateParams(giroNegocioIdParamSchema),
  validateBody(updateGiroNegocioSchema),
  (req, res) => girosNegocioController.update(req, res)
);

// PATCH /giros-negocio/baja/:GiroNegocioID - Dar de baja
router.patch('/baja/:GiroNegocioID', validateParams(giroNegocioIdParamSchema), (req, res) =>
  girosNegocioController.baja(req, res)
);

// PATCH /giros-negocio/activar/:GiroNegocioID - Activar
router.patch('/activar/:GiroNegocioID', validateParams(giroNegocioIdParamSchema), (req, res) =>
  girosNegocioController.activar(req, res)
);

export default router;
