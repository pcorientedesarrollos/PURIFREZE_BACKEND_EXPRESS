import { Router } from 'express';
import { puestosTrabajoController } from './puestos-trabajo.controller';
import { validateBody, validateParams } from '../../middlewares/validateRequest';
import { createPuestoTrabajoSchema, updatePuestoTrabajoSchema, puestoTrabajoIdParamSchema } from './puestos-trabajo.schema';

const router = Router();

/** @swagger
 * /puestos-trabajo:
 *   post:
 *     summary: Crear puesto de trabajo
 *     tags: [Puestos de Trabajo]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [PuestoTrabajo]
 *             properties:
 *               PuestoTrabajo:
 *                 type: string
 *                 example: Gerente
 *               Observaciones:
 *                 type: string
 *     responses:
 *       200:
 *         description: Creado
 */
router.post('/', validateBody(createPuestoTrabajoSchema), (req, res) => puestosTrabajoController.create(req, res));

/** @swagger
 * /puestos-trabajo:
 *   get:
 *     summary: Obtener todos los puestos
 *     tags: [Puestos de Trabajo]
 *     responses:
 *       200:
 *         description: Lista de puestos
 */
router.get('/', (req, res) => puestosTrabajoController.findAll(req, res));

/** @swagger
 * /puestos-trabajo/{PuestoTrabajoID}:
 *   get:
 *     summary: Obtener puesto por ID
 *     tags: [Puestos de Trabajo]
 *     parameters:
 *       - in: path
 *         name: PuestoTrabajoID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Encontrado
 *       404:
 *         description: No encontrado
 */
router.get('/:PuestoTrabajoID', validateParams(puestoTrabajoIdParamSchema), (req, res) => puestosTrabajoController.findOne(req, res));

/** @swagger
 * /puestos-trabajo/{PuestoTrabajoID}:
 *   put:
 *     summary: Actualizar puesto
 *     tags: [Puestos de Trabajo]
 *     parameters:
 *       - in: path
 *         name: PuestoTrabajoID
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               PuestoTrabajo:
 *                 type: string
 *               Observaciones:
 *                 type: string
 *     responses:
 *       200:
 *         description: Actualizado
 *       404:
 *         description: No encontrado
 */
router.put('/:PuestoTrabajoID', validateParams(puestoTrabajoIdParamSchema), validateBody(updatePuestoTrabajoSchema), (req, res) => puestosTrabajoController.update(req, res));

/** @swagger
 * /puestos-trabajo/baja/{PuestoTrabajoID}:
 *   patch:
 *     summary: Dar de baja puesto
 *     tags: [Puestos de Trabajo]
 *     parameters:
 *       - in: path
 *         name: PuestoTrabajoID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Dado de baja
 */
router.patch('/baja/:PuestoTrabajoID', validateParams(puestoTrabajoIdParamSchema), (req, res) => puestosTrabajoController.baja(req, res));

/** @swagger
 * /puestos-trabajo/activar/{PuestoTrabajoID}:
 *   patch:
 *     summary: Activar puesto
 *     tags: [Puestos de Trabajo]
 *     parameters:
 *       - in: path
 *         name: PuestoTrabajoID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Activado
 */
router.patch('/activar/:PuestoTrabajoID', validateParams(puestoTrabajoIdParamSchema), (req, res) => puestosTrabajoController.activar(req, res));

export default router;
