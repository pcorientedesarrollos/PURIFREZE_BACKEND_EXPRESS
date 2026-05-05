import { Router } from 'express';
import { gastosProyeccionController } from './gastos-proyeccion.controller';
import { validateBody, validateParams } from '../../middlewares/validateRequest';
import { proyeccionParamSchema, guardarProyeccionSchema } from './gastos-proyeccion.schema';

const router = Router();

router.get('/:anio/:mes', validateParams(proyeccionParamSchema), (req, res) =>
    gastosProyeccionController.getProyeccion(req, res)
);

router.post('/:anio/:mes', validateParams(proyeccionParamSchema), validateBody(guardarProyeccionSchema), (req, res) =>
    gastosProyeccionController.guardarItems(req, res)
);

export default router;
