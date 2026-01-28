# API de Refacciones Dañadas - Purifreeze Backend

## Información General

**Base URL:** `http://localhost:3000`

**Prefijo de ruta:** `/refacciones-danadas`

**Autenticación:** Requiere Bearer Token (JWT)

---

## Descripción del Módulo

Este módulo permite **registrar refacciones dañadas** para análisis y control de calidad. Sirve para:
- Analizar calidad de proveedores (qué proveedor envía más piezas defectuosas)
- Identificar refacciones problemáticas (qué piezas se dañan más)
- Detectar técnicos con alto índice de daños
- Calcular pérdidas estimadas por daños

### Características Principales
- Si la refacción viene de un técnico, se **descuenta automáticamente** de su inventario
- Se resta primero del stock usado, luego del nuevo
- Genera reportes agrupados por proveedor, refacción y técnico
- Soft delete (no restaura inventario al eliminar)

---

## Endpoints

### 1. Registrar Refacción Dañada

**Endpoint:** `POST /refacciones-danadas`

**Descripción:** Registra una o más piezas dañadas. Si se especifica `TecnicoID`, se descuenta automáticamente del inventario del técnico (primero de stock usado, luego de nuevo).

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Payload:**

| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `RefaccionID` | number | Sí | - | ID de la refacción dañada |
| `TecnicoID` | number | No | nullable | ID del técnico (si viene de su inventario) |
| `ProveedorID` | number | No | nullable | ID del proveedor (para trazabilidad) |
| `CompraEncabezadoID` | number | No | nullable | ID de la compra (para trazabilidad) |
| `Cantidad` | number | Sí | min: 1 | Cantidad de piezas dañadas |
| `MotivoDano` | string | Sí | enum | Motivo del daño (ver tabla abajo) |
| `Observaciones` | string | No | max: 255 | Notas adicionales |
| `UsuarioID` | number | Sí | - | ID del usuario que registra |

**Motivos de Daño (enum):**

| Valor | Descripción |
|-------|-------------|
| `Defecto_Fabrica` | Pieza llegó defectuosa del proveedor |
| `Mal_Uso` | Daño por uso inadecuado |
| `Desgaste_Normal` | Desgaste por uso normal |
| `Accidente` | Daño accidental |
| `Otro` | Otro motivo |

**Ejemplo de Request (desde técnico):**
```json
{
  "RefaccionID": 15,
  "TecnicoID": 1,
  "ProveedorID": 3,
  "Cantidad": 2,
  "MotivoDano": "Defecto_Fabrica",
  "Observaciones": "Llegaron defectuosos del proveedor",
  "UsuarioID": 5
}
```

**Ejemplo de Request (sin técnico - solo registro):**
```json
{
  "RefaccionID": 15,
  "ProveedorID": 3,
  "CompraEncabezadoID": 10,
  "Cantidad": 5,
  "MotivoDano": "Defecto_Fabrica",
  "Observaciones": "Lote completo defectuoso",
  "UsuarioID": 5
}
```

**Response Exitoso (201):**
```json
{
  "status": 201,
  "message": "Registro creado",
  "error": false,
  "data": {
    "RefaccionDanadaID": 1,
    "RefaccionID": 15,
    "TecnicoID": 1,
    "ProveedorID": 3,
    "CompraEncabezadoID": null,
    "Cantidad": 2,
    "MotivoDano": "Defecto_Fabrica",
    "Observaciones": "Llegaron defectuosos del proveedor",
    "FechaRegistro": "2026-01-15T10:30:00.000Z",
    "UsuarioID": 5,
    "IsActive": 1,
    "refaccion": {
      "RefaccionID": 15,
      "NombrePieza": "Compresor 1HP",
      "NombreCorto": "Compresor",
      "Codigo": "COMP-001",
      "CostoPromedio": 1500.00
    },
    "TecnicoNombre": "Juan Pérez García",
    "ProveedorNombre": "Refri-Parts SA",
    "UsuarioNombre": "Admin Sistema"
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | Bad Request (RefaccionID: RefaccionID es requerido) | Campo faltante |
| 400 | Bad Request (Cantidad: Cantidad debe ser al menos 1) | Cantidad inválida |
| 400 | Bad Request (MotivoDano: Invalid enum value) | Motivo no válido |
| 404 | Refacción no encontrada | RefaccionID inválido |
| 404 | Técnico no encontrado | TecnicoID inválido |
| 404 | Proveedor no encontrado | ProveedorID inválido |
| 404 | Usuario no encontrado | UsuarioID inválido |
| 300 | El técnico no tiene esa refacción en su inventario | No existe en inventario_tecnico |
| 300 | Stock insuficiente. Disponible: X | No hay suficiente stock |

**Ejemplo de Error:**
```json
{
  "status": 300,
  "message": "Stock insuficiente. Disponible: 1",
  "error": true,
  "data": []
}
```

**Flujo Interno (si viene de técnico):**
1. Valida que el técnico tenga la refacción
2. Valida que tenga suficiente stock (StockUsado + StockNuevo >= Cantidad)
3. Crea el registro de refacción dañada
4. Descuenta del inventario del técnico:
   - Primero resta de `StockUsado`
   - Si no alcanza, resta el restante de `StockNuevo`

---

### 2. Obtener Todos los Registros

**Endpoint:** `GET /refacciones-danadas`

**Descripción:** Obtiene todos los registros de refacciones dañadas activos, ordenados por fecha descendente.

**Headers:**
```
Authorization: Bearer {token}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Refacciones dañadas obtenidas",
  "error": false,
  "data": [
    {
      "RefaccionDanadaID": 2,
      "RefaccionID": 20,
      "TecnicoID": 1,
      "ProveedorID": null,
      "CompraEncabezadoID": null,
      "Cantidad": 1,
      "MotivoDano": "Accidente",
      "Observaciones": "Se cayó durante instalación",
      "FechaRegistro": "2026-01-15T14:00:00.000Z",
      "UsuarioID": 5,
      "IsActive": 1,
      "refaccion": {
        "RefaccionID": 20,
        "NombrePieza": "Filtro de agua",
        "Codigo": "FLT-001",
        "CostoPromedio": 150.00
      },
      "TecnicoNombre": "Juan Pérez García",
      "ProveedorNombre": null,
      "UsuarioNombre": "Admin Sistema"
    },
    {
      "RefaccionDanadaID": 1,
      "RefaccionID": 15,
      "TecnicoID": 1,
      "ProveedorID": 3,
      "CompraEncabezadoID": null,
      "Cantidad": 2,
      "MotivoDano": "Defecto_Fabrica",
      "Observaciones": "Llegaron defectuosos del proveedor",
      "FechaRegistro": "2026-01-15T10:30:00.000Z",
      "UsuarioID": 5,
      "IsActive": 1,
      "refaccion": {
        "RefaccionID": 15,
        "NombrePieza": "Compresor 1HP",
        "Codigo": "COMP-001",
        "CostoPromedio": 1500.00
      },
      "TecnicoNombre": "Juan Pérez García",
      "ProveedorNombre": "Refri-Parts SA",
      "UsuarioNombre": "Admin Sistema"
    }
  ]
}
```

---

### 3. Obtener Registro por ID

**Endpoint:** `GET /refacciones-danadas/:RefaccionDanadaID`

**Descripción:** Obtiene el detalle completo de un registro específico.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `RefaccionDanadaID` | number | Sí | ID del registro |

**Ejemplo de Request:**
```
GET /refacciones-danadas/1
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Registro obtenido",
  "error": false,
  "data": {
    "RefaccionDanadaID": 1,
    "RefaccionID": 15,
    "TecnicoID": 1,
    "ProveedorID": 3,
    "CompraEncabezadoID": null,
    "Cantidad": 2,
    "MotivoDano": "Defecto_Fabrica",
    "Observaciones": "Llegaron defectuosos del proveedor",
    "FechaRegistro": "2026-01-15T10:30:00.000Z",
    "UsuarioID": 5,
    "IsActive": 1,
    "refaccion": {
      "RefaccionID": 15,
      "NombrePieza": "Compresor 1HP",
      "NombreCorto": "Compresor",
      "Codigo": "COMP-001",
      "CostoPromedio": 1500.00
    },
    "TecnicoNombre": "Juan Pérez García",
    "ProveedorNombre": "Refri-Parts SA",
    "UsuarioNombre": "Admin Sistema"
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | Bad Request (RefaccionDanadaID: ID debe ser un número válido) | Parámetro no numérico |
| 404 | Registro no encontrado | ID inválido o inactivo |

---

### 4. Reporte por Proveedor

**Endpoint:** `GET /refacciones-danadas/reporte/proveedor`

**Descripción:** Genera un reporte de refacciones dañadas agrupado por proveedor y motivo de daño. Útil para analizar la **calidad de los proveedores**.

**Headers:**
```
Authorization: Bearer {token}
```

**Query Params (todos opcionales):**

| Parámetro | Tipo | Formato | Descripción |
|-----------|------|---------|-------------|
| `fechaInicio` | string | YYYY-MM-DD | Filtrar desde esta fecha |
| `fechaFin` | string | YYYY-MM-DD | Filtrar hasta esta fecha |
| `proveedorId` | number | - | Filtrar por proveedor específico |

**Ejemplos de Request:**
```
GET /refacciones-danadas/reporte/proveedor
GET /refacciones-danadas/reporte/proveedor?fechaInicio=2026-01-01&fechaFin=2026-01-31
GET /refacciones-danadas/reporte/proveedor?proveedorId=3
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Reporte por proveedor obtenido",
  "error": false,
  "data": [
    {
      "ProveedorID": 3,
      "ProveedorNombre": "Refri-Parts SA",
      "MotivoDano": "Defecto_Fabrica",
      "CantidadTotal": 15,
      "NumeroRegistros": 5
    },
    {
      "ProveedorID": 3,
      "ProveedorNombre": "Refri-Parts SA",
      "MotivoDano": "Desgaste_Normal",
      "CantidadTotal": 3,
      "NumeroRegistros": 2
    },
    {
      "ProveedorID": 5,
      "ProveedorNombre": "Compresores MX",
      "MotivoDano": "Defecto_Fabrica",
      "CantidadTotal": 8,
      "NumeroRegistros": 3
    }
  ]
}
```

**Campos del Reporte:**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `ProveedorID` | number | ID del proveedor |
| `ProveedorNombre` | string | Nombre del proveedor |
| `MotivoDano` | string | Motivo de daño |
| `CantidadTotal` | number | Total de piezas dañadas |
| `NumeroRegistros` | number | Cantidad de registros (incidencias) |

**Nota:** Solo incluye registros que tienen `ProveedorID` asignado.

---

### 5. Reporte por Refacción

**Endpoint:** `GET /refacciones-danadas/reporte/refaccion`

**Descripción:** Identifica **qué refacciones se dañan más frecuentemente** y calcula la pérdida estimada. Retorna máximo 20 resultados ordenados por cantidad dañada.

**Headers:**
```
Authorization: Bearer {token}
```

**Query Params (todos opcionales):**

| Parámetro | Tipo | Formato | Descripción |
|-----------|------|---------|-------------|
| `fechaInicio` | string | YYYY-MM-DD | Filtrar desde esta fecha |
| `fechaFin` | string | YYYY-MM-DD | Filtrar hasta esta fecha |
| `refaccionId` | number | - | Filtrar por refacción específica |

**Ejemplos de Request:**
```
GET /refacciones-danadas/reporte/refaccion
GET /refacciones-danadas/reporte/refaccion?fechaInicio=2026-01-01&fechaFin=2026-01-31
GET /refacciones-danadas/reporte/refaccion?refaccionId=15
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Reporte por refacción obtenido",
  "error": false,
  "data": [
    {
      "RefaccionID": 15,
      "NombrePieza": "Compresor 1HP",
      "Codigo": "COMP-001",
      "CostoPromedio": 1500.00,
      "CantidadDanada": 10,
      "PerdidaEstimada": 15000.00,
      "NumeroRegistros": 4
    },
    {
      "RefaccionID": 20,
      "NombrePieza": "Filtro de agua",
      "Codigo": "FLT-001",
      "CostoPromedio": 150.00,
      "CantidadDanada": 8,
      "PerdidaEstimada": 1200.00,
      "NumeroRegistros": 6
    }
  ]
}
```

**Campos del Reporte:**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `RefaccionID` | number | ID de la refacción |
| `NombrePieza` | string | Nombre de la refacción |
| `Codigo` | string | Código de la refacción |
| `CostoPromedio` | number | Costo promedio unitario |
| `CantidadDanada` | number | Total de piezas dañadas |
| `PerdidaEstimada` | number | CantidadDanada × CostoPromedio |
| `NumeroRegistros` | number | Cantidad de incidencias |

**Nota:** Ordenado por `CantidadDanada` descendente, limitado a 20 resultados.

---

### 6. Reporte por Técnico

**Endpoint:** `GET /refacciones-danadas/reporte/tecnico`

**Descripción:** Analiza **qué técnicos reportan más daños**, agrupado por técnico y motivo de daño. Útil para detectar patrones.

**Headers:**
```
Authorization: Bearer {token}
```

**Query Params (todos opcionales):**

| Parámetro | Tipo | Formato | Descripción |
|-----------|------|---------|-------------|
| `fechaInicio` | string | YYYY-MM-DD | Filtrar desde esta fecha |
| `fechaFin` | string | YYYY-MM-DD | Filtrar hasta esta fecha |
| `tecnicoId` | number | - | Filtrar por técnico específico |

**Ejemplos de Request:**
```
GET /refacciones-danadas/reporte/tecnico
GET /refacciones-danadas/reporte/tecnico?fechaInicio=2026-01-01&fechaFin=2026-01-31
GET /refacciones-danadas/reporte/tecnico?tecnicoId=1
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Reporte por técnico obtenido",
  "error": false,
  "data": [
    {
      "TecnicoID": 1,
      "TecnicoNombre": "Juan Pérez García",
      "MotivoDano": "Accidente",
      "CantidadTotal": 5,
      "NumeroRegistros": 3
    },
    {
      "TecnicoID": 1,
      "TecnicoNombre": "Juan Pérez García",
      "MotivoDano": "Mal_Uso",
      "CantidadTotal": 2,
      "NumeroRegistros": 1
    },
    {
      "TecnicoID": 2,
      "TecnicoNombre": "María García López",
      "MotivoDano": "Desgaste_Normal",
      "CantidadTotal": 3,
      "NumeroRegistros": 2
    }
  ]
}
```

**Campos del Reporte:**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `TecnicoID` | number | ID del técnico |
| `TecnicoNombre` | string | Nombre del técnico |
| `MotivoDano` | string | Motivo de daño |
| `CantidadTotal` | number | Total de piezas dañadas |
| `NumeroRegistros` | number | Cantidad de incidencias |

**Nota:** Solo incluye registros que tienen `TecnicoID` asignado.

---

### 7. Eliminar Registro (Soft Delete)

**Endpoint:** `DELETE /refacciones-danadas/:RefaccionDanadaID`

**Descripción:** Elimina un registro de refacción dañada (soft delete). **NO restaura el inventario del técnico**.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `RefaccionDanadaID` | number | Sí | ID del registro a eliminar |

**Ejemplo de Request:**
```
DELETE /refacciones-danadas/1
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Registro eliminado",
  "error": false,
  "data": {
    "RefaccionDanadaID": 1
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | Bad Request (RefaccionDanadaID: ID debe ser un número válido) | Parámetro no numérico |
| 404 | Registro no encontrado | ID inválido |

**Advertencia:** El soft delete NO restaura las piezas al inventario del técnico. Si necesita devolver las piezas, debe hacerlo manualmente mediante el módulo de inventario técnico.

---

## Resumen de Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/refacciones-danadas` | Registrar refacción dañada |
| GET | `/refacciones-danadas` | Listar todos los registros |
| GET | `/refacciones-danadas/reporte/proveedor` | Reporte por proveedor |
| GET | `/refacciones-danadas/reporte/refaccion` | Reporte por refacción (más dañadas) |
| GET | `/refacciones-danadas/reporte/tecnico` | Reporte por técnico |
| GET | `/refacciones-danadas/:RefaccionDanadaID` | Detalle de un registro |
| DELETE | `/refacciones-danadas/:RefaccionDanadaID` | Eliminar registro (soft delete) |

---

## Modelo de Datos

### refacciones_danadas

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| RefaccionDanadaID | Int | No | Clave primaria (autoincrement) |
| RefaccionID | Int | No | FK a catalogo_refacciones |
| TecnicoID | Int | Sí | FK a catalogo_tecnicos |
| ProveedorID | Int | Sí | FK a catalogo_proveedores |
| CompraEncabezadoID | Int | Sí | FK a compras_encabezado |
| Cantidad | Int | No | Piezas dañadas (min: 1) |
| MotivoDano | Enum | No | Causa del daño |
| Observaciones | String(255) | Sí | Notas adicionales |
| FechaRegistro | DateTime | No | Fecha de registro |
| UsuarioID | Int | No | FK a usuarios (quien registró) |
| IsActive | TinyInt | Sí | 1=Activo, 0=Eliminado |

---

## Relaciones

```
catalogo_refacciones (1) ◄──── (N) refacciones_danadas
                                    │
                                    ├──── catalogo_tecnicos (opcional)
                                    ├──── catalogo_proveedores (opcional)
                                    ├──── compras_encabezado (opcional)
                                    └──── usuarios
```

---

## Notas Importantes

1. **Descuento Automático:** Si se especifica `TecnicoID`, las piezas se descuentan automáticamente del inventario del técnico.

2. **Orden de Descuento:** Primero se resta de `StockUsado`, si no alcanza, se resta de `StockNuevo`.

3. **Trazabilidad:** Los campos `ProveedorID` y `CompraEncabezadoID` son opcionales pero útiles para rastrear el origen de las piezas defectuosas.

4. **Soft Delete:** Eliminar un registro NO restaura el inventario. Las piezas ya fueron marcadas como dañadas y salieron del inventario.

5. **Reportes Agrupados:** Los reportes agregan datos por proveedor/refacción/técnico Y por motivo de daño, permitiendo análisis detallado.

6. **Pérdida Estimada:** Se calcula como `CantidadDanada × CostoPromedio` de la refacción.

---

## Casos de Uso Comunes

### Registrar pieza dañada por técnico
```json
POST /refacciones-danadas
{
  "RefaccionID": 15,
  "TecnicoID": 1,
  "Cantidad": 1,
  "MotivoDano": "Accidente",
  "Observaciones": "Se cayó durante instalación",
  "UsuarioID": 5
}
```

### Registrar lote defectuoso de proveedor
```json
POST /refacciones-danadas
{
  "RefaccionID": 15,
  "ProveedorID": 3,
  "CompraEncabezadoID": 25,
  "Cantidad": 10,
  "MotivoDano": "Defecto_Fabrica",
  "Observaciones": "Todo el lote llegó con defectos",
  "UsuarioID": 5
}
```

### Ver qué proveedor tiene más problemas de calidad
```
GET /refacciones-danadas/reporte/proveedor?fechaInicio=2026-01-01&fechaFin=2026-12-31
```

### Ver qué refacciones generan más pérdidas
```
GET /refacciones-danadas/reporte/refaccion
```

### Ver historial de daños de un técnico específico
```
GET /refacciones-danadas/reporte/tecnico?tecnicoId=1
```

---

**Última actualización:** 2026-01-15
