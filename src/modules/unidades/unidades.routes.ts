import { Router } from 'express';
import { unidadesController } from './unidades.controller';
import { validateBody, validateParams } from '../../middlewares/validateRequest';
import { createUnidadSchema, updateUnidadSchema, unidadIdParamSchema } from './unidades.schema';

const router = Router();

/**
 * @swagger
 * /unidades:
 *   post:
 *     summary: Crear una nueva unidad
 *     tags: [Unidades]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [DesUnidad, EsFraccionable, DecUnidad, Observaciones]
 *             properties:
 *               DesUnidad:
 *                 type: string
 *                 example: Pieza
 *               EsFraccionable:
 *                 type: boolean
 *                 example: false
 *               DecUnidad:
 *                 type: string
 *                 example: PZA
 *               Observaciones:
 *                 type: string
 *     responses:
 *       200:
 *         description: Unidad creada
 *       300:
 *         description: Ya existe
 */
router.post('/', validateBody(createUnidadSchema), (req, res) => unidadesController.create(req, res));

/**
 * @swagger
 * /unidades:
 *   get:
 *     summary: Obtener todas las unidades
 *     tags: [Unidades]
 *     responses:
 *       200:
 *         description: Lista de unidades
 */
router.get('/', (req, res) => unidadesController.findAll(req, res));

/**
 * @swagger
 * /unidades/{UnidadID}:
 *   get:
 *     summary: Obtener una unidad por ID
 *     tags: [Unidades]
 *     parameters:
 *       - in: path
 *         name: UnidadID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Unidad encontrada
 *       404:
 *         description: No encontrada
 */
router.get('/:UnidadID', validateParams(unidadIdParamSchema), (req, res) => unidadesController.findOne(req, res));

/**
 * @swagger
 * /unidades/{UnidadID}:
 *   put:
 *     summary: Actualizar una unidad
 *     tags: [Unidades]
 *     parameters:
 *       - in: path
 *         name: UnidadID
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               DesUnidad:
 *                 type: string
 *               EsFraccionable:
 *                 type: boolean
 *               DecUnidad:
 *                 type: string
 *               Observaciones:
 *                 type: string
 *     responses:
 *       200:
 *         description: Actualizada
 *       404:
 *         description: No encontrada
 */
router.put('/:UnidadID', validateParams(unidadIdParamSchema), validateBody(updateUnidadSchema), (req, res) => unidadesController.update(req, res));

/**
 * @swagger
 * /unidades/baja/{UnidadID}:
 *   patch:
 *     summary: Dar de baja una unidad
 *     tags: [Unidades]
 *     parameters:
 *       - in: path
 *         name: UnidadID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Dada de baja
 *       300:
 *         description: Ya está dada de baja
 *       404:
 *         description: No existe
 */
router.patch('/baja/:UnidadID', validateParams(unidadIdParamSchema), (req, res) => unidadesController.baja(req, res));

/**
 * @swagger
 * /unidades/activar/{UnidadID}:
 *   patch:
 *     summary: Activar una unidad
 *     tags: [Unidades]
 *     parameters:
 *       - in: path
 *         name: UnidadID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Activada
 *       300:
 *         description: Ya está activa
 *       404:
 *         description: No existe
 */
router.patch('/activar/:UnidadID', validateParams(unidadIdParamSchema), (req, res) => unidadesController.activar(req, res));

export default router;
