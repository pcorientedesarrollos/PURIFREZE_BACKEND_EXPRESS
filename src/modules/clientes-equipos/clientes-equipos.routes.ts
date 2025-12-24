import { Router } from 'express';
import { clientesEquiposController } from './clientes-equipos.controller';
import { validateBody, validateParams, validateQuery } from '../../middlewares/validateRequest';
import {
  createClienteEquipoSchema,
  updateClienteEquipoSchema,
  retirarEquipoSchema,
  clienteEquipoIdParamSchema,
  clienteIdParamSchema,
  clientesEquiposQuerySchema,
} from './clientes-equipos.schema';

const router = Router();

// =============================================
// CLIENTES EQUIPOS - CRUD
// =============================================

/** @swagger
 * /clientes-equipos:
 *   post:
 *     summary: Asignar equipo a cliente
 *     tags: [Clientes Equipos]
 */
router.post('/', validateBody(createClienteEquipoSchema), (req, res) => clientesEquiposController.create(req, res));

/** @swagger
 * /clientes-equipos:
 *   get:
 *     summary: Obtener todos los equipos de clientes
 *     tags: [Clientes Equipos]
 */
router.get('/', validateQuery(clientesEquiposQuerySchema), (req, res) => clientesEquiposController.findAll(req, res));

/** @swagger
 * /clientes-equipos/cliente/{ClienteID}:
 *   get:
 *     summary: Obtener equipos por cliente
 *     tags: [Clientes Equipos]
 */
router.get('/cliente/:ClienteID', validateParams(clienteIdParamSchema), validateQuery(clientesEquiposQuerySchema), (req, res) => clientesEquiposController.findByCliente(req, res));

/** @swagger
 * /clientes-equipos/{ClienteEquipoID}:
 *   get:
 *     summary: Obtener equipo de cliente por ID
 *     tags: [Clientes Equipos]
 */
router.get('/:ClienteEquipoID', validateParams(clienteEquipoIdParamSchema), (req, res) => clientesEquiposController.findOne(req, res));

/** @swagger
 * /clientes-equipos/{ClienteEquipoID}:
 *   put:
 *     summary: Actualizar equipo de cliente
 *     tags: [Clientes Equipos]
 */
router.put('/:ClienteEquipoID', validateParams(clienteEquipoIdParamSchema), validateBody(updateClienteEquipoSchema), (req, res) => clientesEquiposController.update(req, res));

/** @swagger
 * /clientes-equipos/retirar/{ClienteEquipoID}:
 *   patch:
 *     summary: Retirar equipo de cliente
 *     tags: [Clientes Equipos]
 */
router.patch('/retirar/:ClienteEquipoID', validateParams(clienteEquipoIdParamSchema), validateBody(retirarEquipoSchema), (req, res) => clientesEquiposController.retirar(req, res));

/** @swagger
 * /clientes-equipos/activar/{ClienteEquipoID}:
 *   patch:
 *     summary: Reactivar equipo
 *     tags: [Clientes Equipos]
 */
router.patch('/activar/:ClienteEquipoID', validateParams(clienteEquipoIdParamSchema), (req, res) => clientesEquiposController.activar(req, res));

/** @swagger
 * /clientes-equipos/baja/{ClienteEquipoID}:
 *   patch:
 *     summary: Dar de baja (soft delete)
 *     tags: [Clientes Equipos]
 */
router.patch('/baja/:ClienteEquipoID', validateParams(clienteEquipoIdParamSchema), (req, res) => clientesEquiposController.baja(req, res));

export default router;
