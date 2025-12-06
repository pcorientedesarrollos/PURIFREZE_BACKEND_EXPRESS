# API de Técnicos - Purifreeze Backend

## Información General

**Base URL:** `http://localhost:3000`

**Prefijo de ruta:** `/tecnicos`

**Autenticación:** Bearer Token (JWT)

---

## Endpoints

### 1. Crear Técnico

**Endpoint:** `POST /tecnicos`

**Descripción:** Registra un usuario existente como técnico en el sistema.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Payload:**
| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `UsuarioID` | number | Sí | - | ID del usuario a registrar como técnico |
| `Codigo` | string | No | max: 20 | Código interno del técnico (ej: T-001) |
| `Telefono` | string | No | max: 20 | Teléfono de contacto |
| `Observaciones` | string | No | max: 255 | Notas adicionales |

**Ejemplo de Request:**
```json
{
  "UsuarioID": 5,
  "Codigo": "T-001",
  "Telefono": "5551234567",
  "Observaciones": "Técnico especialista en refrigeración"
}
```

**Response Exitoso (201):**
```json
{
  "status": 201,
  "message": "Técnico creado",
  "error": false,
  "data": {
    "TecnicoID": 1,
    "UsuarioID": 5,
    "Codigo": "T-001",
    "Telefono": "5551234567",
    "Observaciones": "Técnico especialista en refrigeración",
    "IsActive": true,
    "FechaAlta": "2024-01-15",
    "usuario": {
      "UsuarioID": 5,
      "Usuario": "jperez",
      "NombreCompleto": "Juan Pérez",
      "IsActive": true
    }
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | Bad Request (UsuarioID: UsuarioID es requerido) | Falta el UsuarioID |
| 404 | El usuario no existe | Usuario no encontrado |
| 300 | El usuario ya está registrado como técnico | Usuario ya es técnico |
| 300 | El código ya está en uso | Código duplicado |

---

### 2. Obtener Todos los Técnicos

**Endpoint:** `GET /tecnicos`

**Descripción:** Obtiene la lista completa de técnicos (activos e inactivos).

**Headers:**
```
Authorization: Bearer {token}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Técnicos obtenidos",
  "error": false,
  "data": [
    {
      "TecnicoID": 1,
      "UsuarioID": 5,
      "Codigo": "T-001",
      "Telefono": "5551234567",
      "Observaciones": "Técnico especialista en refrigeración",
      "IsActive": true,
      "FechaAlta": "2024-01-15",
      "usuario": {
        "UsuarioID": 5,
        "Usuario": "jperez",
        "NombreCompleto": "Juan Pérez",
        "IsActive": true
      }
    }
  ]
}
```

---

### 3. Obtener Técnicos Activos

**Endpoint:** `GET /tecnicos/activos`

**Descripción:** Obtiene solo los técnicos con IsActive = true.

**Headers:**
```
Authorization: Bearer {token}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Técnicos activos obtenidos",
  "error": false,
  "data": [
    {
      "TecnicoID": 1,
      "UsuarioID": 5,
      "Codigo": "T-001",
      "Telefono": "5551234567",
      "Observaciones": "Técnico especialista en refrigeración",
      "IsActive": true,
      "FechaAlta": "2024-01-15",
      "usuario": {
        "UsuarioID": 5,
        "Usuario": "jperez",
        "NombreCompleto": "Juan Pérez",
        "IsActive": true
      }
    }
  ]
}
```

---

### 4. Obtener Usuarios Disponibles

**Endpoint:** `GET /tecnicos/usuarios-disponibles`

**Descripción:** Obtiene usuarios activos que aún no están registrados como técnicos. Útil para el dropdown de creación.

**Headers:**
```
Authorization: Bearer {token}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Usuarios disponibles obtenidos",
  "error": false,
  "data": [
    {
      "UsuarioID": 10,
      "Usuario": "mgarcia",
      "NombreCompleto": "María García"
    },
    {
      "UsuarioID": 12,
      "Usuario": "rlopez",
      "NombreCompleto": "Roberto López"
    }
  ]
}
```

---

### 5. Obtener Técnico por ID

**Endpoint:** `GET /tecnicos/:TecnicoID`

**Descripción:** Obtiene un técnico específico por su ID.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `TecnicoID` | number | Sí | ID del técnico |

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Técnico obtenido",
  "error": false,
  "data": {
    "TecnicoID": 1,
    "UsuarioID": 5,
    "Codigo": "T-001",
    "Telefono": "5551234567",
    "Observaciones": "Técnico especialista en refrigeración",
    "IsActive": true,
    "FechaAlta": "2024-01-15",
    "usuario": {
      "UsuarioID": 5,
      "Usuario": "jperez",
      "NombreCompleto": "Juan Pérez",
      "IsActive": true
    }
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | Bad Request (TecnicoID: ID debe ser un número válido) | ID inválido |
| 404 | Técnico no encontrado | No existe |

---

### 6. Actualizar Técnico

**Endpoint:** `PUT /tecnicos/:TecnicoID`

**Descripción:** Actualiza los datos de un técnico. No se puede cambiar el UsuarioID.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `TecnicoID` | number | Sí | ID del técnico |

**Payload:**
| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `Codigo` | string | No | max: 20 | Código interno |
| `Telefono` | string | No | max: 20 | Teléfono de contacto |
| `Observaciones` | string | No | max: 255 | Notas adicionales |

**Ejemplo de Request:**
```json
{
  "Codigo": "T-002",
  "Telefono": "5559876543",
  "Observaciones": "Técnico senior"
}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Técnico actualizado",
  "error": false,
  "data": {
    "TecnicoID": 1,
    "UsuarioID": 5,
    "Codigo": "T-002",
    "Telefono": "5559876543",
    "Observaciones": "Técnico senior",
    "IsActive": true,
    "FechaAlta": "2024-01-15",
    "usuario": {
      "UsuarioID": 5,
      "Usuario": "jperez",
      "NombreCompleto": "Juan Pérez",
      "IsActive": true
    }
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | Técnico no encontrado | No existe |
| 300 | El código ya está en uso | Código duplicado |

---

### 7. Dar de Baja Técnico

**Endpoint:** `PATCH /tecnicos/baja/:TecnicoID`

**Descripción:** Desactiva un técnico (soft delete). El técnico ya no aparecerá en listados de activos.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `TecnicoID` | number | Sí | ID del técnico |

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Técnico dado de baja",
  "error": false,
  "data": {
    "TecnicoID": 1,
    "UsuarioID": 5,
    "Codigo": "T-001",
    "Telefono": "5551234567",
    "Observaciones": "Técnico especialista en refrigeración",
    "IsActive": false,
    "FechaAlta": "2024-01-15",
    "usuario": {
      "UsuarioID": 5,
      "Usuario": "jperez",
      "NombreCompleto": "Juan Pérez",
      "IsActive": true
    }
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | Técnico no encontrado | No existe |
| 300 | El técnico ya está dado de baja | Ya inactivo |

---

### 8. Activar Técnico

**Endpoint:** `PATCH /tecnicos/activar/:TecnicoID`

**Descripción:** Reactiva un técnico previamente dado de baja.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `TecnicoID` | number | Sí | ID del técnico |

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Técnico activado",
  "error": false,
  "data": {
    "TecnicoID": 1,
    "UsuarioID": 5,
    "Codigo": "T-001",
    "Telefono": "5551234567",
    "Observaciones": "Técnico especialista en refrigeración",
    "IsActive": true,
    "FechaAlta": "2024-01-15",
    "usuario": {
      "UsuarioID": 5,
      "Usuario": "jperez",
      "NombreCompleto": "Juan Pérez",
      "IsActive": true
    }
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | Técnico no encontrado | No existe |
| 300 | El técnico ya está activo | Ya activo |

---

## Modelo de Datos

### catalogo_tecnicos

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| TecnicoID | Int | No | Clave primaria, autoincremental |
| UsuarioID | Int | No | FK a usuarios (único) |
| Codigo | String(20) | Sí | Código interno del técnico |
| Telefono | String(20) | Sí | Teléfono de contacto |
| Observaciones | String(255) | Sí | Notas adicionales |
| IsActive | Boolean | Sí | Estado del registro |
| FechaAlta | Date | Sí | Fecha de registro |

## Relaciones

- **Usuario:** Cada técnico está ligado a exactamente un usuario del sistema (relación 1:1)
- **Constraint:** Un usuario solo puede ser técnico una vez (UsuarioID es UNIQUE)

## Notas Importantes

- **Soft Delete:** El campo `IsActive` indica si el técnico está activo
- **Usuario Único:** Un usuario solo puede registrarse como técnico una vez
- **Código Único:** El código del técnico debe ser único en el sistema
- **FechaAlta:** Se asigna automáticamente al crear el técnico
- **Usuarios Disponibles:** El endpoint `/usuarios-disponibles` filtra usuarios activos que no son técnicos

---

**Última actualización:** 2024-12-02
