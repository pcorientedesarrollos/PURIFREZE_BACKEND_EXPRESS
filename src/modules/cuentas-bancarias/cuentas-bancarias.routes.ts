import { Router } from 'express';
import { cuentasBancariasController } from './cuentas-bancarias.controller';
import { validateBody, validateParams } from '../../middlewares/validateRequest';
import { createCuentaBancariaSchema, updateCuentaBancariaSchema, cuentaBancariaIdParamSchema } from './cuentas-bancarias.schema';

const router = Router();

/** @swagger
 * /cuentas-bancarias:
 *   post:
 *     summary: Crear cuenta bancaria
 *     tags: [Cuentas Bancarias]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [BancoID, CuentaBancaria, NombrePropietario, Saldo]
 *             properties:
 *               BancoID:
 *                 type: integer
 *               CuentaBancaria:
 *                 type: string
 *               NombrePropietario:
 *                 type: string
 *               Saldo:
 *                 type: number
 *     responses:
 *       200:
 *         description: Creada
 */
router.post('/', validateBody(createCuentaBancariaSchema), (req, res) => cuentasBancariasController.create(req, res));

/** @swagger
 * /cuentas-bancarias:
 *   get:
 *     summary: Obtener todas las cuentas bancarias
 *     tags: [Cuentas Bancarias]
 *     responses:
 *       200:
 *         description: Lista de cuentas bancarias
 */
router.get('/', (req, res) => cuentasBancariasController.findAll(req, res));

/** @swagger
 * /cuentas-bancarias/{CuentaBancariaID}:
 *   get:
 *     summary: Obtener cuenta bancaria por ID
 *     tags: [Cuentas Bancarias]
 *     parameters:
 *       - in: path
 *         name: CuentaBancariaID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Encontrada
 *       404:
 *         description: No encontrada
 */
router.get('/:CuentaBancariaID', validateParams(cuentaBancariaIdParamSchema), (req, res) => cuentasBancariasController.findOne(req, res));

/** @swagger
 * /cuentas-bancarias/{CuentaBancariaID}:
 *   put:
 *     summary: Actualizar cuenta bancaria
 *     tags: [Cuentas Bancarias]
 *     parameters:
 *       - in: path
 *         name: CuentaBancariaID
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               BancoID:
 *                 type: integer
 *               CuentaBancaria:
 *                 type: string
 *               NombrePropietario:
 *                 type: string
 *               Saldo:
 *                 type: number
 *     responses:
 *       200:
 *         description: Actualizada
 */
router.put('/:CuentaBancariaID', validateParams(cuentaBancariaIdParamSchema), validateBody(updateCuentaBancariaSchema), (req, res) => cuentasBancariasController.update(req, res));

/** @swagger
 * /cuentas-bancarias/baja/{CuentaBancariaID}:
 *   patch:
 *     summary: Dar de baja cuenta bancaria
 *     tags: [Cuentas Bancarias]
 *     parameters:
 *       - in: path
 *         name: CuentaBancariaID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Dada de baja
 */
router.patch('/baja/:CuentaBancariaID', validateParams(cuentaBancariaIdParamSchema), (req, res) => cuentasBancariasController.baja(req, res));

/** @swagger
 * /cuentas-bancarias/activar/{CuentaBancariaID}:
 *   patch:
 *     summary: Activar cuenta bancaria
 *     tags: [Cuentas Bancarias]
 *     parameters:
 *       - in: path
 *         name: CuentaBancariaID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Activada
 */
router.patch('/activar/:CuentaBancariaID', validateParams(cuentaBancariaIdParamSchema), (req, res) => cuentasBancariasController.activar(req, res));

export default router;
