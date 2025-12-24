import { Router } from 'express';
import { contratosController } from './contratos.controller';
import { validateBody, validateParams, validateQuery } from '../../middlewares/validateRequest';
import {
  createContratoSchema,
  updateContratoSchema,
  asignarEquipoSchema,
  cancelarContratoSchema,
  renovarContratoSchema,
  actualizarMontoSchema,
  contratoIdParamSchema,
  clienteEquipoIdParamSchema,
  clienteIdParamSchema,
  contratosQuerySchema,
} from './contratos.schema';
import { z } from 'zod';

const router = Router();

// Schema para activar/instalar/retirar (solo requiere UsuarioID)
const usuarioIdSchema = z.object({
  UsuarioID: z.number({ required_error: 'El UsuarioID es requerido' }),
});

// Schema para retirar con motivo opcional
const retirarEquipoSchema = z.object({
  UsuarioID: z.number({ required_error: 'El UsuarioID es requerido' }),
  MotivoRetiro: z.string().max(255).optional(),
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
// EQUIPOS DEL CONTRATO (usando clientes_equipos)
// =============================================

/** Obtener equipos pendientes de asignación/instalación de un contrato */
router.get('/:ContratoID/equipos-pendientes', validateParams(contratoIdParamSchema), (req, res) => contratosController.getEquiposPendientes(req, res));

/** Obtener equipos disponibles para asignar a un registro de cliente_equipo */
router.get('/cliente-equipo/:ClienteEquipoID/disponibles', validateParams(clienteEquipoIdParamSchema), (req, res) => contratosController.getEquiposDisponibles(req, res));

/** Asignar equipo físico a un registro de cliente_equipo */
router.patch('/cliente-equipo/:ClienteEquipoID/asignar', validateParams(clienteEquipoIdParamSchema), validateBody(asignarEquipoSchema.extend({ UsuarioID: z.number() })), (req, res) => contratosController.asignarEquipo(req, res));

/** Instalar equipo (marcar como instalado) */
router.patch('/cliente-equipo/:ClienteEquipoID/instalar', validateParams(clienteEquipoIdParamSchema), validateBody(usuarioIdSchema), (req, res) => contratosController.instalarEquipo(req, res));

/** Retirar equipo del contrato */
router.patch('/cliente-equipo/:ClienteEquipoID/retirar', validateParams(clienteEquipoIdParamSchema), validateBody(retirarEquipoSchema), (req, res) => contratosController.retirarEquipo(req, res));

// NOTA: Los servicios ahora se manejan en el módulo /servicios

export default router;
