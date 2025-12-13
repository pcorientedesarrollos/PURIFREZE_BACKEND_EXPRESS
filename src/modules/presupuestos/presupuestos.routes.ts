import { Router } from 'express';
import { presupuestosController } from './presupuestos.controller';
import { validateBody, validateParams, validateQuery } from '../../middlewares/validateRequest';
import {
  createPresupuestoSchema,
  updatePresupuestoSchema,
  updateEstatusSchema,
  addDetalleSchema,
  updateDetalleSchema,
  presupuestoIdParamSchema,
  detalleIdParamSchema,
  clienteIdParamSchema,
} from './presupuestos.schema';
import { z } from 'zod';

const router = Router();

const plantillaIdParamSchema = z.object({
  PlantillaEquipoID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

const modalidadQuerySchema = z.object({
  modalidad: z.enum(['VENTA', 'RENTA', 'MANTENIMIENTO']),
});

// =============================================
// PRESUPUESTOS - ENCABEZADO
// =============================================

/** @swagger
 * /presupuestos:
 *   post:
 *     summary: Crear presupuesto con detalles
 *     tags: [Presupuestos]
 */
router.post('/', validateBody(createPresupuestoSchema), (req, res) => presupuestosController.create(req, res));

/** @swagger
 * /presupuestos:
 *   get:
 *     summary: Obtener todos los presupuestos
 *     tags: [Presupuestos]
 */
router.get('/', (req, res) => presupuestosController.findAll(req, res));

/** @swagger
 * /presupuestos/cliente/{ClienteID}:
 *   get:
 *     summary: Obtener presupuestos por cliente
 *     tags: [Presupuestos]
 */
router.get('/cliente/:ClienteID', validateParams(clienteIdParamSchema), (req, res) => presupuestosController.findByCliente(req, res));

/** @swagger
 * /presupuestos/precio-plantilla/{PlantillaEquipoID}:
 *   get:
 *     summary: Obtener precio calculado de una plantilla según modalidad
 *     tags: [Presupuestos]
 *     parameters:
 *       - in: query
 *         name: modalidad
 *         required: true
 *         schema:
 *           type: string
 *           enum: [VENTA, RENTA, MANTENIMIENTO]
 */
router.get('/precio-plantilla/:PlantillaEquipoID', validateParams(plantillaIdParamSchema), validateQuery(modalidadQuerySchema), (req, res) => presupuestosController.getPrecioPlantilla(req, res));

/** @swagger
 * /presupuestos/{PresupuestoID}:
 *   get:
 *     summary: Obtener presupuesto por ID con detalles
 *     tags: [Presupuestos]
 */
router.get('/:PresupuestoID', validateParams(presupuestoIdParamSchema), (req, res) => presupuestosController.findOne(req, res));

/** @swagger
 * /presupuestos/{PresupuestoID}:
 *   put:
 *     summary: Actualizar encabezado del presupuesto
 *     tags: [Presupuestos]
 */
router.put('/:PresupuestoID', validateParams(presupuestoIdParamSchema), validateBody(updatePresupuestoSchema), (req, res) => presupuestosController.update(req, res));

/** @swagger
 * /presupuestos/{PresupuestoID}/estatus:
 *   patch:
 *     summary: Cambiar estatus del presupuesto
 *     tags: [Presupuestos]
 */
router.patch('/:PresupuestoID/estatus', validateParams(presupuestoIdParamSchema), validateBody(updateEstatusSchema), (req, res) => presupuestosController.updateEstatus(req, res));

/** @swagger
 * /presupuestos/baja/{PresupuestoID}:
 *   patch:
 *     summary: Dar de baja presupuesto
 *     tags: [Presupuestos]
 */
router.patch('/baja/:PresupuestoID', validateParams(presupuestoIdParamSchema), (req, res) => presupuestosController.baja(req, res));

/** @swagger
 * /presupuestos/activar/{PresupuestoID}:
 *   patch:
 *     summary: Activar presupuesto
 *     tags: [Presupuestos]
 */
router.patch('/activar/:PresupuestoID', validateParams(presupuestoIdParamSchema), (req, res) => presupuestosController.activar(req, res));

// =============================================
// PRESUPUESTOS - DETALLE
// =============================================

/** @swagger
 * /presupuestos/{PresupuestoID}/detalle:
 *   post:
 *     summary: Agregar item al presupuesto
 *     tags: [Presupuestos - Detalle]
 */
router.post('/:PresupuestoID/detalle', validateParams(presupuestoIdParamSchema), validateBody(addDetalleSchema), (req, res) => presupuestosController.addDetalle(req, res));

/** @swagger
 * /presupuestos/detalle/{DetalleID}:
 *   put:
 *     summary: Actualizar item del presupuesto
 *     tags: [Presupuestos - Detalle]
 */
router.put('/detalle/:DetalleID', validateParams(detalleIdParamSchema), validateBody(updateDetalleSchema), (req, res) => presupuestosController.updateDetalle(req, res));

/** @swagger
 * /presupuestos/detalle/{DetalleID}:
 *   delete:
 *     summary: Eliminar item del presupuesto (soft delete)
 *     tags: [Presupuestos - Detalle]
 */
router.delete('/detalle/:DetalleID', validateParams(detalleIdParamSchema), (req, res) => presupuestosController.removeDetalle(req, res));

export default router;
