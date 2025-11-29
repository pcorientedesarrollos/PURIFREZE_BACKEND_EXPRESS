# API de Inventario y Kardex - Purifreeze Backend

## Información General

**Base URL:** `http://localhost:3000`

**Prefijo de ruta:** `/inventario`

**Autenticación:** Bearer Token (JWT)

---

## Endpoints de Inventario

### 1. Obtener Todo el Inventario

**Endpoint:** `GET /inventario`

**Descripción:** Obtiene el listado completo del inventario con información de refacciones y ubicaciones.

**Headers:**
```
Authorization: Bearer {token}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Inventario obtenido",
  "error": false,
  "data": [
    {
      "InventarioID": 1,
      "RefaccionID": 5,
      "UbicacionID": 1,
      "StockActual": 25,
      "FechaUltimoMovimiento": "2025-11-28",
      "IsActive": 1,
      "catalogo_refacciones": {
        "RefaccionID": 5,
        "NombrePieza": "Filtro de carbón activado",
        "NombreCorto": "FILTRO-CA",
        "CostoPromedio": 150.50,
        "PrecioVenta": 250.00
      },
      "ubicaciones_inventario": {
        "UbicacionID": 1,
        "Tipo": "Bodega",
        "Observaciones": "Bodega General",
        "Fecha": "2025-01-01T00:00:00.000Z"
      }
    }
  ]
}
```

---

### 2. Obtener Resumen de Inventario

**Endpoint:** `GET /inventario/resumen`

**Descripción:** Obtiene un resumen del inventario agrupado por ubicación, incluyendo totales y valor del inventario.

**Headers:**
```
Authorization: Bearer {token}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Resumen de inventario obtenido",
  "error": false,
  "data": {
    "resumenPorUbicacion": [
      {
        "ubicacion": "Bodega",
        "totalItems": 15,
        "totalStock": 250,
        "valorTotal": 37625.00
      },
      {
        "ubicacion": "Tecnico",
        "totalItems": 5,
        "totalStock": 30,
        "valorTotal": 4515.00
      }
    ],
    "totales": {
      "totalItems": 20,
      "totalStock": 280,
      "valorTotal": 42140.00
    }
  }
}
```

**Campos del resumen:**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `ubicacion` | string | Tipo de ubicación (Bodega, Tecnico, Equipo) |
| `totalItems` | number | Cantidad de refacciones diferentes |
| `totalStock` | number | Suma total de unidades |
| `valorTotal` | number | Valor calculado (stock × costo promedio) |

---

### 3. Obtener Inventario por Refacción

**Endpoint:** `GET /inventario/refaccion/:RefaccionID`

**Descripción:** Obtiene el inventario de una refacción específica en todas sus ubicaciones.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `RefaccionID` | number | Sí | ID de la refacción |

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Inventario de refacción obtenido",
  "error": false,
  "data": [
    {
      "InventarioID": 1,
      "RefaccionID": 5,
      "UbicacionID": 1,
      "StockActual": 25,
      "FechaUltimoMovimiento": "2025-11-28",
      "IsActive": 1,
      "catalogo_refacciones": {
        "RefaccionID": 5,
        "NombrePieza": "Filtro de carbón activado",
        "NombreCorto": "FILTRO-CA",
        "CostoPromedio": 150.50,
        "PrecioVenta": 250.00
      },
      "ubicaciones_inventario": {
        "UbicacionID": 1,
        "Tipo": "Bodega",
        "Observaciones": "Bodega General",
        "Fecha": "2025-01-01T00:00:00.000Z"
      }
    }
  ]
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | Bad Request (RefaccionID: ID debe ser un número válido) | Parámetro no numérico |
| 404 | No se encontró inventario para esta refacción | RefaccionID sin stock |

---

## Endpoints de Kardex

### 4. Obtener Todo el Kardex

**Endpoint:** `GET /inventario/kardex`

**Descripción:** Obtiene el historial completo de movimientos de inventario. Soporta filtros opcionales por fecha y tipo de movimiento.

**Headers:**
```
Authorization: Bearer {token}
```

**Query Params (opcionales):**

| Parámetro | Tipo | Formato | Descripción |
|-----------|------|---------|-------------|
| `fechaInicio` | string | YYYY-MM-DD | Filtrar desde esta fecha |
| `fechaFin` | string | YYYY-MM-DD | Filtrar hasta esta fecha |
| `tipoMovimiento` | string | - | Filtrar por tipo de movimiento |

**Ejemplos de uso:**
```
GET /inventario/kardex
GET /inventario/kardex?fechaInicio=2025-11-01
GET /inventario/kardex?fechaInicio=2025-11-01&fechaFin=2025-11-30
GET /inventario/kardex?tipoMovimiento=Entrada_Compra
GET /inventario/kardex?fechaInicio=2025-11-01&tipoMovimiento=Entrada_Compra
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Kardex obtenido",
  "error": false,
  "data": [
    {
      "KardexInventarioID": 15,
      "RefaccionID": 5,
      "FechaMovimiento": "2025-11-28",
      "TipoMovimiento": "Entrada_Compra",
      "Cantidad": 10,
      "CostoPromedioMovimiento": 150.50,
      "UsuarioID": 1,
      "Observaciones": "Entrada por recepción de compra #14",
      "catalogo_refacciones": {
        "RefaccionID": 5,
        "NombrePieza": "Filtro de carbón activado",
        "NombreCorto": "FILTRO-CA"
      }
    }
  ]
}
```

---

### 5. Obtener Tipos de Movimiento

**Endpoint:** `GET /inventario/kardex/tipos-movimiento`

**Descripción:** Obtiene la lista de tipos de movimiento disponibles para filtrar el kardex.

**Headers:**
```
Authorization: Bearer {token}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Tipos de movimiento obtenidos",
  "error": false,
  "data": [
    "Entrada_Compra",
    "Traspaso_Tecnico",
    "Traspaso_Bodega_Tecnico",
    "Traspaso_Bodega_Equipo",
    "Traspaso_Tecnico_Equipo",
    "Traspaso_Equipo"
  ]
}
```

**Descripción de tipos:**

| Tipo | Descripción |
|------|-------------|
| `Entrada_Compra` | Entrada de refacciones por recepción de compra |
| `Traspaso_Tecnico` | Movimiento hacia ubicación Técnico |
| `Traspaso_Bodega_Tecnico` | Movimiento de Bodega a Técnico |
| `Traspaso_Bodega_Equipo` | Movimiento de Bodega a Equipo |
| `Traspaso_Tecnico_Equipo` | Movimiento de Técnico a Equipo |
| `Traspaso_Equipo` | Movimiento dentro de Equipo |

---

### 6. Obtener Kardex por Refacción

**Endpoint:** `GET /inventario/kardex/refaccion/:RefaccionID`

**Descripción:** Obtiene el historial de movimientos de una refacción específica. Soporta los mismos filtros que el kardex general.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `RefaccionID` | number | Sí | ID de la refacción |

**Query Params (opcionales):**

| Parámetro | Tipo | Formato | Descripción |
|-----------|------|---------|-------------|
| `fechaInicio` | string | YYYY-MM-DD | Filtrar desde esta fecha |
| `fechaFin` | string | YYYY-MM-DD | Filtrar hasta esta fecha |
| `tipoMovimiento` | string | - | Filtrar por tipo de movimiento |

**Ejemplo de uso:**
```
GET /inventario/kardex/refaccion/5
GET /inventario/kardex/refaccion/5?fechaInicio=2025-11-01&fechaFin=2025-11-30
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Kardex de refacción obtenido",
  "error": false,
  "data": [
    {
      "KardexInventarioID": 15,
      "RefaccionID": 5,
      "FechaMovimiento": "2025-11-28",
      "TipoMovimiento": "Entrada_Compra",
      "Cantidad": 10,
      "CostoPromedioMovimiento": 150.50,
      "UsuarioID": 1,
      "Observaciones": "Entrada por recepción de compra #14",
      "catalogo_refacciones": {
        "RefaccionID": 5,
        "NombrePieza": "Filtro de carbón activado",
        "NombreCorto": "FILTRO-CA"
      }
    },
    {
      "KardexInventarioID": 10,
      "RefaccionID": 5,
      "FechaMovimiento": "2025-11-25",
      "TipoMovimiento": "Entrada_Compra",
      "Cantidad": 5,
      "CostoPromedioMovimiento": 145.00,
      "UsuarioID": 1,
      "Observaciones": "Entrada por recepción de compra #10",
      "catalogo_refacciones": {
        "RefaccionID": 5,
        "NombrePieza": "Filtro de carbón activado",
        "NombreCorto": "FILTRO-CA"
      }
    }
  ]
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | Bad Request (RefaccionID: ID debe ser un número válido) | Parámetro no numérico |

---

## Modelo de Datos

### inventario

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| `InventarioID` | Int | No | Clave primaria (autoincrement) |
| `RefaccionID` | Int | Sí | FK a `catalogo_refacciones` |
| `UbicacionID` | Int | Sí | FK a `ubicaciones_inventario` |
| `StockActual` | Int | Sí | Cantidad actual en stock |
| `FechaUltimoMovimiento` | DateTime | Sí | Fecha del último movimiento |
| `IsActive` | TinyInt | Sí | 1=Activo, 0=Inactivo |

### kardex_inventario

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| `KardexInventarioID` | Int | No | Clave primaria (autoincrement) |
| `RefaccionID` | Int | Sí | FK a `catalogo_refacciones` |
| `FechaMovimiento` | DateTime | Sí | Fecha del movimiento |
| `TipoMovimiento` | Enum | Sí | Tipo de movimiento |
| `Cantidad` | Float | Sí | Cantidad movida |
| `CostoPromedioMovimiento` | Float | Sí | Costo promedio al momento |
| `UsuarioID` | Int | Sí | Usuario que registró |
| `Observaciones` | String(255) | Sí | Notas del movimiento |

### ubicaciones_inventario

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| `UbicacionID` | Int | No | Clave primaria (autoincrement) |
| `Tipo` | Enum | Sí | Bodega, Tecnico, Equipo |
| `Observaciones` | String(255) | Sí | Descripción de la ubicación |
| `Fecha` | DateTime | Sí | Fecha de creación |

---

## Relaciones

```
catalogo_refacciones (1) ◄──── (N) inventario
                                    │
                                    └──── ubicaciones_inventario

catalogo_refacciones (1) ◄──── (N) kardex_inventario
```

- **catalogo_refacciones → inventario:** Una refacción puede tener stock en múltiples ubicaciones
- **inventario → ubicaciones_inventario:** Cada registro de inventario pertenece a una ubicación
- **catalogo_refacciones → kardex_inventario:** Historial de todos los movimientos de la refacción

---

## Ubicaciones Predefinidas

| UbicacionID | Tipo | Descripción |
|-------------|------|-------------|
| 1 | Bodega | Bodega General (ubicación por defecto) |
| 2 | Tecnico | Asignado a técnicos |
| 3 | Equipo | Instalado en equipos |

---

## Flujo de Actualización de Inventario

El inventario se actualiza automáticamente en los siguientes casos:

### 1. Recepción de Compra (POST /compras-recepciones)
```
Recepción creada
    ├─ Actualiza inventario (suma cantidad a Bodega General)
    ├─ Crea registro en Kardex (tipo: Entrada_Compra)
    └─ Actualiza costo promedio de la refacción
```

### 2. Compra Finalizada Directa (POST /compras con Estatus="Finalizado")
```
Compra finalizada
    ├─ Crea recepción automática
    ├─ Actualiza inventario
    ├─ Crea registro en Kardex
    └─ Actualiza costo promedio
```

---

## Notas Importantes

- **Solo lectura:** Este módulo solo permite consultar inventario y kardex. Las actualizaciones se realizan automáticamente desde el módulo de recepciones.
- **Ubicación por defecto:** Todas las recepciones de compra ingresan a Bodega General (UbicacionID=1).
- **Costo promedio:** Se calcula usando promedio ponderado y se guarda en `catalogo_refacciones.CostoPromedio`.
- **Fechas formateadas:** Todas las fechas se devuelven en formato `YYYY-MM-DD`.
- **Ordenamiento:** Los resultados se ordenan por ID descendente (más recientes primero).

---

## Casos de Uso Comunes

### Ver stock actual de todas las refacciones
```
GET /inventario
```

### Ver valor total del inventario
```
GET /inventario/resumen
```

### Ver historial de una refacción específica
```
GET /inventario/kardex/refaccion/5
```

### Ver entradas de compras del mes
```
GET /inventario/kardex?fechaInicio=2025-11-01&fechaFin=2025-11-30&tipoMovimiento=Entrada_Compra
```

---

**Última actualización:** 2025-11-28
