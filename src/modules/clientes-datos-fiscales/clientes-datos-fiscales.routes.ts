import { Router } from 'express';
import { clientesDatosFiscalesController } from './clientes-datos-fiscales.controller';
import { validateBody, validateParams } from '../../middlewares/validateRequest';
import { createClienteDatosFiscalesSchema, updateClienteDatosFiscalesSchema, datosFiscalesIdParamSchema, clienteIdParamSchema } from './clientes-datos-fiscales.schema';

const router = Router();

/** @swagger
 * /clientes-datos-fiscales:
 *   post:
 *     summary: Crear datos fiscales de cliente
 *     tags: [Clientes - Datos Fiscales]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ClienteID, RazonSocial, RFC, Regimen, DireccionFiscal, CodigoPostal]
 *             properties:
 *               ClienteID:
 *                 type: integer
 *               RazonSocial:
 *                 type: string
 *               RFC:
 *                 type: string
 *               Regimen:
 *                 type: string
 *               DireccionFiscal:
 *                 type: string
 *               CodigoPostal:
 *                 type: string
 *               Observaciones:
 *                 type: string
 *     responses:
 *       200:
 *         description: Creado
 */
router.post('/', validateBody(createClienteDatosFiscalesSchema), (req, res) => clientesDatosFiscalesController.create(req, res));

/** @swagger
 * /clientes-datos-fiscales:
 *   get:
 *     summary: Obtener todos los datos fiscales
 *     tags: [Clientes - Datos Fiscales]
 *     responses:
 *       200:
 *         description: Lista de datos fiscales
 */
router.get('/', (req, res) => clientesDatosFiscalesController.findAll(req, res));

/** @swagger
 * /clientes-datos-fiscales/{DatosFiscalesID}:
 *   get:
 *     summary: Obtener datos fiscales por ID
 *     tags: [Clientes - Datos Fiscales]
 *     parameters:
 *       - in: path
 *         name: DatosFiscalesID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Encontrado
 *       404:
 *         description: No encontrado
 */
router.get('/:DatosFiscalesID', validateParams(datosFiscalesIdParamSchema), (req, res) => clientesDatosFiscalesController.findOne(req, res));

/** @swagger
 * /clientes-datos-fiscales/cliente/{ClienteID}:
 *   get:
 *     summary: Obtener datos fiscales por ClienteID
 *     tags: [Clientes - Datos Fiscales]
 *     parameters:
 *       - in: path
 *         name: ClienteID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Datos fiscales del cliente
 */
router.get('/cliente/:ClienteID', validateParams(clienteIdParamSchema), (req, res) => clientesDatosFiscalesController.findByClienteID(req, res));

/** @swagger
 * /clientes-datos-fiscales/por-cliente/{ClienteID}:
 *   get:
 *     summary: Obtener datos fiscales por ClienteID (alias)
 *     tags: [Clientes - Datos Fiscales]
 *     parameters:
 *       - in: path
 *         name: ClienteID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Datos fiscales del cliente
 */
router.get('/por-cliente/:ClienteID', validateParams(clienteIdParamSchema), (req, res) => clientesDatosFiscalesController.findByClienteID(req, res));

/** @swagger
 * /clientes-datos-fiscales/{DatosFiscalesID}:
 *   put:
 *     summary: Actualizar datos fiscales
 *     tags: [Clientes - Datos Fiscales]
 *     parameters:
 *       - in: path
 *         name: DatosFiscalesID
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               RazonSocial:
 *                 type: string
 *               RFC:
 *                 type: string
 *               Regimen:
 *                 type: string
 *               DireccionFiscal:
 *                 type: string
 *               CodigoPostal:
 *                 type: string
 *               Observaciones:
 *                 type: string
 *     responses:
 *       200:
 *         description: Actualizado
 */
router.put('/:DatosFiscalesID', validateParams(datosFiscalesIdParamSchema), validateBody(updateClienteDatosFiscalesSchema), (req, res) => clientesDatosFiscalesController.update(req, res));

/** @swagger
 * /clientes-datos-fiscales/baja/{DatosFiscalesID}:
 *   patch:
 *     summary: Dar de baja datos fiscales
 *     tags: [Clientes - Datos Fiscales]
 *     parameters:
 *       - in: path
 *         name: DatosFiscalesID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Dado de baja
 */
router.patch('/baja/:DatosFiscalesID', validateParams(datosFiscalesIdParamSchema), (req, res) => clientesDatosFiscalesController.baja(req, res));

/** @swagger
 * /clientes-datos-fiscales/activar/{DatosFiscalesID}:
 *   patch:
 *     summary: Activar datos fiscales
 *     tags: [Clientes - Datos Fiscales]
 *     parameters:
 *       - in: path
 *         name: DatosFiscalesID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Activado
 */
router.patch('/activar/:DatosFiscalesID', validateParams(datosFiscalesIdParamSchema), (req, res) => clientesDatosFiscalesController.activar(req, res));

export default router;
