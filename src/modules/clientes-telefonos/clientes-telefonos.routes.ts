import { Router } from 'express';
import { clientesTelefonosController } from './clientes-telefonos.controller';
import { validateBody, validateParams } from '../../middlewares/validateRequest';
import { createClienteTelefonoSchema, updateClienteTelefonoSchema, telefonoIdParamSchema, empleadoIdParamSchema } from './clientes-telefonos.schema';

const router = Router();

/** @swagger
 * /clientes-telefonos:
 *   post:
 *     summary: Crear teléfono de empleado
 *     tags: [Clientes - Teléfonos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [EmpleadoID, Telefono]
 *             properties:
 *               EmpleadoID:
 *                 type: integer
 *               Telefono:
 *                 type: string
 *               Tipo:
 *                 type: string
 *                 enum: [Trabajo, Personal, Otros, Ejemplo]
 *     responses:
 *       200:
 *         description: Creado
 */
router.post('/', validateBody(createClienteTelefonoSchema), (req, res) => clientesTelefonosController.create(req, res));

/** @swagger
 * /clientes-telefonos:
 *   get:
 *     summary: Obtener todos los teléfonos
 *     tags: [Clientes - Teléfonos]
 *     responses:
 *       200:
 *         description: Lista de teléfonos
 */
router.get('/', (req, res) => clientesTelefonosController.findAll(req, res));

/** @swagger
 * /clientes-telefonos/empleado/{EmpleadoID}:
 *   get:
 *     summary: Obtener teléfonos por EmpleadoID
 *     tags: [Clientes - Teléfonos]
 *     parameters:
 *       - in: path
 *         name: EmpleadoID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de teléfonos del empleado
 */
router.get('/empleado/:EmpleadoID', validateParams(empleadoIdParamSchema), (req, res) => clientesTelefonosController.findByEmpleadoID(req, res));

/** @swagger
 * /clientes-telefonos/{TelefonoID}:
 *   get:
 *     summary: Obtener teléfono por ID
 *     tags: [Clientes - Teléfonos]
 *     parameters:
 *       - in: path
 *         name: TelefonoID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Encontrado
 *       404:
 *         description: No encontrado
 */
router.get('/:TelefonoID', validateParams(telefonoIdParamSchema), (req, res) => clientesTelefonosController.findOne(req, res));

/** @swagger
 * /clientes-telefonos/{TelefonoID}:
 *   put:
 *     summary: Actualizar teléfono
 *     tags: [Clientes - Teléfonos]
 *     parameters:
 *       - in: path
 *         name: TelefonoID
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               Telefono:
 *                 type: string
 *               Tipo:
 *                 type: string
 *                 enum: [Trabajo, Personal, Otros, Ejemplo]
 *     responses:
 *       200:
 *         description: Actualizado
 */
router.put('/:TelefonoID', validateParams(telefonoIdParamSchema), validateBody(updateClienteTelefonoSchema), (req, res) => clientesTelefonosController.update(req, res));

/** @swagger
 * /clientes-telefonos/baja/{TelefonoID}:
 *   patch:
 *     summary: Dar de baja teléfono
 *     tags: [Clientes - Teléfonos]
 *     parameters:
 *       - in: path
 *         name: TelefonoID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Dado de baja
 */
router.patch('/baja/:TelefonoID', validateParams(telefonoIdParamSchema), (req, res) => clientesTelefonosController.baja(req, res));

/** @swagger
 * /clientes-telefonos/activar/{TelefonoID}:
 *   patch:
 *     summary: Activar teléfono
 *     tags: [Clientes - Teléfonos]
 *     parameters:
 *       - in: path
 *         name: TelefonoID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Activado
 */
router.patch('/activar/:TelefonoID', validateParams(telefonoIdParamSchema), (req, res) => clientesTelefonosController.activar(req, res));

export default router;
