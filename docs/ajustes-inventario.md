# API de Ajustes de Inventario de Técnicos - Purifreeze Backend

## Información General

**Base URL:** `http://localhost:3000`

**Prefijo de ruta:** `/ajustes-inventario`

**Autenticación:** Requiere Bearer Token (JWT)

---

## Descripción del Módulo

Este módulo permite **ajustar el inventario de los técnicos** cuando existe una diferencia entre el stock registrado en el sistema y el stock físico real. Incluye un flujo de autorización donde otro usuario debe aprobar o rechazar el ajuste.

### Flujo de Trabajo
```
┌─────────────────────────────────────────────────────────────┐
│                 FLUJO DE AJUSTE INVENTARIO                  │
├─────────────────────────────────────────────────────────────┤
│  1. Usuario crea solicitud indicando stock real             │
│  2. Sistema calcula diferencia automáticamente              │
│  3. Si hay diferencia negativa → Requiere autorización      │
│  4. Otro usuario autoriza o rechaza                         │
│  5. Si autoriza → Inventario técnico se actualiza + Kardex  │
└─────────────────────────────────────────────────────────────┘
```

### Tipos de Motivo (enum)
| Valor | Descripción |
|-------|-------------|
| `Perdida` | Pieza extraviada |
| `Error_Captura` | Error en captura anterior |
| `Robo` | Sospecha de robo |
| `Deterioro` | Pieza se deterioró/dañó |
| `Sobrante` | Hay más piezas de las registradas |
| `Otro` | Otro motivo |

### Estados del Ajuste (enum)
| Estado | Descripción |
|--------|-------------|
| `Pendiente` | Esperando autorización |
| `Autorizado` | Aprobado y aplicado al inventario |
| `Rechazado` | Rechazado por autorizador |

---

## Endpoints

### 1. Crear Solicitud de Ajuste

**Endpoint:** `POST /ajustes-inventario`

**Descripción:** Crea una nueva solicitud de ajuste de inventario para un técnico. El sistema calcula automáticamente la diferencia entre el stock actual del sistema y el stock real reportado.

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
| `StockRealNuevo` | number | Sí | min: 0 | Conteo físico de piezas nuevas |
| `StockRealUsado` | number | Sí | min: 0 | Conteo físico de piezas usadas |
| `MotivoAjuste` | string | Sí | enum | Perdida, Error_Captura, Robo, Deterioro, Sobrante, Otro |
| `Observaciones` | string | No | max: 255 | Observaciones adicionales |
| `UsuarioSolicitaID` | number | Sí | - | ID del usuario que solicita el ajuste |

**Ejemplo de Request:**
```json
{
  "TecnicoID": 1,
  "RefaccionID": 25,
  "StockRealNuevo": 3,
  "StockRealUsado": 1,
  "MotivoAjuste": "Perdida",
  "Observaciones": "No se encontraron 2 piezas en el conteo físico",
  "UsuarioSolicitaID": 5
}
```

**Response Exitoso (201):**
```json
{
  "status": 201,
  "message": "Solicitud de ajuste creada (requiere autorización por diferencia negativa)",
  "error": false,
  "data": {
    "AjusteID": 15,
    "TecnicoID": 1,
    "RefaccionID": 25,
    "StockSistemaNuevo": 5,
    "StockSistemaUsado": 2,
    "StockRealNuevo": 3,
    "StockRealUsado": 1,
    "DiferenciaNuevo": -2,
    "DiferenciaUsado": -1,
    "MotivoAjuste": "Perdida",
    "Observaciones": "No se encontraron 2 piezas en el conteo físico",
    "UsuarioSolicitaID": 5,
    "UsuarioAutorizaID": null,
    "FechaSolicitud": "2026-01-15T10:30:00.000Z",
    "FechaAutorizacion": null,
    "Estatus": "Pendiente",
    "IsActive": 1,
    "refaccion": {
      "RefaccionID": 25,
      "NombrePieza": "Filtro de agua",
      "NombreCorto": "Filtro",
      "Codigo": "FLT-001",
      "CostoPromedio": 150.00
    },
    "TecnicoNombre": "Juan Pérez García",
    "UsuarioSolicitaNombre": "Admin Sistema",
    "UsuarioAutorizaNombre": null
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | Bad Request (TecnicoID: TecnicoID es requerido) | Campo faltante en validación Zod |
| 400 | Bad Request (StockRealNuevo: No puede ser negativo) | Valor negativo |
| 404 | Técnico no encontrado | TecnicoID inválido |
| 404 | Refacción no encontrada | RefaccionID inválido |
| 404 | Usuario no encontrado | UsuarioSolicitaID inválido |
| 300 | No hay diferencia entre el stock del sistema y el stock real | No se requiere ajuste |

**Ejemplo de Error:**
```json
{
  "status": 300,
  "message": "No hay diferencia entre el stock del sistema y el stock real",
  "error": true,
  "data": []
}
```

---

### 2. Listar Todos los Ajustes

**Endpoint:** `GET /ajustes-inventario`

**Descripción:** Obtiene todos los ajustes de inventario activos. Permite filtrar por estatus.

**Headers:**
```
Authorization: Bearer {token}
```

**Query Params:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `estatus` | string | No | Filtrar por: `Pendiente`, `Autorizado`, `Rechazado` |

**Ejemplos de Request:**
```
GET /ajustes-inventario
GET /ajustes-inventario?estatus=Pendiente
GET /ajustes-inventario?estatus=Autorizado
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Ajustes obtenidos",
  "error": false,
  "data": [
    {
      "AjusteID": 15,
      "TecnicoID": 1,
      "RefaccionID": 25,
      "StockSistemaNuevo": 5,
      "StockSistemaUsado": 2,
      "StockRealNuevo": 3,
      "StockRealUsado": 1,
      "DiferenciaNuevo": -2,
      "DiferenciaUsado": -1,
      "MotivoAjuste": "Perdida",
      "Observaciones": "No se encontraron 2 piezas",
      "UsuarioSolicitaID": 5,
      "UsuarioAutorizaID": null,
      "FechaSolicitud": "2026-01-15T10:30:00.000Z",
      "FechaAutorizacion": null,
      "Estatus": "Pendiente",
      "IsActive": 1,
      "refaccion": {
        "RefaccionID": 25,
        "NombrePieza": "Filtro de agua",
        "Codigo": "FLT-001"
      },
      "TecnicoNombre": "Juan Pérez García",
      "UsuarioSolicitaNombre": "Admin Sistema",
      "UsuarioAutorizaNombre": null
    }
  ]
}
```

---

### 3. Listar Ajustes Pendientes

**Endpoint:** `GET /ajustes-inventario/pendientes`

**Descripción:** Obtiene solo los ajustes que están pendientes de autorización. Equivalente a `GET /ajustes-inventario?estatus=Pendiente`.

**Headers:**
```
Authorization: Bearer {token}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Ajustes obtenidos",
  "error": false,
  "data": [
    {
      "AjusteID": 15,
      "TecnicoID": 1,
      "RefaccionID": 25,
      "StockSistemaNuevo": 5,
      "StockSistemaUsado": 2,
      "StockRealNuevo": 3,
      "StockRealUsado": 1,
      "DiferenciaNuevo": -2,
      "DiferenciaUsado": -1,
      "MotivoAjuste": "Perdida",
      "Estatus": "Pendiente",
      "refaccion": {
        "RefaccionID": 25,
        "NombrePieza": "Filtro de agua",
        "Codigo": "FLT-001"
      },
      "TecnicoNombre": "Juan Pérez García",
      "UsuarioSolicitaNombre": "Admin Sistema",
      "UsuarioAutorizaNombre": null
    }
  ]
}
```

---

### 4. Obtener Reporte de Ajustes (Análisis de Pérdidas)

**Endpoint:** `GET /ajustes-inventario/reporte`

**Descripción:** Genera un reporte de ajustes **autorizados** con análisis de pérdidas estimadas. Las piezas nuevas se valoran al 100% del costo promedio, las usadas al 50%.

**Headers:**
```
Authorization: Bearer {token}
```

**Query Params:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `fechaInicio` | string | No | Fecha inicio (YYYY-MM-DD) |
| `fechaFin` | string | No | Fecha fin (YYYY-MM-DD) |
| `tecnicoId` | number | No | Filtrar por técnico específico |
| `motivo` | string | No | Filtrar por motivo (enum) |

**Ejemplos de Request:**
```
GET /ajustes-inventario/reporte
GET /ajustes-inventario/reporte?fechaInicio=2026-01-01&fechaFin=2026-01-31
GET /ajustes-inventario/reporte?tecnicoId=1&motivo=Perdida
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Reporte de ajustes obtenido",
  "error": false,
  "data": {
    "resumen": {
      "totalAjustes": 5,
      "totalDiferenciaNuevo": -10,
      "totalDiferenciaUsado": -3,
      "perdidaEstimada": 1875.00
    },
    "ajustes": [
      {
        "AjusteID": 15,
        "TecnicoID": 1,
        "RefaccionID": 25,
        "StockSistemaNuevo": 5,
        "StockSistemaUsado": 2,
        "StockRealNuevo": 3,
        "StockRealUsado": 1,
        "DiferenciaNuevo": -2,
        "DiferenciaUsado": -1,
        "MotivoAjuste": "Perdida",
        "FechaAutorizacion": "2026-01-15T15:00:00.000Z",
        "refaccion": {
          "NombrePieza": "Filtro de agua",
          "Codigo": "FLT-001",
          "CostoPromedio": 150.00
        },
        "PerdidaEstimada": 375.00
      }
    ]
  }
}
```

**Cálculo de Pérdida Estimada:**
```
PerdidaEstimada = (|DiferenciaNuevo negativa| × CostoPromedio) +
                 (|DiferenciaUsado negativa| × CostoPromedio × 0.5)
```

---

### 5. Obtener Ajustes de un Técnico

**Endpoint:** `GET /ajustes-inventario/tecnico/:TecnicoID`

**Descripción:** Obtiene todos los ajustes de inventario de un técnico específico.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `TecnicoID` | number | Sí | ID del técnico |

**Ejemplo de Request:**
```
GET /ajustes-inventario/tecnico/1
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Ajustes del técnico obtenidos",
  "error": false,
  "data": [
    {
      "AjusteID": 15,
      "TecnicoID": 1,
      "RefaccionID": 25,
      "StockSistemaNuevo": 5,
      "StockSistemaUsado": 2,
      "StockRealNuevo": 3,
      "StockRealUsado": 1,
      "DiferenciaNuevo": -2,
      "DiferenciaUsado": -1,
      "MotivoAjuste": "Perdida",
      "Observaciones": "No se encontraron 2 piezas",
      "UsuarioSolicitaID": 5,
      "UsuarioAutorizaID": 1,
      "FechaSolicitud": "2026-01-15T10:30:00.000Z",
      "FechaAutorizacion": "2026-01-15T15:00:00.000Z",
      "Estatus": "Autorizado",
      "IsActive": 1,
      "refaccion": {
        "NombrePieza": "Filtro de agua",
        "Codigo": "FLT-001"
      }
    }
  ]
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | Bad Request (TecnicoID: TecnicoID debe ser un número válido) | Parámetro no numérico |
| 404 | Técnico no encontrado | TecnicoID inválido |

---

### 6. Obtener Detalle de un Ajuste

**Endpoint:** `GET /ajustes-inventario/:AjusteID`

**Descripción:** Obtiene el detalle completo de un ajuste específico con toda la información enriquecida.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `AjusteID` | number | Sí | ID del ajuste |

**Ejemplo de Request:**
```
GET /ajustes-inventario/15
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Ajuste obtenido",
  "error": false,
  "data": {
    "AjusteID": 15,
    "TecnicoID": 1,
    "RefaccionID": 25,
    "StockSistemaNuevo": 5,
    "StockSistemaUsado": 2,
    "StockRealNuevo": 3,
    "StockRealUsado": 1,
    "DiferenciaNuevo": -2,
    "DiferenciaUsado": -1,
    "MotivoAjuste": "Perdida",
    "Observaciones": "No se encontraron 2 piezas",
    "UsuarioSolicitaID": 5,
    "UsuarioAutorizaID": null,
    "FechaSolicitud": "2026-01-15T10:30:00.000Z",
    "FechaAutorizacion": null,
    "Estatus": "Pendiente",
    "IsActive": 1,
    "refaccion": {
      "RefaccionID": 25,
      "NombrePieza": "Filtro de agua",
      "NombreCorto": "Filtro",
      "Codigo": "FLT-001",
      "CostoPromedio": 150.00
    },
    "TecnicoNombre": "Juan Pérez García",
    "UsuarioSolicitaNombre": "Admin Sistema",
    "UsuarioAutorizaNombre": null
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | Bad Request (AjusteID: ID debe ser un número válido) | Parámetro no numérico |
| 404 | Ajuste no encontrado | AjusteID inválido |

---

### 7. Autorizar o Rechazar Ajuste

**Endpoint:** `POST /ajustes-inventario/:AjusteID/autorizar`

**Descripción:** Autoriza o rechaza un ajuste pendiente. Si se autoriza, el inventario del técnico se actualiza automáticamente con los valores reales y se registra el movimiento en el kardex.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `AjusteID` | number | Sí | ID del ajuste |

**Payload:**

| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `UsuarioAutorizaID` | number | Sí | - | ID del usuario que autoriza/rechaza |
| `Autorizado` | boolean | Sí | - | `true` para autorizar, `false` para rechazar |
| `Observaciones` | string | No | max: 255 | Observaciones del autorizador |

**Ejemplo de Request (Autorizar):**
```json
{
  "UsuarioAutorizaID": 1,
  "Autorizado": true,
  "Observaciones": "Verificado en campo, se autoriza el ajuste"
}
```

**Ejemplo de Request (Rechazar):**
```json
{
  "UsuarioAutorizaID": 1,
  "Autorizado": false,
  "Observaciones": "Requiere más evidencia antes de aprobar"
}
```

**Response Exitoso - Autorizado (200):**
```json
{
  "status": 200,
  "message": "Ajuste autorizado y aplicado",
  "error": false,
  "data": {
    "data": {
      "AjusteID": 15,
      "TecnicoID": 1,
      "RefaccionID": 25,
      "StockSistemaNuevo": 5,
      "StockSistemaUsado": 2,
      "StockRealNuevo": 3,
      "StockRealUsado": 1,
      "DiferenciaNuevo": -2,
      "DiferenciaUsado": -1,
      "MotivoAjuste": "Perdida",
      "Observaciones": "No se encontraron 2 piezas | Auth: Verificado en campo, se autoriza el ajuste",
      "UsuarioSolicitaID": 5,
      "UsuarioAutorizaID": 1,
      "FechaSolicitud": "2026-01-15T10:30:00.000Z",
      "FechaAutorizacion": "2026-01-15T15:00:00.000Z",
      "Estatus": "Autorizado",
      "IsActive": 1,
      "TecnicoNombre": "Juan Pérez García",
      "UsuarioSolicitaNombre": "Admin Sistema",
      "UsuarioAutorizaNombre": "Supervisor General"
    }
  }
}
```

**Response Exitoso - Rechazado (200):**
```json
{
  "status": 200,
  "message": "Ajuste rechazado",
  "error": false,
  "data": {
    "data": {
      "AjusteID": 15,
      "Estatus": "Rechazado",
      "UsuarioAutorizaID": 1,
      "FechaAutorizacion": "2026-01-15T15:00:00.000Z",
      "Observaciones": "No se encontraron 2 piezas | Rechazo: Requiere más evidencia"
    }
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | Bad Request (Autorizado: Debe indicar si autoriza o rechaza) | Campo faltante |
| 404 | Ajuste no encontrado | AjusteID inválido |
| 404 | Usuario autorizante no encontrado | UsuarioAutorizaID inválido |
| 300 | El ajuste ya fue autorizado | Ajuste ya procesado |
| 300 | El ajuste ya fue rechazado | Ajuste ya procesado |

**Acciones al Autorizar:**
1. Actualiza `inventario_tecnico` con los valores reales (StockRealNuevo, StockRealUsado)
2. Crea registro en `kardex_inventario` con TipoMovimiento = 'Traspaso_Tecnico'
3. Actualiza el estatus del ajuste a 'Autorizado'

---

### 8. Cancelar Solicitud de Ajuste

**Endpoint:** `DELETE /ajustes-inventario/:AjusteID/cancelar`

**Descripción:** Cancela una solicitud de ajuste que está pendiente. Solo se pueden cancelar ajustes en estado 'Pendiente'. Es un soft delete (marca IsActive = 0).

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `AjusteID` | number | Sí | ID del ajuste a cancelar |

**Ejemplo de Request:**
```
DELETE /ajustes-inventario/15/cancelar
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Ajuste cancelado",
  "error": false,
  "data": {
    "AjusteID": 15
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | Bad Request (AjusteID: ID debe ser un número válido) | Parámetro no numérico |
| 404 | Ajuste no encontrado | AjusteID inválido |
| 300 | Solo se pueden cancelar ajustes pendientes | Ajuste ya autorizado/rechazado |

---

## Resumen de Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/ajustes-inventario` | Crear solicitud de ajuste |
| GET | `/ajustes-inventario` | Listar todos los ajustes (con filtro opcional) |
| GET | `/ajustes-inventario/pendientes` | Listar ajustes pendientes |
| GET | `/ajustes-inventario/reporte` | Reporte de ajustes (análisis de pérdidas) |
| GET | `/ajustes-inventario/tecnico/:TecnicoID` | Ajustes de un técnico específico |
| GET | `/ajustes-inventario/:AjusteID` | Detalle de un ajuste |
| POST | `/ajustes-inventario/:AjusteID/autorizar` | Autorizar o rechazar ajuste |
| DELETE | `/ajustes-inventario/:AjusteID/cancelar` | Cancelar ajuste pendiente |

---

## Modelo de Datos

### ajustes_inventario

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| AjusteID | Int | No | Clave primaria (autoincrement) |
| TecnicoID | Int | No | FK a catalogo_tecnicos |
| RefaccionID | Int | No | FK a catalogo_refacciones |
| StockSistemaNuevo | Int | No | Stock del sistema al momento (nuevo) |
| StockSistemaUsado | Int | No | Stock del sistema al momento (usado) |
| StockRealNuevo | Int | No | Conteo físico reportado (nuevo) |
| StockRealUsado | Int | No | Conteo físico reportado (usado) |
| DiferenciaNuevo | Int | No | StockReal - StockSistema (nuevo) |
| DiferenciaUsado | Int | No | StockReal - StockSistema (usado) |
| MotivoAjuste | Enum | No | Perdida, Error_Captura, Robo, Deterioro, Sobrante, Otro |
| Observaciones | String(255) | Sí | Notas adicionales |
| UsuarioSolicitaID | Int | No | FK a usuarios (quien solicita) |
| UsuarioAutorizaID | Int | Sí | FK a usuarios (quien autoriza) |
| FechaSolicitud | DateTime | No | Fecha de creación |
| FechaAutorizacion | DateTime | Sí | Fecha de autorización/rechazo |
| Estatus | Enum | No | Pendiente, Autorizado, Rechazado |
| IsActive | TinyInt | Sí | 1=Activo, 0=Cancelado |

---

## Notas Importantes

1. **Cálculo Automático de Diferencias:** El sistema obtiene el stock actual del inventario del técnico y calcula:
   - `DiferenciaNuevo = StockRealNuevo - StockSistemaNuevo`
   - `DiferenciaUsado = StockRealUsado - StockSistemaUsado`

2. **Diferencias Negativas = Faltantes:** Una diferencia negativa indica que hay menos piezas de las registradas.

3. **Diferencias Positivas = Sobrantes:** Una diferencia positiva indica que hay más piezas de las registradas.

4. **Kardex:** Al autorizar, se registra en kardex con tipo `Traspaso_Tecnico` y las observaciones incluyen el número de ajuste y el motivo.

5. **Soft Delete:** Cancelar un ajuste marca `IsActive = 0`, no elimina físicamente el registro.

6. **Concatenación de Observaciones:** Las observaciones del autorizador se concatenan a las originales separadas por `|`.

---

**Última actualización:** 2026-01-15
