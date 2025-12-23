import { Router } from 'express';
import { contratosController } from './contratos.controller';
import { validateBody, validateParams, validateQuery } from '../../middlewares/validateRequest';
import {
  createContratoSchema,
  updateContratoSchema,
  addEquipoSchema,
  asignarEquipoSchema,
  updateEquipoContratoSchema,
  cancelarContratoSchema,
  renovarContratoSchema,
  actualizarMontoSchema,
  contratoIdParamSchema,
  contratoEquipoIdParamSchema,
  clienteIdParamSchema,
  contratosQuerySchema,
} from './contratos.schema';
import { z } from 'zod';

const router = Router();

// Schema para activar/instalar/retirar (solo requiere UsuarioID)
const usuarioIdSchema = z.object({
  UsuarioID: z.number({ required_error: 'El UsuarioID es requerido' }),
});

// =============================================
// CONTRATOS - CRUD
// =============================================

/** Crear contrato desde presupuesto aprobado */
router.post('/', validateBody(createContratoSchema), (req, res) => contratosController.create(req, res));

/** Obtener todos los contratos con filtros opcionales */
router.get('/', validateQuery(contratosQuerySchema), (req, res) => contratosController.findAll(req, res));

/** Obtener contratos por cliente */
router.get('/cliente/:ClienteID', validateParams(clienteIdParamSchema), (req, res) => contratosController.findByCliente(req, res));

/** Obtener contrato por ID */
router.get('/:ContratoID', validateParams(contratoIdParamSchema), (req, res) => contratosController.findOne(req, res));

/** Actualizar contrato (solo en revisión) */
router.put('/:ContratoID', validateParams(contratoIdParamSchema), validateBody(updateContratoSchema.extend({ UsuarioID: z.number() })), (req, res) => contratosController.update(req, res));

/** Activar contrato (cambiar de EN_REVISION a ACTIVO) */
router.patch('/:ContratoID/activar-contrato', validateParams(contratoIdParamSchema), validateBody(usuarioIdSchema), (req, res) => contratosController.activar(req, res));

/** Cancelar contrato */
router.patch('/:ContratoID/cancelar', validateParams(contratoIdParamSchema), validateBody(cancelarContratoSchema), (req, res) => contratosController.cancelar(req, res));

/** Renovar contrato (crear nuevo contrato vinculado) */
router.post('/:ContratoID/renovar', validateParams(contratoIdParamSchema), validateBody(renovarContratoSchema), (req, res) => contratosController.renovar(req, res));

/** Actualizar monto del contrato */
router.patch('/:ContratoID/monto', validateParams(contratoIdParamSchema), validateBody(actualizarMontoSchema), (req, res) => contratosController.actualizarMonto(req, res));

/** Dar de baja contrato (soft delete) */
router.patch('/baja/:ContratoID', validateParams(contratoIdParamSchema), (req, res) => contratosController.baja(req, res));

/** Activar registro de contrato */
router.patch('/activar/:ContratoID', validateParams(contratoIdParamSchema), (req, res) => contratosController.activarRegistro(req, res));

// =============================================
// EQUIPOS DEL CONTRATO
// =============================================

/** Obtener items pendientes de asignar equipo */
router.get('/:ContratoID/items-pendientes', validateParams(contratoIdParamSchema), (req, res) => contratosController.getItemsPendientes(req, res));

/** Agregar equipo al contrato (nuevo, no viene del presupuesto) */
router.post('/:ContratoID/equipos', validateParams(contratoIdParamSchema), validateBody(addEquipoSchema.extend({ UsuarioID: z.number() })), (req, res) => contratosController.addEquipo(req, res));

/** Obtener equipos disponibles para asignar a un item pendiente */
router.get('/equipos/:ContratoEquipoID/disponibles', validateParams(contratoEquipoIdParamSchema), (req, res) => contratosController.getEquiposDisponibles(req, res));

/** Asignar equipo físico a un item pendiente del contrato */
router.patch('/equipos/:ContratoEquipoID/asignar', validateParams(contratoEquipoIdParamSchema), validateBody(asignarEquipoSchema.extend({ UsuarioID: z.number() })), (req, res) => contratosController.asignarEquipo(req, res));

/** Actualizar equipo del contrato */
router.put('/equipos/:ContratoEquipoID', validateParams(contratoEquipoIdParamSchema), validateBody(updateEquipoContratoSchema.extend({ UsuarioID: z.number() })), (req, res) => contratosController.updateEquipo(req, res));

/** Instalar equipo (marcar como instalado) */
router.patch('/equipos/:ContratoEquipoID/instalar', validateParams(contratoEquipoIdParamSchema), validateBody(usuarioIdSchema), (req, res) => contratosController.instalarEquipo(req, res));

/** Retirar equipo del contrato */
router.patch('/equipos/:ContratoEquipoID/retirar', validateParams(contratoEquipoIdParamSchema), validateBody(usuarioIdSchema), (req, res) => contratosController.retirarEquipo(req, res));

// NOTA: Los servicios ahora se manejan en el módulo /servicios

export default router;
