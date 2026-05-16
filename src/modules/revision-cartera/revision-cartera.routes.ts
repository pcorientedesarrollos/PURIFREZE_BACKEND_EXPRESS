import { Router } from 'express';
import { revisionCarteraController } from './revision-cartera.controller';

const router = Router();

router.get('/clientes', (req, res) => revisionCarteraController.getClientes(req, res));
router.get('/resumen', (req, res) => revisionCarteraController.getResumen(req, res));
router.post('/guardar', (req, res) => revisionCarteraController.guardarSeleccion(req, res));

export default router;
