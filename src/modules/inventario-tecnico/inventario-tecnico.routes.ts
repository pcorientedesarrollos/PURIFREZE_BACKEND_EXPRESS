import { Router } from 'express';
import { inventarioTecnicoController } from './inventario-tecnico.controller';
import { validateBody, validateParams } from '../../middlewares/validateRequest';
import {
  upsertInventarioTecnicoSchema,
  updateStockSchema,
  tecnicoIdParamSchema,
  tecnicoRefaccionParamSchema,
} from './inventario-tecnico.schema';

const router = Router();

/** @swagger
 * /inventario-tecnico:
 *   post:
 *     summary: Agregar o actualizar refacción en inventario de técnico
 *     tags: [Inventario Técnico]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [TecnicoID, RefaccionID]
 *             properties:
 *               TecnicoID:
 *                 type: integer
 *               RefaccionID:
 *                 type: integer
 *               StockNuevo:
 *                 type: integer
 *                 default: 0
 *               StockUsado:
 *                 type: integer
 *                 default: 0
 *     responses:
 *       200:
 *         description: Inventario actualizado
 */
router.post('/', validateBody(upsertInventarioTecnicoSchema), (req, res) => inventarioTecnicoController.upsert(req, res));

/** @swagger
 * /inventario-tecnico:
 *   get:
 *     summary: Obtener resumen de inventario de todos los técnicos
 *     tags: [Inventario Técnico]
 *     responses:
 *       200:
 *         description: Resumen de inventarios
 */
router.get('/', (req, res) => inventarioTecnicoController.findAll(req, res));

/** @swagger
 * /inventario-tecnico/tecnico/{TecnicoID}:
 *   get:
 *     summary: Obtener inventario completo de un técnico
 *     tags: [Inventario Técnico]
 *     parameters:
 *       - in: path
 *         name: TecnicoID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Inventario del técnico
 *       404:
 *         description: Técnico no encontrado
 */
router.get('/tecnico/:TecnicoID', validateParams(tecnicoIdParamSchema), (req, res) => inventarioTecnicoController.findByTecnico(req, res));

/** @swagger
 * /inventario-tecnico/tecnico/{TecnicoID}/sugerencias:
 *   get:
 *     summary: Obtener sugerencias de refacciones para un técnico
 *     tags: [Inventario Técnico]
 *     parameters:
 *       - in: path
 *         name: TecnicoID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Sugerencias basadas en otros técnicos
 */
router.get('/tecnico/:TecnicoID/sugerencias', validateParams(tecnicoIdParamSchema), (req, res) => inventarioTecnicoController.getSugerencias(req, res));

/** @swagger
 * /inventario-tecnico/tecnico/{TecnicoID}/buscar:
 *   get:
 *     summary: Buscar refacciones disponibles para agregar
 *     tags: [Inventario Técnico]
 *     parameters:
 *       - in: path
 *         name: TecnicoID
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: q
 *         required: false
 *         schema:
 *           type: string
 *         description: Término de búsqueda
 *     responses:
 *       200:
 *         description: Refacciones encontradas
 */
router.get('/tecnico/:TecnicoID/buscar', validateParams(tecnicoIdParamSchema), (req, res) => inventarioTecnicoController.buscarRefacciones(req, res));

/** @swagger
 * /inventario-tecnico/tecnico/{TecnicoID}/refaccion/{RefaccionID}:
 *   get:
 *     summary: Obtener detalle de una refacción en inventario
 *     tags: [Inventario Técnico]
 *     parameters:
 *       - in: path
 *         name: TecnicoID
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: RefaccionID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Detalle de inventario
 *       404:
 *         description: Registro no encontrado
 */
router.get('/tecnico/:TecnicoID/refaccion/:RefaccionID', validateParams(tecnicoRefaccionParamSchema), (req, res) => inventarioTecnicoController.findOne(req, res));

/** @swagger
 * /inventario-tecnico/tecnico/{TecnicoID}/refaccion/{RefaccionID}:
 *   put:
 *     summary: Actualizar stock de una refacción
 *     tags: [Inventario Técnico]
 *     parameters:
 *       - in: path
 *         name: TecnicoID
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: RefaccionID
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               StockNuevo:
 *                 type: integer
 *               StockUsado:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Stock actualizado
 *       404:
 *         description: Registro no encontrado
 */
router.put('/tecnico/:TecnicoID/refaccion/:RefaccionID', validateParams(tecnicoRefaccionParamSchema), validateBody(updateStockSchema), (req, res) => inventarioTecnicoController.updateStock(req, res));

/** @swagger
 * /inventario-tecnico/tecnico/{TecnicoID}/refaccion/{RefaccionID}:
 *   delete:
 *     summary: Eliminar refacción del inventario (solo si stock es 0)
 *     tags: [Inventario Técnico]
 *     parameters:
 *       - in: path
 *         name: TecnicoID
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: RefaccionID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Registro eliminado
 *       300:
 *         description: No se puede eliminar con stock
 *       404:
 *         description: Registro no encontrado
 */
router.delete('/tecnico/:TecnicoID/refaccion/:RefaccionID', validateParams(tecnicoRefaccionParamSchema), (req, res) => inventarioTecnicoController.remove(req, res));

export default router;
