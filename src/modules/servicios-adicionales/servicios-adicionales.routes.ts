import { Router } from 'express';
import { serviciosAdicionalesController } from './servicios-adicionales.controller';
import { validateBody, validateParams } from '../../middlewares/validateRequest';
import {
  createServicioAdicionalSchema,
  updateServicioAdicionalSchema,
  servicioAdicionalIdParamSchema,
} from './servicios-adicionales.schema';

const router = Router();

/**
 * @swagger
 * /servicios-adicionales:
 *   post:
 *     summary: Crear un nuevo servicio adicional
 *     tags: [Servicios Adicionales]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - Nombre
 *               - Costo
 *             properties:
 *               Nombre:
 *                 type: string
 *                 maxLength: 255
 *                 description: Nombre del servicio adicional
 *                 example: Instalación eléctrica
 *               Costo:
 *                 type: number
 *                 description: Costo del servicio
 *                 example: 1500.00
 *     responses:
 *       200:
 *         description: Servicio adicional creado exitosamente
 *       300:
 *         description: Ya existe un servicio adicional con ese nombre
 */
router.post(
  '/',
  validateBody(createServicioAdicionalSchema),
  (req, res) => serviciosAdicionalesController.create(req, res),
);

/**
 * @swagger
 * /servicios-adicionales:
 *   get:
 *     summary: Obtener todos los servicios adicionales
 *     tags: [Servicios Adicionales]
 *     responses:
 *       200:
 *         description: Lista de servicios adicionales
 */
router.get('/', (req, res) => serviciosAdicionalesController.findAll(req, res));

/**
 * @swagger
 * /servicios-adicionales/activos:
 *   get:
 *     summary: Obtener solo servicios adicionales activos
 *     tags: [Servicios Adicionales]
 *     responses:
 *       200:
 *         description: Lista de servicios adicionales activos
 */
router.get('/activos', (req, res) => serviciosAdicionalesController.findAllActive(req, res));

/**
 * @swagger
 * /servicios-adicionales/{ServicioAdicionalID}:
 *   get:
 *     summary: Obtener un servicio adicional por ID
 *     tags: [Servicios Adicionales]
 *     parameters:
 *       - in: path
 *         name: ServicioAdicionalID
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del servicio adicional
 *     responses:
 *       200:
 *         description: Servicio adicional encontrado
 *       404:
 *         description: Servicio adicional no encontrado
 */
router.get(
  '/:ServicioAdicionalID',
  validateParams(servicioAdicionalIdParamSchema),
  (req, res) => serviciosAdicionalesController.findOne(req, res),
);

/**
 * @swagger
 * /servicios-adicionales/{ServicioAdicionalID}:
 *   put:
 *     summary: Actualizar un servicio adicional
 *     tags: [Servicios Adicionales]
 *     parameters:
 *       - in: path
 *         name: ServicioAdicionalID
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del servicio adicional
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               Nombre:
 *                 type: string
 *                 maxLength: 255
 *               Costo:
 *                 type: number
 *     responses:
 *       200:
 *         description: Servicio adicional actualizado exitosamente
 *       300:
 *         description: Ya existe un servicio adicional con ese nombre
 *       404:
 *         description: Servicio adicional no encontrado
 */
router.put(
  '/:ServicioAdicionalID',
  validateParams(servicioAdicionalIdParamSchema),
  validateBody(updateServicioAdicionalSchema),
  (req, res) => serviciosAdicionalesController.update(req, res),
);

/**
 * @swagger
 * /servicios-adicionales/baja/{ServicioAdicionalID}:
 *   patch:
 *     summary: Dar de baja un servicio adicional (soft delete)
 *     tags: [Servicios Adicionales]
 *     parameters:
 *       - in: path
 *         name: ServicioAdicionalID
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del servicio adicional
 *     responses:
 *       200:
 *         description: Servicio adicional dado de baja exitosamente
 *       300:
 *         description: El servicio adicional ya está dado de baja
 *       404:
 *         description: Servicio adicional no encontrado
 */
router.patch(
  '/baja/:ServicioAdicionalID',
  validateParams(servicioAdicionalIdParamSchema),
  (req, res) => serviciosAdicionalesController.bajaServicio(req, res),
);

/**
 * @swagger
 * /servicios-adicionales/activar/{ServicioAdicionalID}:
 *   patch:
 *     summary: Activar un servicio adicional
 *     tags: [Servicios Adicionales]
 *     parameters:
 *       - in: path
 *         name: ServicioAdicionalID
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del servicio adicional
 *     responses:
 *       200:
 *         description: Servicio adicional activado exitosamente
 *       300:
 *         description: El servicio adicional ya está activo
 *       404:
 *         description: Servicio adicional no encontrado
 */
router.patch(
  '/activar/:ServicioAdicionalID',
  validateParams(servicioAdicionalIdParamSchema),
  (req, res) => serviciosAdicionalesController.activarServicio(req, res),
);

export default router;
