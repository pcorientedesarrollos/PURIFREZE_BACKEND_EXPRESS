import { Router } from 'express';
import { cotizacionesCompraController } from './cotizaciones-compra.controller';
import { validateBody, validateParams } from '../../middlewares/validateRequest';
import {
  createCotizacionCompraSchema,
  updateCotizacionCompraSchema,
  enviarCotizacionSchema,
  convertirACompraSchema,
  cotizacionIdParamSchema,
} from './cotizaciones-compra.schema';

const router = Router();

/** @swagger
 * /cotizaciones-compra:
 *   post:
 *     summary: Crear cotización de compra con detalles
 *     tags: [Cotizaciones Compra]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [FechaCotizacion, Detalles]
 *             properties:
 *               FechaCotizacion:
 *                 type: string
 *                 format: date
 *               Observaciones:
 *                 type: string
 *               UsuarioID:
 *                 type: integer
 *               Detalles:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [RefaccionID, Cantidad]
 *                   properties:
 *                     RefaccionID:
 *                       type: integer
 *                     Cantidad:
 *                       type: integer
 *                     Observaciones:
 *                       type: string
 *     responses:
 *       201:
 *         description: Cotización creada
 */
router.post('/', validateBody(createCotizacionCompraSchema), (req, res) => cotizacionesCompraController.create(req, res));

/** @swagger
 * /cotizaciones-compra:
 *   get:
 *     summary: Obtener todas las cotizaciones
 *     tags: [Cotizaciones Compra]
 *     responses:
 *       200:
 *         description: Lista de cotizaciones
 */
router.get('/', (req, res) => cotizacionesCompraController.findAll(req, res));

/** @swagger
 * /cotizaciones-compra/{CotizacionCompraID}:
 *   get:
 *     summary: Obtener cotización por ID con detalles
 *     tags: [Cotizaciones Compra]
 *     parameters:
 *       - in: path
 *         name: CotizacionCompraID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Cotización encontrada
 *       404:
 *         description: No encontrada
 */
router.get('/:CotizacionCompraID', validateParams(cotizacionIdParamSchema), (req, res) => cotizacionesCompraController.findOne(req, res));

/** @swagger
 * /cotizaciones-compra/{CotizacionCompraID}/pdf:
 *   get:
 *     summary: Obtener datos para generar PDF de cotización
 *     tags: [Cotizaciones Compra]
 *     parameters:
 *       - in: path
 *         name: CotizacionCompraID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Datos para PDF
 */
router.get('/:CotizacionCompraID/pdf', validateParams(cotizacionIdParamSchema), (req, res) => cotizacionesCompraController.getPdf(req, res));

/** @swagger
 * /cotizaciones-compra/{CotizacionCompraID}:
 *   put:
 *     summary: Actualizar cotización (solo en estado PENDIENTE)
 *     tags: [Cotizaciones Compra]
 *     parameters:
 *       - in: path
 *         name: CotizacionCompraID
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               FechaCotizacion:
 *                 type: string
 *               Observaciones:
 *                 type: string
 *               Detalles:
 *                 type: array
 *               DetallesEliminar:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Cotización actualizada
 */
router.put('/:CotizacionCompraID', validateParams(cotizacionIdParamSchema), validateBody(updateCotizacionCompraSchema), (req, res) => cotizacionesCompraController.update(req, res));

/** @swagger
 * /cotizaciones-compra/{CotizacionCompraID}:
 *   delete:
 *     summary: Eliminar cotización (soft delete)
 *     tags: [Cotizaciones Compra]
 *     parameters:
 *       - in: path
 *         name: CotizacionCompraID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Cotización eliminada
 */
router.delete('/:CotizacionCompraID', validateParams(cotizacionIdParamSchema), (req, res) => cotizacionesCompraController.remove(req, res));

/** @swagger
 * /cotizaciones-compra/{CotizacionCompraID}/enviar:
 *   post:
 *     summary: Registrar envío de cotización a proveedor
 *     tags: [Cotizaciones Compra]
 *     parameters:
 *       - in: path
 *         name: CotizacionCompraID
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ProveedorID, MedioEnvio]
 *             properties:
 *               ProveedorID:
 *                 type: integer
 *               ContactoID:
 *                 type: integer
 *               MedioEnvio:
 *                 type: string
 *                 enum: [WHATSAPP, EMAIL, OTRO]
 *               Telefono:
 *                 type: string
 *     responses:
 *       200:
 *         description: Envío registrado
 */
router.post('/:CotizacionCompraID/enviar', validateParams(cotizacionIdParamSchema), validateBody(enviarCotizacionSchema), (req, res) => cotizacionesCompraController.registrarEnvio(req, res));

/** @swagger
 * /cotizaciones-compra/{CotizacionCompraID}/convertir:
 *   post:
 *     summary: Convertir cotización a compra
 *     tags: [Cotizaciones Compra]
 *     parameters:
 *       - in: path
 *         name: CotizacionCompraID
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ProveedorID, DetallesSeleccionados]
 *             properties:
 *               ProveedorID:
 *                 type: integer
 *               DetallesSeleccionados:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: IDs de los detalles a incluir en la compra
 *     responses:
 *       201:
 *         description: Compra creada a partir de la cotización
 */
router.post('/:CotizacionCompraID/convertir', validateParams(cotizacionIdParamSchema), validateBody(convertirACompraSchema), (req, res) => cotizacionesCompraController.convertirACompra(req, res));

export default router;
