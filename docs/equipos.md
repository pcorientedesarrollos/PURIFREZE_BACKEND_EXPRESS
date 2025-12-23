# API de Equipos - Purifreeze Backend

## Información General

**Base URL:** `http://localhost:3000`

**Prefijo de ruta:** `/equipos`

**Autenticación:** Bearer Token (JWT)

---

## Conceptos Importantes

### Tipos de Equipos

| Tipo | EsExterno | Descripción |
|------|-----------|-------------|
| **Purifreeze** | 0 | Equipos internos que afectan inventario |
| **Externo** | 1 | Equipos de terceros, no afectan inventario |

### Estados del Equipo (Flujo de Vida)

```
                    EQUIPOS PURIFREEZE (Internos)

   [Armado] ──────────────────► [Instalado] ──────────────► [Desmontado]
       ▲                              │                           │
       │                              │                           │ (piezas individuales)
       │                              ▼                           │
       │                       [Reacondicionado] ◄────────────────┘
       │                              │ (equipo completo)
       │                              │
       └──────────────────────────────┘
        (finalizar reacondicionamiento)
```

| Estado | Descripción | Operaciones Permitidas |
|--------|-------------|------------------------|
| **Armado** | Equipo nuevo, listo para instalar | Agregar/quitar/modificar refacciones, Instalar |
| **Instalado** | Equipo en uso con un cliente | Solo desmontar (desde servicios) |
| **Reacondicionado** | Equipo retirado en proceso de reparación | Agregar/quitar/modificar refacciones, Finalizar reacondicionamiento |
| **Desmontado** | Equipo desarmado (piezas individuales al inventario) | Sin operaciones |

### Movimientos de Kardex

| Tipo de Movimiento | Descripción |
|--------------------|-------------|
| `Traspaso_Bodega_Equipo` | Salida de bodega al armar equipo |
| `Traspaso_Equipo` | Retorno de equipo a bodega |
| `Reacondicionamiento_Entrada` | Entrada a equipo durante reacondicionamiento |
| `Reacondicionamiento_Salida` | Salida de equipo durante reacondicionamiento |

### Número de Serie

Se genera automáticamente con el formato: `PREFIJO-AÑO-CONSECUTIVO`

**Ejemplos:**
- Plantilla "Purificador Básico" → `PUR-24-0001`, `PUR-24-0002`
- Plantilla "Frigorífico Industrial" → `FI-24-0001`

El prefijo se genera desde el nombre de la plantilla:
- Una palabra: primeras 3 letras
- Múltiples palabras: inicial de cada palabra (máx. 4)

---

## Endpoints

### 1. Crear Equipos desde Plantilla

**Endpoint:** `POST /equipos`

**Descripción:** Crea uno o más equipos basados en una plantilla existente. Para equipos Purifreeze, valida y descuenta el inventario necesario.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Payload:**

| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `PlantillaEquipoID` | number | Sí | - | ID de la plantilla base |
| `Cantidad` | number | No | min: 1, max: 50 | Cantidad de equipos a crear (default: 1) |

**Ejemplo de Request:**
```json
{
  "PlantillaEquipoID": 1,
  "Cantidad": 3
}
```

**Response Exitoso (201):**
```json
{
  "status": 201,
  "message": "3 equipo(s) creado(s) correctamente",
  "error": false,
  "data": [
    {
      "EquipoID": 1,
      "NumeroSerie": "PUR-24-0001",
      "EsExterno": false,
      "Estatus": "Armado",
      "Observaciones": null,
      "FechaCreacion": "2024-12-23",
      "FechaInstalacion": null,
      "FechaDesmontaje": null,
      "FechaReacondicionamiento": null,
      "VecesReacondicionado": 0,
      "Plantilla": {
        "PlantillaEquipoID": 1,
        "NombreEquipo": "Purificador Básico",
        "Codigo": "PUR-001"
      },
      "TotalRefacciones": 5,
      "CostoTotal": 1500.00,
      "PrecioVenta": 2025.00,
      "PrecioRenta": 225.00
    }
  ]
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | Bad Request | Validación Zod fallida |
| 400 | Stock insuficiente para "X". Disponible: Y, Requerido: Z | No hay suficiente inventario |
| 404 | Plantilla no encontrada | PlantillaEquipoID no existe o inactiva |

---

### 2. Listar Equipos

**Endpoint:** `GET /equipos`

**Descripción:** Obtiene todos los equipos activos con filtros opcionales.

**Headers:**
```
Authorization: Bearer {token}
```

**Query Params:**

| Parámetro | Tipo | Requerido | Descripción | Valores |
|-----------|------|-----------|-------------|---------|
| `q` | string | No | Buscar por número de serie, observaciones o nombre de plantilla | - |
| `estatus` | string | No | Filtrar por estado | todos, Armado, Instalado, Reacondicionado, Desmontado |
| `tipo` | string | No | Filtrar por tipo de equipo | todos, interno, externo |
| `plantillaId` | number | No | Filtrar por ID de plantilla | - |

**Ejemplo de Request:**
```
GET /equipos?estatus=Armado&tipo=interno
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Equipos encontrados",
  "error": false,
  "data": [
    {
      "EquipoID": 1,
      "NumeroSerie": "PUR-24-0001",
      "EsExterno": false,
      "Estatus": "Armado",
      "Observaciones": null,
      "FechaCreacion": "2024-12-23",
      "FechaInstalacion": null,
      "FechaDesmontaje": null,
      "FechaReacondicionamiento": null,
      "VecesReacondicionado": 0,
      "Plantilla": {
        "PlantillaEquipoID": 1,
        "NombreEquipo": "Purificador Básico",
        "Codigo": "PUR-001"
      },
      "TotalRefacciones": 5,
      "CostoTotal": 1500.00,
      "PrecioVenta": 2025.00,
      "PrecioRenta": 225.00
    }
  ]
}
```

---

### 3. Obtener Equipo por ID

**Endpoint:** `GET /equipos/:EquipoID`

**Descripción:** Obtiene un equipo específico con todos sus detalles incluyendo refacciones.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `EquipoID` | number | Sí | ID del equipo |

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Equipo encontrado",
  "error": false,
  "data": {
    "EquipoID": 1,
    "NumeroSerie": "PUR-24-0001",
    "EsExterno": false,
    "Estatus": "Armado",
    "Observaciones": null,
    "FechaCreacion": "2024-12-23",
    "FechaInstalacion": null,
    "FechaDesmontaje": null,
    "FechaReacondicionamiento": null,
    "VecesReacondicionado": 0,
    "UsuarioCreadorID": 1,
    "Plantilla": {
      "PlantillaEquipoID": 1,
      "NombreEquipo": "Purificador Básico",
      "Codigo": "PUR-001",
      "PorcentajeVenta": 35,
      "PorcentajeRenta": 15
    },
    "CostoTotal": 1500.00,
    "PrecioVenta": 2025.00,
    "PrecioRenta": 225.00,
    "Detalles": [
      {
        "EquipoDetalleID": 1,
        "RefaccionID": 10,
        "Cantidad": 2,
        "Refaccion": {
          "NombrePieza": "Filtro de carbón activado",
          "NombreCorto": "Filtro CA",
          "Codigo": "FLT-001",
          "CostoPromedio": 250.00,
          "Unidad": "Pieza"
        },
        "Subtotal": 500.00
      }
    ]
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | Equipo no encontrado | EquipoID no existe o está inactivo |

---

### 4. Actualizar Observaciones del Equipo

**Endpoint:** `PUT /equipos/:EquipoID`

**Descripción:** Actualiza las observaciones de un equipo. Solo permitido en estados **Armado** o **Reacondicionado**.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `EquipoID` | number | Sí | ID del equipo |

**Payload:**

| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `Observaciones` | string | No | max: 500 | Observaciones del equipo |

**Ejemplo de Request:**
```json
{
  "Observaciones": "Equipo revisado y listo para uso"
}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Equipo actualizado correctamente",
  "error": false,
  "data": { ... }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | Esta operación solo está permitida para equipos en estado: Armado, Reacondicionado | Estado no permitido |
| 404 | Equipo no encontrado | EquipoID no existe |

---

### 5. Buscar Refacciones con Stock

**Endpoint:** `GET /equipos/refacciones`

**Descripción:** Busca refacciones disponibles mostrando el stock del inventario general. Útil para agregar refacciones a equipos.

**Headers:**
```
Authorization: Bearer {token}
```

**Query Params:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `q` | string | No | Buscar por nombre, código o nombre corto |

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Refacciones encontradas",
  "error": false,
  "data": [
    {
      "RefaccionID": 10,
      "NombrePieza": "Filtro de carbón activado",
      "NombreCorto": "Filtro CA",
      "Codigo": "FLT-001",
      "CostoPromedio": 250.00,
      "Unidad": "Pieza",
      "StockDisponible": 50
    }
  ]
}
```

---

### 6. Agregar Refacción a Equipo

**Endpoint:** `POST /equipos/:EquipoID/refacciones`

**Descripción:** Agrega una nueva refacción al equipo. Solo permitido en estados **Armado** o **Reacondicionado**. Para equipos Purifreeze, descuenta del inventario.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `EquipoID` | number | Sí | ID del equipo |

**Payload:**

| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `RefaccionID` | number | Sí | - | ID de la refacción |
| `Cantidad` | number | Sí | min: 1 | Cantidad a agregar |

**Ejemplo de Request:**
```json
{
  "RefaccionID": 10,
  "Cantidad": 2
}
```

**Response Exitoso (201):**
```json
{
  "status": 201,
  "message": "Refacción agregada correctamente",
  "error": false,
  "data": { ... }
}
```

**Comportamiento de Kardex:**
- **Estado Armado**: Registra movimiento `Traspaso_Bodega_Equipo`
- **Estado Reacondicionado**: Registra movimiento `Reacondicionamiento_Entrada`

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | Esta refacción ya existe en el equipo | Refacción duplicada |
| 400 | Stock insuficiente para "X" | No hay inventario suficiente |
| 400 | Esta operación solo está permitida para equipos en estado: Armado, Reacondicionado | Estado no permitido |
| 404 | Equipo no encontrado | EquipoID no existe |
| 404 | Refacción no encontrada | RefaccionID no existe |

---

### 7. Modificar Cantidad de Refacción

**Endpoint:** `PATCH /equipos/:EquipoID/refacciones/:EquipoDetalleID/cantidad`

**Descripción:** Modifica la cantidad de una refacción en el equipo. Solo permitido en estados **Armado** o **Reacondicionado**. Ajusta el inventario automáticamente.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `EquipoID` | number | Sí | ID del equipo |
| `EquipoDetalleID` | number | Sí | ID del detalle a modificar |

**Payload:**

| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `Cantidad` | number | Sí | min: 1 | Nueva cantidad |

**Ejemplo de Request:**
```json
{
  "Cantidad": 5
}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Cantidad actualizada correctamente",
  "error": false,
  "data": { ... }
}
```

**Comportamiento de Kardex:**
- Si **aumenta** cantidad:
  - Estado Armado: `Traspaso_Bodega_Equipo` (salida de bodega)
  - Estado Reacondicionado: `Reacondicionamiento_Entrada`
- Si **disminuye** cantidad:
  - Estado Armado: `Traspaso_Equipo` (entrada a bodega)
  - Estado Reacondicionado: `Reacondicionamiento_Salida`

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | Stock insuficiente | Si aumenta cantidad y no hay inventario |
| 404 | Detalle de equipo no encontrado | EquipoDetalleID no existe |

---

### 8. Eliminar Refacción de Equipo

**Endpoint:** `DELETE /equipos/:EquipoID/refacciones/:EquipoDetalleID`

**Descripción:** Elimina una refacción del equipo. Solo permitido en estados **Armado** o **Reacondicionado**. Debe especificar el destino de las piezas.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `EquipoID` | number | Sí | ID del equipo |
| `EquipoDetalleID` | number | Sí | ID del detalle a eliminar |

**Payload:**

| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `Destino` | string | Sí | enum: inventario, danada | Destino de las piezas |
| `MotivoDano` | string | Condicional | enum: Defecto_Fabrica, Mal_Uso, Desgaste_Normal, Accidente, Otro | Requerido si destino es "danada" |
| `Observaciones` | string | No | max: 255 | Observaciones adicionales |

**Ejemplo de Request (retorno a inventario):**
```json
{
  "Destino": "inventario"
}
```

**Ejemplo de Request (pieza dañada):**
```json
{
  "Destino": "danada",
  "MotivoDano": "Desgaste_Normal",
  "Observaciones": "Filtro con perforaciones"
}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Refacción eliminada correctamente",
  "error": false,
  "data": { ... }
}
```

**Comportamiento de Kardex:**
- **Estado Armado**: Registra `Traspaso_Equipo`
- **Estado Reacondicionado**: Registra `Reacondicionamiento_Salida`

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | MotivoDano es requerido cuando el destino es dañada | Falta motivo de daño |
| 404 | Detalle de equipo no encontrado | EquipoDetalleID no existe |

---

### 9. Instalar Equipo

**Endpoint:** `PATCH /equipos/:EquipoID/instalar`

**Descripción:** Cambia el estado del equipo de **Armado** o **Reacondicionado** a **Instalado**.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `EquipoID` | number | Sí | ID del equipo |

**Payload:**

| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `FechaInstalacion` | string | No | formato ISO | Fecha de instalación (default: fecha actual) |

**Ejemplo de Request:**
```json
{
  "FechaInstalacion": "2024-12-23"
}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Equipo instalado correctamente",
  "error": false,
  "data": { ... }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | Esta operación solo está permitida para equipos en estado: Armado, Reacondicionado | Estado no permitido |

---

### 10. Desmontar Equipo

**Endpoint:** `PATCH /equipos/:EquipoID/desmontar`

**Descripción:** Desmonta un equipo para recuperar sus refacciones. Solo para equipos Purifreeze. **IMPORTANTE:** Todas las refacciones del equipo DEBEN ser procesadas para evitar pérdida de inventario.

**Casos de uso:**
- **Desde servicio:** Equipo **Instalado** que se retira del cliente
- **Desde fábrica:** Equipo **Armado** que se desarma para recuperar refacciones

**Estados permitidos:** `Armado`, `Instalado`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `EquipoID` | number | Sí | ID del equipo |

#### Opciones de Desmontaje

Hay **2 formas** de desmontar un equipo:

##### Opción 1: Todo al Inventario (Automático)

Usar cuando todas las refacciones están en buen estado y regresan completas al inventario.

**Payload:**
```json
{
  "TodoAlInventario": true,
  "Observaciones": "Equipo retirado sin daños"
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `TodoAlInventario` | boolean | Sí | Debe ser `true` |
| `FechaDesmontaje` | string | No | Fecha ISO (default: hoy) |
| `Observaciones` | string | No | max: 500 caracteres |

##### Opción 2: Especificar Destino de Cada Refacción (Manual)

Usar cuando hay refacciones dañadas o se necesita control individual.

**Payload:**
```json
{
  "Observaciones": "Algunas piezas con desgaste",
  "Refacciones": [
    {
      "RefaccionID": 10,
      "Cantidad": 2,
      "Destino": "inventario"
    },
    {
      "RefaccionID": 15,
      "Cantidad": 1,
      "Destino": "danada",
      "MotivoDano": "Desgaste_Normal",
      "ObservacionesDano": "Filtro con perforaciones"
    }
  ]
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `TodoAlInventario` | boolean | No | Debe ser `false` u omitido |
| `FechaDesmontaje` | string | No | Fecha ISO (default: hoy) |
| `Observaciones` | string | No | max: 500 caracteres |
| `Refacciones` | array | Sí | **TODAS** las refacciones del equipo |

**Estructura de cada Refacción:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `RefaccionID` | number | Sí | ID de la refacción |
| `Cantidad` | number | Sí | Cantidad a procesar (debe coincidir con el equipo) |
| `Destino` | string | Sí | `inventario` o `danada` |
| `MotivoDano` | string | Condicional | Requerido si Destino es `danada` |
| `ObservacionesDano` | string | No | max: 255 caracteres |

**Valores para MotivoDano:**
- `Defecto_Fabrica`
- `Mal_Uso`
- `Desgaste_Normal`
- `Accidente`
- `Otro`

#### ¿Cómo obtener las refacciones del equipo?

Antes de desmontar, consulta el equipo para ver sus refacciones:

```
GET /equipos/:EquipoID
```

La respuesta incluye el array `Detalles` con cada refacción:
```json
{
  "data": {
    "EquipoID": 1,
    "Detalles": [
      {
        "EquipoDetalleID": 1,
        "RefaccionID": 10,
        "Cantidad": 2,
        "Refaccion": {
          "NombrePieza": "Filtro de carbón activado",
          ...
        }
      },
      {
        "EquipoDetalleID": 2,
        "RefaccionID": 15,
        "Cantidad": 1,
        "Refaccion": {
          "NombrePieza": "Bomba de agua",
          ...
        }
      }
    ]
  }
}
```

#### Response Exitoso (200)

```json
{
  "status": 200,
  "message": "Equipo desmontado correctamente",
  "error": false,
  "data": {
    "EquipoID": 1,
    "NumeroSerie": "PUR-24-0001",
    "Estatus": "Desmontado",
    "FechaDesmontaje": "2024-12-23",
    ...
  }
}
```

#### Errores Posibles

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | Debe especificar TodoAlInventario=true o proporcionar el array de Refacciones... | No se especificó ninguna opción |
| 400 | Solo equipos Purifreeze pueden desmontarse | Equipo externo |
| 400 | Esta operación solo está permitida para equipos en estado: Armado, Instalado | Estado no permitido |
| 400 | El equipo no tiene refacciones para desmontar | Equipo sin detalles |
| 400 | Falta especificar destino para la refacción "X" | Falta refacción en el array |
| 400 | La cantidad procesada para "X" (Y) no coincide con la cantidad en el equipo (Z) | Cantidades no coinciden |
| 400 | MotivoDano es requerido para refacción "X" | Falta motivo cuando destino es `danada` |
| 404 | Refacción X no encontrada en el equipo | RefaccionID no pertenece al equipo |

#### Comportamiento en Kardex

- Cada refacción que va a `inventario` genera un movimiento `Traspaso_Equipo` (entrada)
- Las refacciones `danada` se registran en la tabla `refacciones_danadas`

---

### 11. Finalizar Reacondicionamiento

**Endpoint:** `PATCH /equipos/:EquipoID/finalizar-reacondicionamiento`

**Descripción:** Finaliza el proceso de reacondicionamiento y marca el equipo como listo para nuevo uso (cambia estado a **Armado**). Incrementa el contador de veces reacondicionado.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `EquipoID` | number | Sí | ID del equipo |

**Payload:**

| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `Observaciones` | string | No | max: 500 | Observaciones del reacondicionamiento |

**Ejemplo de Request:**
```json
{
  "Observaciones": "Se reemplazaron filtros y se verificó funcionamiento"
}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Reacondicionamiento finalizado. Equipo listo para nuevo uso.",
  "error": false,
  "data": {
    "EquipoID": 1,
    "NumeroSerie": "PUR-24-0001",
    "EsExterno": false,
    "Estatus": "Armado",
    "VecesReacondicionado": 1,
    "FechaReacondicionamiento": "2024-12-23",
    ...
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | Solo equipos Purifreeze pueden reacondicionarse | Equipo externo |
| 400 | Esta operación solo está permitida para equipos en estado: Reacondicionado | Estado no permitido |
| 404 | Equipo no encontrado | EquipoID no existe |

---

### 12. Dar de Baja Equipo

**Endpoint:** `PATCH /equipos/baja/:EquipoID`

**Descripción:** Realiza soft delete del equipo. **IMPORTANTE:** No se permite dar de baja equipos en estado **Instalado**. Primero deben desmontarse.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `EquipoID` | number | Sí | ID del equipo |

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Equipo dado de baja correctamente",
  "error": false,
  "data": { "EquipoID": 1 }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | No se puede dar de baja un equipo instalado. El equipo "X" (Y) debe desmontarse primero | Equipo en estado Instalado |
| 404 | Equipo no encontrado | EquipoID no existe o ya está dado de baja |

---

### 13. Activar Equipo

**Endpoint:** `PATCH /equipos/activar/:EquipoID`

**Descripción:** Reactiva un equipo dado de baja.

**Headers:**
```
Authorization: Bearer {token}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Equipo activado correctamente",
  "error": false,
  "data": { "EquipoID": 1 }
}
```

---

## Modelos de Datos

### equipos

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| EquipoID | Int | No | Clave primaria |
| PlantillaEquipoID | Int | No | FK a plantilla |
| NumeroSerie | String(50) | No | Único, autogenerado |
| EsExterno | TinyInt | No | 0=Purifreeze, 1=Externo |
| Estatus | Enum | No | Armado, Instalado, Reacondicionado, Desmontado |
| Observaciones | String(500) | Sí | Notas del equipo |
| FechaCreacion | Date | No | Fecha de armado |
| FechaInstalacion | Date | Sí | Fecha de instalación |
| FechaDesmontaje | Date | Sí | Fecha de desmontaje |
| FechaReacondicionamiento | Date | Sí | Última fecha de reacondicionamiento |
| VecesReacondicionado | Int | No | Contador de reacondicionamientos (default: 0) |
| UsuarioCreadorID | Int | Sí | Usuario que creó el equipo |
| ClienteID | Int | Sí | Cliente actual (cuando está instalado) |
| SucursalID | Int | Sí | Sucursal actual (cuando está instalado) |
| ContratoID | Int | Sí | Contrato actual (cuando está instalado) |
| IsActive | TinyInt | Sí | Soft delete |

### equipos_detalle

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| EquipoDetalleID | Int | No | Clave primaria |
| EquipoID | Int | No | FK a equipo |
| RefaccionID | Int | No | FK a refacción |
| Cantidad | Int | No | Cantidad de piezas |
| IsActive | TinyInt | Sí | Soft delete |

### equipos_historial

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| EquipoHistorialID | Int | No | Clave primaria |
| EquipoID | Int | No | FK a equipo |
| TipoAccion | Enum | No | Tipo de acción realizada |
| EstatusAnterior | Enum | Sí | Estado antes del cambio |
| EstatusNuevo | Enum | Sí | Estado después del cambio |
| Descripcion | String(500) | No | Descripción del evento |
| DetalleJSON | Text | Sí | Datos adicionales en JSON |
| UsuarioID | Int | Sí | Usuario que realizó la acción |
| FechaAccion | DateTime | No | Fecha y hora del evento |

### TipoAccionEquipo (Enum)

| Valor | Descripción |
|-------|-------------|
| CREACION | Equipo creado |
| INSTALACION | Equipo instalado en cliente |
| DESINSTALACION | Equipo retirado de cliente |
| INICIO_REACONDICIONAMIENTO | Comenzó reacondicionamiento |
| FIN_REACONDICIONAMIENTO | Finalizó reacondicionamiento |
| AGREGAR_REFACCION | Refacción agregada |
| MODIFICAR_REFACCION | Cantidad de refacción modificada |
| ELIMINAR_REFACCION | Refacción eliminada |
| MODIFICACION | Observaciones actualizadas |
| BAJA | Equipo dado de baja |
| ACTIVACION | Equipo reactivado |

---

## Relaciones

- **Plantilla:** Cada equipo se basa en una plantilla (`plantillas_equipo`)
- **Detalles:** Un equipo tiene múltiples refacciones (`equipos_detalle`)
- **Cliente/Sucursal/Contrato:** Ubicación actual del equipo cuando está instalado
- **Historial:** Registro de todos los eventos del equipo (`equipos_historial`)
- **Refacciones dañadas:** Historial de piezas dañadas (`refacciones_danadas`)

---

## Flujo de Trabajo Típico

### Crear y Armar Equipos

```
1. POST /equipos (crear desde plantilla)
   ↓
2. Si necesita ajustes:
   - POST /equipos/:id/refacciones (agregar)
   - PATCH /equipos/:id/refacciones/:id/cantidad (modificar)
   - DELETE /equipos/:id/refacciones/:id (eliminar)
   ↓
3. Equipo listo en estado "Armado"
```

### Ciclo de Vida del Equipo

```
1. [Armado] → Servicio de instalación → [Instalado]
   ↓
2. [Instalado] → Servicio de desinstalación
   ↓
   ├─ Con EQUIPO_COMPLETO → [Reacondicionado]
   │   ↓
   │   Ajustar refacciones (agregar/quitar/modificar)
   │   ↓
   │   PATCH /equipos/:id/finalizar-reacondicionamiento → [Armado]
   │   ↓
   │   Vuelve a estar disponible para nuevo uso
   │
   └─ Con PIEZAS_INDIVIDUALES → [Desmontado]
       (Las piezas regresan al inventario)
```

---

## Notas Importantes

1. **Equipos Externos vs Purifreeze:**
   - Los equipos externos **NO afectan** el inventario
   - Los equipos externos **NO pueden reacondicionarse**
   - Los equipos externos **NO pueden desmontarse**

2. **Flujo de Servicios:**
   - La instalación y desinstalación principal se manejan desde el módulo de **servicios**
   - El cambio a estado "Reacondicionado" se hace desde servicios con acción `EQUIPO_COMPLETO`
   - El cambio a estado "Desmontado" se hace desde servicios con acción `PIEZAS_INDIVIDUALES`

3. **Inventario y Kardex:**
   - Cada operación en equipos Purifreeze afecta el inventario general
   - Se registra en kardex con el tipo de movimiento correspondiente
   - En estado Reacondicionado, los movimientos usan tipos específicos (`Reacondicionamiento_Entrada/Salida`)

4. **Historial:**
   - **TODAS** las operaciones quedan registradas en `equipos_historial`
   - Incluye: usuario, estados anterior/nuevo, descripción y detalles en JSON
   - Permite trazabilidad completa del ciclo de vida del equipo

5. **Reacondicionamiento:**
   - El contador `VecesReacondicionado` indica cuántas veces se ha reacondicionado el equipo
   - La fecha `FechaReacondicionamiento` muestra la última vez que se finalizó un reacondicionamiento
   - Un equipo puede ser reacondicionado múltiples veces durante su vida útil

6. **Precios Calculados:**
   - `CostoTotal`: Suma de (CostoPromedio × Cantidad) de cada refacción
   - `PrecioVenta`: CostoTotal × (1 + PorcentajeVenta/100)
   - `PrecioRenta`: CostoTotal × (PorcentajeRenta/100)

7. **Soft Delete:** El campo `IsActive` indica si el registro está activo (1) o dado de baja (0).

---

**Última actualización:** 2025-12-23
