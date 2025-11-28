import { Router } from 'express';
import { metodosPagoController } from './metodos-pago.controller';
import { validateBody, validateParams } from '../../middlewares/validateRequest';
import { createMetodoPagoSchema, updateMetodoPagoSchema, metodoPagoIdParamSchema } from './metodos-pago.schema';

const router = Router();

/** @swagger
 * /metodos-pago:
 *   post:
 *     summary: Crear un nuevo método de pago
 *     tags: [Métodos de Pago]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [Descripcion]
 *             properties:
 *               Descripcion:
 *                 type: string
 *                 example: Transferencia
 *               EsBancario:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Creado
 *       300:
 *         description: Ya existe
 */
router.post('/', validateBody(createMetodoPagoSchema), (req, res) => metodosPagoController.create(req, res));

/** @swagger
 * /metodos-pago:
 *   get:
 *     summary: Obtener todos los métodos de pago
 *     tags: [Métodos de Pago]
 *     responses:
 *       200:
 *         description: Lista de métodos
 */
router.get('/', (req, res) => metodosPagoController.findAll(req, res));

/** @swagger
 * /metodos-pago/{MetodosDePagoID}:
 *   get:
 *     summary: Obtener método de pago por ID
 *     tags: [Métodos de Pago]
 *     parameters:
 *       - in: path
 *         name: MetodosDePagoID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Encontrado
 *       404:
 *         description: No encontrado
 */
router.get('/:MetodosDePagoID', validateParams(metodoPagoIdParamSchema), (req, res) => metodosPagoController.findOne(req, res));

/** @swagger
 * /metodos-pago/{MetodosDePagoID}:
 *   put:
 *     summary: Actualizar método de pago
 *     tags: [Métodos de Pago]
 *     parameters:
 *       - in: path
 *         name: MetodosDePagoID
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               Descripcion:
 *                 type: string
 *               EsBancario:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Actualizado
 *       404:
 *         description: No encontrado
 */
router.put('/:MetodosDePagoID', validateParams(metodoPagoIdParamSchema), validateBody(updateMetodoPagoSchema), (req, res) => metodosPagoController.update(req, res));

/** @swagger
 * /metodos-pago/baja/{MetodosDePagoID}:
 *   patch:
 *     summary: Dar de baja método de pago
 *     tags: [Métodos de Pago]
 *     parameters:
 *       - in: path
 *         name: MetodosDePagoID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Dado de baja
 *       300:
 *         description: Ya dado de baja
 *       404:
 *         description: No existe
 */
router.patch('/baja/:MetodosDePagoID', validateParams(metodoPagoIdParamSchema), (req, res) => metodosPagoController.baja(req, res));

/** @swagger
 * /metodos-pago/activar/{MetodosDePagoID}:
 *   patch:
 *     summary: Activar método de pago
 *     tags: [Métodos de Pago]
 *     parameters:
 *       - in: path
 *         name: MetodosDePagoID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Activado
 *       300:
 *         description: Ya activo
 *       404:
 *         description: No existe
 */
router.patch('/activar/:MetodosDePagoID', validateParams(metodoPagoIdParamSchema), (req, res) => metodosPagoController.activar(req, res));

export default router;
