import { Router } from 'express';
import { proveedoresContactosController } from './proveedores-contactos.controller';
import { validateBody, validateParams } from '../../middlewares/validateRequest';
import {
  createProveedorContactoSchema,
  updateProveedorContactoSchema,
  contactoIdParamSchema,
  proveedorIdParamSchema,
} from './proveedores-contactos.schema';

const router = Router();

router.post('/', validateBody(createProveedorContactoSchema), (req, res) => proveedoresContactosController.create(req, res));

router.get('/proveedor/:ProveedorID', validateParams(proveedorIdParamSchema), (req, res) => proveedoresContactosController.findByProveedor(req, res));

router.get('/:ContactoID', validateParams(contactoIdParamSchema), (req, res) => proveedoresContactosController.findOne(req, res));

router.put('/:ContactoID', validateParams(contactoIdParamSchema), validateBody(updateProveedorContactoSchema), (req, res) => proveedoresContactosController.update(req, res));

router.patch('/baja/:ContactoID', validateParams(contactoIdParamSchema), (req, res) => proveedoresContactosController.baja(req, res));

router.patch('/activar/:ContactoID', validateParams(contactoIdParamSchema), (req, res) => proveedoresContactosController.activar(req, res));

export default router;
