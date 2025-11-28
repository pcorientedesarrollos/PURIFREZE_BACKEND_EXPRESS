import { Router } from 'express';
import { comprasRecepcionesController } from './compras-recepciones.controller';
import { validateBody, validateParams } from '../../middlewares/validateRequest';
import { createRecepcionSchema, recepcionIdParamSchema, compraIdParamSchema } from './compras-recepciones.schema';

const router = Router();

/** @swagger
 * /compras-recepciones:
 *   post:
 *     summary: Crear recepción de compra
 *     tags: [Compras - Recepciones]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [CompraEncabezadoID, MontoRecepcion, UsuarioID, MetodoPagoID, CuentaBancariaID, Detalles]
 *             properties:
 *               CompraEncabezadoID:
 *                 type: integer
 *               FechaRecepcion:
 *                 type: string
 *                 format: date
 *               Observaciones:
 *                 type: string
 *               MontoRecepcion:
 *                 type: number
 *               UsuarioID:
 *                 type: integer
 *               MetodoPagoID:
 *                 type: integer
 *               CuentaBancariaID:
 *                 type: integer
 *               Detalles:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [RefaccionID, CantidadEstablecida]
 *                   properties:
 *                     RefaccionID:
 *                       type: integer
 *                     CantidadEstablecida:
 *                       type: number
 *     responses:
 *       200:
 *         description: Recepción creada
 */
router.post('/', validateBody(createRecepcionSchema), (req, res) => comprasRecepcionesController.create(req, res));

/** @swagger
 * /compras-recepciones:
 *   get:
 *     summary: Obtener todas las recepciones
 *     tags: [Compras - Recepciones]
 *     responses:
 *       200:
 *         description: Lista de recepciones
 */
router.get('/', (req, res) => comprasRecepcionesController.findAll(req, res));

/** @swagger
 * /compras-recepciones/with-pagos:
 *   get:
 *     summary: Obtener todas las recepciones con pagos
 *     tags: [Compras - Recepciones]
 *     responses:
 *       200:
 *         description: Lista de recepciones con información de pagos
 */
router.get('/with-pagos', (req, res) => comprasRecepcionesController.findAllWithPagos(req, res));

/** @swagger
 * /compras-recepciones/{ComprasRecepcionesEncabezadoID}:
 *   get:
 *     summary: Obtener recepción por ID
 *     tags: [Compras - Recepciones]
 *     parameters:
 *       - in: path
 *         name: ComprasRecepcionesEncabezadoID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Recepción encontrada
 *       404:
 *         description: No encontrada
 */
router.get('/:ComprasRecepcionesEncabezadoID', validateParams(recepcionIdParamSchema), (req, res) => comprasRecepcionesController.findOne(req, res));

/** @swagger
 * /compras-recepciones/compra/{CompraEncabezadoID}:
 *   get:
 *     summary: Obtener recepciones por CompraEncabezadoID
 *     tags: [Compras - Recepciones]
 *     parameters:
 *       - in: path
 *         name: CompraEncabezadoID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Recepciones de la compra
 */
router.get('/compra/:CompraEncabezadoID', validateParams(compraIdParamSchema), (req, res) => comprasRecepcionesController.findByCompra(req, res));

/** @swagger
 * /compras-recepciones/compra/{CompraEncabezadoID}/with-pagos:
 *   get:
 *     summary: Obtener recepciones por CompraEncabezadoID con pagos
 *     tags: [Compras - Recepciones]
 *     parameters:
 *       - in: path
 *         name: CompraEncabezadoID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Recepciones de la compra con pagos
 */
router.get('/compra/:CompraEncabezadoID/with-pagos', validateParams(compraIdParamSchema), (req, res) => comprasRecepcionesController.findByCompraWithPagos(req, res));

export default router;
