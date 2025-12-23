import { Router } from 'express';
import { equiposController } from './equipos.controller';
import { validateBody, validateParams, validateQuery } from '../../middlewares/validateRequest';
import {
  createEquiposFromPlantillaSchema,
  equipoIdParamSchema,
  equipoDetalleIdParamSchema,
  searchEquiposQuerySchema,
  updateEquipoSchema,
  agregarRefaccionEquipoSchema,
  modificarCantidadRefaccionSchema,
  eliminarRefaccionEquipoSchema,
  instalarEquipoSchema,
  desmontarEquipoSchema,
  finalizarReacondicionamientoSchema,
} from './equipos.schema';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════
// CRUD BÁSICO
// ═══════════════════════════════════════════════════════════════════════════

// POST /equipos - Crear equipos desde plantilla
router.post(
  '/',
  validateBody(createEquiposFromPlantillaSchema),
  (req, res) => equiposController.createFromPlantilla(req, res)
);

// GET /equipos - Obtener todos los equipos (con filtros opcionales)
router.get(
  '/',
  validateQuery(searchEquiposQuerySchema),
  (req, res) => equiposController.findAll(req, res)
);

// GET /equipos/refacciones - Buscar refacciones con stock disponible
router.get(
  '/refacciones',
  (req, res) => equiposController.searchRefacciones(req, res)
);

// GET /equipos/:EquipoID - Obtener equipo por ID
router.get(
  '/:EquipoID',
  validateParams(equipoIdParamSchema),
  (req, res) => equiposController.findOne(req, res)
);

// PUT /equipos/:EquipoID - Actualizar observaciones del equipo
router.put(
  '/:EquipoID',
  validateParams(equipoIdParamSchema),
  validateBody(updateEquipoSchema),
  (req, res) => equiposController.update(req, res)
);

// ═══════════════════════════════════════════════════════════════════════════
// GESTIÓN DE REFACCIONES EN EQUIPO
// ═══════════════════════════════════════════════════════════════════════════

// POST /equipos/:EquipoID/refacciones - Agregar refacción al equipo
router.post(
  '/:EquipoID/refacciones',
  validateParams(equipoIdParamSchema),
  validateBody(agregarRefaccionEquipoSchema),
  (req, res) => equiposController.agregarRefaccion(req, res)
);

// PATCH /equipos/:EquipoID/refacciones/:EquipoDetalleID/cantidad - Modificar cantidad
router.patch(
  '/:EquipoID/refacciones/:EquipoDetalleID/cantidad',
  validateParams(equipoDetalleIdParamSchema),
  validateBody(modificarCantidadRefaccionSchema),
  (req, res) => equiposController.modificarCantidadRefaccion(req, res)
);

// DELETE /equipos/:EquipoID/refacciones/:EquipoDetalleID - Eliminar refacción
router.delete(
  '/:EquipoID/refacciones/:EquipoDetalleID',
  validateParams(equipoDetalleIdParamSchema),
  validateBody(eliminarRefaccionEquipoSchema),
  (req, res) => equiposController.eliminarRefaccion(req, res)
);

// ═══════════════════════════════════════════════════════════════════════════
// CAMBIO DE ESTATUS
// ═══════════════════════════════════════════════════════════════════════════

// PATCH /equipos/:EquipoID/instalar - Instalar equipo (Armado → Instalado)
router.patch(
  '/:EquipoID/instalar',
  validateParams(equipoIdParamSchema),
  validateBody(instalarEquipoSchema),
  (req, res) => equiposController.instalar(req, res)
);

// PATCH /equipos/:EquipoID/desmontar - Desmontar equipo (Instalado → Desmontado)
// NOTA: Este endpoint se mantiene por compatibilidad, pero el flujo principal es desde servicios
router.patch(
  '/:EquipoID/desmontar',
  validateParams(equipoIdParamSchema),
  validateBody(desmontarEquipoSchema),
  (req, res) => equiposController.desmontar(req, res)
);

// PATCH /equipos/:EquipoID/finalizar-reacondicionamiento - Finalizar reacondicionamiento (Reacondicionado → Armado)
router.patch(
  '/:EquipoID/finalizar-reacondicionamiento',
  validateParams(equipoIdParamSchema),
  validateBody(finalizarReacondicionamientoSchema),
  (req, res) => equiposController.finalizarReacondicionamiento(req, res)
);

// ═══════════════════════════════════════════════════════════════════════════
// SOFT DELETE
// ═══════════════════════════════════════════════════════════════════════════

// PATCH /equipos/baja/:EquipoID - Dar de baja equipo
router.patch(
  '/baja/:EquipoID',
  validateParams(equipoIdParamSchema),
  (req, res) => equiposController.deactivate(req, res)
);

// PATCH /equipos/activar/:EquipoID - Activar equipo
router.patch(
  '/activar/:EquipoID',
  validateParams(equipoIdParamSchema),
  (req, res) => equiposController.activate(req, res)
);

export default router;
