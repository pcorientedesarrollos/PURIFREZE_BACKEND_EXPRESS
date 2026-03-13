import { Router } from 'express';
import { cotizacionesProveedorController } from './cotizaciones-proveedor.controller';
import { validateBody, validateParams } from '../../middlewares/validateRequest';
import {
  asignarProveedoresSchema,
  respuestaProveedorSchema,
  cotizacionIdParamSchema,
  respuestaIdParamSchema,
  generarComprasSchema,
} from './cotizaciones-proveedor.schema';
import { z } from 'zod';

const router = Router();

// Schema para param de proveedor
const proveedorIdParamSchema = z.object({
  ProveedorID: z.string().regex(/^\d+$/, 'ID debe ser un número válido').transform(Number),
});

// ═══════════════════════════════════════════════════════════════════════════
// ENDPOINTS PARA ADMINISTRADORES (asignar proveedores, comparar)
// ═══════════════════════════════════════════════════════════════════════════

// POST /cotizaciones-proveedor/:CotizacionCompraID/asignar - Asignar proveedores
router.post(
  '/:CotizacionCompraID/asignar',
  validateParams(cotizacionIdParamSchema),
  validateBody(asignarProveedoresSchema),
  (req, res) => cotizacionesProveedorController.asignarProveedores(req, res)
);

// GET /cotizaciones-proveedor/:CotizacionCompraID/proveedores - Ver proveedores asignados
router.get(
  '/:CotizacionCompraID/proveedores',
  validateParams(cotizacionIdParamSchema),
  (req, res) => cotizacionesProveedorController.getProveedoresAsignados(req, res)
);

// GET /cotizaciones-proveedor/:CotizacionCompraID/comparar - Comparar respuestas
router.get(
  '/:CotizacionCompraID/comparar',
  validateParams(cotizacionIdParamSchema),
  (req, res) => cotizacionesProveedorController.compararRespuestas(req, res)
);

// POST /cotizaciones-proveedor/:CotizacionCompraID/generar-compras - Generar múltiples compras
router.post(
  '/:CotizacionCompraID/generar-compras',
  validateParams(cotizacionIdParamSchema),
  validateBody(generarComprasSchema),
  (req, res) => cotizacionesProveedorController.generarComprasMultiples(req, res)
);

// ═══════════════════════════════════════════════════════════════════════════
// ENDPOINTS PARA PROVEEDORES (ver cotizaciones asignadas, responder)
// ═══════════════════════════════════════════════════════════════════════════

// GET /cotizaciones-proveedor/proveedor/:ProveedorID - Ver cotizaciones asignadas al proveedor
router.get(
  '/proveedor/:ProveedorID',
  validateParams(proveedorIdParamSchema),
  (req, res) => cotizacionesProveedorController.getCotizacionesPorProveedor(req, res)
);

// GET /cotizaciones-proveedor/respuesta/:RespuestaID - Ver detalle de respuesta
router.get(
  '/respuesta/:RespuestaID',
  validateParams(respuestaIdParamSchema),
  (req, res) => cotizacionesProveedorController.getRespuestaDetalle(req, res)
);

// POST /cotizaciones-proveedor/respuesta/:RespuestaID/responder - Proveedor responde con precios
router.post(
  '/respuesta/:RespuestaID/responder',
  validateParams(respuestaIdParamSchema),
  validateBody(respuestaProveedorSchema),
  (req, res) => cotizacionesProveedorController.responderCotizacion(req, res)
);

// POST /cotizaciones-proveedor/respuesta/:RespuestaID/rechazar - Proveedor rechaza cotización
router.post(
  '/respuesta/:RespuestaID/rechazar',
  validateParams(respuestaIdParamSchema),
  (req, res) => cotizacionesProveedorController.rechazarCotizacion(req, res)
);

// DELETE /cotizaciones-proveedor/respuesta/:RespuestaID - Eliminar asignación
router.delete(
  '/respuesta/:RespuestaID',
  validateParams(respuestaIdParamSchema),
  (req, res) => cotizacionesProveedorController.eliminarAsignacion(req, res)
);

export default router;
