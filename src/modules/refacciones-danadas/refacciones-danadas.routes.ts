import { Router } from 'express';
import { refaccionesDanadasController } from './refacciones-danadas.controller';
import { validateBody, validateParams } from '../../middlewares/validateRequest';
import { createRefaccionDanadaSchema, refaccionDanadaIdParamSchema } from './refacciones-danadas.schema';

const router = Router();

/** @swagger
 * /refacciones-danadas:
 *   post:
 *     summary: Registrar refacción dañada
 *     tags: [Refacciones Dañadas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [RefaccionID, Cantidad, MotivoDano, UsuarioID]
 *             properties:
 *               RefaccionID:
 *                 type: integer
 *               TecnicoID:
 *                 type: integer
 *                 nullable: true
 *               ProveedorID:
 *                 type: integer
 *                 nullable: true
 *               CompraEncabezadoID:
 *                 type: integer
 *                 nullable: true
 *               Cantidad:
 *                 type: integer
 *                 minimum: 1
 *               MotivoDano:
 *                 type: string
 *                 enum: [Defecto_Fabrica, Mal_Uso, Desgaste_Normal, Accidente, Otro]
 *               Observaciones:
 *                 type: string
 *               UsuarioID:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Registro creado
 */
router.post('/', validateBody(createRefaccionDanadaSchema), (req, res) => refaccionesDanadasController.create(req, res));

/** @swagger
 * /refacciones-danadas:
 *   get:
 *     summary: Obtener todos los registros de refacciones dañadas
 *     tags: [Refacciones Dañadas]
 *     responses:
 *       200:
 *         description: Lista de registros
 */
router.get('/', (req, res) => refaccionesDanadasController.findAll(req, res));

/** @swagger
 * /refacciones-danadas/reporte/proveedor:
 *   get:
 *     summary: Reporte de refacciones dañadas por proveedor
 *     tags: [Refacciones Dañadas]
 *     parameters:
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
 *         name: proveedorId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Reporte por proveedor
 */
router.get('/reporte/proveedor', (req, res) => refaccionesDanadasController.reportePorProveedor(req, res));

/** @swagger
 * /refacciones-danadas/reporte/refaccion:
 *   get:
 *     summary: Reporte de refacciones más dañadas
 *     tags: [Refacciones Dañadas]
 *     parameters:
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
 *         name: refaccionId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Reporte por refacción
 */
router.get('/reporte/refaccion', (req, res) => refaccionesDanadasController.reportePorRefaccion(req, res));

/** @swagger
 * /refacciones-danadas/reporte/tecnico:
 *   get:
 *     summary: Reporte de refacciones dañadas por técnico
 *     tags: [Refacciones Dañadas]
 *     parameters:
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
 *         name: tecnicoId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Reporte por técnico
 */
router.get('/reporte/tecnico', (req, res) => refaccionesDanadasController.reportePorTecnico(req, res));

/** @swagger
 * /refacciones-danadas/{RefaccionDanadaID}:
 *   get:
 *     summary: Obtener detalle de un registro
 *     tags: [Refacciones Dañadas]
 *     parameters:
 *       - in: path
 *         name: RefaccionDanadaID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Registro encontrado
 *       404:
 *         description: No encontrado
 */
router.get('/:RefaccionDanadaID', validateParams(refaccionDanadaIdParamSchema), (req, res) => refaccionesDanadasController.findOne(req, res));

/** @swagger
 * /refacciones-danadas/{RefaccionDanadaID}:
 *   delete:
 *     summary: Eliminar registro (soft delete)
 *     tags: [Refacciones Dañadas]
 *     parameters:
 *       - in: path
 *         name: RefaccionDanadaID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Registro eliminado
 *       404:
 *         description: No encontrado
 */
router.delete('/:RefaccionDanadaID', validateParams(refaccionDanadaIdParamSchema), (req, res) => refaccionesDanadasController.remove(req, res));

export default router;
