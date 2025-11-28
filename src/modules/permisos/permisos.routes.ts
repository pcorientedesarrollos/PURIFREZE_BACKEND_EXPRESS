import { Router } from 'express';
import { permisosController } from './permisos.controller';
import { validateParams, validateBody } from '../../middlewares/validateRequest';
import { usuarioParamSchema, generarPermisoSchema } from './permisos.schema';

const router = Router();

// GET /permisos/sideBar/:UsuarioID - Obtener sidebar del usuario
router.get(
  '/sideBar/:UsuarioID',
  validateParams(usuarioParamSchema),
  permisosController.getSideBar.bind(permisosController)
);

// GET /permisos/arbol/admin/:UsuarioID - Obtener árbol de permisos para admin
router.get(
  '/arbol/admin/:UsuarioID',
  validateParams(usuarioParamSchema),
  permisosController.getArbolPermisos.bind(permisosController)
);

// PUT /permisos/generar/permiso - Crear o actualizar permiso
router.put(
  '/generar/permiso',
  validateBody(generarPermisoSchema),
  permisosController.generarPermiso.bind(permisosController)
);

export default router;
