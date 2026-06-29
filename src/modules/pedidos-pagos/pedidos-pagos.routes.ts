import { Router } from 'express';
import { pedidosPagosController } from './pedidos-pagos.controller';
import { validateBody, validateParams } from '../../middlewares/validateRequest';
import {
  createPedidoPagoSchema,
  pedidoPagoIdParamSchema,
  pedidoIdParamSchema,
} from './pedidos-pagos.schema';

const router = Router();

// POST /pedidos-pagos - Registrar nuevo pago
router.post(
  '/',
  validateBody(createPedidoPagoSchema),
  pedidosPagosController.create
);

// GET /pedidos-pagos/pedido/:PedidoID - Obtener pagos de un pedido
router.get(
  '/pedido/:PedidoID',
  validateParams(pedidoIdParamSchema),
  pedidosPagosController.getByPedido
);

// DELETE /pedidos-pagos/:PedidoPagoID - Eliminar pago (soft delete)
router.delete(
  '/:PedidoPagoID',
  validateParams(pedidoPagoIdParamSchema),
  pedidosPagosController.remove
);

export default router;
