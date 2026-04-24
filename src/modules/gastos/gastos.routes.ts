import { Router } from 'express';
import { gastosController } from './gastos.controller';
import { validateBody, validateParams } from '../../middlewares/validateRequest';
import {
    createGastoSchema,
    updateGastoSchema,
    gastoIdParamSchema,
} from './gastos.schema';

const router = Router();

// Las rutas de reportes van ANTES de /:GastoID para evitar conflicto de parámetros
router.get('/reportes/semanal', (req, res) => gastosController.getReporteSemanal(req, res));

router.get('/reportes/mensual', (req, res) => gastosController.getReporteMensual(req, res));

router.get('/', (req, res) => gastosController.findAll(req, res));

router.post('/', validateBody(createGastoSchema), (req, res) =>
    gastosController.create(req, res)
);

router.get('/:GastoID', validateParams(gastoIdParamSchema), (req, res) =>
    gastosController.findOne(req, res)
);

router.put(
    '/:GastoID',
    validateParams(gastoIdParamSchema),
    validateBody(updateGastoSchema),
    (req, res) => gastosController.update(req, res)
);

router.delete('/:GastoID', validateParams(gastoIdParamSchema), (req, res) =>
    gastosController.baja(req, res)
);

export default router;
