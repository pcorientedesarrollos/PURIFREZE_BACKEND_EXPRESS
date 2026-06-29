import { Router } from 'express';
import { pedidosDescuentosController } from './pedidos-descuentos.controller';
import { validateBody, validateParams } from '../../middlewares/validateRequest';
import {
  aplicarNotaCreditoSchema,
  pedidoIdParamSchema,
  pedidoDescuentoIdParamSchema,
} from './pedidos-descuentos.schema';

const router = Router();

// POST /pedidos-descuentos/nota-credito - Aplicar NC a un pedido
router.post(
  '/nota-credito',
  validateBody(aplicarNotaCreditoSchema),
  (req, res) => pedidosDescuentosController.aplicarNotaCredito(req, res),
);

// GET /pedidos-descuentos/pedido/:PedidoID - Listar descuentos de un pedido
// (ruta especifica ANTES de /:PedidoDescuentoID)
router.get(
  '/pedido/:PedidoID',
  validateParams(pedidoIdParamSchema),
  (req, res) => pedidosDescuentosController.findByPedido(req, res),
);

// DELETE /pedidos-descuentos/:PedidoDescuentoID - Eliminar un descuento
router.delete(
  '/:PedidoDescuentoID',
  validateParams(pedidoDescuentoIdParamSchema),
  (req, res) => pedidosDescuentosController.remove(req, res),
);

export default router;
