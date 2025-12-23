# API de Clientes Empleados - Purifreeze Backend

## Información General

**Base URL:** `http://localhost:3000`

**Prefijo de ruta:** `/clientes-empleados`

**Autenticación:** Bearer Token (si está configurado)

---

## Cambio Importante: Múltiples Puestos por Empleado

A partir de esta versión, un empleado puede tener **múltiples puestos de trabajo** asignados. El campo `PuestoTrabajoID` fue removido de la tabla `clientes_empleados` y ahora existe una tabla intermedia `empleados_puestos` que maneja la relación muchos a muchos.

### Estructura de Datos Anterior vs Nueva

**Antes:**
```json
{
  "EmpleadoID": 1,
  "ClienteID": 1,
  "PuestoTrabajoID": 1,
  "NombreEmpleado": "Juan Pérez"
}
```

**Ahora:**
```json
{
  "EmpleadoID": 1,
  "ClienteID": 1,
  "NombreEmpleado": "Juan Pérez",
  "empleados_puestos": [
    {
      "EmpleadoPuestoID": 1,
      "PuestoTrabajoID": 1,
      "IsActive": true,
      "puesto": {
        "PuestoTrabajoID": 1,
        "PuestoTrabajo": "Gerente"
      }
    },
    {
      "EmpleadoPuestoID": 2,
      "PuestoTrabajoID": 2,
      "IsActive": true,
      "puesto": {
        "PuestoTrabajoID": 2,
        "PuestoTrabajo": "Supervisor"
      }
    }
  ]
}
```

---

## Endpoints

### 1. Crear Empleado con Puestos

**Endpoint:** `POST /clientes-empleados`

**Descripción:** Crea un nuevo empleado y le asigna uno o más puestos de trabajo.

**Headers:**
```
Content-Type: application/json
```

**Payload:**
| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `ClienteID` | number | Sí | - | ID del cliente al que pertenece |
| `NombreEmpleado` | string | Sí | min: 1 | Nombre completo del empleado |
| `Observaciones` | string | No | - | Notas adicionales |
| `PuestosTrabajoIDs` | number[] | Sí | min: 1 elemento | Array con IDs de puestos a asignar |

**Ejemplo de Request:**
```json
{
  "ClienteID": 1,
  "NombreEmpleado": "Juan Pérez García",
  "Observaciones": "Empleado de confianza",
  "PuestosTrabajoIDs": [1, 3, 5]
}
```

**Response Exitoso (201):**
```json
{
  "status": 201,
  "message": "Empleado Creado",
  "error": false,
  "data": {
    "EmpleadoID": 10,
    "ClienteID": 1,
    "NombreEmpleado": "Juan Pérez García",
    "Observaciones": "Empleado de confianza",
    "IsActive": true,
    "empleados_puestos": [
      {
        "EmpleadoPuestoID": 1,
        "EmpleadoID": 10,
        "PuestoTrabajoID": 1,
        "IsActive": true,
        "puesto": {
          "PuestoTrabajoID": 1,
          "PuestoTrabajo": "Gerente",
          "Observaciones": null,
          "IsActive": true
        }
      },
      {
        "EmpleadoPuestoID": 2,
        "EmpleadoID": 10,
        "PuestoTrabajoID": 3,
        "IsActive": true,
        "puesto": {
          "PuestoTrabajoID": 3,
          "PuestoTrabajo": "Supervisor",
          "Observaciones": null,
          "IsActive": true
        }
      }
    ]
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | Bad Request (PuestosTrabajoIDs: Debe asignar al menos un puesto de trabajo) | No se enviaron puestos |
| 300 | El nombre del empleado ya existe | Nombre duplicado |
| 300 | Uno o más puestos de trabajo no existen | IDs de puestos inválidos |

---

### 2. Obtener Todos los Empleados

**Endpoint:** `GET /clientes-empleados`

**Descripción:** Obtiene la lista de todos los empleados con sus puestos activos.

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Empleados obtenidos",
  "error": false,
  "data": [
    {
      "EmpleadoID": 1,
      "ClienteID": 1,
      "NombreEmpleado": "Juan Pérez",
      "Observaciones": null,
      "IsActive": true,
      "empleados_puestos": [
        {
          "EmpleadoPuestoID": 1,
          "EmpleadoID": 1,
          "PuestoTrabajoID": 1,
          "IsActive": true,
          "puesto": {
            "PuestoTrabajoID": 1,
            "PuestoTrabajo": "Gerente"
          }
        }
      ]
    }
  ]
}
```

---

### 3. Obtener Empleado por ID

**Endpoint:** `GET /clientes-empleados/:EmpleadoID`

**Descripción:** Obtiene un empleado específico con todos sus puestos (activos e inactivos).

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `EmpleadoID` | number | Sí | ID del empleado |

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Empleado obtenido",
  "error": false,
  "data": {
    "EmpleadoID": 1,
    "ClienteID": 1,
    "NombreEmpleado": "Juan Pérez",
    "Observaciones": null,
    "IsActive": true,
    "empleados_puestos": [
      {
        "EmpleadoPuestoID": 1,
        "EmpleadoID": 1,
        "PuestoTrabajoID": 1,
        "IsActive": true,
        "puesto": {
          "PuestoTrabajoID": 1,
          "PuestoTrabajo": "Gerente"
        }
      }
    ]
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | Empleado no encontrado | ID no existe |

---

### 4. Actualizar Empleado

**Endpoint:** `PUT /clientes-empleados/:EmpleadoID`

**Descripción:** Actualiza los datos básicos del empleado (NO los puestos). Para gestionar puestos usar los endpoints específicos.

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `EmpleadoID` | number | Sí | ID del empleado |

**Payload:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `NombreEmpleado` | string | No | Nuevo nombre |
| `Observaciones` | string | No | Nuevas observaciones |

**Ejemplo de Request:**
```json
{
  "NombreEmpleado": "Juan Pérez Actualizado",
  "Observaciones": "Actualizado el 16/12/2024"
}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Empleado Actualizado",
  "error": false,
  "data": {
    "EmpleadoID": 1,
    "ClienteID": 1,
    "NombreEmpleado": "Juan Pérez Actualizado",
    "Observaciones": "Actualizado el 16/12/2024",
    "IsActive": true,
    "empleados_puestos": [...]
  }
}
```

---

### 5. Obtener Puestos de un Empleado

**Endpoint:** `GET /clientes-empleados/:EmpleadoID/puestos`

**Descripción:** Obtiene solo los puestos activos de un empleado.

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `EmpleadoID` | number | Sí | ID del empleado |

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Puestos del empleado obtenidos",
  "error": false,
  "data": [
    {
      "EmpleadoPuestoID": 1,
      "EmpleadoID": 1,
      "PuestoTrabajoID": 1,
      "IsActive": true,
      "puesto": {
        "PuestoTrabajoID": 1,
        "PuestoTrabajo": "Gerente",
        "Observaciones": null,
        "IsActive": true
      }
    },
    {
      "EmpleadoPuestoID": 2,
      "EmpleadoID": 1,
      "PuestoTrabajoID": 3,
      "IsActive": true,
      "puesto": {
        "PuestoTrabajoID": 3,
        "PuestoTrabajo": "Supervisor",
        "Observaciones": null,
        "IsActive": true
      }
    }
  ]
}
```

---

### 6. Asignar Puestos (Reemplazar todos)

**Endpoint:** `PUT /clientes-empleados/:EmpleadoID/puestos`

**Descripción:** Reemplaza TODOS los puestos actuales del empleado con los nuevos especificados. Los puestos anteriores se desactivan (soft delete).

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `EmpleadoID` | number | Sí | ID del empleado |

**Payload:**
| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `PuestosTrabajoIDs` | number[] | Sí | min: 1 elemento | Array con IDs de puestos |

**Ejemplo de Request:**
```json
{
  "PuestosTrabajoIDs": [2, 4, 6]
}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Puestos asignados correctamente",
  "error": false,
  "data": {
    "EmpleadoID": 1,
    "NombreEmpleado": "Juan Pérez",
    "empleados_puestos": [
      {
        "EmpleadoPuestoID": 3,
        "PuestoTrabajoID": 2,
        "IsActive": true,
        "puesto": { "PuestoTrabajo": "Contador" }
      },
      {
        "EmpleadoPuestoID": 4,
        "PuestoTrabajoID": 4,
        "IsActive": true,
        "puesto": { "PuestoTrabajo": "Administrador" }
      }
    ]
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | No existe el empleado | EmpleadoID inválido |
| 300 | Uno o más puestos de trabajo no existen | PuestoTrabajoID inválido |

---

### 7. Agregar un Puesto

**Endpoint:** `POST /clientes-empleados/:EmpleadoID/puestos`

**Descripción:** Agrega un puesto adicional al empleado sin afectar los existentes.

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `EmpleadoID` | number | Sí | ID del empleado |

**Payload:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `PuestoTrabajoID` | number | Sí | ID del puesto a agregar |

**Ejemplo de Request:**
```json
{
  "PuestoTrabajoID": 5
}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Puesto agregado correctamente",
  "error": false,
  "data": {
    "EmpleadoID": 1,
    "NombreEmpleado": "Juan Pérez",
    "empleados_puestos": [
      { "PuestoTrabajoID": 1, "puesto": { "PuestoTrabajo": "Gerente" } },
      { "PuestoTrabajoID": 5, "puesto": { "PuestoTrabajo": "Auditor" } }
    ]
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | No existe el empleado | EmpleadoID inválido |
| 300 | El puesto de trabajo no existe | PuestoTrabajoID inválido |
| 300 | El empleado ya tiene asignado este puesto | Puesto duplicado |

---

### 8. Quitar un Puesto

**Endpoint:** `DELETE /clientes-empleados/:EmpleadoID/puestos/:PuestoTrabajoID`

**Descripción:** Remueve un puesto específico del empleado (soft delete). El empleado debe mantener al menos un puesto.

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `EmpleadoID` | number | Sí | ID del empleado |
| `PuestoTrabajoID` | number | Sí | ID del puesto a quitar |

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Puesto removido correctamente",
  "error": false,
  "data": {
    "EmpleadoID": 1,
    "NombreEmpleado": "Juan Pérez",
    "empleados_puestos": [
      { "PuestoTrabajoID": 1, "puesto": { "PuestoTrabajo": "Gerente" } }
    ]
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | No existe el empleado | EmpleadoID inválido |
| 300 | El empleado no tiene asignado este puesto | Puesto no asignado |
| 300 | El empleado debe tener al menos un puesto asignado | Intento de quitar el único puesto |

---

### 9. Dar de Baja Empleado

**Endpoint:** `PATCH /clientes-empleados/baja/:EmpleadoID`

**Descripción:** Desactiva un empleado (soft delete).

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Empleado dado de baja",
  "error": false,
  "data": {
    "EmpleadoID": 1,
    "IsActive": false,
    "empleados_puestos": [...]
  }
}
```

---

### 10. Activar Empleado

**Endpoint:** `PATCH /clientes-empleados/activar/:EmpleadoID`

**Descripción:** Reactiva un empleado previamente dado de baja.

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Empleado activado",
  "error": false,
  "data": {
    "EmpleadoID": 1,
    "IsActive": true,
    "empleados_puestos": [...]
  }
}
```

---

## Modelo de Datos

### clientes_empleados

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| EmpleadoID | Int | No | Clave primaria (autoincrement) |
| ClienteID | Int | Sí | FK al cliente |
| NombreEmpleado | String(255) | Sí | Nombre del empleado |
| Observaciones | String(255) | Sí | Notas adicionales |
| IsActive | Boolean | Sí | Estado del registro |

### empleados_puestos (NUEVA)

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| EmpleadoPuestoID | Int | No | Clave primaria (autoincrement) |
| EmpleadoID | Int | No | FK al empleado |
| PuestoTrabajoID | Int | No | FK al puesto de trabajo |
| IsActive | Boolean | Sí | Estado del registro (default: true) |

**Índice único:** `(EmpleadoID, PuestoTrabajoID)` - Un empleado no puede tener el mismo puesto duplicado.

---

## Relaciones

- **clientes_empleados → empleados_puestos:** Un empleado puede tener muchos puestos (1:N)
- **empleados_puestos → catalogo_puestosTrabajo:** Cada asignación referencia un puesto (N:1)

---

## Rutas Alias (Compatibilidad Frontend)

Las siguientes rutas son alias para compatibilidad:

| Ruta Original | Alias |
|---------------|-------|
| `GET /:EmpleadoID` | `GET /by-empleados/:EmpleadosID` |
| `PUT /:EmpleadoID` | `PUT /by-empleados/:EmpleadosID` |
| `PATCH /baja/:EmpleadoID` | `PATCH /baja-empleados/:EmpleadosID` |
| `PATCH /activar/:EmpleadoID` | `PATCH /activar-empleados/:EmpleadosID` |

---

## Notas Importantes

1. **Soft Delete:** Tanto empleados como sus puestos usan `IsActive` para soft delete
2. **Mínimo un puesto:** Un empleado siempre debe tener al menos un puesto asignado
3. **Transacciones:** Las operaciones de creación y asignación de puestos usan transacciones
4. **Puestos reactivables:** Si se quita un puesto y luego se vuelve a agregar, se reactiva el registro existente

---

## Migración de Datos Existentes

Si tienes empleados con el campo `PuestoTrabajoID` anterior, necesitarás migrar los datos a la nueva tabla `empleados_puestos`. Ver sección de SQL de migración.

---

**Última actualización:** 2024-12-16
