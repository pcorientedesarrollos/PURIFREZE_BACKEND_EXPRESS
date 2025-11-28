import { Router } from 'express';
import { usuariosController } from './usuarios.controller';
import { validateBody, validateParams } from '../../middlewares/validateRequest';
import { createUsuarioSchema, updateUsuarioSchema, usuarioIdParamSchema } from './usuarios.schema';

const router = Router();

/** @swagger
 * /usuarios:
 *   post:
 *     summary: Crear usuario
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [Usuario, Password, NombreCompleto, IsAdmin]
 *             properties:
 *               Usuario:
 *                 type: string
 *                 example: admin
 *               Password:
 *                 type: string
 *                 example: "123456"
 *               NombreCompleto:
 *                 type: string
 *                 example: Administrador
 *               IsAdmin:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Usuario creado
 *       300:
 *         description: Ya existe
 */
router.post('/', validateBody(createUsuarioSchema), (req, res) => usuariosController.create(req, res));

/** @swagger
 * /usuarios:
 *   get:
 *     summary: Obtener todos los usuarios
 *     tags: [Usuarios]
 *     responses:
 *       200:
 *         description: Lista de usuarios
 */
router.get('/', (req, res) => usuariosController.findAll(req, res));

/** @swagger
 * /usuarios/{UsuarioID}:
 *   get:
 *     summary: Obtener usuario por ID
 *     tags: [Usuarios]
 *     parameters:
 *       - in: path
 *         name: UsuarioID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Usuario encontrado
 *       404:
 *         description: No encontrado
 */
router.get('/:UsuarioID', validateParams(usuarioIdParamSchema), (req, res) => usuariosController.findOne(req, res));

/** @swagger
 * /usuarios/{UsuarioID}:
 *   put:
 *     summary: Actualizar usuario
 *     tags: [Usuarios]
 *     parameters:
 *       - in: path
 *         name: UsuarioID
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               Usuario:
 *                 type: string
 *               Password:
 *                 type: string
 *               NombreCompleto:
 *                 type: string
 *               IsAdmin:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Actualizado
 *       404:
 *         description: No encontrado
 */
router.put('/:UsuarioID', validateParams(usuarioIdParamSchema), validateBody(updateUsuarioSchema), (req, res) => usuariosController.update(req, res));

/** @swagger
 * /usuarios/baja/{UsuarioID}:
 *   patch:
 *     summary: Dar de baja usuario
 *     tags: [Usuarios]
 *     parameters:
 *       - in: path
 *         name: UsuarioID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Dado de baja
 */
router.patch('/baja/:UsuarioID', validateParams(usuarioIdParamSchema), (req, res) => usuariosController.baja(req, res));

/** @swagger
 * /usuarios/activar/{UsuarioID}:
 *   patch:
 *     summary: Activar usuario
 *     tags: [Usuarios]
 *     parameters:
 *       - in: path
 *         name: UsuarioID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Activado
 */
router.patch('/activar/:UsuarioID', validateParams(usuarioIdParamSchema), (req, res) => usuariosController.activar(req, res));

export default router;
