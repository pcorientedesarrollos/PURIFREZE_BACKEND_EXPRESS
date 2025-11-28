import { Router } from 'express';
import { clientesDireccionesController } from './clientes-direcciones.controller';
import { validateBody, validateParams } from '../../middlewares/validateRequest';
import { createClienteDireccionSchema, updateClienteDireccionSchema, direccionIdParamSchema, clienteIdParamSchema } from './clientes-direcciones.schema';

const router = Router();

/** @swagger
 * /clientes-direcciones:
 *   post:
 *     summary: Crear dirección de cliente
 *     tags: [Clientes - Direcciones]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ClienteID, Direccion]
 *             properties:
 *               ClienteID:
 *                 type: integer
 *               Direccion:
 *                 type: string
 *               Ubicacion:
 *                 type: string
 *               Observaciones:
 *                 type: string
 *     responses:
 *       200:
 *         description: Creada
 */
router.post('/', validateBody(createClienteDireccionSchema), (req, res) => clientesDireccionesController.create(req, res));

/** @swagger
 * /clientes-direcciones:
 *   get:
 *     summary: Obtener todas las direcciones
 *     tags: [Clientes - Direcciones]
 *     responses:
 *       200:
 *         description: Lista de direcciones
 */
router.get('/', (req, res) => clientesDireccionesController.findAll(req, res));

/** @swagger
 * /clientes-direcciones/{DireccionID}:
 *   get:
 *     summary: Obtener dirección por ID
 *     tags: [Clientes - Direcciones]
 *     parameters:
 *       - in: path
 *         name: DireccionID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Encontrada
 *       404:
 *         description: No encontrada
 */
router.get('/:DireccionID', validateParams(direccionIdParamSchema), (req, res) => clientesDireccionesController.findOne(req, res));

/** @swagger
 * /clientes-direcciones/cliente/{ClienteID}:
 *   get:
 *     summary: Obtener direcciones por ClienteID
 *     tags: [Clientes - Direcciones]
 *     parameters:
 *       - in: path
 *         name: ClienteID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de direcciones del cliente
 */
router.get('/cliente/:ClienteID', validateParams(clienteIdParamSchema), (req, res) => clientesDireccionesController.findByClienteID(req, res));

/** @swagger
 * /clientes-direcciones/{DireccionID}:
 *   put:
 *     summary: Actualizar dirección
 *     tags: [Clientes - Direcciones]
 *     parameters:
 *       - in: path
 *         name: DireccionID
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               Direccion:
 *                 type: string
 *               Ubicacion:
 *                 type: string
 *               Observaciones:
 *                 type: string
 *     responses:
 *       200:
 *         description: Actualizada
 */
router.put('/:DireccionID', validateParams(direccionIdParamSchema), validateBody(updateClienteDireccionSchema), (req, res) => clientesDireccionesController.update(req, res));

/** @swagger
 * /clientes-direcciones/baja/{DireccionID}:
 *   patch:
 *     summary: Dar de baja dirección
 *     tags: [Clientes - Direcciones]
 *     parameters:
 *       - in: path
 *         name: DireccionID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Dada de baja
 */
router.patch('/baja/:DireccionID', validateParams(direccionIdParamSchema), (req, res) => clientesDireccionesController.baja(req, res));

/** @swagger
 * /clientes-direcciones/activar/{DireccionID}:
 *   patch:
 *     summary: Activar dirección
 *     tags: [Clientes - Direcciones]
 *     parameters:
 *       - in: path
 *         name: DireccionID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Activada
 */
router.patch('/activar/:DireccionID', validateParams(direccionIdParamSchema), (req, res) => clientesDireccionesController.activar(req, res));

export default router;
