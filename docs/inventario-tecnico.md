# API de Inventario Técnico - Purifreeze Backend

## Información General

**Base URL:** `http://localhost:3000`

**Prefijo de ruta:** `/inventario-tecnico`

**Autenticación:** Bearer Token (JWT)

---

## Endpoints

### 1. Agregar/Actualizar Refacción en Inventario

**Endpoint:** `POST /inventario-tecnico`

**Descripción:** Agrega una refacción al inventario de un técnico o actualiza las cantidades si ya existe.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Payload:**
| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `TecnicoID` | number | Sí | - | ID del técnico |
| `RefaccionID` | number | Sí | - | ID de la refacción |
| `StockNuevo` | number | No | min: 0 | Cantidad de piezas nuevas (default: 0) |
| `StockUsado` | number | No | min: 0 | Cantidad de piezas usadas (default: 0) |

**Ejemplo de Request:**
```json
{
  "TecnicoID": 1,
  "RefaccionID": 15,
  "StockNuevo": 5,
  "StockUsado": 2
}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Inventario actualizado",
  "error": false,
  "data": {
    "InventarioTecnicoID": 1,
    "TecnicoID": 1,
    "RefaccionID": 15,
    "StockNuevo": 5,
    "StockUsado": 2,
    "FechaUltimoMov": "2024-01-15",
    "IsActive": 1,
    "tecnico": {
      "TecnicoID": 1,
      "Codigo": "T-001",
      "usuario": {
        "NombreCompleto": "Juan Pérez"
      }
    },
    "refaccion": {
      "RefaccionID": 15,
      "NombrePieza": "Compresor 1HP",
      "Codigo": "COMP-001"
    }
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | Técnico no encontrado | TecnicoID inválido |
| 404 | Refacción no encontrada | RefaccionID inválido |
| 300 | El técnico está dado de baja | Técnico inactivo |

---

### 2. Obtener Resumen de Todos los Técnicos

**Endpoint:** `GET /inventario-tecnico`

**Descripción:** Obtiene un resumen del inventario de todos los técnicos activos.

**Headers:**
```
Authorization: Bearer {token}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Resumen de inventarios obtenido",
  "error": false,
  "data": [
    {
      "TecnicoID": 1,
      "Codigo": "T-001",
      "NombreCompleto": "Juan Pérez",
      "TotalRefacciones": 15,
      "TotalPiezasNuevas": 45,
      "TotalPiezasUsadas": 12,
      "ValorEstimado": 15000.50
    },
    {
      "TecnicoID": 2,
      "Codigo": "T-002",
      "NombreCompleto": "María García",
      "TotalRefacciones": 10,
      "TotalPiezasNuevas": 30,
      "TotalPiezasUsadas": 8,
      "ValorEstimado": 9500.00
    }
  ]
}
```

---

### 3. Obtener Inventario de un Técnico

**Endpoint:** `GET /inventario-tecnico/tecnico/:TecnicoID`

**Descripción:** Obtiene el inventario completo de un técnico con totales y detalle.

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
  "message": "Inventario del técnico obtenido",
  "error": false,
  "data": {
    "tecnico": {
      "TecnicoID": 1,
      "Codigo": "T-001",
      "NombreCompleto": "Juan Pérez"
    },
    "totales": {
      "totalRefacciones": 15,
      "totalPiezasNuevas": 45,
      "totalPiezasUsadas": 12,
      "valorEstimado": 15000.50
    },
    "inventario": [
      {
        "InventarioTecnicoID": 1,
        "TecnicoID": 1,
        "RefaccionID": 15,
        "StockNuevo": 5,
        "StockUsado": 2,
        "FechaUltimoMov": "2024-01-15",
        "IsActive": 1,
        "refaccion": {
          "RefaccionID": 15,
          "NombrePieza": "Compresor 1HP",
          "NombreCorto": "Compresor",
          "Codigo": "COMP-001",
          "CostoPromedio": 1500.00,
          "catalogo_unidades": {
            "DesUnidad": "Pieza"
          }
        }
      }
    ]
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | Técnico no encontrado | TecnicoID inválido |

---

### 4. Obtener Sugerencias de Refacciones

**Endpoint:** `GET /inventario-tecnico/tecnico/:TecnicoID/sugerencias`

**Descripción:** Obtiene sugerencias de refacciones basadas en lo que tienen otros técnicos. Útil para asignar stock inicial.

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
  "message": "Sugerencias obtenidas",
  "error": false,
  "data": [
    {
      "RefaccionID": 15,
      "NombrePieza": "Compresor 1HP",
      "NombreCorto": "Compresor",
      "Codigo": "COMP-001",
      "Unidad": "Pieza",
      "CostoPromedio": 1500.00,
      "TecnicosQueLoTienen": 5,
      "PromedioStockNuevo": 3,
      "PromedioStockUsado": 1
    }
  ]
}
```

---

### 5. Buscar Refacciones Disponibles

**Endpoint:** `GET /inventario-tecnico/tecnico/:TecnicoID/buscar`

**Descripción:** Busca refacciones que el técnico aún no tiene en su inventario.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `TecnicoID` | number | Sí | ID del técnico |

**Query Params:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `q` | string | No | Término de búsqueda |

**Ejemplo:** `GET /inventario-tecnico/tecnico/1/buscar?q=compresor`

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Refacciones encontradas",
  "error": false,
  "data": [
    {
      "RefaccionID": 20,
      "NombrePieza": "Compresor 2HP",
      "NombreCorto": "Compresor 2HP",
      "Codigo": "COMP-002",
      "CostoPromedio": 2500.00,
      "catalogo_unidades": {
        "DesUnidad": "Pieza"
      }
    }
  ]
}
```

---

### 6. Obtener Detalle de una Refacción

**Endpoint:** `GET /inventario-tecnico/tecnico/:TecnicoID/refaccion/:RefaccionID`

**Descripción:** Obtiene el detalle de una refacción específica en el inventario de un técnico.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `TecnicoID` | number | Sí | ID del técnico |
| `RefaccionID` | number | Sí | ID de la refacción |

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Registro de inventario obtenido",
  "error": false,
  "data": {
    "InventarioTecnicoID": 1,
    "TecnicoID": 1,
    "RefaccionID": 15,
    "StockNuevo": 5,
    "StockUsado": 2,
    "FechaUltimoMov": "2024-01-15",
    "IsActive": 1,
    "tecnico": {
      "TecnicoID": 1,
      "Codigo": "T-001",
      "usuario": {
        "NombreCompleto": "Juan Pérez"
      }
    },
    "refaccion": {
      "RefaccionID": 15,
      "NombrePieza": "Compresor 1HP",
      "NombreCorto": "Compresor",
      "Codigo": "COMP-001",
      "CostoPromedio": 1500.00,
      "catalogo_unidades": {
        "DesUnidad": "Pieza"
      }
    }
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | Registro de inventario no encontrado | Combinación no existe |

---

### 7. Actualizar Stock de una Refacción

**Endpoint:** `PUT /inventario-tecnico/tecnico/:TecnicoID/refaccion/:RefaccionID`

**Descripción:** Actualiza las cantidades de stock de una refacción específica.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `TecnicoID` | number | Sí | ID del técnico |
| `RefaccionID` | number | Sí | ID de la refacción |

**Payload:**
| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `StockNuevo` | number | No | min: 0 | Nueva cantidad de piezas nuevas |
| `StockUsado` | number | No | min: 0 | Nueva cantidad de piezas usadas |

**Ejemplo de Request:**
```json
{
  "StockNuevo": 8,
  "StockUsado": 3
}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Stock actualizado",
  "error": false,
  "data": {
    "InventarioTecnicoID": 1,
    "TecnicoID": 1,
    "RefaccionID": 15,
    "StockNuevo": 8,
    "StockUsado": 3,
    "FechaUltimoMov": "2024-01-15",
    "IsActive": 1
  }
}
```

---

### 8. Eliminar Refacción del Inventario

**Endpoint:** `DELETE /inventario-tecnico/tecnico/:TecnicoID/refaccion/:RefaccionID`

**Descripción:** Elimina una refacción del inventario de un técnico. Solo funciona si el stock es 0.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `TecnicoID` | number | Sí | ID del técnico |
| `RefaccionID` | number | Sí | ID de la refacción |

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Registro de inventario eliminado",
  "error": false,
  "data": {
    "InventarioTecnicoID": 1,
    "IsActive": 0
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | Registro de inventario no encontrado | No existe |
| 300 | No se puede eliminar un registro con stock. Primero transfiera las piezas. | Stock > 0 |

---

## Modelo de Datos

### inventario_tecnico

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| InventarioTecnicoID | Int | No | Clave primaria, autoincremental |
| TecnicoID | Int | No | FK a catalogo_tecnicos |
| RefaccionID | Int | No | FK a catalogo_refacciones |
| StockNuevo | Int | No | Cantidad de piezas nuevas (default: 0) |
| StockUsado | Int | No | Cantidad de piezas usadas en buen estado (default: 0) |
| FechaUltimoMov | Date | Sí | Fecha del último movimiento |
| IsActive | TinyInt | Sí | Estado del registro (default: 1) |

## Relaciones

- **Técnico:** Cada registro pertenece a un técnico
- **Refacción:** Cada registro es de una refacción específica
- **Unique Constraint:** Un técnico solo puede tener un registro por refacción (TecnicoID + RefaccionID)

## Notas Importantes

- **Stock Nuevo vs Usado:** Se manejan por separado para distinguir el estado de las piezas
- **Valor Estimado:** Se calcula con el CostoPromedio de cada refacción
- **Sugerencias:** Se basan en las refacciones más comunes entre todos los técnicos
- **Eliminación:** Solo se permite si ambos stocks están en 0
- **Soft Delete:** El campo `IsActive` controla la visibilidad del registro

---

**Última actualización:** 2024-12-02
