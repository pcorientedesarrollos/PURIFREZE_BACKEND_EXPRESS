import { Router } from 'express';
import { ajustesInventarioController } from './ajustes-inventario.controller';
import { validateBody, validateParams } from '../../middlewares/validateRequest';
import {
  createAjusteSchema,
  autorizarAjusteSchema,
  ajusteIdParamSchema,
  tecnicoIdParamSchema,
} from './ajustes-inventario.schema';

const router = Router();

/** @swagger
 * /ajustes-inventario:
 *   post:
 *     summary: Crear solicitud de ajuste de inventario
 *     tags: [Ajustes Inventario]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [TecnicoID, RefaccionID, StockRealNuevo, StockRealUsado, MotivoAjuste, UsuarioSolicitaID]
 *             properties:
 *               TecnicoID:
 *                 type: integer
 *               RefaccionID:
 *                 type: integer
 *               StockRealNuevo:
 *                 type: integer
 *                 minimum: 0
 *               StockRealUsado:
 *                 type: integer
 *                 minimum: 0
 *               MotivoAjuste:
 *                 type: string
 *                 enum: [Perdida, Error_Captura, Robo, Deterioro, Sobrante, Otro]
 *               Observaciones:
 *                 type: string
 *               UsuarioSolicitaID:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Solicitud creada
 */
router.post('/', validateBody(createAjusteSchema), (req, res) => ajustesInventarioController.create(req, res));

/** @swagger
 * /ajustes-inventario:
 *   get:
 *     summary: Obtener todos los ajustes
 *     tags: [Ajustes Inventario]
 *     parameters:
 *       - in: query
 *         name: estatus
 *         schema:
 *           type: string
 *           enum: [Pendiente, Autorizado, Rechazado]
 *     responses:
 *       200:
 *         description: Lista de ajustes
 */
router.get('/', (req, res) => ajustesInventarioController.findAll(req, res));

/** @swagger
 * /ajustes-inventario/pendientes:
 *   get:
 *     summary: Obtener ajustes pendientes de autorización
 *     tags: [Ajustes Inventario]
 *     responses:
 *       200:
 *         description: Lista de ajustes pendientes
 */
router.get('/pendientes', (req, res) => ajustesInventarioController.findPendientes(req, res));

/** @swagger
 * /ajustes-inventario/reporte:
 *   get:
 *     summary: Reporte de ajustes (análisis de pérdidas)
 *     tags: [Ajustes Inventario]
 *     parameters:
 *       - in: query
 *         name: fechaInicio
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: fechaFin
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: tecnicoId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: motivo
 *         schema:
 *           type: string
 *           enum: [Perdida, Error_Captura, Robo, Deterioro, Sobrante, Otro]
 *     responses:
 *       200:
 *         description: Reporte de ajustes
 */
router.get('/reporte', (req, res) => ajustesInventarioController.reporteAjustes(req, res));

/** @swagger
 * /ajustes-inventario/tecnico/{TecnicoID}:
 *   get:
 *     summary: Obtener ajustes de un técnico
 *     tags: [Ajustes Inventario]
 *     parameters:
 *       - in: path
 *         name: TecnicoID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Ajustes del técnico
 */
router.get('/tecnico/:TecnicoID', validateParams(tecnicoIdParamSchema), (req, res) => ajustesInventarioController.findByTecnico(req, res));

/** @swagger
 * /ajustes-inventario/{AjusteID}:
 *   get:
 *     summary: Obtener detalle de un ajuste
 *     tags: [Ajustes Inventario]
 *     parameters:
 *       - in: path
 *         name: AjusteID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Ajuste encontrado
 *       404:
 *         description: No encontrado
 */
router.get('/:AjusteID', validateParams(ajusteIdParamSchema), (req, res) => ajustesInventarioController.findOne(req, res));

/** @swagger
 * /ajustes-inventario/{AjusteID}/autorizar:
 *   post:
 *     summary: Autorizar o rechazar un ajuste
 *     tags: [Ajustes Inventario]
 *     parameters:
 *       - in: path
 *         name: AjusteID
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [UsuarioAutorizaID, Autorizado]
 *             properties:
 *               UsuarioAutorizaID:
 *                 type: integer
 *               Autorizado:
 *                 type: boolean
 *               Observaciones:
 *                 type: string
 *     responses:
 *       200:
 *         description: Ajuste procesado
 */
router.post('/:AjusteID/autorizar', validateParams(ajusteIdParamSchema), validateBody(autorizarAjusteSchema), (req, res) => ajustesInventarioController.autorizar(req, res));

/** @swagger
 * /ajustes-inventario/{AjusteID}/cancelar:
 *   delete:
 *     summary: Cancelar solicitud pendiente
 *     tags: [Ajustes Inventario]
 *     parameters:
 *       - in: path
 *         name: AjusteID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Ajuste cancelado
 */
router.delete('/:AjusteID/cancelar', validateParams(ajusteIdParamSchema), (req, res) => ajustesInventarioController.cancelar(req, res));

export default router;
