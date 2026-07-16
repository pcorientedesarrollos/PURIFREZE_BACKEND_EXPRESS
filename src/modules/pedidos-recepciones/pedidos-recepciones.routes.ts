import { Router } from 'express';
import { pedidosRecepcionesController } from './pedidos-recepciones.controller';
import { validateBody, validateParams, validateQuery } from '../../middlewares/validateRequest';
import {
  createPedidoRecepcionSchema,
  pedidoIdParamSchema,
  pedidoRecepcionIdParamSchema,
  reporteQuerySchema,
} from './pedidos-recepciones.schema';

const router = Router();

// POST /pedidos-recepciones - Registrar recepcion
router.post(
  '/',
  validateBody(createPedidoRecepcionSchema),
  (req, res) => pedidosRecepcionesController.create(req, res),
);

// GET /pedidos-recepciones/pedido/:PedidoID - Recepciones de un pedido
// (ruta especifica ANTES de /:PedidoRecepcionID para evitar shadowing)
router.get(
  '/pedido/:PedidoID',
  validateParams(pedidoIdParamSchema),
  (req, res) => pedidosRecepcionesController.findByPedido(req, res),
);

// GET /pedidos-recepciones/pedido/:PedidoID/with-pagos - Recepciones + pagos enriquecidos
router.get(
  '/pedido/:PedidoID/with-pagos',
  validateParams(pedidoIdParamSchema),
  (req, res) => pedidosRecepcionesController.findByPedidoWithPagos(req, res),
);

// GET /pedidos-recepciones/reporte - Reporte de entregas
// (ruta estatica ANTES de /:PedidoRecepcionID para evitar shadowing)
router.get(
  '/reporte',
  validateQuery(reporteQuerySchema),
  (req, res) => pedidosRecepcionesController.getReporte(req, res),
);

// GET /pedidos-recepciones/:PedidoRecepcionID - Obtener una recepcion
router.get(
  '/:PedidoRecepcionID',
  validateParams(pedidoRecepcionIdParamSchema),
  (req, res) => pedidosRecepcionesController.findOne(req, res),
);

export default router;
