import { Router } from 'express';
import { controlController } from './control.controller';
import { validateQuery } from '../../middlewares/validateRequest';
import { listControlPedidosQuerySchema } from './control.schema';

const router = Router();

/**
 * @swagger
 * /control/pedidos:
 *   get:
 *     summary: Lista pedidos para el tablero de control con filtros y paginacion
 *     tags: [Control]
 *     parameters:
 *       - in: query
 *         name: texto
 *         schema: { type: string }
 *         description: Busca en NumeroPedido, Observaciones, FormaPago, proveedor (nombre/RFC), facturas (Folio/UUID) y conceptos (Descripcion/NoIdentificacion/ClaveProdServ)
 *       - in: query
 *         name: proveedorId
 *         schema: { type: integer }
 *       - in: query
 *         name: fechaDesde
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: fechaHasta
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: pageSize
 *         schema: { type: integer }
 *         description: pageSize=0 devuelve todo el filtro sin paginacion (uso para export)
 *     responses:
 *       200:
 *         description: Pedidos con meta { total, page, pageSize, totalPages, sumas }
 */
router.get(
  '/pedidos',
  validateQuery(listControlPedidosQuerySchema),
  (req, res) => controlController.listPedidos(req, res),
);

export default router;
