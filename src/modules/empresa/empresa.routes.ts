import { Router } from 'express';
import { empresaController } from './empresa.controller';
import { validateBody } from '../../middlewares/validateRequest';
import { updateEmpresaSchema } from './empresa.schema';

const router = Router();

router.get('/', (req, res) => empresaController.get(req, res));
router.put('/', validateBody(updateEmpresaSchema), (req, res) => empresaController.update(req, res));

export default router;
