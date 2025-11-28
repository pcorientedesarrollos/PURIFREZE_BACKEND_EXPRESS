import { Router } from 'express';
import { bancosController } from './bancos.controller';
import { validateBody, validateParams } from '../../middlewares/validateRequest';
import { createBancoSchema, updateBancoSchema, bancoIdParamSchema } from './bancos.schema';

const router = Router();

/**
 * @swagger
 * /bancos:
 *   post:
 *     summary: Crear un nuevo banco
 *     tags: [Bancos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - NombreBanco
 *               - Observaciones
 *             properties:
 *               NombreBanco:
 *                 type: string
 *                 maxLength: 255
 *                 description: Nombre del banco
 *                 example: BBVA
 *               Observaciones:
 *                 type: string
 *                 maxLength: 255
 *                 description: Observaciones adicionales
 *                 example: Banco principal
 *     responses:
 *       200:
 *         description: Banco creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Banco Creado
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   type: object
 *                   properties:
 *                     BancoID:
 *                       type: integer
 *                     NombreBanco:
 *                       type: string
 *                     Observaciones:
 *                       type: string
 *                     IsActive:
 *                       type: boolean
 *       300:
 *         description: El nombre del banco ya existe
 */
router.post(
  '/',
  validateBody(createBancoSchema),
  (req, res) => bancosController.create(req, res),
);

/**
 * @swagger
 * /bancos:
 *   get:
 *     summary: Obtener todos los bancos
 *     tags: [Bancos]
 *     responses:
 *       200:
 *         description: Lista de bancos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Bancos obtenidos
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       BancoID:
 *                         type: integer
 *                       NombreBanco:
 *                         type: string
 *                       Observaciones:
 *                         type: string
 *                       IsActive:
 *                         type: boolean
 */
router.get('/', (req, res) => bancosController.findAll(req, res));

/**
 * @swagger
 * /bancos/{BancoID}:
 *   get:
 *     summary: Obtener un banco por ID
 *     tags: [Bancos]
 *     parameters:
 *       - in: path
 *         name: BancoID
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del banco
 *     responses:
 *       200:
 *         description: Banco encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Banco obtenido
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   type: object
 *                   properties:
 *                     BancoID:
 *                       type: integer
 *                     NombreBanco:
 *                       type: string
 *                     Observaciones:
 *                       type: string
 *                     IsActive:
 *                       type: boolean
 *       404:
 *         description: Banco no encontrado
 */
router.get(
  '/:BancoID',
  validateParams(bancoIdParamSchema),
  (req, res) => bancosController.findOne(req, res),
);

/**
 * @swagger
 * /bancos/{BancoID}:
 *   put:
 *     summary: Actualizar un banco
 *     tags: [Bancos]
 *     parameters:
 *       - in: path
 *         name: BancoID
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del banco
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               NombreBanco:
 *                 type: string
 *                 maxLength: 255
 *               Observaciones:
 *                 type: string
 *                 maxLength: 255
 *     responses:
 *       200:
 *         description: Banco actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Banco Actualizado
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   type: object
 *                   properties:
 *                     BancoID:
 *                       type: integer
 *                     NombreBanco:
 *                       type: string
 *                     Observaciones:
 *                       type: string
 *                     IsActive:
 *                       type: boolean
 *       300:
 *         description: El nombre del banco ya existe
 *       404:
 *         description: No existe el banco
 */
router.put(
  '/:BancoID',
  validateParams(bancoIdParamSchema),
  validateBody(updateBancoSchema),
  (req, res) => bancosController.update(req, res),
);

/**
 * @swagger
 * /bancos/baja/{BancoID}:
 *   patch:
 *     summary: Dar de baja un banco (soft delete)
 *     tags: [Bancos]
 *     parameters:
 *       - in: path
 *         name: BancoID
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del banco
 *     responses:
 *       200:
 *         description: Banco dado de baja exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Banco dado de baja
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   type: object
 *                   properties:
 *                     BancoID:
 *                       type: integer
 *                     NombreBanco:
 *                       type: string
 *                     Observaciones:
 *                       type: string
 *                     IsActive:
 *                       type: boolean
 *                       example: false
 *       300:
 *         description: El banco ya ha sido dado de baja
 *       404:
 *         description: El banco no existe
 */
router.patch(
  '/baja/:BancoID',
  validateParams(bancoIdParamSchema),
  (req, res) => bancosController.bajaBanco(req, res),
);

/**
 * @swagger
 * /bancos/activar/{BancoID}:
 *   patch:
 *     summary: Activar un banco
 *     tags: [Bancos]
 *     parameters:
 *       - in: path
 *         name: BancoID
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del banco
 *     responses:
 *       200:
 *         description: Banco activado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Banco activado
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   type: object
 *                   properties:
 *                     BancoID:
 *                       type: integer
 *                     NombreBanco:
 *                       type: string
 *                     Observaciones:
 *                       type: string
 *                     IsActive:
 *                       type: boolean
 *                       example: true
 *       300:
 *         description: El banco ya ha sido activado
 *       404:
 *         description: El banco no existe
 */
router.patch(
  '/activar/:BancoID',
  validateParams(bancoIdParamSchema),
  (req, res) => bancosController.activarBanco(req, res),
);

export default router;
