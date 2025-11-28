import { Router } from 'express';
import { refaccionesController } from './refacciones.controller';
import { validateBody, validateParams } from '../../middlewares/validateRequest';
import { createRefaccionSchema, updateRefaccionSchema, refaccionIdParamSchema } from './refacciones.schema';

const router = Router();

/** @swagger
 * /refacciones:
 *   post:
 *     summary: Crear refacción
 *     tags: [Refacciones]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ClasificacionRefaccionID, UnidadID, NombrePieza, NombreCorto, Modelo, Codigo]
 *             properties:
 *               ClasificacionRefaccionID:
 *                 type: integer
 *               UnidadID:
 *                 type: integer
 *               NombrePieza:
 *                 type: string
 *                 maxLength: 255
 *               NombreCorto:
 *                 type: string
 *                 maxLength: 255
 *               Modelo:
 *                 type: string
 *                 maxLength: 255
 *               Codigo:
 *                 type: string
 *                 maxLength: 255
 *               Observaciones:
 *                 type: string
 *                 maxLength: 255
 *     responses:
 *       200:
 *         description: Creada
 */
router.post('/', validateBody(createRefaccionSchema), (req, res) => refaccionesController.create(req, res));

/** @swagger
 * /refacciones:
 *   get:
 *     summary: Obtener todas las refacciones
 *     tags: [Refacciones]
 *     responses:
 *       200:
 *         description: Lista de refacciones
 */
router.get('/', (req, res) => refaccionesController.findAll(req, res));

/** @swagger
 * /refacciones/{RefaccionID}:
 *   get:
 *     summary: Obtener refacción por ID
 *     tags: [Refacciones]
 *     parameters:
 *       - in: path
 *         name: RefaccionID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Encontrada
 *       404:
 *         description: No encontrada
 */
router.get('/:RefaccionID', validateParams(refaccionIdParamSchema), (req, res) => refaccionesController.findOne(req, res));

/** @swagger
 * /refacciones/{RefaccionID}:
 *   put:
 *     summary: Actualizar refacción
 *     tags: [Refacciones]
 *     parameters:
 *       - in: path
 *         name: RefaccionID
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ClasificacionRefaccionID:
 *                 type: integer
 *               UnidadID:
 *                 type: integer
 *               NombrePieza:
 *                 type: string
 *               NombreCorto:
 *                 type: string
 *               Modelo:
 *                 type: string
 *               Codigo:
 *                 type: string
 *               Observaciones:
 *                 type: string
 *     responses:
 *       200:
 *         description: Actualizada
 */
router.put('/:RefaccionID', validateParams(refaccionIdParamSchema), validateBody(updateRefaccionSchema), (req, res) => refaccionesController.update(req, res));

/** @swagger
 * /refacciones/baja/{RefaccionID}:
 *   patch:
 *     summary: Dar de baja refacción
 *     tags: [Refacciones]
 *     parameters:
 *       - in: path
 *         name: RefaccionID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Dada de baja
 */
router.patch('/baja/:RefaccionID', validateParams(refaccionIdParamSchema), (req, res) => refaccionesController.baja(req, res));

/** @swagger
 * /refacciones/activar/{RefaccionID}:
 *   patch:
 *     summary: Activar refacción
 *     tags: [Refacciones]
 *     parameters:
 *       - in: path
 *         name: RefaccionID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Activada
 */
router.patch('/activar/:RefaccionID', validateParams(refaccionIdParamSchema), (req, res) => refaccionesController.activar(req, res));

export default router;
