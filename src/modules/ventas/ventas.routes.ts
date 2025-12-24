import { Router } from 'express';
import { ventasController } from './ventas.controller';
import { validateBody, validateParams, validateQuery } from '../../middlewares/validateRequest';
import {
  createVentaSchema,
  updateVentaSchema,
  updateEstatusVentaSchema,
  addDetalleVentaSchema,
  updateDetalleVentaSchema,
  createPagoSchema,
  ventaIdParamSchema,
  detalleIdParamSchema,
  pagoIdParamSchema,
  clienteIdParamSchema,
  ventasQuerySchema,
} from './ventas.schema';

const router = Router();

// =============================================
// VENTAS - ENCABEZADO
// =============================================

/** @swagger
 * /ventas:
 *   post:
 *     summary: Crear venta con detalles
 *     tags: [Ventas]
 */
router.post('/', validateBody(createVentaSchema), (req, res) => ventasController.create(req, res));

/** @swagger
 * /ventas:
 *   get:
 *     summary: Obtener todas las ventas
 *     tags: [Ventas]
 */
router.get('/', validateQuery(ventasQuerySchema), (req, res) => ventasController.findAll(req, res));

/** @swagger
 * /ventas/cliente/{ClienteID}:
 *   get:
 *     summary: Obtener ventas por cliente
 *     tags: [Ventas]
 */
router.get('/cliente/:ClienteID', validateParams(clienteIdParamSchema), validateQuery(ventasQuerySchema), (req, res) => ventasController.findByCliente(req, res));

/** @swagger
 * /ventas/{VentaID}:
 *   get:
 *     summary: Obtener venta por ID con detalles y pagos
 *     tags: [Ventas]
 */
router.get('/:VentaID', validateParams(ventaIdParamSchema), (req, res) => ventasController.findOne(req, res));

/** @swagger
 * /ventas/{VentaID}:
 *   put:
 *     summary: Actualizar encabezado de venta
 *     tags: [Ventas]
 */
router.put('/:VentaID', validateParams(ventaIdParamSchema), validateBody(updateVentaSchema), (req, res) => ventasController.update(req, res));

/** @swagger
 * /ventas/{VentaID}/estatus:
 *   patch:
 *     summary: Cambiar estatus de la venta
 *     tags: [Ventas]
 */
router.patch('/:VentaID/estatus', validateParams(ventaIdParamSchema), validateBody(updateEstatusVentaSchema), (req, res) => ventasController.updateEstatus(req, res));

/** @swagger
 * /ventas/baja/{VentaID}:
 *   patch:
 *     summary: Dar de baja venta
 *     tags: [Ventas]
 */
router.patch('/baja/:VentaID', validateParams(ventaIdParamSchema), (req, res) => ventasController.baja(req, res));

/** @swagger
 * /ventas/activar/{VentaID}:
 *   patch:
 *     summary: Activar venta
 *     tags: [Ventas]
 */
router.patch('/activar/:VentaID', validateParams(ventaIdParamSchema), (req, res) => ventasController.activar(req, res));

// =============================================
// VENTAS - DETALLE
// =============================================

/** @swagger
 * /ventas/{VentaID}/detalle:
 *   post:
 *     summary: Agregar item a la venta
 *     tags: [Ventas - Detalle]
 */
router.post('/:VentaID/detalle', validateParams(ventaIdParamSchema), validateBody(addDetalleVentaSchema), (req, res) => ventasController.addDetalle(req, res));

/** @swagger
 * /ventas/detalle/{VentaDetalleID}:
 *   put:
 *     summary: Actualizar item de la venta
 *     tags: [Ventas - Detalle]
 */
router.put('/detalle/:VentaDetalleID', validateParams(detalleIdParamSchema), validateBody(updateDetalleVentaSchema), (req, res) => ventasController.updateDetalle(req, res));

/** @swagger
 * /ventas/detalle/{VentaDetalleID}:
 *   delete:
 *     summary: Eliminar item de la venta (soft delete)
 *     tags: [Ventas - Detalle]
 */
router.delete('/detalle/:VentaDetalleID', validateParams(detalleIdParamSchema), (req, res) => ventasController.removeDetalle(req, res));

// =============================================
// VENTAS - PAGOS
// =============================================

/** @swagger
 * /ventas/{VentaID}/pago:
 *   post:
 *     summary: Registrar pago de venta
 *     tags: [Ventas - Pagos]
 */
router.post('/:VentaID/pago', validateParams(ventaIdParamSchema), validateBody(createPagoSchema), (req, res) => ventasController.addPago(req, res));

/** @swagger
 * /ventas/pago/{VentaPagoID}:
 *   delete:
 *     summary: Eliminar pago (soft delete)
 *     tags: [Ventas - Pagos]
 */
router.delete('/pago/:VentaPagoID', validateParams(pagoIdParamSchema), (req, res) => ventasController.removePago(req, res));

export default router;
