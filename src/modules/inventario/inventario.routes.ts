import { Router } from 'express';
import { inventarioController } from './inventario.controller';
import { validateParams, validateQuery } from '../../middlewares/validateRequest';
import { refaccionIdParamSchema, kardexQuerySchema } from './inventario.schema';

const router = Router();

// ==================== INVENTARIO ====================

/** @swagger
 * /inventario:
 *   get:
 *     summary: Obtener todo el inventario
 *     tags: [Inventario]
 *     responses:
 *       200:
 *         description: Lista de inventario con stock actual
 */
router.get('/', (req, res) => inventarioController.findAll(req, res));

/** @swagger
 * /inventario/resumen:
 *   get:
 *     summary: Obtener resumen de inventario por ubicación
 *     tags: [Inventario]
 *     responses:
 *       200:
 *         description: Resumen con totales por ubicación y valor total
 */
router.get('/resumen', (req, res) => inventarioController.getResumen(req, res));

/** @swagger
 * /inventario/refaccion/{RefaccionID}:
 *   get:
 *     summary: Obtener inventario por RefaccionID
 *     tags: [Inventario]
 *     parameters:
 *       - in: path
 *         name: RefaccionID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Inventario de la refacción
 *       404:
 *         description: No encontrado
 */
router.get(
  '/refaccion/:RefaccionID',
  validateParams(refaccionIdParamSchema),
  (req, res) => inventarioController.findByRefaccion(req, res),
);

// ==================== KARDEX ====================

/** @swagger
 * /inventario/kardex:
 *   get:
 *     summary: Obtener todo el kardex
 *     tags: [Kardex]
 *     parameters:
 *       - in: query
 *         name: fechaInicio
 *         schema:
 *           type: string
 *           format: date
 *         description: Filtrar desde fecha (YYYY-MM-DD)
 *       - in: query
 *         name: fechaFin
 *         schema:
 *           type: string
 *           format: date
 *         description: Filtrar hasta fecha (YYYY-MM-DD)
 *       - in: query
 *         name: tipoMovimiento
 *         schema:
 *           type: string
 *         description: Filtrar por tipo de movimiento
 *     responses:
 *       200:
 *         description: Lista de movimientos de kardex
 */
router.get(
  '/kardex',
  validateQuery(kardexQuerySchema),
  (req, res) => inventarioController.findAllKardex(req, res),
);

/** @swagger
 * /inventario/kardex/tipos-movimiento:
 *   get:
 *     summary: Obtener tipos de movimiento disponibles
 *     tags: [Kardex]
 *     responses:
 *       200:
 *         description: Lista de tipos de movimiento
 */
router.get('/kardex/tipos-movimiento', (req, res) => inventarioController.getTiposMovimiento(req, res));

/** @swagger
 * /inventario/kardex/refaccion/{RefaccionID}:
 *   get:
 *     summary: Obtener kardex por RefaccionID
 *     tags: [Kardex]
 *     parameters:
 *       - in: path
 *         name: RefaccionID
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: fechaInicio
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: fechaFin
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: tipoMovimiento
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Kardex de la refacción
 */
router.get(
  '/kardex/refaccion/:RefaccionID',
  validateParams(refaccionIdParamSchema),
  validateQuery(kardexQuerySchema),
  (req, res) => inventarioController.findKardexByRefaccion(req, res),
);

export default router;
