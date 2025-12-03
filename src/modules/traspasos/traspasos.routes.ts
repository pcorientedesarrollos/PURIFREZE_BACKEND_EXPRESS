import { Router } from 'express';
import { traspasosController } from './traspasos.controller';
import { validateBody, validateParams } from '../../middlewares/validateRequest';
import {
  createTraspasoSchema,
  autorizarTraspasoSchema,
  traspasoIdParamSchema,
  tecnicoIdParamSchema,
} from './traspasos.schema';

const router = Router();

/** @swagger
 * /traspasos:
 *   post:
 *     summary: Crear solicitud de traspaso
 *     tags: [Traspasos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [TipoTraspaso, OrigenTipo, DestinoTipo, UsuarioSolicitaID, Detalle]
 *             properties:
 *               TipoTraspaso:
 *                 type: string
 *                 enum: [Bodega_Tecnico, Tecnico_Bodega, Tecnico_Tecnico]
 *               OrigenTipo:
 *                 type: string
 *                 enum: [Bodega, Tecnico]
 *               OrigenID:
 *                 type: integer
 *                 nullable: true
 *               DestinoTipo:
 *                 type: string
 *                 enum: [Bodega, Tecnico]
 *               DestinoID:
 *                 type: integer
 *                 nullable: true
 *               UsuarioSolicitaID:
 *                 type: integer
 *               Observaciones:
 *                 type: string
 *               Detalle:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     RefaccionID:
 *                       type: integer
 *                     CantidadNuevo:
 *                       type: integer
 *                     CantidadUsado:
 *                       type: integer
 *     responses:
 *       201:
 *         description: Solicitud creada
 */
router.post('/', validateBody(createTraspasoSchema), (req, res) => traspasosController.create(req, res));

/** @swagger
 * /traspasos:
 *   get:
 *     summary: Obtener todos los traspasos
 *     tags: [Traspasos]
 *     parameters:
 *       - in: query
 *         name: estatus
 *         schema:
 *           type: string
 *           enum: [Pendiente, Autorizado, Rechazado]
 *       - in: query
 *         name: tipo
 *         schema:
 *           type: string
 *           enum: [Bodega_Tecnico, Tecnico_Bodega, Tecnico_Tecnico]
 *     responses:
 *       200:
 *         description: Lista de traspasos
 */
router.get('/', (req, res) => traspasosController.findAll(req, res));

/** @swagger
 * /traspasos/pendientes:
 *   get:
 *     summary: Obtener traspasos pendientes de autorización
 *     tags: [Traspasos]
 *     responses:
 *       200:
 *         description: Lista de traspasos pendientes
 */
router.get('/pendientes', (req, res) => traspasosController.findPendientes(req, res));

/** @swagger
 * /traspasos/tecnico/{TecnicoID}:
 *   get:
 *     summary: Obtener traspasos de un técnico
 *     tags: [Traspasos]
 *     parameters:
 *       - in: path
 *         name: TecnicoID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Traspasos del técnico
 */
router.get('/tecnico/:TecnicoID', validateParams(tecnicoIdParamSchema), (req, res) => traspasosController.findByTecnico(req, res));

/** @swagger
 * /traspasos/{TraspasoEncabezadoID}:
 *   get:
 *     summary: Obtener detalle de un traspaso
 *     tags: [Traspasos]
 *     parameters:
 *       - in: path
 *         name: TraspasoEncabezadoID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Detalle del traspaso
 *       404:
 *         description: No encontrado
 */
router.get('/:TraspasoEncabezadoID', validateParams(traspasoIdParamSchema), (req, res) => traspasosController.findOne(req, res));

/** @swagger
 * /traspasos/{TraspasoEncabezadoID}/autorizar:
 *   post:
 *     summary: Autorizar o rechazar un traspaso
 *     tags: [Traspasos]
 *     parameters:
 *       - in: path
 *         name: TraspasoEncabezadoID
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
 *         description: Traspaso procesado
 */
router.post('/:TraspasoEncabezadoID/autorizar', validateParams(traspasoIdParamSchema), validateBody(autorizarTraspasoSchema), (req, res) => traspasosController.autorizar(req, res));

/** @swagger
 * /traspasos/{TraspasoEncabezadoID}/cancelar:
 *   delete:
 *     summary: Cancelar solicitud pendiente
 *     tags: [Traspasos]
 *     parameters:
 *       - in: path
 *         name: TraspasoEncabezadoID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Traspaso cancelado
 *       300:
 *         description: No se puede cancelar
 */
router.delete('/:TraspasoEncabezadoID/cancelar', validateParams(traspasoIdParamSchema), (req, res) => traspasosController.cancelar(req, res));

export default router;
