import { Router } from 'express';
import { estadosCuentaController } from './estados-cuenta.controller';
import { validateParams, validateQuery } from '../../middlewares/validateRequest';
import { estadoCuentaParamSchema, estadoCuentaQuerySchema } from './estados-cuenta.schema';

const router = Router();

// Histórico de últimos N meses (antes que /:año/:mes para evitar conflictos)
router.get('/', validateQuery(estadoCuentaQuerySchema), (req, res) =>
    estadosCuentaController.getHistorico(req, res)
);

// Estado de cuenta de un mes específico
router.get('/:anio/:mes', validateParams(estadoCuentaParamSchema), (req, res) =>
    estadosCuentaController.getEstadoCuenta(req, res)
);

export default router;
