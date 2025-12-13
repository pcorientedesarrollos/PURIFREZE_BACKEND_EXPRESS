# API de Clientes - Purifreeze Backend

## Información General

**Base URL:** `http://localhost:3000`

**Prefijo de ruta:** `/clientes`

**Autenticación:** No requerida (verificar si se implementa middleware de auth)

---

## Descripción

Este módulo gestiona los clientes principales del sistema. Un cliente puede tener:
- Múltiples direcciones
- Múltiples empleados (con sus teléfonos y correos)
- Múltiples sucursales
- Correos directos del cliente
- Datos fiscales

### Estructura de Relaciones

```
catalogo_clientes (Cliente Principal)
├── clientes_direcciones (N direcciones)
├── clientes_empleados (N empleados)
│   ├── clientes_telefonos (N teléfonos por empleado)
│   └── clientes_correos (N correos por empleado)
├── clientes_correos (correos directos del cliente)
├── clientes_datosFiscales (datos fiscales)
└── clientes_sucursales (N sucursales)
```

---

## Endpoints

### 1. Crear Cliente

**Endpoint:** `POST /clientes`

**Descripción:** Crea un nuevo cliente. Opcionalmente puede crear una dirección inicial.

**Headers:**
```
Content-Type: application/json
```

**Payload:**
| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `NombreComercio` | string | Sí | min: 1, max: 255, único | Nombre del comercio |
| `Observaciones` | string | No | - | Notas adicionales |
| `Direccion` | string | No | - | Dirección inicial (crea registro en clientes_direcciones) |
| `Ubicacion` | string | No | - | Ubicación/coordenadas de la dirección |

**Ejemplo de Request:**
```json
{
  "NombreComercio": "Tiendas XYZ",
  "Observaciones": "Cliente mayorista",
  "Direccion": "Av. Principal #123, Col. Centro",
  "Ubicacion": "25.4284,-100.9737"
}
```

**Response Exitoso (201):**
```json
{
  "status": 201,
  "message": "Cliente Creado",
  "error": false,
  "data": {
    "ClienteID": 1,
    "NombreComercio": "Tiendas XYZ",
    "Observaciones": "Cliente mayorista",
    "IsActive": true
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | Bad Request (NombreComercio: El nombre del comercio es requerido) | Falta nombre |
| 300 | El nombre del comercio ya existe | Nombre duplicado |

---

### 2. Obtener Todos los Clientes

**Endpoint:** `GET /clientes`

**Descripción:** Obtiene todos los clientes registrados (activos e inactivos).

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Clientes obtenidos",
  "error": false,
  "data": [
    {
      "ClienteID": 2,
      "NombreComercio": "Comercial ABC",
      "Observaciones": null,
      "IsActive": true
    },
    {
      "ClienteID": 1,
      "NombreComercio": "Tiendas XYZ",
      "Observaciones": "Cliente mayorista",
      "IsActive": true
    }
  ]
}
```

---

### 3. Obtener Cliente por ID

**Endpoint:** `GET /clientes/:ClienteID`

**Descripción:** Obtiene los datos básicos de un cliente por su ID.

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `ClienteID` | number | Sí | ID del cliente |

**Ejemplo:** `GET /clientes/1`

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Cliente obtenido",
  "error": false,
  "data": {
    "ClienteID": 1,
    "NombreComercio": "Tiendas XYZ",
    "Observaciones": "Cliente mayorista",
    "IsActive": true
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | Bad Request (ClienteID: ID debe ser un número válido) | ID no numérico |
| 404 | Cliente no encontrado | No existe el cliente |

---

### 4. Obtener Detalle Completo del Cliente

**Endpoint:** `GET /clientes/:ClienteID/detalle`

**Descripción:** Obtiene el cliente con TODAS sus relaciones: direcciones, empleados (con sus teléfonos y correos), correos directos, datos fiscales y sucursales.

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `ClienteID` | number | Sí | ID del cliente |

**Ejemplo:** `GET /clientes/1/detalle`

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Detalle del cliente obtenido",
  "error": false,
  "data": {
    "ClienteID": 1,
    "NombreComercio": "Tiendas XYZ",
    "Observaciones": "Cliente mayorista",
    "IsActive": true,
    "sucursales": [
      {
        "SucursalID": 1,
        "ClienteID": 1,
        "NombreSucursal": "Sucursal Centro",
        "Direccion": "Av. Principal #123",
        "Ubicacion": "25.4284,-100.9737",
        "Telefono": "844-123-4567",
        "Contacto": "Juan Pérez",
        "Observaciones": null,
        "IsActive": true
      },
      {
        "SucursalID": 2,
        "ClienteID": 1,
        "NombreSucursal": "Sucursal Norte",
        "Direccion": "Blvd. Norte #456",
        "Ubicacion": null,
        "Telefono": "844-987-6543",
        "Contacto": "María García",
        "Observaciones": null,
        "IsActive": true
      }
    ],
    "direcciones": [
      {
        "DireccionID": 1,
        "ClienteID": 1,
        "Direccion": "Av. Principal #123, Col. Centro",
        "Ubicacion": "25.4284,-100.9737",
        "Observaciones": null,
        "IsActive": true
      }
    ],
    "empleados": [
      {
        "EmpleadoID": 1,
        "ClienteID": 1,
        "PuestoTrabajoID": 1,
        "NombreEmpleado": "Juan Pérez",
        "Observaciones": null,
        "IsActive": true,
        "telefonos": [
          {
            "TelefonoID": 1,
            "EmpleadoID": 1,
            "Telefono": "844-111-2222",
            "Tipo": "Trabajo",
            "IsActive": true
          },
          {
            "TelefonoID": 2,
            "EmpleadoID": 1,
            "Telefono": "844-333-4444",
            "Tipo": "Personal",
            "IsActive": true
          }
        ],
        "correos": [
          {
            "CorreoID": 1,
            "ClienteID": null,
            "EmpleadoID": 1,
            "Correo": "juan.perez@tiendasxyz.com",
            "TipoCorreo": "trabajo",
            "Observaciones": null,
            "IsActive": true
          }
        ]
      },
      {
        "EmpleadoID": 2,
        "ClienteID": 1,
        "PuestoTrabajoID": 2,
        "NombreEmpleado": "María García",
        "Observaciones": null,
        "IsActive": true,
        "telefonos": [],
        "correos": []
      }
    ],
    "correos": [
      {
        "CorreoID": 5,
        "ClienteID": 1,
        "EmpleadoID": null,
        "Correo": "contacto@tiendasxyz.com",
        "TipoCorreo": "trabajo",
        "Observaciones": "Correo general",
        "IsActive": true
      }
    ],
    "datosFiscales": {
      "DatosFiscalesID": 1,
      "RazonSocial": "Tiendas XYZ S.A. de C.V.",
      "RFC": "TXY123456ABC",
      "Regimen": "Persona Moral",
      "DireccionFiscal": "Av. Fiscal #100, Col. Centro",
      "CodigoPostal": "25000",
      "Observaciones": null,
      "IsActive": true,
      "ClienteID": 1
    }
  }
}
```

**Nota:** Solo retorna registros activos (`IsActive: true`) en todas las relaciones.

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | Cliente no encontrado | No existe el cliente |

---

### 5. Actualizar Cliente

**Endpoint:** `PUT /clientes/:ClienteID`

**Descripción:** Actualiza los datos básicos de un cliente.

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `ClienteID` | number | Sí | ID del cliente |

**Payload:**
| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `NombreComercio` | string | No | min: 1, max: 255, único | Nuevo nombre |
| `Observaciones` | string | No | - | Nuevas observaciones |

**Ejemplo de Request:**
```json
{
  "NombreComercio": "Tiendas XYZ Premium",
  "Observaciones": "Cliente VIP"
}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Cliente Actualizado",
  "error": false,
  "data": {
    "ClienteID": 1,
    "NombreComercio": "Tiendas XYZ Premium",
    "Observaciones": "Cliente VIP",
    "IsActive": true
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | No existe el cliente | ClienteID no encontrado |
| 300 | El nombre del comercio ya existe | Nombre duplicado |

---

### 6. Dar de Baja Cliente

**Endpoint:** `PATCH /clientes/baja/:ClienteID`

**Descripción:** Desactiva un cliente (soft delete).

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `ClienteID` | number | Sí | ID del cliente |

**Ejemplo:** `PATCH /clientes/baja/1`

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Cliente dado de baja",
  "error": false,
  "data": {
    "ClienteID": 1,
    "NombreComercio": "Tiendas XYZ",
    "Observaciones": "Cliente mayorista",
    "IsActive": false
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | El cliente no existe | ClienteID no encontrado |
| 300 | El cliente ya ha sido dado de baja | Ya está inactivo |

---

### 7. Activar Cliente

**Endpoint:** `PATCH /clientes/activar/:ClienteID`

**Descripción:** Reactiva un cliente previamente dado de baja.

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `ClienteID` | number | Sí | ID del cliente |

**Ejemplo:** `PATCH /clientes/activar/1`

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Cliente activado",
  "error": false,
  "data": {
    "ClienteID": 1,
    "NombreComercio": "Tiendas XYZ",
    "Observaciones": "Cliente mayorista",
    "IsActive": true
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | El cliente no existe | ClienteID no encontrado |
| 300 | El cliente ya ha sido activado | Ya está activo |

---

## Modelo de Datos

### catalogo_clientes

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| ClienteID | Int | No | Clave primaria, autoincrement |
| NombreComercio | String(255) | Sí | Nombre único del comercio |
| Observaciones | String(255) | Sí | Notas adicionales |
| IsActive | Boolean | Sí | Estado del registro |

### Relaciones

- **sucursales:** 1:N con `clientes_sucursales`
- **direcciones:** 1:N con `clientes_direcciones`
- **empleados:** 1:N con `clientes_empleados`
- **correos:** 1:N con `clientes_correos` (donde EmpleadoID es null)
- **datosFiscales:** 1:1 con `clientes_datosFiscales`

---

## Casos de Uso para Frontend

### Vista de Lista de Clientes

```javascript
// Obtener todos los clientes
const clientes = await fetch('/clientes').then(r => r.json());

// Filtrar solo activos en frontend si es necesario
const clientesActivos = clientes.data.filter(c => c.IsActive);
```

### Vista de Detalle de Cliente

```javascript
// Obtener detalle completo con todas las relaciones
const clienteDetalle = await fetch(`/clientes/${clienteId}/detalle`).then(r => r.json());

// Acceder a las diferentes secciones
const {
  sucursales,
  direcciones,
  empleados,
  correos,
  datosFiscales
} = clienteDetalle.data;

// Mostrar empleados con sus contactos
empleados.forEach(emp => {
  console.log(emp.NombreEmpleado);
  console.log('Teléfonos:', emp.telefonos);
  console.log('Correos:', emp.correos);
});
```

### Selector de Cliente para Presupuestos

```javascript
// 1. Obtener clientes activos
const clientes = await fetch('/clientes').then(r => r.json());
const clientesActivos = clientes.data.filter(c => c.IsActive);

// 2. Cuando se selecciona un cliente, obtener sus sucursales
const detalle = await fetch(`/clientes/${clienteId}/detalle`).then(r => r.json());

// 3. Mostrar opciones:
// - "Cliente directo" (sin sucursal seleccionada)
// - Lista de sucursales del cliente
const opciones = [
  { value: null, label: 'Cliente directo' },
  ...detalle.data.sucursales.map(s => ({
    value: s.SucursalID,
    label: s.NombreSucursal
  }))
];
```

---

## Endpoints Relacionados

Para gestionar las entidades relacionadas, usar los siguientes módulos:

| Módulo | Prefijo | Documentación |
|--------|---------|---------------|
| Direcciones | `/clientes-direcciones` | Ver docs/clientes-direcciones.md |
| Empleados | `/clientes-empleados` | Ver docs/clientes-empleados.md |
| Teléfonos | `/clientes-telefonos` | Ver docs/clientes-telefonos.md |
| Correos | `/clientes-correos` | Ver docs/clientes-correos.md |
| Datos Fiscales | `/clientes-datos-fiscales` | Ver docs/clientes-datos-fiscales.md |
| Sucursales | `/clientes-sucursales` | Ver docs/clientes-sucursales.md |

---

## Ejemplo de Error

```json
{
  "status": 300,
  "message": "El nombre del comercio ya existe",
  "error": true,
  "data": []
}
```

---

**Última actualización:** 2025-12-11
