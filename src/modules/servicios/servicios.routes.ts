import { Router } from 'express';
import { serviciosController } from './servicios.controller';
import { validateBody, validateParams, validateQuery } from '../../middlewares/validateRequest';
import {
  createServicioSchema,
  updateServicioSchema,
  cambiarEstatusSchema,
  cancelarServicioSchema,
  reagendarServicioSchema,
  actualizarRefaccionSchema,
  agregarRefaccionEquipoServicioSchema,
  eliminarRefaccionEquipoServicioSchema,
  agregarInsumoSchema,
  modificarInsumoSchema,
  configurarDesinstalacionSchema,
  finalizarServicioSchema,
  servicioIdParamSchema,
  searchServiciosQuerySchema,
  agendaQuerySchema,
} from './servicios.schema';
import { z } from 'zod';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════
// CONSULTAS
// ═══════════════════════════════════════════════════════════════════════════

// GET /servicios/agenda - Obtener agenda de servicios (debe ir antes de /:ServicioID)
router.get(
  '/agenda',
  validateQuery(agendaQuerySchema),
  (req, res) => serviciosController.getAgenda(req, res)
);

// GET /servicios - Obtener todos los servicios
router.get(
  '/',
  validateQuery(searchServiciosQuerySchema),
  (req, res) => serviciosController.findAll(req, res)
);

// GET /servicios/:ServicioID - Obtener servicio por ID
router.get(
  '/:ServicioID',
  validateParams(servicioIdParamSchema),
  (req, res) => serviciosController.findOne(req, res)
);

// ═══════════════════════════════════════════════════════════════════════════
// CRUD
// ═══════════════════════════════════════════════════════════════════════════

// POST /servicios - Crear servicio
router.post(
  '/',
  validateBody(createServicioSchema),
  (req, res) => serviciosController.create(req, res)
);

// PUT /servicios/:ServicioID - Actualizar servicio
router.put(
  '/:ServicioID',
  validateParams(servicioIdParamSchema),
  validateBody(updateServicioSchema),
  (req, res) => serviciosController.update(req, res)
);

// ═══════════════════════════════════════════════════════════════════════════
// CAMBIO DE ESTATUS
// ═══════════════════════════════════════════════════════════════════════════

// PATCH /servicios/:ServicioID/estatus - Cambiar estatus
router.patch(
  '/:ServicioID/estatus',
  validateParams(servicioIdParamSchema),
  validateBody(cambiarEstatusSchema),
  (req, res) => serviciosController.cambiarEstatus(req, res)
);

// PATCH /servicios/:ServicioID/cancelar - Cancelar servicio
router.patch(
  '/:ServicioID/cancelar',
  validateParams(servicioIdParamSchema),
  validateBody(cancelarServicioSchema),
  (req, res) => serviciosController.cancelar(req, res)
);

// POST /servicios/:ServicioID/reagendar - Reagendar servicio
router.post(
  '/:ServicioID/reagendar',
  validateParams(servicioIdParamSchema),
  validateBody(reagendarServicioSchema),
  (req, res) => serviciosController.reagendar(req, res)
);

// POST /servicios/:ServicioID/finalizar - Finalizar servicio
router.post(
  '/:ServicioID/finalizar',
  validateParams(servicioIdParamSchema),
  validateBody(finalizarServicioSchema),
  (req, res) => serviciosController.finalizar(req, res)
);

// ═══════════════════════════════════════════════════════════════════════════
// GESTIÓN DE REFACCIONES EN EQUIPOS
// ═══════════════════════════════════════════════════════════════════════════

// PATCH /servicios/:ServicioID/refacciones - Actualizar refacción
router.patch(
  '/:ServicioID/refacciones',
  validateParams(servicioIdParamSchema),
  validateBody(actualizarRefaccionSchema),
  (req, res) => serviciosController.actualizarRefaccion(req, res)
);

// POST /servicios/:ServicioID/refacciones - Agregar refacción
router.post(
  '/:ServicioID/refacciones',
  validateParams(servicioIdParamSchema),
  validateBody(agregarRefaccionEquipoServicioSchema),
  (req, res) => serviciosController.agregarRefaccion(req, res)
);

// DELETE /servicios/:ServicioID/refacciones - Eliminar refacción
router.delete(
  '/:ServicioID/refacciones',
  validateParams(servicioIdParamSchema),
  validateBody(eliminarRefaccionEquipoServicioSchema),
  (req, res) => serviciosController.eliminarRefaccion(req, res)
);

// ═══════════════════════════════════════════════════════════════════════════
// GESTIÓN DE INSUMOS
// ═══════════════════════════════════════════════════════════════════════════

// POST /servicios/:ServicioID/insumos - Agregar insumo
router.post(
  '/:ServicioID/insumos',
  validateParams(servicioIdParamSchema),
  validateBody(agregarInsumoSchema),
  (req, res) => serviciosController.agregarInsumo(req, res)
);

// PATCH /servicios/:ServicioID/insumos - Modificar insumo
router.patch(
  '/:ServicioID/insumos',
  validateParams(servicioIdParamSchema),
  validateBody(modificarInsumoSchema),
  (req, res) => serviciosController.modificarInsumo(req, res)
);

// DELETE /servicios/:ServicioID/insumos/:ServicioInsumoID - Eliminar insumo
const insumoIdParamSchema = z.object({
  ServicioID: z.string().regex(/^\d+$/, 'ServicioID debe ser un número válido').transform(Number),
  ServicioInsumoID: z.string().regex(/^\d+$/, 'ServicioInsumoID debe ser un número válido').transform(Number),
});

router.delete(
  '/:ServicioID/insumos/:ServicioInsumoID',
  validateParams(insumoIdParamSchema),
  (req, res) => serviciosController.eliminarInsumo(req, res)
);

// ═══════════════════════════════════════════════════════════════════════════
// DESINSTALACIÓN
// ═══════════════════════════════════════════════════════════════════════════

// PATCH /servicios/:ServicioID/desinstalacion - Configurar desinstalación
router.patch(
  '/:ServicioID/desinstalacion',
  validateParams(servicioIdParamSchema),
  validateBody(configurarDesinstalacionSchema),
  (req, res) => serviciosController.configurarDesinstalacion(req, res)
);

export default router;
