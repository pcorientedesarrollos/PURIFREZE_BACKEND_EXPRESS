import { Router } from 'express';
import { comprasPagosController } from './compras-pagos.controller';
import { validateBody, validateParams } from '../../middlewares/validateRequest';
import {
  createCompraPagoSchema,
  compraPagoIdParamSchema,
  compraIdParamSchema,
} from './compras-pagos.schema';

const router = Router();

// POST /compras-pagos - Registrar nuevo pago
router.post(
  '/',
  validateBody(createCompraPagoSchema),
  comprasPagosController.create
);

// GET /compras-pagos/compra/:CompraEncabezadoID - Obtener pagos de una compra
router.get(
  '/compra/:CompraEncabezadoID',
  validateParams(compraIdParamSchema),
  comprasPagosController.getByCompra
);

// DELETE /compras-pagos/:CompraPagoID - Eliminar pago (soft delete)
router.delete(
  '/:CompraPagoID',
  validateParams(compraPagoIdParamSchema),
  comprasPagosController.remove
);

export default router;
