# API de Ajustes de Inventario - Purifreeze Backend

## Información General

**Base URL:** `http://localhost:3000`

**Prefijo de ruta:** `/ajustes-inventario`

**Autenticación:** Bearer Token (JWT)

---

## Flujo de Ajustes

```
┌─────────────────────────────────────────────────────────────┐
│                 FLUJO DE AJUSTE INVENTARIO                  │
├─────────────────────────────────────────────────────────────┤
│  1. Técnico/Admin captura stock real vs sistema             │
│  2. Sistema calcula diferencia automáticamente              │
│  3. Si hay diferencia negativa → Requiere autorización      │
│  4. Admin autoriza → Se ajusta el stock                     │
│  5. Se registra en kardex con tipo "Ajuste"                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Endpoints

### 1. Crear Solicitud de Ajuste

**Endpoint:** `POST /ajustes-inventario`

**Descripción:** Crea una solicitud de ajuste comparando el stock real con el del sistema.

**Payload:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `TecnicoID` | number | Sí | ID del técnico |
| `RefaccionID` | number | Sí | ID de la refacción |
| `StockRealNuevo` | number | Sí | Conteo físico de piezas nuevas |
| `StockRealUsado` | number | Sí | Conteo físico de piezas usadas |
| `MotivoAjuste` | enum | Sí | Perdida, Error_Captura, Robo, Deterioro, Sobrante, Otro |
| `Observaciones` | string | No | Notas adicionales |
| `UsuarioSolicitaID` | number | Sí | Quien solicita el ajuste |

**Ejemplo:**
```json
{
  "TecnicoID": 1,
  "RefaccionID": 15,
  "StockRealNuevo": 3,
  "StockRealUsado": 1,
  "MotivoAjuste": "Perdida",
  "Observaciones": "No se encontraron 2 piezas en el conteo",
  "UsuarioSolicitaID": 5
}
```

**Response (201):**
```json
{
  "status": 201,
  "message": "Solicitud de ajuste creada (requiere autorización por diferencia negativa)",
  "error": false,
  "data": {
    "AjusteID": 1,
    "TecnicoID": 1,
    "RefaccionID": 15,
    "StockSistemaNuevo": 5,
    "StockSistemaUsado": 2,
    "StockRealNuevo": 3,
    "StockRealUsado": 1,
    "DiferenciaNuevo": -2,
    "DiferenciaUsado": -1,
    "MotivoAjuste": "Perdida",
    "Estatus": "Pendiente",
    "TecnicoNombre": "Juan Pérez"
  }
}
```

**Errores:**
| Código | Mensaje | Causa |
|--------|---------|-------|
| 300 | No hay diferencia entre el stock del sistema y el stock real | Sin cambios |
| 404 | Técnico/Refacción/Usuario no encontrado | IDs inválidos |

---

### 2. Obtener Todos los Ajustes

**Endpoint:** `GET /ajustes-inventario`

**Query Params:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `estatus` | enum | Pendiente, Autorizado, Rechazado |

---

### 3. Obtener Ajustes Pendientes

**Endpoint:** `GET /ajustes-inventario/pendientes`

---

### 4. Obtener Ajuste por ID

**Endpoint:** `GET /ajustes-inventario/:AjusteID`

---

### 5. Autorizar o Rechazar Ajuste

**Endpoint:** `POST /ajustes-inventario/:AjusteID/autorizar`

**Payload:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `UsuarioAutorizaID` | number | Sí | Quien autoriza |
| `Autorizado` | boolean | Sí | true = autorizar, false = rechazar |
| `Observaciones` | string | No | Comentarios |

**Ejemplo - Autorizar:**
```json
{
  "UsuarioAutorizaID": 1,
  "Autorizado": true,
  "Observaciones": "Verificado en campo"
}
```

**Response (200) - Autorizado:**
```json
{
  "status": 200,
  "message": "Ajuste autorizado y aplicado",
  "error": false,
  "data": {
    "AjusteID": 1,
    "Estatus": "Autorizado",
    "FechaAutorizacion": "2024-01-15"
  }
}
```

---

### 6. Obtener Ajustes de un Técnico

**Endpoint:** `GET /ajustes-inventario/tecnico/:TecnicoID`

---

### 7. Cancelar Solicitud

**Endpoint:** `DELETE /ajustes-inventario/:AjusteID/cancelar`

---

### 8. Reporte de Ajustes (Análisis de Pérdidas)

**Endpoint:** `GET /ajustes-inventario/reporte`

**Query Params:**
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `fechaInicio` | date | Fecha inicial |
| `fechaFin` | date | Fecha final |
| `tecnicoId` | number | Filtrar por técnico |
| `motivo` | enum | Filtrar por motivo |

**Response (200):**
```json
{
  "status": 200,
  "message": "Reporte de ajustes obtenido",
  "error": false,
  "data": {
    "resumen": {
      "totalAjustes": 10,
      "totalDiferenciaNuevo": -15,
      "totalDiferenciaUsado": -8,
      "perdidaEstimada": 25000.00
    },
    "ajustes": [...]
  }
}
```

---

## Modelo de Datos

### ajustes_inventario

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| AjusteID | Int | No | Clave primaria |
| TecnicoID | Int | No | FK a catalogo_tecnicos |
| RefaccionID | Int | No | FK a catalogo_refacciones |
| StockSistemaNuevo | Int | No | Lo que dice el sistema (nuevo) |
| StockSistemaUsado | Int | No | Lo que dice el sistema (usado) |
| StockRealNuevo | Int | No | Conteo físico (nuevo) |
| StockRealUsado | Int | No | Conteo físico (usado) |
| DiferenciaNuevo | Int | No | StockReal - StockSistema (nuevo) |
| DiferenciaUsado | Int | No | StockReal - StockSistema (usado) |
| MotivoAjuste | Enum | No | Causa del ajuste |
| Observaciones | String(255) | Sí | Notas |
| UsuarioSolicitaID | Int | No | Quien solicita |
| UsuarioAutorizaID | Int | Sí | Quien autoriza |
| FechaSolicitud | Date | No | Fecha de creación |
| FechaAutorizacion | Date | Sí | Fecha de resolución |
| Estatus | Enum | No | Pendiente, Autorizado, Rechazado |
| IsActive | TinyInt | Sí | Estado del registro |

## Motivos de Ajuste

| Valor | Descripción |
|-------|-------------|
| `Perdida` | Pieza extraviada |
| `Error_Captura` | Error en captura anterior |
| `Robo` | Sospecha de robo |
| `Deterioro` | Pieza se deterioró |
| `Sobrante` | Hay más piezas de las registradas |
| `Otro` | Otro motivo |

## Notas Importantes

- **Diferencias negativas** siempre requieren autorización
- **Diferencias positivas** (sobrantes) también requieren autorización para mantener control
- Al autorizar, se actualiza el inventario del técnico y se registra en kardex
- La pérdida estimada se calcula: piezas nuevas al 100% del costo, usadas al 50%

---

**Última actualización:** 2024-12-02
