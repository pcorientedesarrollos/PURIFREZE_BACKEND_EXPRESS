import { Router } from 'express';
import { pedidosController } from './pedidos.controller';
import { validateBody, validateParams } from '../../middlewares/validateRequest';
import {
  createPedidoSchema,
  updatePedidoSchema,
  pedidoIdParamSchema,
  asociarFacturaSchema,
  desasociarFacturaParamSchema,
} from './pedidos.schema';

const router = Router();

/** POST /pedidos - Crear pedido con detalles */
router.post('/', validateBody(createPedidoSchema), (req, res) => pedidosController.create(req, res));

/** GET /pedidos - Listar pedidos activos */
router.get('/', (req, res) => pedidosController.findAll(req, res));

/** GET /pedidos/:PedidoID - Obtener pedido por ID */
router.get('/:PedidoID', validateParams(pedidoIdParamSchema), (req, res) => pedidosController.findOne(req, res));

/** PUT /pedidos/:PedidoID - Actualizar pedido */
router.put('/:PedidoID', validateParams(pedidoIdParamSchema), validateBody(updatePedidoSchema), (req, res) => pedidosController.update(req, res));

/** DELETE /pedidos/:PedidoID - Soft delete */
router.delete('/:PedidoID', validateParams(pedidoIdParamSchema), (req, res) => pedidosController.remove(req, res));

/** POST /pedidos/:PedidoID/facturas - Asociar factura */
router.post('/:PedidoID/facturas', validateParams(pedidoIdParamSchema), validateBody(asociarFacturaSchema), (req, res) => pedidosController.asociarFactura(req, res));

/** DELETE /pedidos/:PedidoID/facturas/:FacturaID - Desasociar factura */
router.delete('/:PedidoID/facturas/:FacturaID', validateParams(desasociarFacturaParamSchema), (req, res) => pedidosController.desasociarFactura(req, res));

/** GET /pedidos/:PedidoID/facturas - Listar facturas asociadas */
router.get('/:PedidoID/facturas', validateParams(pedidoIdParamSchema), (req, res) => pedidosController.findFacturas(req, res));

export default router;
