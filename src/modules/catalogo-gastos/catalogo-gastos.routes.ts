import { Router } from 'express';
import { catalogoGastosController } from './catalogo-gastos.controller';
import { validateBody, validateParams } from '../../middlewares/validateRequest';
import {
    createCatalogoGastoSchema,
    updateCatalogoGastoSchema,
    catalogoGastoIdParamSchema,
    nivelParamSchema,
    parentIdParamSchema,
} from './catalogo-gastos.schema';

const router = Router();

// Rutas específicas antes de /:CatalogoGastoID
router.get('/admin', (req, res) => catalogoGastosController.getTreeAdmin(req, res));

router.get('/nivel/:nivel', validateParams(nivelParamSchema), (req, res) =>
    catalogoGastosController.getByNivel(req, res)
);

router.get('/hijos/:parentId', validateParams(parentIdParamSchema), (req, res) =>
    catalogoGastosController.getHijos(req, res)
);

router.get('/', (req, res) => catalogoGastosController.getTree(req, res));

router.post('/', validateBody(createCatalogoGastoSchema), (req, res) =>
    catalogoGastosController.create(req, res)
);

router.put(
    '/:CatalogoGastoID',
    validateParams(catalogoGastoIdParamSchema),
    validateBody(updateCatalogoGastoSchema),
    (req, res) => catalogoGastosController.update(req, res)
);

router.patch('/baja/:CatalogoGastoID', validateParams(catalogoGastoIdParamSchema), (req, res) =>
    catalogoGastosController.baja(req, res)
);

router.patch('/activar/:CatalogoGastoID', validateParams(catalogoGastoIdParamSchema), (req, res) =>
    catalogoGastosController.activar(req, res)
);

export default router;
