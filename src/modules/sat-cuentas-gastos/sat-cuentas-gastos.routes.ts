import { Router } from 'express';
import { satCuentasGastosController } from './sat-cuentas-gastos.controller';

const router = Router();

router.get('/tree', (req, res) => satCuentasGastosController.getTree(req, res));
router.get('/', (req, res) => satCuentasGastosController.findAll(req, res));

export default router;
