# API de Refacciones Dañadas - Purifreeze Backend

## Información General

**Base URL:** `http://localhost:3000`

**Prefijo de ruta:** `/refacciones-danadas`

**Autenticación:** Bearer Token (JWT)

---

## Propósito

Registrar refacciones que ya no están en condiciones de uso para:
- Análisis de calidad de proveedores
- Identificar refacciones problemáticas
- Detectar técnicos con alto índice de daños
- Calcular pérdidas por daños

---

## Endpoints

### 1. Registrar Refacción Dañada

**Endpoint:** `POST /refacciones-danadas`

**Descripción:** Registra una o más piezas dañadas. Si viene de un técnico, se descuenta automáticamente de su inventario.

**Payload:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `RefaccionID` | number | Sí | ID de la refacción dañada |
| `TecnicoID` | number | No | ID del técnico (si aplica) |
| `ProveedorID` | number | No | ID del proveedor (para trazabilidad) |
| `CompraEncabezadoID` | number | No | ID de la compra (para trazabilidad) |
| `Cantidad` | number | Sí | Cantidad de piezas dañadas (mín: 1) |
| `MotivoDano` | enum | Sí | Defecto_Fabrica, Mal_Uso, Desgaste_Normal, Accidente, Otro |
| `Observaciones` | string | No | Notas adicionales (máx 255) |
| `UsuarioID` | number | Sí | ID del usuario que registra |

**Ejemplo:**
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

**Response (201):**
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
    "Cantidad": 2,
    "MotivoDano": "Defecto_Fabrica",
    "FechaRegistro": "2024-01-15",
    "refaccion": {
      "NombrePieza": "Compresor 1HP",
      "Codigo": "COMP-001"
    },
    "TecnicoNombre": "Juan Pérez",
    "ProveedorNombre": "Refri-Parts SA"
  }
}
```

---

### 2. Obtener Todos los Registros

**Endpoint:** `GET /refacciones-danadas`

**Response (200):**
```json
{
  "status": 200,
  "message": "Refacciones dañadas obtenidas",
  "error": false,
  "data": [...]
}
```

---

### 3. Obtener Registro por ID

**Endpoint:** `GET /refacciones-danadas/:RefaccionDanadaID`

---

### 4. Reporte por Proveedor

**Endpoint:** `GET /refacciones-danadas/reporte/proveedor`

**Descripción:** Analiza qué proveedores tienen más refacciones dañadas (calidad).

**Query Params:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `fechaInicio` | date | Fecha inicial del rango |
| `fechaFin` | date | Fecha final del rango |
| `proveedorId` | number | Filtrar por proveedor específico |

**Response (200):**
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
    }
  ]
}
```

---

### 5. Reporte por Refacción

**Endpoint:** `GET /refacciones-danadas/reporte/refaccion`

**Descripción:** Identifica qué refacciones se dañan más frecuentemente.

**Response (200):**
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
      "NumeroRegistros": 3
    }
  ]
}
```

---

### 6. Reporte por Técnico

**Endpoint:** `GET /refacciones-danadas/reporte/tecnico`

**Descripción:** Analiza qué técnicos reportan más daños.

---

### 7. Eliminar Registro

**Endpoint:** `DELETE /refacciones-danadas/:RefaccionDanadaID`

**Nota:** Soft delete, no restaura el inventario.

---

## Modelo de Datos

### refacciones_danadas

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| RefaccionDanadaID | Int | No | Clave primaria |
| RefaccionID | Int | No | FK a catalogo_refacciones |
| TecnicoID | Int | Sí | FK a catalogo_tecnicos |
| ProveedorID | Int | Sí | FK a catalogo_proveedores |
| CompraEncabezadoID | Int | Sí | FK a compras_encabezado |
| Cantidad | Int | No | Piezas dañadas |
| MotivoDano | Enum | No | Causa del daño |
| Observaciones | String(255) | Sí | Notas |
| FechaRegistro | Date | No | Fecha de registro |
| UsuarioID | Int | No | Quien registró |
| IsActive | TinyInt | Sí | Estado del registro |

## Motivos de Daño

| Valor | Descripción |
|-------|-------------|
| `Defecto_Fabrica` | Pieza llegó defectuosa del proveedor |
| `Mal_Uso` | Daño por uso inadecuado |
| `Desgaste_Normal` | Desgaste por uso normal |
| `Accidente` | Daño accidental |
| `Otro` | Otro motivo |

---

**Última actualización:** 2024-12-02
