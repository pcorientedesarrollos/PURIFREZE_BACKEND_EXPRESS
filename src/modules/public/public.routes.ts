import { Router } from 'express';
import { publicController } from './public.controller';

const router = Router();

router.get('/cotizacion/:id', (req, res) => publicController.getCotizacion(req, res));
router.get('/compra/:id', (req, res) => publicController.getCompra(req, res));

export const publicRoutes = router;
