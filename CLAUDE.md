# Guía para Documentación de APIs - Purifreeze Backend (Express + Prisma) - 2026 New sistema

Esta guía define cómo Claude debe generar documentación de APIs para el equipo de frontend.



## Objetivo

Generar documentación completa y clara de las APIs del backend para que el equipo de frontend pueda consumirlas sin necesidad de revisar el código fuente.

---

## Stack Tecnológico

- **Framework:** Express.js 4.x
- **ORM:** Prisma 6.x
- **Base de Datos:** MySQL
- **Validación:** Zod
- **Autenticación:** JWT (jsonwebtoken)
- **Seguridad:** helmet, cors, bcrypt

---

## Estructura del Proyecto

```
src/
├── config/
│   ├── database.ts      # Instancia de PrismaClient
│   └── env.ts           # Variables de entorno
├── middlewares/
│   ├── errorHandler.ts  # Manejo global de errores
│   └── validateRequest.ts # Validación con Zod
├── modules/
│   └── {modulo}/
│       ├── {modulo}.controller.ts  # Controlador
│       ├── {modulo}.service.ts     # Lógica de negocio
│       ├── {modulo}.schema.ts      # Schemas Zod (validación)
│       ├── {modulo}.routes.ts      # Definición de rutas
│       └── index.ts                # Export del módulo
├── shared/
│   └── shared-operations.service.ts # Operaciones compartidas
├── utils/
│   ├── jwt.ts           # Manejo de tokens JWT
│   ├── response.ts      # Funciones de respuesta y HttpError
│   └── uuid.ts          # Generación de UUIDs
└── index.ts             # Punto de entrada
prisma/
└── schema.prisma        # Esquema de la base de datos
```

---

## Archivos a Revisar

Para cada módulo que se solicite documentar, debes revisar en orden:

### 1. Rutas (`*.routes.ts`)
**Ubicación:** `src/modules/{modulo}/{modulo}.routes.ts`

**Qué revisar:**
- Rutas HTTP definidas (GET, POST, PUT, PATCH, DELETE)
- Middlewares aplicados (`validateBody`, `validateParams`, `validateQuery`)
- Schemas de validación utilizados
- Estructura de los endpoints

**Ejemplo:** `src/modules/bancos/bancos.routes.ts`

### 2. Controlador (`*.controller.ts`)
**Ubicación:** `src/modules/{modulo}/{modulo}.controller.ts`

**Qué revisar:**
- Métodos expuestos y sus nombres
- Parámetros extraídos de `req.params`, `req.body`, `req.query`
- Mensajes de respuesta exitosa
- Tipo de datos retornados

**Ejemplo:** `src/modules/bancos/bancos.controller.ts`

### 3. Servicio (`*.service.ts`)
**Ubicación:** `src/modules/{modulo}/{modulo}.service.ts`

**Qué revisar:**
- Lógica de cada método
- Validaciones de negocio
- Errores lanzados con `HttpError`
- Códigos de estado HTTP utilizados
- Estructura de los datos retornados
- Relaciones con otras tablas (include de Prisma)
- Operaciones transaccionales (`prisma.$transaction`)

**Ejemplo:** `src/modules/bancos/bancos.service.ts`

### 4. Schema de Validación (`*.schema.ts`)
**Ubicación:** `src/modules/{modulo}/{modulo}.schema.ts`

**Qué revisar:**
- Schemas Zod para crear (`create*Schema`)
- Schemas Zod para actualizar (`update*Schema`)
- Schemas para parámetros (`*ParamSchema`)
- Validaciones (`z.string()`, `z.number()`, `z.optional()`, etc.)
- Transformaciones (`.transform()`)
- Types inferidos exportados

**Ejemplo:** `src/modules/bancos/bancos.schema.ts`

### 5. Esquema Prisma (`prisma/schema.prisma`)
**Qué revisar:**
- Modelo correspondiente al módulo
- Campos y tipos de datos
- Campos opcionales (con `?`)
- Relaciones entre modelos
- Enums definidos

### 6. Archivo Principal (`src/index.ts`)
**Qué revisar:**
- Puerto del servidor (`env.PORT`)
- Configuración de middlewares globales
- Prefijo de rutas (ej: `/bancos`, `/auth`)

---

## Estructura del Documento de Salida

Cada módulo debe generar un archivo: `docs/{modulo}.md`

### Plantilla a Seguir:

```markdown
# API de {Módulo} - Purifreeze Backend

## Información General

**Base URL:** `http://localhost:{puerto}`

**Prefijo de ruta:** `/{prefijo}`

**Autenticación:** [Especificar si requiere Bearer Token o no]

---

## Endpoints

### 1. [Nombre de la Operación]

**Endpoint:** `{MÉTODO} /{ruta}`

**Descripción:** [Explicación clara de qué hace este endpoint]

**Headers:**
```
Content-Type: application/json
[Authorization: Bearer {token}] (si aplica)
```

**Parámetros de URL:** (si aplica)
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `{param}` | number | Sí | {descripción} |

**Query Params:** (si aplica)
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `{param}` | string | No | {descripción} |

**Payload:** (para POST, PUT, PATCH)
| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `campo` | string | Sí | max: 255 | {descripción} |

**Ejemplo de Request:**
```json
{
  "campo": "valor de ejemplo"
}
```

**Response Exitoso ({código}):**
```json
{
  "status": 200,
  "message": "mensaje",
  "error": false,
  "data": {objeto/array de ejemplo}
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | Bad Request (campo: mensaje) | Validación Zod fallida |
| 404 | {mensaje} | Recurso no encontrado |
| 300 | {mensaje} | Error de negocio |

**Ejemplo de Error:**
```json
{
  "status": 404,
  "message": "Recurso no encontrado",
  "error": true,
  "data": []
}
```

---

[Repetir para cada endpoint]

## Modelo de Datos

### {NombreModelo}

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| {CampoID} | Int | No | Clave primaria |
| {Campo} | String | Sí | {descripción} |

## Relaciones

- **{Relación}:** {descripción de la relación}

## Notas Importantes

- **Soft Delete:** El campo `IsActive` indica si el registro está activo
- **Activar/Dar de baja:** Usa los endpoints PATCH específicos

---

**Última actualización:** {fecha}
```

---

## Formato de Respuesta Estándar

El proyecto usa las funciones `success()` y `error()` de `src/utils/response.ts`:

### Respuesta Exitosa
```json
{
  "status": number,
  "message": string,
  "error": false,
  "data": any
}
```

### Respuesta de Error
```json
{
  "status": number,
  "message": string,
  "error": true,
  "data": []
}
```

---

## Manejo de Errores

El middleware `errorHandler` maneja tres tipos de errores:

### 1. Error de Validación Zod (400)
Cuando falla la validación de `validateBody`, `validateParams` o `validateQuery`:
```json
{
  "status": 400,
  "message": "Bad Request (campo: mensaje de validación)",
  "error": true,
  "data": []
}
```

### 2. HttpError (código personalizado)
Errores lanzados manualmente con `throw new HttpError(mensaje, código)`:
```json
{
  "status": {código},
  "message": "{mensaje}",
  "error": true,
  "data": []
}
```

### 3. Error Interno (500)
Cualquier otro error no controlado:
```json
{
  "status": 500,
  "message": "Error {mensaje del error}",
  "error": true,
  "data": []
}
```

---

## Validación con Zod

Los schemas de validación están en `{modulo}.schema.ts`. Ejemplos comunes:

```typescript
// String requerido con máximo
z.string().max(255, 'Mensaje de error')

// String opcional
z.string().max(255).optional()

// Número desde param (viene como string)
z.string().regex(/^\d+$/, 'Debe ser número').transform(Number)

// Booleano
z.boolean()

// Array
z.array(z.object({...}))

// Enum
z.enum(['valor1', 'valor2'])

// Fecha como string
z.string()
```

---

## Autenticación JWT

### Tokens
- **Access Token:** Expira en 15 minutos
- **Refresh Token:** Expira en 7 días

### Payload del Token
```typescript
{
  UsuarioID: number,
  SessionID: string,
  IpAdress: string,
  iat: number,
  exp: number
}
```

### Endpoints de Auth

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/auth` | POST | Login |
| `/auth/refreshToken` | POST | Refrescar token |
| `/auth/sesiones` | GET | Obtener sesiones |
| `/auth/reauth` | PUT | Reautenticar |
| `/auth/logout` | POST | Cerrar sesión |
| `/auth/logout/admin` | POST | Cerrar sesión admin |

---

## REGLA CRITICA: NO USAR MIGRACIONES NI DB PULL DE PRISMA

### ⛔ PROHIBIDO usar (ROMPE TODO EL SISTEMA):
- `prisma migrate` - NO USAR NUNCA
- `prisma db push` - NO USAR NUNCA
- `prisma db pull` - **PROHIBIDO TOTALMENTE** - Destruye TODAS las relaciones del schema

### ✅ OBLIGATORIO:
- **Editar schema.prisma MANUALMENTE** para agregar modelos/campos
- **Solo agregar lo nuevo**, NO tocar modelos existentes
- Usar `npx prisma generate` para regenerar el cliente (lo hace el usuario)

### Ejemplo de flujo correcto:
```bash
# 1. Editar prisma/schema.prisma manualmente agregando el nuevo modelo
# 2. El usuario ejecuta: npx prisma generate
# 3. Si la tabla no existe en BD, el usuario la crea con SQL directo
```

### ⚠️ POR QUÉ NO USAR db pull:
- **DESTRUYE todas las relaciones** (@relation) definidas manualmente
- Elimina los campos calculados y relaciones entre modelos
- Rompe TODOS los servicios que usan include/relaciones
- El schema queda sin conexiones entre tablas
- Requiere restaurar manualmente TODAS las relaciones (70+ modelos)

**NUNCA ejecutar `prisma db pull` bajo ninguna circunstancia.**

---

## REGLA CRITICA: PRUEBAS DE API OBLIGATORIAS

### Cada API nueva o modificacion DEBE pasar este filtro antes de considerarse TERMINADA:

**El backend NO esta terminado hasta que se prueben TODOS los endpoints con flujo completo.**

### 1. Prueba Individual de cada Endpoint
```bash
# Autenticacion primero
curl -X POST http://localhost:3000/auth \
  -H "Content-Type: application/json" \
  -d '{"Usuario": "usuario", "Password": "password"}'

# Luego probar cada endpoint:
# - POST (crear)
# - GET (listar/obtener)
# - PUT/PATCH (actualizar)
# - DELETE (eliminar)
```

### 2. Prueba de Flujo Completo (OBLIGATORIO)
Probar el ciclo de vida completo del modulo. Ejemplo para Compras:

```bash
# 1. Crear compra
POST /compras -> Verificar status 201, EstadoPago: PENDIENTE, EstadoEntrega: PEDIDO

# 2. Recepcion parcial
POST /compras-recepciones -> Verificar EstadoEntrega: PARCIAL

# 3. Pago parcial
POST /compras-pagos -> Verificar EstadoPago: PARCIAL

# 4. Recepcion final
POST /compras-recepciones -> Verificar EstadoEntrega: ENTREGADO

# 5. Pago final
POST /compras-pagos -> Verificar EstadoPago: PAGADO, Estatus: Finalizado

# 6. Verificacion final
GET /compras/{id} -> Confirmar todos los estados correctos
```

### 3. Checklist de Verificacion
- [ ] Endpoint responde con status correcto (200, 201, 400, 404, etc.)
- [ ] Formato ResponseApi correcto (`{ status, message, error, data }`)
- [ ] Validaciones Zod funcionan (probar payload invalido)
- [ ] Estados se actualizan correctamente en cada paso
- [ ] Relaciones se mantienen integras
- [ ] No hay errores en consola del backend
- [ ] Campos calculados se actualizan (TotalPagado, TotalRecibido, etc.)

### 4. Documentar Pruebas Realizadas
Al terminar un modulo, agregar en este archivo o en docs/:
- Endpoints probados
- Flujos verificados
- Casos edge probados

---

## Reglas Importantes

### 1. NO Generar Código Frontend
- Solo documentar las APIs
- No crear ejemplos de React, Vue, Angular, etc.
- No sugerir librerías de frontend

### 2. Exactitud
- Los payloads deben coincidir EXACTAMENTE con los schemas Zod
- Las respuestas deben coincidir EXACTAMENTE con lo que retorna el servicio
- Los códigos de estado deben ser los definidos en el código

### 3. Completitud
- Documentar TODOS los endpoints del archivo routes
- Incluir TODOS los posibles errores del servicio (buscar `throw new HttpError`)
- Listar TODAS las validaciones de los schemas Zod

### 4. Claridad
- Explicaciones en español claro
- Ejemplos con datos realistas
- Notas para casos especiales (soft delete, transacciones, etc.)

### 5. Soft Delete
- La mayoría de módulos usan `IsActive` para soft delete
- Documentar endpoints `/baja/:ID` y `/activar/:ID` cuando existan

---

## Módulos Disponibles

| Módulo | Prefijo | Descripción |
|--------|---------|-------------|
| auth | `/auth` | Autenticación y sesiones |
| bancos | `/bancos` | Catálogo de bancos |
| unidades | `/unidades` | Catálogo de unidades |
| metodos-pago | `/metodos-pago` | Métodos de pago |
| puestos-trabajo | `/puestos-trabajo` | Puestos de trabajo |
| clasificacion-refacciones | `/clasificacion-refacciones` | Clasificación de refacciones |
| usuarios | `/usuarios` | Gestión de usuarios |
| proveedores | `/proveedores` | Catálogo de proveedores |
| clientes | `/clientes` | Catálogo de clientes |
| clientes-direcciones | `/clientes-direcciones` | Direcciones de clientes |
| clientes-telefonos | `/clientes-telefonos` | Teléfonos de clientes |
| clientes-correos | `/clientes-correos` | Correos de clientes |
| clientes-empleados | `/clientes-empleados` | Empleados de clientes |
| clientes-datos-fiscales | `/clientes-datos-fiscales` | Datos fiscales de clientes |
| refacciones | `/refacciones` | Catálogo de refacciones |
| cuentas-bancarias | `/cuentas-bancarias` | Cuentas bancarias |
| compras | `/compras` | Gestión de compras |
| compras-recepciones | `/compras-recepciones` | Recepciones de compras |

---

## Proceso de Documentación

1. **Explorar archivos:**
   - Leer routes, controller, service y schema del módulo
   - Revisar el modelo en `prisma/schema.prisma`
   - Revisar `src/index.ts` para el prefijo de ruta

2. **Analizar:**
   - Mapear cada ruta HTTP a su funcionalidad
   - Identificar validaciones Zod y reglas de negocio
   - Detectar posibles errores y casos especiales

3. **Generar documento:**
   - Crear archivo `docs/{modulo}.md`
   - Seguir la plantilla definida
   - Incluir todos los endpoints ordenadamente

4. **Validar:**
   - Revisar que todo esté correcto
   - Confirmar que los ejemplos sean válidos JSON
   - Verificar que no falte información

---

## Ejemplo de Uso

**Usuario solicita:**
> "Documenta las APIs de bancos"

**Claude debe:**
1. Leer archivos:
   - `src/modules/bancos/bancos.routes.ts`
   - `src/modules/bancos/bancos.controller.ts`
   - `src/modules/bancos/bancos.service.ts`
   - `src/modules/bancos/bancos.schema.ts`
   - Modelo `catalogo_bancos` en `prisma/schema.prisma`
2. Analizar cada endpoint y sus validaciones
3. Generar `docs/bancos.md` con toda la documentación
4. Informar al usuario que la documentación está lista

---

## Ubicación de Archivos Generados

Todos los archivos de documentación se guardan en:
```
docs/
  ├── auth.md
  ├── bancos.md
  ├── usuarios.md
  └── ...
```

Si la carpeta `docs/` no existe, crearla automáticamente.

---

## Información del Servidor

### Base URL por defecto
```
http://localhost:3000
```

### Health Check
```
GET /health
Response: { "status": "ok", "timestamp": "ISO-8601" }
```

### Variables de Entorno Requeridas
- `PORT` - Puerto del servidor (default: 3000)
- `NODE_ENV` - Ambiente (development/production)
- `DATABASE_URL` - URL de conexión MySQL
- `SECRET_KEY` - Clave para JWT
- `REAUTH_KEY` - Clave para reautenticación
- `REFRESH_KEY` - Clave para refresh tokens

---

## Convenciones de Código

### Nombres de ID en Rutas
Los IDs en las rutas usan el nombre del campo de la base de datos:
- `/bancos/:BancoID`
- `/usuarios/:UsuarioID`
- `/clientes/:ClienteID`

### Operaciones Comunes por Módulo

| Operación | Método | Ruta | Descripción |
|-----------|--------|------|-------------|
| Crear | POST | `/{modulo}` | Crear nuevo registro |
| Listar | GET | `/{modulo}` | Obtener todos |
| Obtener uno | GET | `/{modulo}/:ID` | Obtener por ID |
| Actualizar | PUT | `/{modulo}/:ID` | Actualizar registro |
| Dar de baja | PATCH | `/{modulo}/baja/:ID` | Soft delete |
| Activar | PATCH | `/{modulo}/activar/:ID` | Reactivar registro |

---

**Esta guía debe seguirse estrictamente para mantener consistencia en toda la documentación.**

---

## MODULOS PROBADOS Y VERIFICADOS

### Compras (100% Funcional - Probado 2026-03-06)
| Endpoint | Estado | Notas |
|----------|--------|-------|
| POST /compras | OK | Crea compra con detalles |
| GET /compras | OK | Lista todas las compras |
| GET /compras/:id | OK | Obtiene compra con relaciones |
| PUT /compras/:id | OK | Actualiza compra |
| DELETE /compras/:id | OK | Soft delete |

### Compras Recepciones (100% Funcional - Probado 2026-03-06)
| Endpoint | Estado | Notas |
|----------|--------|-------|
| POST /compras-recepciones | OK | Crea recepcion, actualiza inventario/kardex |
| GET /compras-recepciones | OK | Lista recepciones |
| GET /compras-recepciones/compra/:id | OK | Por compra |
| GET /compras-recepciones/compra/:id/with-pagos | OK | Resumen completo |

### Compras Pagos (100% Funcional - Probado 2026-03-06)
| Endpoint | Estado | Notas |
|----------|--------|-------|
| POST /compras-pagos | OK | Registra pago, actualiza saldo bancario |
| GET /compras-pagos/compra/:id | OK | Pagos por compra |
| DELETE /compras-pagos/:id | OK | Soft delete + revertir saldo |

### Notas de Credito (100% Funcional - Probado 2026-03-06)
| Endpoint | Estado | Notas |
|----------|--------|-------|
| POST /notas-credito | OK | Crea nota |
| GET /notas-credito | OK | Lista todas |
| GET /notas-credito/:id | OK | Por ID |
| PUT /notas-credito/:id | OK | Solo si DISPONIBLE |
| DELETE /notas-credito/:id | OK | Solo si DISPONIBLE |
| GET /notas-credito/proveedor/:id | OK | Por proveedor |
| POST /notas-credito/:id/aplicar | OK | Aplica a compra |

---

## Sistema de Ejes Independientes (Compras)

Las compras usan dos ejes independientes para mayor flexibilidad:

| Eje | Campo | Estados | Descripcion |
|-----|-------|---------|-------------|
| Entrega | `EstadoEntrega` | PEDIDO -> PARCIAL -> ENTREGADO | Recepciones de mercancia |
| Pago | `EstadoPago` | PENDIENTE -> PARCIAL -> PAGADO | Pagos al proveedor |

**Campo Legacy `Estatus`:**
- Se actualiza automaticamente a "Finalizado" cuando AMBOS ejes estan completos
- Verificado en `compras-pagos.service.ts` y `compras-recepciones.service.ts`

**Correccion aplicada (2026-03-06):**
- Bug: El campo `Estatus` no se actualizaba cuando el pago final se hacia despues de la recepcion final
- Solucion: Se agrego verificacion de ambos ejes en `actualizarEstadoPagoCompra()`

---

## Notas de Credito - Estados

| Estado | Descripcion | Restricciones |
|--------|-------------|---------------|
| DISPONIBLE | Nota creada, pendiente de aplicar | Puede editarse/eliminarse |
| APLICADO | Nota aplicada a una compra | NO puede editarse/eliminarse |

**Impacto en Compras:**
- Al aplicar una nota, se incrementa `TotalNotasCredito` en la compra
- Esto reduce el monto adeudado al proveedor

---

**Ultima actualizacion:** 2026-03-06
