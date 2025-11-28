import { Router } from 'express';
import { clasificacionRefaccionesController } from './clasificacion-refacciones.controller';
import { validateBody, validateParams } from '../../middlewares/validateRequest';
import { createClasificacionRefaccionSchema, updateClasificacionRefaccionSchema, clasificacionRefaccionIdParamSchema } from './clasificacion-refacciones.schema';

const router = Router();

/** @swagger
 * /clasificacion-refacciones:
 *   post:
 *     summary: Crear clasificación de refacciones
 *     tags: [Clasificación Refacciones]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [NombreClasificacion]
 *             properties:
 *               NombreClasificacion:
 *                 type: string
 *                 example: Filtros
 *               Observaciones:
 *                 type: string
 *     responses:
 *       200:
 *         description: Creada
 */
router.post('/', validateBody(createClasificacionRefaccionSchema), (req, res) => clasificacionRefaccionesController.create(req, res));

/** @swagger
 * /clasificacion-refacciones:
 *   get:
 *     summary: Obtener todas las clasificaciones
 *     tags: [Clasificación Refacciones]
 *     responses:
 *       200:
 *         description: Lista de clasificaciones
 */
router.get('/', (req, res) => clasificacionRefaccionesController.findAll(req, res));

/** @swagger
 * /clasificacion-refacciones/{ClasificacionRefaccionID}:
 *   get:
 *     summary: Obtener clasificación por ID
 *     tags: [Clasificación Refacciones]
 *     parameters:
 *       - in: path
 *         name: ClasificacionRefaccionID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Encontrada
 *       404:
 *         description: No encontrada
 */
router.get('/:ClasificacionRefaccionID', validateParams(clasificacionRefaccionIdParamSchema), (req, res) => clasificacionRefaccionesController.findOne(req, res));

/** @swagger
 * /clasificacion-refacciones/{ClasificacionRefaccionID}:
 *   put:
 *     summary: Actualizar clasificación
 *     tags: [Clasificación Refacciones]
 *     parameters:
 *       - in: path
 *         name: ClasificacionRefaccionID
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               NombreClasificacion:
 *                 type: string
 *               Observaciones:
 *                 type: string
 *     responses:
 *       200:
 *         description: Actualizada
 *       404:
 *         description: No encontrada
 */
router.put('/:ClasificacionRefaccionID', validateParams(clasificacionRefaccionIdParamSchema), validateBody(updateClasificacionRefaccionSchema), (req, res) => clasificacionRefaccionesController.update(req, res));

/** @swagger
 * /clasificacion-refacciones/baja/{ClasificacionRefaccionID}:
 *   patch:
 *     summary: Dar de baja clasificación
 *     tags: [Clasificación Refacciones]
 *     parameters:
 *       - in: path
 *         name: ClasificacionRefaccionID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Dada de baja
 */
router.patch('/baja/:ClasificacionRefaccionID', validateParams(clasificacionRefaccionIdParamSchema), (req, res) => clasificacionRefaccionesController.baja(req, res));

/** @swagger
 * /clasificacion-refacciones/activar/{ClasificacionRefaccionID}:
 *   patch:
 *     summary: Activar clasificación
 *     tags: [Clasificación Refacciones]
 *     parameters:
 *       - in: path
 *         name: ClasificacionRefaccionID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Activada
 */
router.patch('/activar/:ClasificacionRefaccionID', validateParams(clasificacionRefaccionIdParamSchema), (req, res) => clasificacionRefaccionesController.activar(req, res));

export default router;
