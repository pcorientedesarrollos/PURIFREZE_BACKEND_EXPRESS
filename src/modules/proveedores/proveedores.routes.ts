import { Router } from 'express';
import { proveedoresController } from './proveedores.controller';
import { validateBody, validateParams } from '../../middlewares/validateRequest';
import { createProveedorSchema, updateProveedorSchema, proveedorIdParamSchema } from './proveedores.schema';

const router = Router();

/** @swagger
 * /proveedores:
 *   post:
 *     summary: Crear proveedor
 *     tags: [Proveedores]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [NombreProveedor]
 *             properties:
 *               NombreProveedor:
 *                 type: string
 *                 example: Proveedor ABC
 *               Direccion:
 *                 type: string
 *               Telefono:
 *                 type: string
 *               Contacto:
 *                 type: string
 *               Pais:
 *                 type: string
 *               Correo:
 *                 type: string
 *                 format: email
 *               Observaciones:
 *                 type: string
 *     responses:
 *       200:
 *         description: Creado
 */
router.post('/', validateBody(createProveedorSchema), (req, res) => proveedoresController.create(req, res));

/** @swagger
 * /proveedores:
 *   get:
 *     summary: Obtener todos los proveedores
 *     tags: [Proveedores]
 *     responses:
 *       200:
 *         description: Lista de proveedores
 */
router.get('/', (req, res) => proveedoresController.findAll(req, res));

/** @swagger
 * /proveedores/{ProveedorID}:
 *   get:
 *     summary: Obtener proveedor por ID
 *     tags: [Proveedores]
 *     parameters:
 *       - in: path
 *         name: ProveedorID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Encontrado
 *       404:
 *         description: No encontrado
 */
router.get('/:ProveedorID', validateParams(proveedorIdParamSchema), (req, res) => proveedoresController.findOne(req, res));

/** @swagger
 * /proveedores/{ProveedorID}:
 *   put:
 *     summary: Actualizar proveedor
 *     tags: [Proveedores]
 *     parameters:
 *       - in: path
 *         name: ProveedorID
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               NombreProveedor:
 *                 type: string
 *               Direccion:
 *                 type: string
 *               Telefono:
 *                 type: string
 *               Contacto:
 *                 type: string
 *               Pais:
 *                 type: string
 *               Correo:
 *                 type: string
 *               Observaciones:
 *                 type: string
 *     responses:
 *       200:
 *         description: Actualizado
 *       404:
 *         description: No encontrado
 */
router.put('/:ProveedorID', validateParams(proveedorIdParamSchema), validateBody(updateProveedorSchema), (req, res) => proveedoresController.update(req, res));

/** @swagger
 * /proveedores/baja/{ProveedorID}:
 *   patch:
 *     summary: Dar de baja proveedor
 *     tags: [Proveedores]
 *     parameters:
 *       - in: path
 *         name: ProveedorID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Dado de baja
 */
router.patch('/baja/:ProveedorID', validateParams(proveedorIdParamSchema), (req, res) => proveedoresController.baja(req, res));

/** @swagger
 * /proveedores/activar/{ProveedorID}:
 *   patch:
 *     summary: Activar proveedor
 *     tags: [Proveedores]
 *     parameters:
 *       - in: path
 *         name: ProveedorID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Activado
 */
router.patch('/activar/:ProveedorID', validateParams(proveedorIdParamSchema), (req, res) => proveedoresController.activar(req, res));

export default router;
