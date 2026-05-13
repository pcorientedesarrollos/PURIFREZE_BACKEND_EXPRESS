import { Router } from 'express';
import { reportesBancariosController } from './reportes-bancarios.controller';
import { validateParams, validateQuery } from '../../middlewares/validateRequest';
import { cuentaBancariaIdParamSchema, reporteQuerySchema } from './reportes-bancarios.schema';

const router = Router();

/** @swagger
 * /reportes-bancarios:
 *   get:
 *     summary: Resumen de todas las cuentas bancarias
 *     tags: [Reportes Bancarios]
 *     responses:
 *       200:
 *         description: Saldo, ingresos, egresos y total de movimientos por cuenta
 */
router.get('/', (req, res) => reportesBancariosController.findResumen(req, res));

/** @swagger
 * /reportes-bancarios/{CuentaBancariaID}:
 *   get:
 *     summary: Detalle de movimientos de una cuenta bancaria
 *     tags: [Reportes Bancarios]
 *     parameters:
 *       - in: path
 *         name: CuentaBancariaID
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: FechaInicio
 *         schema:
 *           type: string
 *           format: date
 *         description: Filtro fecha inicio (YYYY-MM-DD)
 *       - in: query
 *         name: FechaFin
 *         schema:
 *           type: string
 *           format: date
 *         description: Filtro fecha fin (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Movimientos con detalle de compras asociadas
 *       404:
 *         description: Cuenta no encontrada
 */
router.get(
  '/:CuentaBancariaID',
  validateParams(cuentaBancariaIdParamSchema),
  validateQuery(reporteQuerySchema),
  (req, res) => reportesBancariosController.findDetalle(req, res)
);

export default router;
