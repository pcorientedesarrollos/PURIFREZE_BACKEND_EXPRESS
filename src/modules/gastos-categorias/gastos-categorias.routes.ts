import { Router } from 'express';
import { gastosCategoriasController } from './gastos-categorias.controller';
import { validateBody, validateParams } from '../../middlewares/validateRequest';
import {
    createGastoCategoriaSchema,
    updateGastoCategoriaSchema,
    gastoCategoriaIdParamSchema,
} from './gastos-categorias.schema';

const router = Router();

router.get('/', (req, res) => gastosCategoriasController.findAll(req, res));

router.get('/admin', (req, res) => gastosCategoriasController.findAllAdmin(req, res));

router.post('/seed', (req, res) => gastosCategoriasController.seed(req, res));

router.post('/', validateBody(createGastoCategoriaSchema), (req, res) =>
    gastosCategoriasController.create(req, res)
);

router.put(
    '/:CategoriaGastoID',
    validateParams(gastoCategoriaIdParamSchema),
    validateBody(updateGastoCategoriaSchema),
    (req, res) => gastosCategoriasController.update(req, res)
);

router.patch('/baja/:CategoriaGastoID', validateParams(gastoCategoriaIdParamSchema), (req, res) =>
    gastosCategoriasController.baja(req, res)
);

router.patch('/activar/:CategoriaGastoID', validateParams(gastoCategoriaIdParamSchema), (req, res) =>
    gastosCategoriasController.activar(req, res)
);

export default router;
