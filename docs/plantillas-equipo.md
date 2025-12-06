# API de Plantillas de Equipo - Purifreeze Backend

## Información General

**Base URL:** `http://localhost:3000`

**Prefijo de ruta:** `/plantillas-equipo`

**Autenticación:** Bearer Token (JWT)

---

## Endpoints

### 1. Crear Plantilla de Equipo

**Endpoint:** `POST /plantillas-equipo`

**Descripción:** Crea una nueva plantilla de equipo con sus refacciones. Valida que no haya refacciones duplicadas y que todas las refacciones existan y estén activas.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Payload:**
| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `Codigo` | string | No | max: 50, único | Código identificador de la plantilla |
| `NombreEquipo` | string | Sí | max: 255 | Nombre del equipo/plantilla |
| `Observaciones` | string | No | max: 500 | Notas adicionales |
| `PorcentajeVenta` | number | No | min: 0, default: 35 | Porcentaje de utilidad para venta |
| `PorcentajeRenta` | number | No | min: 0, default: 15 | Porcentaje para cálculo de renta |
| `Detalles` | array | Sí | min: 1 | Lista de refacciones |
| `Detalles[].RefaccionID` | number | Sí | - | ID de la refacción |
| `Detalles[].Cantidad` | number | Sí | min: 1 | Cantidad de piezas |

**Ejemplo de Request:**
```json
{
  "Codigo": "OSM-5ET",
  "NombreEquipo": "Osmosis Inversa 5 Etapas",
  "Observaciones": "Equipo estándar para purificación doméstica",
  "PorcentajeVenta": 35,
  "PorcentajeRenta": 15,
  "Detalles": [
    { "RefaccionID": 1, "Cantidad": 1 },
    { "RefaccionID": 2, "Cantidad": 3 },
    { "RefaccionID": 5, "Cantidad": 1 }
  ]
}
```

**Response Exitoso (201):**
```json
{
  "status": 201,
  "message": "Plantilla creada correctamente",
  "error": false,
  "data": {
    "PlantillaEquipoID": 1,
    "Codigo": "OSM-5ET",
    "NombreEquipo": "Osmosis Inversa 5 Etapas",
    "Observaciones": "Equipo estándar para purificación doméstica",
    "PorcentajeVenta": 35,
    "PorcentajeRenta": 15,
    "IsActive": 1,
    "FechaCreacion": "2024-12-05",
    "FechaModificacion": null,
    "CostoTotal": 1500.00,
    "PrecioVenta": 2025.00,
    "PrecioRenta": 225.00,
    "detalles": [
      {
        "PlantillaDetalleID": 1,
        "RefaccionID": 1,
        "Cantidad": 1,
        "Refaccion": {
          "NombrePieza": "Membrana RO 75GPD",
          "NombreCorto": "Membrana 75",
          "Codigo": "MEM-75",
          "CostoPromedio": 850.00,
          "Unidad": "Pieza"
        },
        "Subtotal": 850.00
      }
    ]
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | Bad Request (NombreEquipo: Required) | Falta el nombre del equipo |
| 400 | Bad Request (Detalles: Debe incluir al menos una refacción) | No hay refacciones |
| 400 | No se pueden agregar refacciones duplicadas: X, Y | RefaccionID repetido |
| 400 | Ya existe una plantilla con este código | Código duplicado |
| 404 | Refacciones no encontradas o inactivas: X, Y | RefaccionID inválido |

---

### 2. Obtener Todas las Plantillas

**Endpoint:** `GET /plantillas-equipo`

**Descripción:** Obtiene un listado de todas las plantillas activas con resumen de costos y precios calculados dinámicamente.

**Headers:**
```
Authorization: Bearer {token}
```

**Query Params:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `q` | string | No | Filtrar por nombre o código |

**Ejemplo:** `GET /plantillas-equipo?q=osmosis`

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Plantillas obtenidas",
  "error": false,
  "data": [
    {
      "PlantillaEquipoID": 1,
      "Codigo": "OSM-5ET",
      "NombreEquipo": "Osmosis Inversa 5 Etapas",
      "Observaciones": "Equipo estándar para purificación doméstica",
      "PorcentajeVenta": 35,
      "PorcentajeRenta": 15,
      "TotalRefacciones": 5,
      "CostoTotal": 1500.00,
      "PrecioVenta": 2025.00,
      "PrecioRenta": 225.00,
      "FechaCreacion": "2024-12-05",
      "FechaModificacion": null
    }
  ]
}
```

---

### 3. Obtener Plantilla por ID

**Endpoint:** `GET /plantillas-equipo/:PlantillaEquipoID`

**Descripción:** Obtiene el detalle completo de una plantilla con todas sus refacciones y precios calculados.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `PlantillaEquipoID` | number | Sí | ID de la plantilla |

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Plantilla obtenida",
  "error": false,
  "data": {
    "PlantillaEquipoID": 1,
    "Codigo": "OSM-5ET",
    "NombreEquipo": "Osmosis Inversa 5 Etapas",
    "Observaciones": "Equipo estándar para purificación doméstica",
    "PorcentajeVenta": 35,
    "PorcentajeRenta": 15,
    "IsActive": 1,
    "FechaCreacion": "2024-12-05",
    "FechaModificacion": null,
    "CostoTotal": 1500.00,
    "PrecioVenta": 2025.00,
    "PrecioRenta": 225.00,
    "detalles": [
      {
        "PlantillaDetalleID": 1,
        "RefaccionID": 1,
        "Cantidad": 1,
        "Refaccion": {
          "NombrePieza": "Membrana RO 75GPD",
          "NombreCorto": "Membrana 75",
          "Codigo": "MEM-75",
          "CostoPromedio": 850.00,
          "Unidad": "Pieza"
        },
        "Subtotal": 850.00
      },
      {
        "PlantillaDetalleID": 2,
        "RefaccionID": 2,
        "Cantidad": 3,
        "Refaccion": {
          "NombrePieza": "Filtro de Sedimentos 5 micras",
          "NombreCorto": "Filtro 5mic",
          "Codigo": "FLT-5M",
          "CostoPromedio": 120.00,
          "Unidad": "Pieza"
        },
        "Subtotal": 360.00
      }
    ]
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | Plantilla no encontrada | ID inválido o inactiva |

---

### 4. Actualizar Plantilla

**Endpoint:** `PUT /plantillas-equipo/:PlantillaEquipoID`

**Descripción:** Actualiza una plantilla existente. Permite modificar datos del encabezado, agregar/actualizar/eliminar refacciones.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `PlantillaEquipoID` | number | Sí | ID de la plantilla |

**Payload:**
| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `Codigo` | string | No | max: 50, único | Código identificador |
| `NombreEquipo` | string | No | max: 255 | Nombre del equipo |
| `Observaciones` | string | No | max: 500, nullable | Notas adicionales |
| `PorcentajeVenta` | number | No | min: 0 | Porcentaje para venta |
| `PorcentajeRenta` | number | No | min: 0 | Porcentaje para renta |
| `Detalles` | array | No | - | Refacciones a agregar/actualizar |
| `Detalles[].PlantillaDetalleID` | number | No | - | ID del detalle (si es actualización) |
| `Detalles[].RefaccionID` | number | Sí | - | ID de la refacción |
| `Detalles[].Cantidad` | number | Sí | min: 1 | Cantidad |
| `DetallesEliminar` | array | No | - | IDs de detalles a eliminar |

**Ejemplo de Request (actualizar cantidad y agregar nueva):**
```json
{
  "NombreEquipo": "Osmosis Inversa 5 Etapas Premium",
  "PorcentajeVenta": 40,
  "Detalles": [
    { "PlantillaDetalleID": 2, "RefaccionID": 2, "Cantidad": 5 },
    { "RefaccionID": 10, "Cantidad": 2 }
  ],
  "DetallesEliminar": [3]
}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Plantilla actualizada correctamente",
  "error": false,
  "data": {
    "PlantillaEquipoID": 1,
    "Codigo": "OSM-5ET",
    "NombreEquipo": "Osmosis Inversa 5 Etapas Premium",
    "PorcentajeVenta": 40,
    "PorcentajeRenta": 15,
    "CostoTotal": 1800.00,
    "PrecioVenta": 2520.00,
    "PrecioRenta": 270.00,
    "detalles": [...]
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | No se pueden agregar refacciones duplicadas | RefaccionID repetido |
| 400 | Ya existe una plantilla con este código | Código duplicado |
| 404 | Plantilla no encontrada | ID inválido |
| 404 | Refacciones no encontradas o inactivas | RefaccionID inválido |

---

### 5. Duplicar Plantilla

**Endpoint:** `POST /plantillas-equipo/:PlantillaEquipoID/duplicar`

**Descripción:** Crea una copia exacta de una plantilla existente con todas sus refacciones. El nombre se genera como "{Nombre Original} (Copia)" y el código se deja vacío.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `PlantillaEquipoID` | number | Sí | ID de la plantilla a duplicar |

**Response Exitoso (201):**
```json
{
  "status": 201,
  "message": "Plantilla duplicada correctamente",
  "error": false,
  "data": {
    "PlantillaEquipoID": 2,
    "Codigo": null,
    "NombreEquipo": "Osmosis Inversa 5 Etapas (Copia)",
    "Observaciones": "Equipo estándar para purificación doméstica",
    "PorcentajeVenta": 35,
    "PorcentajeRenta": 15,
    "CostoTotal": 1500.00,
    "PrecioVenta": 2025.00,
    "PrecioRenta": 225.00,
    "detalles": [...]
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | Plantilla no encontrada | ID inválido o inactiva |

---

### 6. Dar de Baja Plantilla

**Endpoint:** `PATCH /plantillas-equipo/baja/:PlantillaEquipoID`

**Descripción:** Desactiva una plantilla (soft delete). La plantilla no se elimina físicamente.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `PlantillaEquipoID` | number | Sí | ID de la plantilla |

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Plantilla dada de baja correctamente",
  "error": false,
  "data": {
    "PlantillaEquipoID": 1
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | Plantilla no encontrada | ID inválido o ya está inactiva |

---

### 7. Activar Plantilla

**Endpoint:** `PATCH /plantillas-equipo/activar/:PlantillaEquipoID`

**Descripción:** Reactiva una plantilla previamente dada de baja.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `PlantillaEquipoID` | number | Sí | ID de la plantilla |

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Plantilla activada correctamente",
  "error": false,
  "data": {
    "PlantillaEquipoID": 1
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | Plantilla no encontrada o ya está activa | ID inválido o activa |

---

### 8. Buscar Refacciones Disponibles

**Endpoint:** `GET /plantillas-equipo/refacciones`

**Descripción:** Busca refacciones activas para agregar a una plantilla. Útil para el autocompletado en el frontend.

**Headers:**
```
Authorization: Bearer {token}
```

**Query Params:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `q` | string | No | Término de búsqueda (nombre, código) |

**Ejemplo:** `GET /plantillas-equipo/refacciones?q=membrana`

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Refacciones encontradas",
  "error": false,
  "data": [
    {
      "RefaccionID": 1,
      "NombrePieza": "Membrana RO 75GPD",
      "NombreCorto": "Membrana 75",
      "Codigo": "MEM-75",
      "CostoPromedio": 850.00,
      "Unidad": "Pieza"
    },
    {
      "RefaccionID": 8,
      "NombrePieza": "Membrana RO 100GPD",
      "NombreCorto": "Membrana 100",
      "Codigo": "MEM-100",
      "CostoPromedio": 1200.00,
      "Unidad": "Pieza"
    }
  ]
}
```

---

## Modelo de Datos

### plantillas_equipo

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| PlantillaEquipoID | Int | No | Clave primaria, autoincremental |
| Codigo | String(50) | Sí | Código único identificador |
| NombreEquipo | String(255) | No | Nombre del equipo/plantilla |
| Observaciones | String(500) | Sí | Notas adicionales |
| PorcentajeVenta | Float | No | Porcentaje de utilidad para venta (default: 35) |
| PorcentajeRenta | Float | No | Porcentaje para cálculo de renta mensual (default: 15) |
| IsActive | TinyInt | Sí | Estado del registro (default: 1) |
| FechaCreacion | Date | No | Fecha de creación |
| FechaModificacion | Date | Sí | Fecha de última modificación |

### plantillas_equipo_detalle

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| PlantillaDetalleID | Int | No | Clave primaria, autoincremental |
| PlantillaEquipoID | Int | No | FK a plantillas_equipo |
| RefaccionID | Int | No | FK a catalogo_refacciones |
| Cantidad | Int | No | Cantidad de piezas (default: 1, min: 1) |
| IsActive | TinyInt | Sí | Estado del registro (default: 1) |

## Relaciones

- **Plantilla → Detalles:** Una plantilla tiene muchos detalles (1:N)
- **Detalle → Refacción:** Cada detalle referencia una refacción (N:1)
- **Unique Constraint:** Un `PlantillaEquipoID` + `RefaccionID` debe ser único (no se puede agregar la misma refacción dos veces)

## Cálculos Dinámicos

Los precios se calculan en tiempo real cada vez que se consulta una plantilla:

| Campo Calculado | Fórmula |
|-----------------|---------|
| `CostoTotal` | Σ (CostoPromedio × Cantidad) de cada detalle |
| `PrecioVenta` | CostoTotal × (1 + PorcentajeVenta/100) |
| `PrecioRenta` | CostoTotal × (PorcentajeRenta/100) |
| `Subtotal` (por detalle) | CostoPromedio × Cantidad |

**Ejemplo:**
- CostoTotal = $1,500.00
- PorcentajeVenta = 35%
- PorcentajeRenta = 15%
- **PrecioVenta** = $1,500 × 1.35 = **$2,025.00**
- **PrecioRenta** = $1,500 × 0.15 = **$225.00** (mensual)

## Notas Importantes

- **Precios Dinámicos:** Los precios siempre se calculan con el `CostoPromedio` actual de cada refacción. Si el costo de una refacción cambia, los precios de todas las plantillas que la contengan se actualizarán automáticamente.

- **Soft Delete:** El campo `IsActive` controla la visibilidad. Las plantillas dadas de baja no aparecen en listados pero pueden reactivarse.

- **Código Único:** El campo `Codigo` es opcional pero si se proporciona debe ser único entre las plantillas activas.

- **Sin Refacciones Duplicadas:** Una plantilla no puede tener la misma refacción dos veces. Para aumentar cantidad, actualizar el detalle existente.

- **Duplicación:** Al duplicar una plantilla, el código se deja vacío para evitar conflictos y el nombre incluye "(Copia)".

---

**Última actualización:** 2024-12-05
