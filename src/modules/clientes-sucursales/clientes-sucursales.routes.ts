import { Router } from 'express';
import { clientesSucursalesController } from './clientes-sucursales.controller';
import { validateBody, validateParams } from '../../middlewares/validateRequest';
import { createClienteSucursalSchema, updateClienteSucursalSchema, sucursalIdParamSchema, clienteIdParamSchema, asignarRfcSchema } from './clientes-sucursales.schema';

const router = Router();

/** @swagger
 * /clientes-sucursales:
 *   post:
 *     summary: Crear sucursal de cliente
 *     tags: [Clientes - Sucursales]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ClienteID, NombreSucursal]
 *             properties:
 *               ClienteID:
 *                 type: integer
 *               NombreSucursal:
 *                 type: string
 *               Direccion:
 *                 type: string
 *               Ubicacion:
 *                 type: string
 *               Telefono:
 *                 type: string
 *               Contacto:
 *                 type: string
 *               Observaciones:
 *                 type: string
 *     responses:
 *       201:
 *         description: Creada
 */
router.post('/', validateBody(createClienteSucursalSchema), (req, res) => clientesSucursalesController.create(req, res));

/** @swagger
 * /clientes-sucursales:
 *   get:
 *     summary: Obtener todas las sucursales
 *     tags: [Clientes - Sucursales]
 *     responses:
 *       200:
 *         description: Lista de sucursales
 */
router.get('/', (req, res) => clientesSucursalesController.findAll(req, res));

/** @swagger
 * /clientes-sucursales/{SucursalID}:
 *   get:
 *     summary: Obtener sucursal por ID
 *     tags: [Clientes - Sucursales]
 *     parameters:
 *       - in: path
 *         name: SucursalID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Encontrada
 *       404:
 *         description: No encontrada
 */
router.get('/:SucursalID', validateParams(sucursalIdParamSchema), (req, res) => clientesSucursalesController.findOne(req, res));

/** @swagger
 * /clientes-sucursales/cliente/{ClienteID}:
 *   get:
 *     summary: Obtener sucursales por ClienteID
 *     tags: [Clientes - Sucursales]
 *     parameters:
 *       - in: path
 *         name: ClienteID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de sucursales del cliente
 */
router.get('/cliente/:ClienteID', validateParams(clienteIdParamSchema), (req, res) => clientesSucursalesController.findByClienteID(req, res));

/** @swagger
 * /clientes-sucursales/{SucursalID}:
 *   put:
 *     summary: Actualizar sucursal
 *     tags: [Clientes - Sucursales]
 *     parameters:
 *       - in: path
 *         name: SucursalID
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               NombreSucursal:
 *                 type: string
 *               Direccion:
 *                 type: string
 *               Ubicacion:
 *                 type: string
 *               Telefono:
 *                 type: string
 *               Contacto:
 *                 type: string
 *               Observaciones:
 *                 type: string
 *     responses:
 *       200:
 *         description: Actualizada
 */
router.put('/:SucursalID', validateParams(sucursalIdParamSchema), validateBody(updateClienteSucursalSchema), (req, res) => clientesSucursalesController.update(req, res));

/** @swagger
 * /clientes-sucursales/baja/{SucursalID}:
 *   patch:
 *     summary: Dar de baja sucursal
 *     tags: [Clientes - Sucursales]
 *     parameters:
 *       - in: path
 *         name: SucursalID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Dada de baja
 */
router.patch('/baja/:SucursalID', validateParams(sucursalIdParamSchema), (req, res) => clientesSucursalesController.baja(req, res));

/** @swagger
 * /clientes-sucursales/activar/{SucursalID}:
 *   patch:
 *     summary: Activar sucursal
 *     tags: [Clientes - Sucursales]
 *     parameters:
 *       - in: path
 *         name: SucursalID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Activada
 */
router.patch('/activar/:SucursalID', validateParams(sucursalIdParamSchema), (req, res) => clientesSucursalesController.activar(req, res));

/** @swagger
 * /clientes-sucursales/matriz/{SucursalID}:
 *   patch:
 *     summary: Establecer sucursal como matriz
 *     tags: [Clientes - Sucursales]
 *     parameters:
 *       - in: path
 *         name: SucursalID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Establecida como matriz
 */
router.patch('/matriz/:SucursalID', validateParams(sucursalIdParamSchema), (req, res) => clientesSucursalesController.setMatriz(req, res));

/** @swagger
 * /clientes-sucursales/{SucursalID}/asignar-rfc:
 *   patch:
 *     summary: Asignar o quitar RFC a una sucursal
 *     tags: [Clientes - Sucursales]
 *     parameters:
 *       - in: path
 *         name: SucursalID
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [DatosFiscalesID]
 *             properties:
 *               DatosFiscalesID:
 *                 type: integer
 *                 nullable: true
 *                 description: ID de los datos fiscales a asignar (null para quitar)
 *     responses:
 *       200:
 *         description: RFC asignado/removido correctamente
 */
router.patch('/:SucursalID/asignar-rfc', validateParams(sucursalIdParamSchema), validateBody(asignarRfcSchema), (req, res) => clientesSucursalesController.asignarRfc(req, res));

export default router;
