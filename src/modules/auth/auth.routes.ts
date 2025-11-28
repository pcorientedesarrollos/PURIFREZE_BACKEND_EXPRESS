import { Router } from 'express';
import { authController } from './auth.controller';
import { validateBody } from '../../middlewares/validateRequest';
import {
  loginSchema,
  refreshTokenSchema,
  reauthSchema,
  logoutSchema,
} from './auth.schema';

const router = Router();

/**
 * @swagger
 * /auth:
 *   post:
 *     summary: Iniciar sesión
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - Usuario
 *               - Password
 *             properties:
 *               Usuario:
 *                 type: string
 *                 description: Nombre de usuario
 *                 example: admin
 *               Password:
 *                 type: string
 *                 description: Contraseña del usuario
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Login exitoso
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
 *                   example: Login exitoso
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   type: object
 *                   properties:
 *                     Usuario:
 *                       type: string
 *                     Token:
 *                       type: string
 *       401:
 *         description: Contraseña incorrecta
 *       404:
 *         description: El usuario no existe
 */
router.post(
  '/',
  validateBody(loginSchema),
  (req, res) => authController.login(req, res),
);

/**
 * @swagger
 * /auth/refreshToken:
 *   post:
 *     summary: Refrescar token de acceso
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - AcessToken
 *               - UsuarioID
 *               - SessionID
 *             properties:
 *               AcessToken:
 *                 type: string
 *                 description: Token de acceso actual (puede estar expirado)
 *               UsuarioID:
 *                 type: integer
 *                 description: ID del usuario
 *                 example: 1
 *               SessionID:
 *                 type: string
 *                 description: ID de la sesión (max 37 caracteres)
 *     responses:
 *       200:
 *         description: Token refrescado exitosamente
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
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   type: object
 *                   properties:
 *                     Usuario:
 *                       type: string
 *                     UsuarioID:
 *                       type: integer
 *                     SessionID:
 *                       type: string
 *                     Token:
 *                       type: string
 *       401:
 *         description: Token de acceso caducado o sesión expirada
 *       404:
 *         description: Usuario o sesión no encontrada
 */
router.post(
  '/refreshToken',
  validateBody(refreshTokenSchema),
  (req, res) => authController.refreshToken(req, res),
);

/**
 * @swagger
 * /auth/sesiones:
 *   get:
 *     summary: Obtener todas las sesiones activas
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Lista de sesiones
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
 *                   example: Sesiones obtenidas
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   type: object
 *                   properties:
 *                     NoSesiones:
 *                       type: integer
 *                     sesiones:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           RefreshTokenID:
 *                             type: integer
 *                           SessionID:
 *                             type: string
 *                           IsActive:
 *                             type: boolean
 *                           IsActiveAdmin:
 *                             type: boolean
 *                           FechaAlta:
 *                             type: string
 *                           UsuarioID:
 *                             type: integer
 *                           usuario:
 *                             type: object
 *                             properties:
 *                               UsuarioID:
 *                                 type: integer
 *                               Usuario:
 *                                 type: string
 *                               NombreCompleto:
 *                                 type: string
 */
router.get('/sesiones', (req, res) => authController.findSesiones(req, res));

/**
 * @swagger
 * /auth/reauth:
 *   put:
 *     summary: Reautenticar sesión (renovar refresh token)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - Usuario
 *               - Password
 *               - SessionID
 *             properties:
 *               Usuario:
 *                 type: string
 *                 description: Nombre de usuario
 *               Password:
 *                 type: string
 *                 description: Contraseña del usuario
 *               SessionID:
 *                 type: string
 *                 description: ID de la sesión a reautenticar
 *     responses:
 *       200:
 *         description: Reautenticación exitosa
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
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   type: object
 *                   properties:
 *                     Usuario:
 *                       type: string
 *                     Token:
 *                       type: string
 *       300:
 *         description: El refreshToken aún sigue vivo
 *       401:
 *         description: Contraseña incorrecta o sesión no activa
 *       404:
 *         description: Usuario no existe
 */
router.put(
  '/reauth',
  validateBody(reauthSchema),
  (req, res) => authController.reauth(req, res),
);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Cerrar sesión (usuario)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - SessionID
 *               - UsuarioID
 *             properties:
 *               SessionID:
 *                 type: string
 *                 description: ID de la sesión (max 37 caracteres)
 *               UsuarioID:
 *                 type: integer
 *                 description: ID del usuario
 *     responses:
 *       200:
 *         description: Sesión cerrada exitosamente
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
 *                   example: Sesión cerrada
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   type: object
 *                   properties:
 *                     SessionID:
 *                       type: string
 *                     UsuarioID:
 *                       type: integer
 *                     IsActive:
 *                       type: boolean
 *                       example: false
 *       404:
 *         description: No se encontró una sesión activa
 */
router.post(
  '/logout',
  validateBody(logoutSchema),
  (req, res) => authController.logout(req, res),
);

/**
 * @swagger
 * /auth/logout/admin:
 *   post:
 *     summary: Cerrar sesión (admin)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - SessionID
 *               - UsuarioID
 *             properties:
 *               SessionID:
 *                 type: string
 *                 description: ID de la sesión (max 37 caracteres)
 *               UsuarioID:
 *                 type: integer
 *                 description: ID del usuario
 *     responses:
 *       200:
 *         description: Sesión admin cerrada exitosamente
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
 *                   example: Sesión admin cerrada
 *                 error:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   type: object
 *                   properties:
 *                     SessionID:
 *                       type: string
 *                     UsuarioID:
 *                       type: integer
 *                     IsActiveAdmin:
 *                       type: boolean
 *                       example: false
 *       404:
 *         description: No se encontró una sesión activa
 */
router.post(
  '/logout/admin',
  validateBody(logoutSchema),
  (req, res) => authController.logoutAdmin(req, res),
);

export default router;
