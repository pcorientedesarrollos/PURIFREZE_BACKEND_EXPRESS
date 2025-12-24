import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env';
import { swaggerSpec } from './config/swagger';
import { errorHandler } from './middlewares/errorHandler';
import { authMiddleware } from './middlewares/authMiddleware';
import prisma from './config/database';

// Import routes
import { authRoutes } from './modules/auth';
import { bancosRoutes } from './modules/bancos';
import { unidadesRoutes } from './modules/unidades';
import { metodosPagoRoutes } from './modules/metodos-pago';
import { puestosTrabajoRoutes } from './modules/puestos-trabajo';
import { clasificacionRefaccionesRoutes } from './modules/clasificacion-refacciones';
import { usuariosRoutes } from './modules/usuarios';
import { proveedoresRoutes } from './modules/proveedores';
import { clientesRoutes } from './modules/clientes';
import { clientesDireccionesRoutes } from './modules/clientes-direcciones';
import { clientesTelefonosRoutes } from './modules/clientes-telefonos';
import { clientesCorreosRoutes } from './modules/clientes-correos';
import { clientesEmpleadosRoutes } from './modules/clientes-empleados';
import { clientesDatosFiscalesRoutes } from './modules/clientes-datos-fiscales';
import { clientesSucursalesRoutes } from './modules/clientes-sucursales';
import { refaccionesRoutes } from './modules/refacciones';
import { cuentasBancariasRoutes } from './modules/cuentas-bancarias';
import { comprasRoutes } from './modules/compras';
import { comprasRecepcionesRoutes } from './modules/compras-recepciones';
import { permisosRoutes } from './modules/permisos';
import { inventarioRoutes } from './modules/inventario';
import { tecnicosRoutes } from './modules/tecnicos';
import { inventarioTecnicoRoutes } from './modules/inventario-tecnico';
import { traspasosRoutes } from './modules/traspasos';
import { refaccionesDanadasRoutes } from './modules/refacciones-danadas';
import { ajustesInventarioRoutes } from './modules/ajustes-inventario';
import { plantillasEquipoRoutes } from './modules/plantillas-equipo';
import { equiposRoutes } from './modules/equipos';
import { presupuestosRoutes } from './modules/presupuestos';
import { contratosRoutes } from './modules/contratos';
import { serviciosRoutes } from './modules/servicios';
import { clientesEquiposRoutes } from './modules/clientes-equipos';
import { ventasRoutes } from './modules/ventas';

const app = express();

// Middlewares globales
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Rutas públicas (sin autenticación)
app.use('/auth', authRoutes);

// Middleware de autenticación para rutas protegidas
app.use(authMiddleware);

// Rutas protegidas (requieren token válido)
app.use('/bancos', bancosRoutes);
app.use('/unidades', unidadesRoutes);
app.use('/catalogo-unidades', unidadesRoutes);
app.use('/metodos-pago', metodosPagoRoutes);
app.use('/catalogo-metodos-pago', metodosPagoRoutes);
app.use('/puestos-trabajo', puestosTrabajoRoutes);
app.use('/catalogo-puestos-trabajo', puestosTrabajoRoutes);
app.use('/clasificacion-refacciones', clasificacionRefaccionesRoutes);
app.use('/catalogo-clasificacion-refacciones', clasificacionRefaccionesRoutes);
app.use('/usuarios', usuariosRoutes);
app.use('/proveedores', proveedoresRoutes);
app.use('/clientes', clientesRoutes);
app.use('/clientes-direcciones', clientesDireccionesRoutes);
app.use('/direcciones', clientesDireccionesRoutes);
app.use('/clientes-telefonos', clientesTelefonosRoutes);
app.use('/clientes-correos', clientesCorreosRoutes);
app.use('/clientes-empleados', clientesEmpleadosRoutes);
app.use('/clientes-datos-fiscales', clientesDatosFiscalesRoutes);
app.use('/clientes-sucursales', clientesSucursalesRoutes);
app.use('/sucursales', clientesSucursalesRoutes);
app.use('/refacciones', refaccionesRoutes);
app.use('/catalogo-refacciones', refaccionesRoutes);
app.use('/cuentas-bancarias', cuentasBancariasRoutes);
app.use('/compras', comprasRoutes);
app.use('/compras-recepciones', comprasRecepcionesRoutes);
app.use('/permisos', permisosRoutes);
app.use('/inventario', inventarioRoutes);
app.use('/tecnicos', tecnicosRoutes);
app.use('/inventario-tecnico', inventarioTecnicoRoutes);
app.use('/traspasos', traspasosRoutes);
app.use('/refacciones-danadas', refaccionesDanadasRoutes);
app.use('/ajustes-inventario', ajustesInventarioRoutes);
app.use('/plantillas-equipo', plantillasEquipoRoutes);
app.use('/equipos', equiposRoutes);
app.use('/presupuestos', presupuestosRoutes);
app.use('/contratos', contratosRoutes);
app.use('/servicios', serviciosRoutes);
app.use('/clientes-equipos', clientesEquiposRoutes);
app.use('/ventas', ventasRoutes);

// Error handler (debe ir al final)
app.use(errorHandler);

// Start server
const PORT = env.PORT;

async function main() {
  try {
    // Verificar conexión a la BD
    await prisma.$connect();
    console.log('✅ Conectado a la base de datos');

    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
      console.log(`📖 Swagger docs en http://localhost:${PORT}/api-docs`);
      console.log(`📊 Ambiente: ${env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

main();

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
