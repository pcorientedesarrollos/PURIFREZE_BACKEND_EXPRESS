import { Router } from 'express';
import { cobrosController } from './cobros.controller';
import { validateBody, validateParams, validateQuery } from '../../middlewares/validateRequest';
import {
  cobroIdParamSchema,
  contratoIdParamSchema,
  cobrosQuerySchema,
  configurarCobrosSchema,
  registrarPagoSchema,
  registrarPagoParcialSchema,
  aplicarRegaloSchema,
  aplicarDescuentoSchema,
  cancelarCobroSchema,
  modificarMontoSchema,
  generarCobrosSchema,
  pagarConDescuentoSchema,
} from './cobros.schema';
import { z } from 'zod';

const router = Router();

// Schema para ClienteID en params
const clienteIdParamSchema = z.object({
  ClienteID: z.string().regex(/^\d+$/, 'El ClienteID debe ser un número').transform(Number),
});

// =============================================
// CONFIGURACIÓN Y GENERACIÓN DE COBROS
// =============================================

/** Configurar la generación de cobros para un contrato */
router.post(
  '/contrato/:ContratoID/configurar',
  validateParams(contratoIdParamSchema),
  validateBody(configurarCobrosSchema),
  (req, res) => cobrosController.configurarCobros(req, res)
);

/** Obtener configuración de cobros de un contrato */
router.get(
  '/contrato/:ContratoID/configuracion',
  validateParams(contratoIdParamSchema),
  (req, res) => cobrosController.getConfiguracion(req, res)
);

/** Generar cobros para un contrato (según su configuración) */
router.post(
  '/contrato/:ContratoID/generar',
  validateParams(contratoIdParamSchema),
  validateBody(generarCobrosSchema),
  (req, res) => cobrosController.generarCobros(req, res)
);

// =============================================
// CONSULTAS
// =============================================

/** Obtener todos los cobros con filtros opcionales */
router.get('/', validateQuery(cobrosQuerySchema), (req, res) => cobrosController.findAll(req, res));

/** Obtener cobros vencidos */
router.get('/vencidos', (req, res) => cobrosController.getVencidos(req, res));

/** Obtener cobros de un contrato */
router.get('/contrato/:ContratoID', validateParams(contratoIdParamSchema), (req, res) =>
  cobrosController.findByContrato(req, res)
);

/** Obtener resumen de cobros de un cliente */
router.get('/cliente/:ClienteID/resumen', validateParams(clienteIdParamSchema), (req, res) =>
  cobrosController.getResumenCliente(req, res)
);

/** Obtener un cobro por ID */
router.get('/:CobroID', validateParams(cobroIdParamSchema), (req, res) => cobrosController.findOne(req, res));

// =============================================
// ACCIONES SOBRE COBROS
// =============================================

/** Registrar pago completo de un cobro */
router.patch(
  '/:CobroID/pagar',
  validateParams(cobroIdParamSchema),
  validateBody(registrarPagoSchema),
  (req, res) => cobrosController.registrarPago(req, res)
);

/** Registrar pago parcial de un cobro */
router.patch(
  '/:CobroID/pago-parcial',
  validateParams(cobroIdParamSchema),
  validateBody(registrarPagoParcialSchema),
  (req, res) => cobrosController.registrarPagoParcial(req, res)
);

/** Aplicar regalo/cortesía a un cobro (monto = 0) */
router.patch(
  '/:CobroID/regalar',
  validateParams(cobroIdParamSchema),
  validateBody(aplicarRegaloSchema),
  (req, res) => cobrosController.aplicarRegalo(req, res)
);

/** Aplicar descuento o promoción a un cobro */
router.patch(
  '/:CobroID/descuento',
  validateParams(cobroIdParamSchema),
  validateBody(aplicarDescuentoSchema),
  (req, res) => cobrosController.aplicarDescuento(req, res)
);

/** Aplicar descuento y pagar en una sola operación */
router.patch(
  '/:CobroID/pagar-con-descuento',
  validateParams(cobroIdParamSchema),
  validateBody(pagarConDescuentoSchema),
  (req, res) => cobrosController.pagarConDescuento(req, res)
);

/** Cancelar un cobro */
router.patch(
  '/:CobroID/cancelar',
  validateParams(cobroIdParamSchema),
  validateBody(cancelarCobroSchema),
  (req, res) => cobrosController.cancelar(req, res)
);

/** Modificar el monto de un cobro */
router.patch(
  '/:CobroID/monto',
  validateParams(cobroIdParamSchema),
  validateBody(modificarMontoSchema),
  (req, res) => cobrosController.modificarMonto(req, res)
);

// =============================================
// TAREAS ADMINISTRATIVAS
// =============================================

/** Marcar cobros vencidos (para tarea programada) */
router.post('/marcar-vencidos', (req, res) => cobrosController.marcarVencidos(req, res));

export default router;
