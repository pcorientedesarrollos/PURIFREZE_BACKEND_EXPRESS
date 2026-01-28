# API de Inventario General y Kardex - Purifreeze Backend

## Información General

**Base URL:** `http://localhost:3000`

**Prefijo de ruta:** `/inventario`

**Autenticación:** Requiere Bearer Token (JWT)

---

## Descripción del Módulo

Este módulo permite consultar el **inventario general de bodega** y el **kardex de movimientos**. Es un módulo de **solo lectura** - las actualizaciones de inventario se realizan automáticamente desde otros módulos (recepciones de compra, traspasos, órdenes de servicio, etc.).

### Características Principales
- Consulta de stock actual en bodega
- Resumen por ubicación
- Historial de movimientos (kardex)
- Filtros por fecha y tipo de movimiento
- Solo lectura (las actualizaciones son automáticas)

---

## Endpoints de Inventario

### 1. Obtener Todo el Inventario

**Endpoint:** `GET /inventario`

**Descripción:** Obtiene el listado completo del inventario de bodega con información de refacciones y ubicaciones.

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
      "FechaUltimoMovimiento": "2026-01-15",
      "IsActive": 1,
      "refaccion": {
        "RefaccionID": 5,
        "NombrePieza": "Filtro de carbón activado",
        "NombreCorto": "FILTRO-CA",
        "CostoPromedio": 150.50,
        "PrecioVenta": 250.00
      },
      "ubicacion": {
        "UbicacionID": 1,
        "Tipo": "Bodega",
        "Observaciones": "Bodega General",
        "Fecha": "2026-01-01T00:00:00.000Z"
      }
    },
    {
      "InventarioID": 2,
      "RefaccionID": 10,
      "UbicacionID": 1,
      "StockActual": 15,
      "FechaUltimoMovimiento": "2026-01-14",
      "IsActive": 1,
      "refaccion": {
        "RefaccionID": 10,
        "NombrePieza": "Compresor 1HP",
        "NombreCorto": "COMP-1HP",
        "CostoPromedio": 1500.00,
        "PrecioVenta": 2500.00
      },
      "ubicacion": {
        "UbicacionID": 1,
        "Tipo": "Bodega",
        "Observaciones": "Bodega General",
        "Fecha": "2026-01-01T00:00:00.000Z"
      }
    }
  ]
}
```

**Campos del Inventario:**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `InventarioID` | number | ID único del registro |
| `RefaccionID` | number | ID de la refacción |
| `UbicacionID` | number | ID de la ubicación |
| `StockActual` | number | Cantidad actual en stock |
| `FechaUltimoMovimiento` | string | Fecha del último movimiento (YYYY-MM-DD) |
| `IsActive` | number | 1=Activo, 0=Inactivo |
| `refaccion` | object | Información de la refacción |
| `ubicacion` | object | Información de la ubicación |

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
        "totalItems": 45,
        "totalStock": 350,
        "valorTotal": 52875.00
      },
      {
        "ubicacion": "Tecnico",
        "totalItems": 12,
        "totalStock": 45,
        "valorTotal": 6750.00
      },
      {
        "ubicacion": "Equipo",
        "totalItems": 8,
        "totalStock": 20,
        "valorTotal": 3000.00
      }
    ],
    "totales": {
      "totalItems": 65,
      "totalStock": 415,
      "valorTotal": 62625.00
    }
  }
}
```

**Campos del Resumen:**

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

**Ejemplo de Request:**
```
GET /inventario/refaccion/5
```

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
      "FechaUltimoMovimiento": "2026-01-15",
      "IsActive": 1,
      "refaccion": {
        "RefaccionID": 5,
        "NombrePieza": "Filtro de carbón activado",
        "NombreCorto": "FILTRO-CA",
        "CostoPromedio": 150.50,
        "PrecioVenta": 250.00
      },
      "ubicacion": {
        "UbicacionID": 1,
        "Tipo": "Bodega",
        "Observaciones": "Bodega General",
        "Fecha": "2026-01-01T00:00:00.000Z"
      }
    }
  ]
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | Bad Request (RefaccionID: ID debe ser un número válido) | Parámetro no numérico |
| 404 | No se encontró inventario para esta refacción | RefaccionID sin stock registrado |

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

**Ejemplos de Request:**
```
GET /inventario/kardex
GET /inventario/kardex?fechaInicio=2026-01-01
GET /inventario/kardex?fechaInicio=2026-01-01&fechaFin=2026-01-31
GET /inventario/kardex?tipoMovimiento=Entrada_Compra
GET /inventario/kardex?fechaInicio=2026-01-01&tipoMovimiento=Entrada_Compra
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
      "FechaMovimiento": "2026-01-15",
      "TipoMovimiento": "Entrada_Compra",
      "Cantidad": 10,
      "CostoPromedioMovimiento": 150.50,
      "UsuarioID": 1,
      "Observaciones": "Entrada por recepción de compra #14",
      "refaccion": {
        "RefaccionID": 5,
        "NombrePieza": "Filtro de carbón activado",
        "NombreCorto": "FILTRO-CA"
      }
    },
    {
      "KardexInventarioID": 14,
      "RefaccionID": 10,
      "FechaMovimiento": "2026-01-14",
      "TipoMovimiento": "Traspaso_Bodega_Tecnico",
      "Cantidad": -5,
      "CostoPromedioMovimiento": 1500.00,
      "UsuarioID": 1,
      "Observaciones": "Salida de bodega → Técnico T-001 (Juan Pérez)",
      "refaccion": {
        "RefaccionID": 10,
        "NombrePieza": "Compresor 1HP",
        "NombreCorto": "COMP-1HP"
      }
    }
  ]
}
```

**Campos del Kardex:**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `KardexInventarioID` | number | ID único del movimiento |
| `RefaccionID` | number | ID de la refacción |
| `FechaMovimiento` | string | Fecha del movimiento (YYYY-MM-DD) |
| `TipoMovimiento` | string | Tipo de movimiento (ver tabla abajo) |
| `Cantidad` | number | Cantidad movida (positiva=entrada, negativa=salida) |
| `CostoPromedioMovimiento` | number | Costo promedio al momento del movimiento |
| `UsuarioID` | number | ID del usuario que realizó el movimiento |
| `Observaciones` | string | Descripción del movimiento |
| `refaccion` | object | Información de la refacción |

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

**Descripción de Tipos de Movimiento:**

| Tipo | Descripción |
|------|-------------|
| `Entrada_Compra` | Entrada de refacciones por recepción de compra |
| `Traspaso_Tecnico` | Movimiento de/hacia técnico (ajustes, devoluciones) |
| `Traspaso_Bodega_Tecnico` | Movimiento de bodega hacia técnico |
| `Traspaso_Bodega_Equipo` | Movimiento de bodega hacia equipo instalado |
| `Traspaso_Tecnico_Equipo` | Movimiento de técnico hacia equipo (instalación) |
| `Traspaso_Equipo` | Movimiento dentro de equipos |

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

**Ejemplos de Request:**
```
GET /inventario/kardex/refaccion/5
GET /inventario/kardex/refaccion/5?fechaInicio=2026-01-01&fechaFin=2026-01-31
GET /inventario/kardex/refaccion/5?tipoMovimiento=Entrada_Compra
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
      "FechaMovimiento": "2026-01-15",
      "TipoMovimiento": "Entrada_Compra",
      "Cantidad": 10,
      "CostoPromedioMovimiento": 150.50,
      "UsuarioID": 1,
      "Observaciones": "Entrada por recepción de compra #14",
      "refaccion": {
        "RefaccionID": 5,
        "NombrePieza": "Filtro de carbón activado",
        "NombreCorto": "FILTRO-CA"
      }
    },
    {
      "KardexInventarioID": 10,
      "RefaccionID": 5,
      "FechaMovimiento": "2026-01-10",
      "TipoMovimiento": "Entrada_Compra",
      "Cantidad": 5,
      "CostoPromedioMovimiento": 145.00,
      "UsuarioID": 1,
      "Observaciones": "Entrada por recepción de compra #10",
      "refaccion": {
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

## Resumen de Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/inventario` | Obtener todo el inventario |
| GET | `/inventario/resumen` | Resumen por ubicación con totales |
| GET | `/inventario/refaccion/:RefaccionID` | Inventario de una refacción |
| GET | `/inventario/kardex` | Historial de movimientos |
| GET | `/inventario/kardex/tipos-movimiento` | Tipos de movimiento disponibles |
| GET | `/inventario/kardex/refaccion/:RefaccionID` | Kardex de una refacción |

---

## Modelo de Datos

### inventario

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| InventarioID | Int | No | Clave primaria (autoincrement) |
| RefaccionID | Int | Sí | FK a catalogo_refacciones |
| UbicacionID | Int | Sí | FK a ubicaciones_inventario |
| StockActual | Int | Sí | Cantidad actual en stock |
| FechaUltimoMovimiento | DateTime | Sí | Fecha del último movimiento |
| IsActive | TinyInt | Sí | 1=Activo, 0=Inactivo |

### kardex_inventario

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| KardexInventarioID | Int | No | Clave primaria (autoincrement) |
| RefaccionID | Int | Sí | FK a catalogo_refacciones |
| FechaMovimiento | DateTime | Sí | Fecha del movimiento |
| TipoMovimiento | Enum | Sí | Tipo de movimiento |
| Cantidad | Float | Sí | Cantidad movida (+ entrada, - salida) |
| CostoPromedioMovimiento | Float | Sí | Costo promedio al momento |
| UsuarioID | Int | Sí | Usuario que registró el movimiento |
| Observaciones | String(255) | Sí | Notas del movimiento |

### ubicaciones_inventario

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| UbicacionID | Int | No | Clave primaria (autoincrement) |
| Tipo | Enum | Sí | Bodega, Tecnico, Equipo |
| Observaciones | String(255) | Sí | Descripción de la ubicación |
| Fecha | DateTime | Sí | Fecha de creación |

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

El inventario se actualiza **automáticamente** en los siguientes casos:

### 1. Recepción de Compra (`POST /compras-recepciones`)
```
Recepción creada
    ├─ Actualiza inventario (suma cantidad a Bodega General)
    ├─ Crea registro en Kardex (tipo: Entrada_Compra)
    └─ Actualiza costo promedio de la refacción
```

### 2. Traspaso a Técnico (`POST /inventario-tecnico`)
```
Traspaso creado
    ├─ Descuenta de inventario bodega
    ├─ Crea salida en Kardex (tipo: Traspaso_Bodega_Tecnico)
    └─ Actualiza inventario_tecnico
```

### 3. Ajuste de Inventario Autorizado (`POST /ajustes-inventario/:id/autorizar`)
```
Ajuste autorizado
    ├─ Actualiza inventario_tecnico
    └─ Crea registro en Kardex (tipo: Traspaso_Tecnico)
```

### 4. Orden de Servicio (consumo de refacciones)
```
Servicio completado
    ├─ Descuenta de inventario técnico
    ├─ Crea salida en Kardex (tipo: Traspaso_Tecnico_Equipo)
    └─ Registra refacción en equipo
```

---

## Notas Importantes

1. **Solo Lectura:** Este módulo solo permite consultar inventario y kardex. Las actualizaciones se realizan automáticamente desde otros módulos.

2. **Ubicación por Defecto:** Todas las recepciones de compra ingresan a Bodega General (UbicacionID=1).

3. **Costo Promedio:** Se calcula usando promedio ponderado y se guarda en `catalogo_refacciones.CostoPromedio`.

4. **Fechas Formateadas:** Todas las fechas se devuelven en formato `YYYY-MM-DD`.

5. **Ordenamiento:** Los resultados se ordenan por ID descendente (más recientes primero).

6. **Cantidad en Kardex:**
   - Positiva (+) = Entrada de stock
   - Negativa (-) = Salida de stock

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

### Ver dónde está una refacción específica
```
GET /inventario/refaccion/5
```

### Ver historial completo de movimientos
```
GET /inventario/kardex
```

### Ver movimientos de una refacción específica
```
GET /inventario/kardex/refaccion/5
```

### Ver entradas de compras del mes
```
GET /inventario/kardex?fechaInicio=2026-01-01&fechaFin=2026-01-31&tipoMovimiento=Entrada_Compra
```

### Ver todos los traspasos a técnicos
```
GET /inventario/kardex?tipoMovimiento=Traspaso_Bodega_Tecnico
```

---

**Última actualización:** 2026-01-15
