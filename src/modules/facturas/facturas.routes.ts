import { Router } from 'express';
import multer from 'multer';
import { facturasController } from './facturas.controller';
import { validateParams, validateQuery } from '../../middlewares/validateRequest';
import { facturaIdParamSchema, listFacturasQuerySchema } from './facturas.schema';

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
