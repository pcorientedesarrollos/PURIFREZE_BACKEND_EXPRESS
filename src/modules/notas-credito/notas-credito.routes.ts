import { Router } from 'express';
import { notasCreditoController } from './notas-credito.controller';

const router = Router();

// CRUD básico
router.post('/', notasCreditoController.create);
router.get('/', notasCreditoController.findAll);
router.get('/:NotaCreditoID', notasCreditoController.findOne);
router.put('/:NotaCreditoID', notasCreditoController.update);
router.delete('/:NotaCreditoID', notasCreditoController.delete);

// Por proveedor (para usar en compras)
router.get('/proveedor/:ProveedorID', notasCreditoController.findByProveedor);

// Aplicar a una compra
router.post('/:NotaCreditoID/aplicar', notasCreditoController.aplicar);

export default router;
