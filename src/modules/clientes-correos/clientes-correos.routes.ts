import { Router } from 'express';
import { clientesCorreosController } from './clientes-correos.controller';
import { validateBody, validateParams } from '../../middlewares/validateRequest';
import { createClienteCorreoSchema, updateClienteCorreoSchema, correoIdParamSchema } from './clientes-correos.schema';

const router = Router();

/** @swagger
 * /clientes-correos:
 *   post:
 *     summary: Crear correo de empleado
 *     tags: [Clientes - Correos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ClienteID, EmpleadoID, Correo]
 *             properties:
 *               ClienteID:
 *                 type: integer
 *               EmpleadoID:
 *                 type: integer
 *               Correo:
 *                 type: string
 *                 format: email
 *               TipoCorreo:
 *                 type: string
 *                 enum: [trabajo, personal, otros]
 *               Observaciones:
 *                 type: string
 *     responses:
 *       200:
 *         description: Creado
 */
router.post('/', validateBody(createClienteCorreoSchema), (req, res) => clientesCorreosController.create(req, res));

/** @swagger
 * /clientes-correos:
 *   get:
 *     summary: Obtener todos los correos
 *     tags: [Clientes - Correos]
 *     responses:
 *       200:
 *         description: Lista de correos
 */
router.get('/', (req, res) => clientesCorreosController.findAll(req, res));

/** @swagger
 * /clientes-correos/{CorreoID}:
 *   get:
 *     summary: Obtener correo por ID
 *     tags: [Clientes - Correos]
 *     parameters:
 *       - in: path
 *         name: CorreoID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Encontrado
 *       404:
 *         description: No encontrado
 */
router.get('/:CorreoID', validateParams(correoIdParamSchema), (req, res) => clientesCorreosController.findOne(req, res));

/** @swagger
 * /clientes-correos/{CorreoID}:
 *   put:
 *     summary: Actualizar correo
 *     tags: [Clientes - Correos]
 *     parameters:
 *       - in: path
 *         name: CorreoID
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               Correo:
 *                 type: string
 *               TipoCorreo:
 *                 type: string
 *                 enum: [trabajo, personal, otros]
 *               Observaciones:
 *                 type: string
 *     responses:
 *       200:
 *         description: Actualizado
 */
router.put('/:CorreoID', validateParams(correoIdParamSchema), validateBody(updateClienteCorreoSchema), (req, res) => clientesCorreosController.update(req, res));

/** @swagger
 * /clientes-correos/baja/{CorreoID}:
 *   patch:
 *     summary: Dar de baja correo
 *     tags: [Clientes - Correos]
 *     parameters:
 *       - in: path
 *         name: CorreoID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Dado de baja
 */
router.patch('/baja/:CorreoID', validateParams(correoIdParamSchema), (req, res) => clientesCorreosController.baja(req, res));

/** @swagger
 * /clientes-correos/activar/{CorreoID}:
 *   patch:
 *     summary: Activar correo
 *     tags: [Clientes - Correos]
 *     parameters:
 *       - in: path
 *         name: CorreoID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Activado
 */
router.patch('/activar/:CorreoID', validateParams(correoIdParamSchema), (req, res) => clientesCorreosController.activar(req, res));

export default router;
