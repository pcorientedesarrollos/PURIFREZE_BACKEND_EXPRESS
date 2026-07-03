import { Router } from 'express';
import multer from 'multer';
import { facturasController } from './facturas.controller';
import { validateParams, validateQuery, validateBody } from '../../middlewares/validateRequest';
import {
  facturaIdParamSchema,
  emisorIdParamSchema,
  listFacturasQuerySchema,
  listAgrupadasQuerySchema,
  asignarNumeroPedidoSchema,
} from './facturas.schema';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB máximo
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/xml' || file.mimetype === 'application/xml') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos XML'));
    }
  },
});

const router = Router();

/**
 * @swagger
 * /facturas/upload:
 *   post:
 *     summary: Subir XMLs de facturas CFDI 4.0
 *     tags: [Facturas]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               archivos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Resultado del procesamiento
 */
router.post('/upload', upload.array('archivos'), (req, res) => facturasController.upload(req, res));

/**
 * @swagger
 * /facturas:
 *   get:
 *     summary: Listar facturas
 *     tags: [Facturas]
 *     parameters:
 *       - in: query
 *         name: texto
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de facturas
 */
router.get('/', validateQuery(listFacturasQuerySchema), (req, res) => facturasController.findAll(req, res));

/**
 * @swagger
 * /facturas/agrupadas:
 *   get:
 *     summary: Listar facturas agrupadas por emisor
 *     tags: [Facturas]
 *     parameters:
 *       - in: query
 *         name: texto
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de emisores con conteo y suma
 */
router.get('/agrupadas', validateQuery(listAgrupadasQuerySchema), (req, res) => facturasController.findAllAgrupadas(req, res));

/**
 * @swagger
 * /facturas/pedidos-agrupados:
 *   get:
 *     summary: Listar números de pedido registrados en facturas (agrupados por emisor)
 *     tags: [Facturas]
 *     responses:
 *       200:
 *         description: Lista de grupos { NumeroPedido, EmisorFacturaID, RFC, RazonSocial, totalFacturas, sumaTotal }
 */
router.get('/pedidos-agrupados', (req, res) => facturasController.findPedidosAgrupados(req, res));

/**
 * @swagger
 * /facturas/por-numero-pedido:
 *   get:
 *     summary: Facturas de un N° de pedido (por RFC del emisor) con conceptos
 *     tags: [Facturas]
 *     parameters:
 *       - in: query
 *         name: numeroPedido
 *         schema: { type: string }
 *       - in: query
 *         name: rfc
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Facturas del pedido con conceptos
 */
router.get('/por-numero-pedido', (req, res) => facturasController.findByNumeroPedido(req, res));

/**
 * @swagger
 * /facturas/asignar-numero-pedido:
 *   patch:
 *     summary: Asignar un N° de pedido a un lote de facturas (mismo emisor, sin N° previo)
 *     tags: [Facturas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               NumeroPedido: { type: string }
 *               FacturaIDs:
 *                 type: array
 *                 items: { type: integer }
 *     responses:
 *       200:
 *         description: N° de pedido asignado
 *       400:
 *         description: Validación fallida (no existe / inactiva / ya tiene N° / distinto emisor)
 */
router.patch(
  '/asignar-numero-pedido',
  validateBody(asignarNumeroPedidoSchema),
  (req, res) => facturasController.asignarNumeroPedido(req, res),
);

/**
 * @swagger
 * /facturas/{FacturaID}/quitar-numero-pedido:
 *   patch:
 *     summary: Quitar el N° de pedido de una factura (si no está asociada a un pedido)
 *     tags: [Facturas]
 *     parameters:
 *       - in: path
 *         name: FacturaID
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: N° de pedido eliminado
 *       404:
 *         description: Factura no encontrada
 *       409:
 *         description: La factura está asociada a un pedido
 */
router.patch(
  '/:FacturaID/quitar-numero-pedido',
  validateParams(facturaIdParamSchema),
  (req, res) => facturasController.quitarNumeroPedido(req, res),
);

/**
 * @swagger
 * /facturas/{FacturaID}/xml:
 *   get:
 *     summary: Descargar XML original de una factura
 *     tags: [Facturas]
 *     parameters:
 *       - in: path
 *         name: FacturaID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: XML descargado
 *       404:
 *         description: XML no encontrado
 */
router.get('/:FacturaID/xml', validateParams(facturaIdParamSchema), (req, res) => facturasController.getXml(req, res));

/**
 * @swagger
 * /facturas/emisor/{EmisorFacturaID}:
 *   get:
 *     summary: Listar todas las facturas activas de un emisor (drill-down)
 *     tags: [Facturas]
 *     parameters:
 *       - in: path
 *         name: EmisorFacturaID
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Emisor + facturas + meta { total, sumaTotal }
 *       404:
 *         description: Emisor no encontrado
 */
router.get(
  '/emisor/:EmisorFacturaID',
  validateParams(emisorIdParamSchema),
  (req, res) => facturasController.findByEmisor(req, res),
);

/**
 * @swagger
 * /facturas/{FacturaID}:
 *   get:
 *     summary: Obtener factura por ID
 *     tags: [Facturas]
 *     parameters:
 *       - in: path
 *         name: FacturaID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Factura encontrada
 *       404:
 *         description: Factura no encontrada
 */
router.get('/:FacturaID', validateParams(facturaIdParamSchema), (req, res) => facturasController.findOne(req, res));

export default router;
