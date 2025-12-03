import { Router } from 'express';
import { tecnicosController } from './tecnicos.controller';
import { validateBody, validateParams } from '../../middlewares/validateRequest';
import { createTecnicoSchema, updateTecnicoSchema, tecnicoIdParamSchema } from './tecnicos.schema';

const router = Router();

/** @swagger
 * /tecnicos:
 *   post:
 *     summary: Crear técnico
 *     tags: [Tecnicos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [UsuarioID]
 *             properties:
 *               UsuarioID:
 *                 type: integer
 *                 example: 1
 *               Codigo:
 *                 type: string
 *                 example: "T-001"
 *               Telefono:
 *                 type: string
 *                 example: "5551234567"
 *               Observaciones:
 *                 type: string
 *                 example: "Técnico especialista en refrigeración"
 *     responses:
 *       201:
 *         description: Técnico creado
 *       300:
 *         description: Ya existe o código duplicado
 *       404:
 *         description: Usuario no encontrado
 */
router.post('/', validateBody(createTecnicoSchema), (req, res) => tecnicosController.create(req, res));

/** @swagger
 * /tecnicos:
 *   get:
 *     summary: Obtener todos los técnicos
 *     tags: [Tecnicos]
 *     responses:
 *       200:
 *         description: Lista de técnicos
 */
router.get('/', (req, res) => tecnicosController.findAll(req, res));

/** @swagger
 * /tecnicos/activos:
 *   get:
 *     summary: Obtener técnicos activos
 *     tags: [Tecnicos]
 *     responses:
 *       200:
 *         description: Lista de técnicos activos
 */
router.get('/activos', (req, res) => tecnicosController.findAllActivos(req, res));

/** @swagger
 * /tecnicos/usuarios-disponibles:
 *   get:
 *     summary: Obtener usuarios disponibles para asignar como técnicos
 *     tags: [Tecnicos]
 *     responses:
 *       200:
 *         description: Lista de usuarios disponibles
 */
router.get('/usuarios-disponibles', (req, res) => tecnicosController.getUsuariosDisponibles(req, res));

/** @swagger
 * /tecnicos/{TecnicoID}:
 *   get:
 *     summary: Obtener técnico por ID
 *     tags: [Tecnicos]
 *     parameters:
 *       - in: path
 *         name: TecnicoID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Técnico encontrado
 *       404:
 *         description: No encontrado
 */
router.get('/:TecnicoID', validateParams(tecnicoIdParamSchema), (req, res) => tecnicosController.findOne(req, res));

/** @swagger
 * /tecnicos/{TecnicoID}:
 *   put:
 *     summary: Actualizar técnico
 *     tags: [Tecnicos]
 *     parameters:
 *       - in: path
 *         name: TecnicoID
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               Codigo:
 *                 type: string
 *               Telefono:
 *                 type: string
 *               Observaciones:
 *                 type: string
 *     responses:
 *       200:
 *         description: Actualizado
 *       404:
 *         description: No encontrado
 *       300:
 *         description: Código duplicado
 */
router.put('/:TecnicoID', validateParams(tecnicoIdParamSchema), validateBody(updateTecnicoSchema), (req, res) => tecnicosController.update(req, res));

/** @swagger
 * /tecnicos/baja/{TecnicoID}:
 *   patch:
 *     summary: Dar de baja técnico
 *     tags: [Tecnicos]
 *     parameters:
 *       - in: path
 *         name: TecnicoID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Dado de baja
 *       404:
 *         description: No encontrado
 *       300:
 *         description: Ya está dado de baja
 */
router.patch('/baja/:TecnicoID', validateParams(tecnicoIdParamSchema), (req, res) => tecnicosController.baja(req, res));

/** @swagger
 * /tecnicos/activar/{TecnicoID}:
 *   patch:
 *     summary: Activar técnico
 *     tags: [Tecnicos]
 *     parameters:
 *       - in: path
 *         name: TecnicoID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Activado
 *       404:
 *         description: No encontrado
 *       300:
 *         description: Ya está activo
 */
router.patch('/activar/:TecnicoID', validateParams(tecnicoIdParamSchema), (req, res) => tecnicosController.activar(req, res));

export default router;
