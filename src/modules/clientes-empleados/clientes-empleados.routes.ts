import { Router } from 'express';
import { clientesEmpleadosController } from './clientes-empleados.controller';
import { validateBody, validateParams } from '../../middlewares/validateRequest';
import {
  createClienteEmpleadoSchema,
  updateClienteEmpleadoSchema,
  empleadoIdParamSchema,
  empleadosIdParamSchema,
  asignarPuestosSchema,
  agregarPuestoSchema,
  empleadoPuestoParamSchema,
} from './clientes-empleados.schema';

const router = Router();

/** @swagger
 * /clientes-empleados:
 *   post:
 *     summary: Crear empleado de cliente con múltiples puestos
 *     tags: [Clientes - Empleados]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ClienteID, NombreEmpleado, PuestosTrabajoIDs]
 *             properties:
 *               ClienteID:
 *                 type: integer
 *               NombreEmpleado:
 *                 type: string
 *               Observaciones:
 *                 type: string
 *               PuestosTrabajoIDs:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       201:
 *         description: Creado
 */
router.post('/', validateBody(createClienteEmpleadoSchema), (req, res) => clientesEmpleadosController.create(req, res));

/** @swagger
 * /clientes-empleados:
 *   get:
 *     summary: Obtener todos los empleados de clientes con sus puestos
 *     tags: [Clientes - Empleados]
 *     responses:
 *       200:
 *         description: Lista de empleados
 */
router.get('/', (req, res) => clientesEmpleadosController.findAll(req, res));

/** @swagger
 * /clientes-empleados/{EmpleadoID}:
 *   get:
 *     summary: Obtener empleado por ID con sus puestos
 *     tags: [Clientes - Empleados]
 *     parameters:
 *       - in: path
 *         name: EmpleadoID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Encontrado
 *       404:
 *         description: No encontrado
 */
router.get('/:EmpleadoID', validateParams(empleadoIdParamSchema), (req, res) => clientesEmpleadosController.findOne(req, res));

/** @swagger
 * /clientes-empleados/{EmpleadoID}:
 *   put:
 *     summary: Actualizar datos del empleado (sin puestos)
 *     tags: [Clientes - Empleados]
 *     parameters:
 *       - in: path
 *         name: EmpleadoID
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               NombreEmpleado:
 *                 type: string
 *               Observaciones:
 *                 type: string
 *     responses:
 *       200:
 *         description: Actualizado
 */
router.put('/:EmpleadoID', validateParams(empleadoIdParamSchema), validateBody(updateClienteEmpleadoSchema), (req, res) => clientesEmpleadosController.update(req, res));

// =============================================
// ENDPOINTS DE GESTIÓN DE PUESTOS
// =============================================

/** @swagger
 * /clientes-empleados/{EmpleadoID}/puestos:
 *   get:
 *     summary: Obtener puestos de un empleado
 *     tags: [Clientes - Empleados]
 *     parameters:
 *       - in: path
 *         name: EmpleadoID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de puestos del empleado
 */
router.get('/:EmpleadoID/puestos', validateParams(empleadoIdParamSchema), (req, res) => clientesEmpleadosController.getPuestos(req, res));

/** @swagger
 * /clientes-empleados/{EmpleadoID}/puestos:
 *   put:
 *     summary: Asignar puestos (reemplaza todos los existentes)
 *     tags: [Clientes - Empleados]
 *     parameters:
 *       - in: path
 *         name: EmpleadoID
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [PuestosTrabajoIDs]
 *             properties:
 *               PuestosTrabajoIDs:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Puestos asignados
 */
router.put('/:EmpleadoID/puestos', validateParams(empleadoIdParamSchema), validateBody(asignarPuestosSchema), (req, res) => clientesEmpleadosController.asignarPuestos(req, res));

/** @swagger
 * /clientes-empleados/{EmpleadoID}/puestos:
 *   post:
 *     summary: Agregar un puesto adicional al empleado
 *     tags: [Clientes - Empleados]
 *     parameters:
 *       - in: path
 *         name: EmpleadoID
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [PuestoTrabajoID]
 *             properties:
 *               PuestoTrabajoID:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Puesto agregado
 */
router.post('/:EmpleadoID/puestos', validateParams(empleadoIdParamSchema), validateBody(agregarPuestoSchema), (req, res) => clientesEmpleadosController.agregarPuesto(req, res));

/** @swagger
 * /clientes-empleados/{EmpleadoID}/puestos/{PuestoTrabajoID}:
 *   delete:
 *     summary: Quitar un puesto del empleado
 *     tags: [Clientes - Empleados]
 *     parameters:
 *       - in: path
 *         name: EmpleadoID
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: PuestoTrabajoID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Puesto removido
 */
router.delete('/:EmpleadoID/puestos/:PuestoTrabajoID', validateParams(empleadoPuestoParamSchema), (req, res) => clientesEmpleadosController.quitarPuesto(req, res));

// =============================================
// ENDPOINTS DE BAJA Y ACTIVACIÓN
// =============================================

/** @swagger
 * /clientes-empleados/baja/{EmpleadoID}:
 *   patch:
 *     summary: Dar de baja empleado
 *     tags: [Clientes - Empleados]
 *     parameters:
 *       - in: path
 *         name: EmpleadoID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Dado de baja
 */
router.patch('/baja/:EmpleadoID', validateParams(empleadoIdParamSchema), (req, res) => clientesEmpleadosController.baja(req, res));

/** @swagger
 * /clientes-empleados/activar/{EmpleadoID}:
 *   patch:
 *     summary: Activar empleado
 *     tags: [Clientes - Empleados]
 *     parameters:
 *       - in: path
 *         name: EmpleadoID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Activado
 */
router.patch('/activar/:EmpleadoID', validateParams(empleadoIdParamSchema), (req, res) => clientesEmpleadosController.activar(req, res));

// =============================================
// RUTAS ALIAS CON EmpleadosID (para compatibilidad con frontend)
// =============================================

/** @swagger
 * /clientes-empleados/by-empleados/{EmpleadosID}:
 *   get:
 *     summary: Obtener empleado por ID (alias con EmpleadosID)
 *     tags: [Clientes - Empleados]
 *     parameters:
 *       - in: path
 *         name: EmpleadosID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Encontrado
 *       404:
 *         description: No encontrado
 */
router.get('/by-empleados/:EmpleadosID', validateParams(empleadosIdParamSchema), (req, res) => clientesEmpleadosController.findOneByEmpleadosID(req, res));

/** @swagger
 * /clientes-empleados/by-empleados/{EmpleadosID}:
 *   put:
 *     summary: Actualizar empleado (alias con EmpleadosID)
 *     tags: [Clientes - Empleados]
 *     parameters:
 *       - in: path
 *         name: EmpleadosID
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               NombreEmpleado:
 *                 type: string
 *               Observaciones:
 *                 type: string
 *     responses:
 *       200:
 *         description: Actualizado
 */
router.put('/by-empleados/:EmpleadosID', validateParams(empleadosIdParamSchema), validateBody(updateClienteEmpleadoSchema), (req, res) => clientesEmpleadosController.updateByEmpleadosID(req, res));

/** @swagger
 * /clientes-empleados/baja-empleados/{EmpleadosID}:
 *   patch:
 *     summary: Dar de baja empleado (alias con EmpleadosID)
 *     tags: [Clientes - Empleados]
 *     parameters:
 *       - in: path
 *         name: EmpleadosID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Dado de baja
 */
router.patch('/baja-empleados/:EmpleadosID', validateParams(empleadosIdParamSchema), (req, res) => clientesEmpleadosController.bajaByEmpleadosID(req, res));

/** @swagger
 * /clientes-empleados/activar-empleados/{EmpleadosID}:
 *   patch:
 *     summary: Activar empleado (alias con EmpleadosID)
 *     tags: [Clientes - Empleados]
 *     parameters:
 *       - in: path
 *         name: EmpleadosID
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Activado
 */
router.patch('/activar-empleados/:EmpleadosID', validateParams(empleadosIdParamSchema), (req, res) => clientesEmpleadosController.activarByEmpleadosID(req, res));

export default router;
