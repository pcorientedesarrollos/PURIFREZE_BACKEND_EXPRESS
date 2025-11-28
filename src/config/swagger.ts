import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Purifreeze API',
      version: '2.0.0',
      description: 'API Backend para el sistema Purifreeze - Express + Prisma',
      contact: {
        name: 'PC Oriente',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor de desarrollo',
      },
    ],
    components: {
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            status: { type: 'integer', example: 200 },
            message: { type: 'string', example: 'Operación exitosa' },
            error: { type: 'boolean', example: false },
            data: { type: 'object' },
          },
        },
        ApiErrorResponse: {
          type: 'object',
          properties: {
            status: { type: 'integer', example: 400 },
            message: { type: 'string', example: 'Error en la operación' },
            error: { type: 'boolean', example: true },
            data: { type: 'array', items: {}, example: [] },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Autenticación y sesiones' },
      { name: 'Bancos', description: 'Catálogo de bancos' },
      { name: 'Unidades', description: 'Catálogo de unidades de medida' },
      { name: 'Métodos de Pago', description: 'Catálogo de métodos de pago' },
      { name: 'Puestos de Trabajo', description: 'Catálogo de puestos de trabajo' },
      { name: 'Clasificación Refacciones', description: 'Catálogo de clasificación de refacciones' },
      { name: 'Usuarios', description: 'Gestión de usuarios del sistema' },
      { name: 'Proveedores', description: 'Catálogo de proveedores' },
      { name: 'Clientes', description: 'Catálogo de clientes' },
      { name: 'Clientes - Direcciones', description: 'Direcciones de clientes' },
      { name: 'Clientes - Teléfonos', description: 'Teléfonos de empleados de clientes' },
      { name: 'Clientes - Correos', description: 'Correos de empleados de clientes' },
      { name: 'Clientes - Empleados', description: 'Empleados de clientes' },
      { name: 'Clientes - Datos Fiscales', description: 'Datos fiscales de clientes' },
      { name: 'Refacciones', description: 'Catálogo de refacciones' },
      { name: 'Cuentas Bancarias', description: 'Catálogo de cuentas bancarias' },
      { name: 'Compras', description: 'Gestión de compras' },
      { name: 'Compras - Recepciones', description: 'Recepciones de compras' },
    ],
  },
  apis: ['./src/modules/**/*.routes.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
