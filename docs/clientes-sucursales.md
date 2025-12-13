# API de Clientes Sucursales - Purifreeze Backend

## Información General

**Base URL:** `http://localhost:3000`

**Prefijo de ruta:** `/clientes-sucursales` o `/sucursales`

**Autenticación:** No requerida (verificar si se implementa middleware de auth)

---

## Descripción

Este módulo permite gestionar las sucursales de los clientes. Un cliente puede tener múltiples sucursales, y cada sucursal pertenece a un único cliente.

### Relación con Clientes

```
catalogo_clientes (Cliente Principal)
└── clientes_sucursales (Sucursales)
    ├── Sucursal 1
    ├── Sucursal 2
    └── Sucursal N
```

---

## Endpoints

### 1. Crear Sucursal

**Endpoint:** `POST /clientes-sucursales`

**Descripción:** Crea una nueva sucursal para un cliente existente.

**Headers:**
```
Content-Type: application/json
```

**Payload:**
| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `ClienteID` | number | Sí | Debe existir y estar activo | ID del cliente al que pertenece |
| `NombreSucursal` | string | Sí | min: 1, max: 255 | Nombre de la sucursal |
| `Direccion` | string | No | max: 255 | Dirección física |
| `Ubicacion` | string | No | max: 255 | Coordenadas o referencia de ubicación |
| `Telefono` | string | No | max: 50 | Teléfono de contacto |
| `Contacto` | string | No | max: 255 | Nombre del contacto principal |
| `Observaciones` | string | No | max: 255 | Notas adicionales |

**Ejemplo de Request:**
```json
{
  "ClienteID": 1,
  "NombreSucursal": "Sucursal Centro",
  "Direccion": "Av. Principal #123, Col. Centro",
  "Ubicacion": "25.4284,-100.9737",
  "Telefono": "844-123-4567",
  "Contacto": "Juan Pérez",
  "Observaciones": "Horario: Lun-Vie 9am-6pm"
}
```

**Response Exitoso (201):**
```json
{
  "status": 201,
  "message": "Sucursal creada",
  "error": false,
  "data": {
    "SucursalID": 1,
    "ClienteID": 1,
    "NombreSucursal": "Sucursal Centro",
    "Direccion": "Av. Principal #123, Col. Centro",
    "Ubicacion": "25.4284,-100.9737",
    "Telefono": "844-123-4567",
    "Contacto": "Juan Pérez",
    "Observaciones": "Horario: Lun-Vie 9am-6pm",
    "IsActive": true,
    "cliente": {
      "ClienteID": 1,
      "NombreComercio": "Tiendas XYZ"
    }
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | Bad Request (ClienteID: El ClienteID es requerido) | Falta ClienteID |
| 400 | Bad Request (NombreSucursal: El nombre de la sucursal es requerido) | Falta nombre |
| 404 | El cliente no existe | ClienteID no encontrado |
| 300 | El cliente no está activo | Cliente dado de baja |
| 300 | Ya existe una sucursal con ese nombre para este cliente | Nombre duplicado |

---

### 2. Obtener Todas las Sucursales

**Endpoint:** `GET /clientes-sucursales`

**Descripción:** Obtiene todas las sucursales registradas (activas e inactivas).

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Sucursales obtenidas",
  "error": false,
  "data": [
    {
      "SucursalID": 2,
      "ClienteID": 1,
      "NombreSucursal": "Sucursal Norte",
      "Direccion": "Blvd. Norte #456",
      "Ubicacion": null,
      "Telefono": "844-987-6543",
      "Contacto": "María García",
      "Observaciones": null,
      "IsActive": true,
      "cliente": {
        "ClienteID": 1,
        "NombreComercio": "Tiendas XYZ"
      }
    },
    {
      "SucursalID": 1,
      "ClienteID": 1,
      "NombreSucursal": "Sucursal Centro",
      "Direccion": "Av. Principal #123",
      "Ubicacion": "25.4284,-100.9737",
      "Telefono": "844-123-4567",
      "Contacto": "Juan Pérez",
      "Observaciones": "Horario: Lun-Vie 9am-6pm",
      "IsActive": true,
      "cliente": {
        "ClienteID": 1,
        "NombreComercio": "Tiendas XYZ"
      }
    }
  ]
}
```

---

### 3. Obtener Sucursal por ID

**Endpoint:** `GET /clientes-sucursales/:SucursalID`

**Descripción:** Obtiene una sucursal específica por su ID.

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `SucursalID` | number | Sí | ID de la sucursal |

**Ejemplo:** `GET /clientes-sucursales/1`

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Sucursal obtenida",
  "error": false,
  "data": {
    "SucursalID": 1,
    "ClienteID": 1,
    "NombreSucursal": "Sucursal Centro",
    "Direccion": "Av. Principal #123, Col. Centro",
    "Ubicacion": "25.4284,-100.9737",
    "Telefono": "844-123-4567",
    "Contacto": "Juan Pérez",
    "Observaciones": "Horario: Lun-Vie 9am-6pm",
    "IsActive": true,
    "cliente": {
      "ClienteID": 1,
      "NombreComercio": "Tiendas XYZ"
    }
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | Bad Request (SucursalID: ID debe ser un número válido) | ID no numérico |
| 404 | Sucursal no encontrada | No existe la sucursal |

---

### 4. Obtener Sucursales por Cliente

**Endpoint:** `GET /clientes-sucursales/cliente/:ClienteID`

**Descripción:** Obtiene todas las sucursales activas de un cliente específico.

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `ClienteID` | number | Sí | ID del cliente |

**Ejemplo:** `GET /clientes-sucursales/cliente/1`

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Sucursales del cliente obtenidas",
  "error": false,
  "data": [
    {
      "SucursalID": 1,
      "ClienteID": 1,
      "NombreSucursal": "Sucursal Centro",
      "Direccion": "Av. Principal #123",
      "Ubicacion": "25.4284,-100.9737",
      "Telefono": "844-123-4567",
      "Contacto": "Juan Pérez",
      "Observaciones": null,
      "IsActive": true,
      "cliente": {
        "ClienteID": 1,
        "NombreComercio": "Tiendas XYZ"
      }
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
      "IsActive": true,
      "cliente": {
        "ClienteID": 1,
        "NombreComercio": "Tiendas XYZ"
      }
    }
  ]
}
```

**Nota:** Retorna array vacío si el cliente no tiene sucursales activas.

---

### 5. Actualizar Sucursal

**Endpoint:** `PUT /clientes-sucursales/:SucursalID`

**Descripción:** Actualiza los datos de una sucursal existente.

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `SucursalID` | number | Sí | ID de la sucursal |

**Payload:**
| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `NombreSucursal` | string | No | min: 1, max: 255 | Nuevo nombre |
| `Direccion` | string | No | max: 255 | Nueva dirección |
| `Ubicacion` | string | No | max: 255 | Nueva ubicación |
| `Telefono` | string | No | max: 50 | Nuevo teléfono |
| `Contacto` | string | No | max: 255 | Nuevo contacto |
| `Observaciones` | string | No | max: 255 | Nuevas observaciones |

**Ejemplo de Request:**
```json
{
  "Telefono": "844-111-2222",
  "Contacto": "Carlos López"
}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Sucursal actualizada",
  "error": false,
  "data": {
    "SucursalID": 1,
    "ClienteID": 1,
    "NombreSucursal": "Sucursal Centro",
    "Direccion": "Av. Principal #123",
    "Ubicacion": "25.4284,-100.9737",
    "Telefono": "844-111-2222",
    "Contacto": "Carlos López",
    "Observaciones": null,
    "IsActive": true,
    "cliente": {
      "ClienteID": 1,
      "NombreComercio": "Tiendas XYZ"
    }
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | La sucursal no existe | SucursalID no encontrado |
| 300 | Ya existe una sucursal con ese nombre para este cliente | Nombre duplicado |

---

### 6. Dar de Baja Sucursal

**Endpoint:** `PATCH /clientes-sucursales/baja/:SucursalID`

**Descripción:** Desactiva una sucursal (soft delete).

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `SucursalID` | number | Sí | ID de la sucursal |

**Ejemplo:** `PATCH /clientes-sucursales/baja/1`

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Sucursal dada de baja",
  "error": false,
  "data": {
    "SucursalID": 1,
    "ClienteID": 1,
    "NombreSucursal": "Sucursal Centro",
    "Direccion": "Av. Principal #123",
    "Ubicacion": "25.4284,-100.9737",
    "Telefono": "844-123-4567",
    "Contacto": "Juan Pérez",
    "Observaciones": null,
    "IsActive": false
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | La sucursal no existe | SucursalID no encontrado |
| 300 | La sucursal ya ha sido dada de baja | Ya está inactiva |

---

### 7. Activar Sucursal

**Endpoint:** `PATCH /clientes-sucursales/activar/:SucursalID`

**Descripción:** Reactiva una sucursal previamente dada de baja.

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `SucursalID` | number | Sí | ID de la sucursal |

**Ejemplo:** `PATCH /clientes-sucursales/activar/1`

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Sucursal activada",
  "error": false,
  "data": {
    "SucursalID": 1,
    "ClienteID": 1,
    "NombreSucursal": "Sucursal Centro",
    "Direccion": "Av. Principal #123",
    "Ubicacion": "25.4284,-100.9737",
    "Telefono": "844-123-4567",
    "Contacto": "Juan Pérez",
    "Observaciones": null,
    "IsActive": true
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | La sucursal no existe | SucursalID no encontrado |
| 300 | La sucursal ya está activa | Ya está activa |

---

## Modelo de Datos

### clientes_sucursales

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| SucursalID | Int | No | Clave primaria, autoincrement |
| ClienteID | Int | No | FK a catalogo_clientes |
| NombreSucursal | String(255) | No | Nombre de la sucursal |
| Direccion | String(255) | Sí | Dirección física |
| Ubicacion | String(255) | Sí | Coordenadas/referencia |
| Telefono | String(50) | Sí | Teléfono de contacto |
| Contacto | String(255) | Sí | Nombre del contacto |
| Observaciones | String(255) | Sí | Notas adicionales |
| IsActive | Boolean | No | Estado (default: true) |

### Relaciones

- **cliente:** Relación N:1 con `catalogo_clientes` (cada sucursal pertenece a un cliente)

---

## Reglas de Negocio

1. **Unicidad:** El nombre de la sucursal debe ser único por cliente (pueden existir sucursales con el mismo nombre si pertenecen a clientes diferentes).

2. **Cliente activo:** Solo se pueden crear sucursales para clientes activos.

3. **Soft Delete:** Las sucursales no se eliminan físicamente, se desactivan con `IsActive = false`.

4. **Consulta por cliente:** El endpoint `/cliente/:ClienteID` solo retorna sucursales activas.

---

## Casos de Uso para Frontend

### Selector de destino en presupuestos

```javascript
// 1. Obtener clientes activos
const clientes = await fetch('/clientes').then(r => r.json());

// 2. Cuando el usuario selecciona un cliente, cargar sus sucursales
const sucursales = await fetch(`/clientes-sucursales/cliente/${clienteId}`).then(r => r.json());

// 3. Mostrar opciones:
// - Cliente directo (sin sucursal)
// - Lista de sucursales disponibles
```

### Formulario de nueva sucursal

```javascript
const nuevaSucursal = {
  ClienteID: clienteSeleccionado.ClienteID,
  NombreSucursal: "Sucursal Sur",
  Direccion: "Calle Sur #789",
  Telefono: "844-555-1234",
  Contacto: "Ana Martínez"
};

const response = await fetch('/clientes-sucursales', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(nuevaSucursal)
});
```

---

## Ejemplo de Error

```json
{
  "status": 300,
  "message": "Ya existe una sucursal con ese nombre para este cliente",
  "error": true,
  "data": []
}
```

---

**Última actualización:** 2025-12-11
