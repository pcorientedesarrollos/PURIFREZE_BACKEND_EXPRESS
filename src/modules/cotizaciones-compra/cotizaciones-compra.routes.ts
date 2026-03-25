import { Router } from 'express';
import { cotizacionesCompraController } from './cotizaciones-compra.controller';
import { validateBody, validateParams } from '../../middlewares/validateRequest';
import {
  createCotizacionCompraSchema,
  updateCotizacionCompraSchema,
  enviarCotizacionSchema,
  convertirACompraSchema,
  cotizacionIdParamSchema,
  whatsappLinkSchema,
  agregarEquipoVirtualSchema,
  actualizarPrecioEquipoVirtualSchema,
  equipoVirtualIdParamSchema,
  actualizarDetalleCantidadSchema,
  detalleIdParamSchema,
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
 * /cotizaciones-compra/{CotizacionCompraID}/pdf-url:
 *   get:
 *     summary: Generar URL pública del PDF de cotización (válida por 24h)
 *     tags: [Cotizaciones Compra]
 *     parameters:
 *       - in: path
 *         name: CotizacionCompraID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: URL del PDF y link de WhatsApp generados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                 folio:
 *                   type: string
 *                 whatsappLink:
 *                   type: string
 *                 expira:
 *                   type: string
 */
router.get('/:CotizacionCompraID/pdf-url', validateParams(cotizacionIdParamSchema), (req, res) => cotizacionesCompraController.generarPdfUrl(req, res));

/** @swagger
 * /cotizaciones-compra/{CotizacionCompraID}/whatsapp:
 *   post:
 *     summary: Generar link de WhatsApp con datos de la cotización
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
 *             required: [telefono]
 *             properties:
 *               telefono:
 *                 type: string
 *                 description: Número de teléfono del proveedor
 *               frontendUrl:
 *                 type: string
 *                 description: URL base del frontend (default https://purifreeze.com)
 *     responses:
 *       200:
 *         description: Link de WhatsApp generado
 */
router.post('/:CotizacionCompraID/whatsapp', validateParams(cotizacionIdParamSchema), validateBody(whatsappLinkSchema), (req, res) => cotizacionesCompraController.generarWhatsappLink(req, res));

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

// =============================================
// ACTUALIZAR CANTIDAD DE DETALLE
// =============================================

router.patch('/:CotizacionCompraID/detalles/:DetalleID', validateParams(detalleIdParamSchema), validateBody(actualizarDetalleCantidadSchema), (req, res) => cotizacionesCompraController.actualizarCantidadDetalle(req, res));

// =============================================
// EQUIPOS VIRTUALES EN COTIZACIÓN
// =============================================

/** @swagger
 * /cotizaciones-compra/{CotizacionCompraID}/equipos-virtuales:
 *   post:
 *     summary: Agregar equipo virtual a cotización
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
 *             required: [EquipoVirtualID, PrecioFinal]
 *             properties:
 *               EquipoVirtualID:
 *                 type: integer
 *               PrecioFinal:
 *                 type: number
 *     responses:
 *       201:
 *         description: Equipo virtual agregado
 */
router.post('/:CotizacionCompraID/equipos-virtuales', validateParams(cotizacionIdParamSchema), validateBody(agregarEquipoVirtualSchema), (req, res) => cotizacionesCompraController.agregarEquipoVirtual(req, res));

/** @swagger
 * /cotizaciones-compra/{CotizacionCompraID}/equipos-virtuales/{EquipoVirtualID}:
 *   put:
 *     summary: Actualizar precio de equipo virtual en cotización
 *     tags: [Cotizaciones Compra]
 *     parameters:
 *       - in: path
 *         name: CotizacionCompraID
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: EquipoVirtualID
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [PrecioFinal]
 *             properties:
 *               PrecioFinal:
 *                 type: number
 *     responses:
 *       200:
 *         description: Precio actualizado
 */
router.put('/:CotizacionCompraID/equipos-virtuales/:EquipoVirtualID', validateParams(equipoVirtualIdParamSchema), validateBody(actualizarPrecioEquipoVirtualSchema), (req, res) => cotizacionesCompraController.actualizarPrecioEquipoVirtual(req, res));

/** @swagger
 * /cotizaciones-compra/{CotizacionCompraID}/equipos-virtuales/{EquipoVirtualID}:
 *   delete:
 *     summary: Eliminar equipo virtual de cotización
 *     tags: [Cotizaciones Compra]
 *     parameters:
 *       - in: path
 *         name: CotizacionCompraID
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: EquipoVirtualID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Equipo virtual eliminado de la cotización
 */
router.delete('/:CotizacionCompraID/equipos-virtuales/:EquipoVirtualID', validateParams(equipoVirtualIdParamSchema), (req, res) => cotizacionesCompraController.eliminarEquipoVirtual(req, res));

export default router;
