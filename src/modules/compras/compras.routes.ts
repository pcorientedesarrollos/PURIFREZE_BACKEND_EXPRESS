import { Router } from 'express';
import { comprasController } from './compras.controller';
import { validateBody, validateParams } from '../../middlewares/validateRequest';
import { createCompraSchema, updateCompraSchema, compraIdParamSchema, aplicarDescuentosSchema, updateFacturaSchema } from './compras.schema';

const router = Router();

/** @swagger
 * /compras:
 *   post:
 *     summary: Crear compra con detalles
 *     tags: [Compras]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ProveedorID, CuentaBancariaID, FechaCompra, TotalBruto, TotalDescuentosPorcentaje, TotalDescuentoEfectivo, TotalGastosOperativos, TotalGastosImportacion, TotalIVA, TotalNeto, Estatus, Detalles]
 *             properties:
 *               ProveedorID:
 *                 type: integer
 *               CuentaBancariaID:
 *                 type: integer
 *               FechaCompra:
 *                 type: string
 *                 format: date
 *               TotalBruto:
 *                 type: number
 *               TotalDescuentosPorcentaje:
 *                 type: number
 *               TotalDescuentoEfectivo:
 *                 type: number
 *               TotalGastosOperativos:
 *                 type: number
 *               TotalGastosImportacion:
 *                 type: number
 *               TotalIVA:
 *                 type: number
 *               TotalNeto:
 *                 type: number
 *               UsuarioID:
 *                 type: integer
 *               Estatus:
 *                 type: string
 *               MetodoPagoID:
 *                 type: integer
 *               Detalles:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [RefaccionID, Cantidad, PrecioUnitario, DescuentoPorcentaje, DescuentoEfectivo, GastosOperativos, GastosImportacion, SubTotal, Total]
 *                   properties:
 *                     RefaccionID:
 *                       type: integer
 *                     Cantidad:
 *                       type: number
 *                     PrecioUnitario:
 *                       type: number
 *                     DescuentoPorcentaje:
 *                       type: number
 *                     DescuentoEfectivo:
 *                       type: number
 *                     GastosOperativos:
 *                       type: number
 *                     GastosImportacion:
 *                       type: number
 *                     SubTotal:
 *                       type: number
 *                     Total:
 *                       type: number
 *     responses:
 *       200:
 *         description: Compra creada
 */
router.post('/', validateBody(createCompraSchema), (req, res) => comprasController.create(req, res));

/** @swagger
 * /compras:
 *   get:
 *     summary: Obtener todas las compras
 *     tags: [Compras]
 *     responses:
 *       200:
 *         description: Lista de compras
 */
router.get('/', (req, res) => comprasController.findAll(req, res));

/** @swagger
 * /compras/estatus:
 *   get:
 *     summary: Obtener estatus de compras
 *     tags: [Compras]
 *     responses:
 *       200:
 *         description: Lista de estatus
 */
router.get('/estatus', (req, res) => comprasController.findEstatus(req, res));

/** @swagger
 * /compras/{CompraEncabezadoID}:
 *   get:
 *     summary: Obtener compra por ID
 *     tags: [Compras]
 *     parameters:
 *       - in: path
 *         name: CompraEncabezadoID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Compra encontrada
 *       404:
 *         description: No encontrada
 */
router.get('/:CompraEncabezadoID', validateParams(compraIdParamSchema), (req, res) => comprasController.findOne(req, res));

/** @swagger
 * /compras/{CompraEncabezadoID}:
 *   put:
 *     summary: Actualizar compra
 *     tags: [Compras]
 *     parameters:
 *       - in: path
 *         name: CompraEncabezadoID
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ProveedorID:
 *                 type: integer
 *               CuentaBancariaID:
 *                 type: integer
 *               FechaCompra:
 *                 type: string
 *               TotalBruto:
 *                 type: number
 *               TotalDescuentosPorcentaje:
 *                 type: number
 *               TotalDescuentoEfectivo:
 *                 type: number
 *               TotalGastosOperativos:
 *                 type: number
 *               TotalGastosImportacion:
 *                 type: number
 *               TotalIVA:
 *                 type: number
 *               TotalNeto:
 *                 type: number
 *               Estatus:
 *                 type: string
 *               MetodoPagoID:
 *                 type: integer
 *               Detalles:
 *                 type: array
 *                 items:
 *                   type: object
 *               DetallesEliminar:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Actualizada
 */
router.put('/:CompraEncabezadoID', validateParams(compraIdParamSchema), validateBody(updateCompraSchema), (req, res) => comprasController.update(req, res));

/** @swagger
 * /compras/{CompraEncabezadoID}:
 *   delete:
 *     summary: Eliminar compra
 *     tags: [Compras]
 *     parameters:
 *       - in: path
 *         name: CompraEncabezadoID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Eliminada
 */
router.delete('/:CompraEncabezadoID', validateParams(compraIdParamSchema), (req, res) => comprasController.remove(req, res));

/** @swagger
 * /compras/{CompraEncabezadoID}/descuentos:
 *   patch:
 *     summary: Aplicar descuentos al encabezado de compra
 *     tags: [Compras]
 *     parameters:
 *       - in: path
 *         name: CompraEncabezadoID
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               DescuentoPorcentaje:
 *                 type: number
 *                 description: Descuento en porcentaje (0-100)
 *               DescuentoEfectivo:
 *                 type: number
 *                 description: Descuento en monto fijo ($)
 *     responses:
 *       200:
 *         description: Descuentos aplicados
 *       400:
 *         description: Error de validación
 */
router.patch('/:CompraEncabezadoID/descuentos', validateParams(compraIdParamSchema), validateBody(aplicarDescuentosSchema), (req, res) => comprasController.aplicarDescuentos(req, res));

/** PATCH /compras/:id/factura - Actualizar número de factura */
router.patch('/:CompraEncabezadoID/factura', validateParams(compraIdParamSchema), validateBody(updateFacturaSchema), (req, res) => comprasController.updateFactura(req, res));

export default router;
