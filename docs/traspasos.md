# API de Traspasos - Purifreeze Backend

## Información General

**Base URL:** `http://localhost:3000`

**Prefijo de ruta:** `/traspasos`

**Autenticación:** Bearer Token (JWT)

---

## Flujo de Traspasos

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUJO DE TRASPASOS                       │
├─────────────────────────────────────────────────────────────┤
│  1. Usuario crea solicitud → Estatus: Pendiente             │
│  2. Admin revisa solicitud                                  │
│  3. Admin autoriza o rechaza:                               │
│     - Autorizado → Mueve stock automáticamente              │
│     - Rechazado → Solo cambia estatus                       │
│  4. Se registra en kardex_inventario                        │
└─────────────────────────────────────────────────────────────┘
```

## Tipos de Traspaso

| Tipo | Origen | Destino | Descripción |
|------|--------|---------|-------------|
| `Bodega_Tecnico` | Bodega | Técnico | Asignar refacciones de bodega a un técnico |
| `Tecnico_Bodega` | Técnico | Bodega | Devolver refacciones de técnico a bodega |
| `Tecnico_Tecnico` | Técnico | Técnico | Intercambio entre técnicos |

---

## Endpoints

### 1. Crear Solicitud de Traspaso

**Endpoint:** `POST /traspasos`

**Descripción:** Crea una solicitud de traspaso que quedará pendiente de autorización.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Payload:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `TipoTraspaso` | enum | Sí | Bodega_Tecnico, Tecnico_Bodega, Tecnico_Tecnico |
| `OrigenTipo` | enum | Sí | Bodega o Tecnico |
| `OrigenID` | number | Condicional | TecnicoID si OrigenTipo es Tecnico, null si es Bodega |
| `DestinoTipo` | enum | Sí | Bodega o Tecnico |
| `DestinoID` | number | Condicional | TecnicoID si DestinoTipo es Tecnico, null si es Bodega |
| `UsuarioSolicitaID` | number | Sí | ID del usuario que solicita |
| `Observaciones` | string | No | Notas (máx 255) |
| `Detalle` | array | Sí | Refacciones a traspasar (mínimo 1) |

**Detalle (cada item):**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `RefaccionID` | number | Sí | ID de la refacción |
| `CantidadNuevo` | number | No | Piezas nuevas a traspasar (default: 0) |
| `CantidadUsado` | number | No | Piezas usadas a traspasar (default: 0) |

**Ejemplo - Bodega a Técnico:**
```json
{
  "TipoTraspaso": "Bodega_Tecnico",
  "OrigenTipo": "Bodega",
  "OrigenID": null,
  "DestinoTipo": "Tecnico",
  "DestinoID": 1,
  "UsuarioSolicitaID": 5,
  "Observaciones": "Dotación inicial para técnico nuevo",
  "Detalle": [
    { "RefaccionID": 15, "CantidadNuevo": 5, "CantidadUsado": 0 },
    { "RefaccionID": 20, "CantidadNuevo": 3, "CantidadUsado": 2 }
  ]
}
```

**Ejemplo - Técnico a Técnico:**
```json
{
  "TipoTraspaso": "Tecnico_Tecnico",
  "OrigenTipo": "Tecnico",
  "OrigenID": 1,
  "DestinoTipo": "Tecnico",
  "DestinoID": 2,
  "UsuarioSolicitaID": 5,
  "Observaciones": "Préstamo de refacciones",
  "Detalle": [
    { "RefaccionID": 15, "CantidadNuevo": 2, "CantidadUsado": 1 }
  ]
}
```

**Response Exitoso (201):**
```json
{
  "status": 201,
  "message": "Solicitud de traspaso creada",
  "error": false,
  "data": {
    "TraspasoEncabezadoID": 1,
    "TipoTraspaso": "Bodega_Tecnico",
    "OrigenTipo": "Bodega",
    "OrigenID": null,
    "DestinoTipo": "Tecnico",
    "DestinoID": 1,
    "UsuarioSolicitaID": 5,
    "FechaSolicitud": "2024-01-15",
    "Estatus": "Pendiente",
    "OrigenNombre": "Bodega",
    "DestinoNombre": "Juan Pérez",
    "traspasos_detalle": [...]
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 300 | Para traspaso X, el origen debe ser Y | Tipo inconsistente |
| 300 | Debe especificar el técnico destino/origen | Falta ID de técnico |
| 300 | El técnico origen y destino no pueden ser el mismo | Mismo técnico |
| 300 | Stock insuficiente de piezas nuevas/usadas | No hay stock |
| 404 | Técnico no encontrado | ID inválido |
| 404 | Refacción X no encontrada | ID inválido |

---

### 2. Obtener Todos los Traspasos

**Endpoint:** `GET /traspasos`

**Descripción:** Lista todos los traspasos con filtros opcionales.

**Headers:**
```
Authorization: Bearer {token}
```

**Query Params:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `estatus` | enum | No | Pendiente, Autorizado, Rechazado |
| `tipo` | enum | No | Bodega_Tecnico, Tecnico_Bodega, Tecnico_Tecnico |

**Ejemplo:** `GET /traspasos?estatus=Pendiente&tipo=Bodega_Tecnico`

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Traspasos obtenidos",
  "error": false,
  "data": [
    {
      "TraspasoEncabezadoID": 1,
      "TipoTraspaso": "Bodega_Tecnico",
      "Estatus": "Pendiente",
      "FechaSolicitud": "2024-01-15",
      "OrigenNombre": "Bodega",
      "DestinoNombre": "Juan Pérez",
      "traspasos_detalle": [...]
    }
  ]
}
```

---

### 3. Obtener Traspasos Pendientes

**Endpoint:** `GET /traspasos/pendientes`

**Descripción:** Lista solo los traspasos pendientes de autorización.

**Headers:**
```
Authorization: Bearer {token}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Traspasos obtenidos",
  "error": false,
  "data": [...]
}
```

---

### 4. Obtener Traspasos de un Técnico

**Endpoint:** `GET /traspasos/tecnico/:TecnicoID`

**Descripción:** Lista todos los traspasos donde el técnico es origen o destino.

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
  "message": "Traspasos del técnico obtenidos",
  "error": false,
  "data": [...]
}
```

---

### 5. Obtener Detalle de un Traspaso

**Endpoint:** `GET /traspasos/:TraspasoEncabezadoID`

**Descripción:** Obtiene el detalle completo de un traspaso.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `TraspasoEncabezadoID` | number | Sí | ID del traspaso |

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Traspaso obtenido",
  "error": false,
  "data": {
    "TraspasoEncabezadoID": 1,
    "TipoTraspaso": "Bodega_Tecnico",
    "OrigenTipo": "Bodega",
    "OrigenID": null,
    "DestinoTipo": "Tecnico",
    "DestinoID": 1,
    "UsuarioSolicitaID": 5,
    "UsuarioAutorizaID": null,
    "FechaSolicitud": "2024-01-15",
    "FechaAutorizacion": null,
    "Estatus": "Pendiente",
    "Observaciones": "Dotación inicial",
    "OrigenNombre": "Bodega",
    "DestinoNombre": "Juan Pérez",
    "UsuarioSolicitaNombre": "Admin",
    "UsuarioAutorizaNombre": null,
    "traspasos_detalle": [
      {
        "TraspasoDetalleID": 1,
        "RefaccionID": 15,
        "CantidadNuevo": 5,
        "CantidadUsado": 0,
        "refaccion": {
          "RefaccionID": 15,
          "NombrePieza": "Compresor 1HP",
          "Codigo": "COMP-001",
          "CostoPromedio": 1500.00
        }
      }
    ]
  }
}
```

---

### 6. Autorizar o Rechazar Traspaso

**Endpoint:** `POST /traspasos/:TraspasoEncabezadoID/autorizar`

**Descripción:** Autoriza o rechaza un traspaso pendiente. Si se autoriza, mueve el stock automáticamente.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `TraspasoEncabezadoID` | number | Sí | ID del traspaso |

**Payload:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `UsuarioAutorizaID` | number | Sí | ID del usuario que autoriza |
| `Autorizado` | boolean | Sí | true = autorizar, false = rechazar |
| `Observaciones` | string | No | Comentarios de autorización |

**Ejemplo - Autorizar:**
```json
{
  "UsuarioAutorizaID": 1,
  "Autorizado": true,
  "Observaciones": "Aprobado"
}
```

**Ejemplo - Rechazar:**
```json
{
  "UsuarioAutorizaID": 1,
  "Autorizado": false,
  "Observaciones": "No hay suficiente stock en bodega"
}
```

**Response Exitoso (200) - Autorizado:**
```json
{
  "status": 200,
  "message": "Traspaso autorizado y ejecutado",
  "error": false,
  "data": {
    "TraspasoEncabezadoID": 1,
    "Estatus": "Autorizado",
    "FechaAutorizacion": "2024-01-15"
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 300 | El traspaso ya fue autorizado/rechazado | No está pendiente |
| 300 | Stock insuficiente para refacción X | Cambió el stock |
| 404 | Traspaso no encontrado | ID inválido |
| 404 | Usuario autorizante no encontrado | ID inválido |

---

### 7. Cancelar Solicitud

**Endpoint:** `DELETE /traspasos/:TraspasoEncabezadoID/cancelar`

**Descripción:** Cancela una solicitud de traspaso pendiente.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `TraspasoEncabezadoID` | number | Sí | ID del traspaso |

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Traspaso cancelado",
  "error": false,
  "data": {
    "TraspasoEncabezadoID": 1
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 300 | Solo se pueden cancelar traspasos pendientes | Ya procesado |
| 404 | Traspaso no encontrado | ID inválido |

---

## Modelo de Datos

### traspasos_encabezado

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| TraspasoEncabezadoID | Int | No | Clave primaria |
| TipoTraspaso | Enum | No | Tipo de traspaso |
| OrigenTipo | Enum | No | Bodega o Tecnico |
| OrigenID | Int | Sí | ID del técnico origen (null si Bodega) |
| DestinoTipo | Enum | No | Bodega o Tecnico |
| DestinoID | Int | Sí | ID del técnico destino (null si Bodega) |
| UsuarioSolicitaID | Int | No | Quien solicita |
| UsuarioAutorizaID | Int | Sí | Quien autoriza/rechaza |
| FechaSolicitud | Date | No | Fecha de creación |
| FechaAutorizacion | Date | Sí | Fecha de resolución |
| Estatus | Enum | No | Pendiente, Autorizado, Rechazado |
| Observaciones | String(255) | Sí | Notas |
| IsActive | TinyInt | Sí | 1=activo, 0=cancelado |

### traspasos_detalle

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| TraspasoDetalleID | Int | No | Clave primaria |
| TraspasoEncabezadoID | Int | No | FK al encabezado |
| RefaccionID | Int | No | FK a refacción |
| CantidadNuevo | Int | No | Piezas nuevas (default: 0) |
| CantidadUsado | Int | No | Piezas usadas (default: 0) |
| IsActive | TinyInt | Sí | Estado del registro |

## Notas Importantes

- **Autorización requerida:** Todos los traspasos requieren autorización antes de ejecutarse
- **Validación de stock:** Se valida stock al crear y al autorizar
- **Kardex:** Al autorizar, se registra el movimiento en kardex_inventario
- **Cancelación:** Solo traspasos pendientes pueden cancelarse
- **Stock separado:** Se manejan piezas nuevas y usadas por separado

---

**Última actualización:** 2024-12-02
