import { Router } from 'express';
import { clientesController } from './clientes.controller';
import { validateBody, validateParams } from '../../middlewares/validateRequest';
import { createClienteSchema, updateClienteSchema, clienteIdParamSchema } from './clientes.schema';

const router = Router();

/** @swagger
 * /clientes:
 *   post:
 *     summary: Crear cliente
 *     tags: [Clientes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [NombreComercio]
 *             properties:
 *               NombreComercio:
 *                 type: string
 *                 example: Cliente ABC
 *               Observaciones:
 *                 type: string
 *               Direccion:
 *                 type: string
 *               Ubicacion:
 *                 type: string
 *     responses:
 *       200:
 *         description: Creado
 */
router.post('/', validateBody(createClienteSchema), (req, res) => clientesController.create(req, res));

/** @swagger
 * /clientes:
 *   get:
 *     summary: Obtener todos los clientes
 *     tags: [Clientes]
 *     responses:
 *       200:
 *         description: Lista de clientes
 */
router.get('/', (req, res) => clientesController.findAll(req, res));

/** @swagger
 * /clientes/{ClienteID}:
 *   get:
 *     summary: Obtener cliente por ID
 *     tags: [Clientes]
 *     parameters:
 *       - in: path
 *         name: ClienteID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Encontrado
 *       404:
 *         description: No encontrado
 */
router.get('/:ClienteID', validateParams(clienteIdParamSchema), (req, res) => clientesController.findOne(req, res));

/** @swagger
 * /clientes/{ClienteID}:
 *   put:
 *     summary: Actualizar cliente
 *     tags: [Clientes]
 *     parameters:
 *       - in: path
 *         name: ClienteID
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               NombreComercio:
 *                 type: string
 *               Observaciones:
 *                 type: string
 *     responses:
 *       200:
 *         description: Actualizado
 *       404:
 *         description: No encontrado
 */
router.put('/:ClienteID', validateParams(clienteIdParamSchema), validateBody(updateClienteSchema), (req, res) => clientesController.update(req, res));

/** @swagger
 * /clientes/baja/{ClienteID}:
 *   patch:
 *     summary: Dar de baja cliente
 *     tags: [Clientes]
 *     parameters:
 *       - in: path
 *         name: ClienteID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Dado de baja
 */
router.patch('/baja/:ClienteID', validateParams(clienteIdParamSchema), (req, res) => clientesController.baja(req, res));

/** @swagger
 * /clientes/activar/{ClienteID}:
 *   patch:
 *     summary: Activar cliente
 *     tags: [Clientes]
 *     parameters:
 *       - in: path
 *         name: ClienteID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Activado
 */
router.patch('/activar/:ClienteID', validateParams(clienteIdParamSchema), (req, res) => clientesController.activar(req, res));

export default router;
