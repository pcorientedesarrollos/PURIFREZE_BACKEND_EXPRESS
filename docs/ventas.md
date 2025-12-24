# API de Ventas - Purifreeze Backend

## Información General

**Base URL:** `http://localhost:3000`

**Prefijo de ruta:** `/ventas`

**Autenticación:** Bearer Token requerido

---

## Descripción del Módulo

Este módulo gestiona las ventas de:
- Equipos Purifreeze
- Equipos externos
- Refacciones
- Servicios

Las ventas pueden generarse automáticamente al aprobar un presupuesto o crearse manualmente.

---

## Endpoints

### 1. Crear Venta

**Endpoint:** `POST /ventas`

**Descripción:** Crea una nueva venta con sus detalles.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Payload:**

| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `ClienteID` | number | Sí | - | ID del cliente |
| `SucursalID` | number | No | - | ID de la sucursal |
| `PresupuestoID` | number | No | - | ID del presupuesto origen |
| `FechaVenta` | string | No | formato ISO | Fecha de la venta (default: hoy) |
| `Observaciones` | string | No | max: 500 | Observaciones generales |
| `UsuarioID` | number | Sí | - | ID del usuario que registra |
| `DescuentoPorcentaje` | number | No | 0-100 | Descuento global en porcentaje |
| `DescuentoEfectivo` | number | No | min: 0 | Descuento global en efectivo |
| `detalles` | array | Sí | min: 1 | Array de items de venta |

**Estructura de cada detalle:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `TipoItem` | string | Sí | EQUIPO_PURIFREEZE, EQUIPO_EXTERNO, REFACCION, SERVICIO |
| `EquipoID` | number | No | ID del equipo (si aplica) |
| `PlantillaEquipoID` | number | No | ID de la plantilla (si aplica) |
| `RefaccionID` | number | No | ID de la refacción (si aplica) |
| `PresupuestoDetalleID` | number | No | ID del detalle de presupuesto origen |
| `Descripcion` | string | No | Descripción del item |
| `Cantidad` | number | Sí | Cantidad (min: 1) |
| `PrecioUnitario` | number | Sí | Precio unitario |
| `DescuentoPorcentaje` | number | No | Descuento en porcentaje |
| `DescuentoEfectivo` | number | No | Descuento en efectivo |
| `NumeroSerie` | string | No | Número de serie del equipo |
| `MesesGarantia` | number | No | Meses de garantía (default: 12) |

**Ejemplo de Request:**
```json
{
  "ClienteID": 1,
  "SucursalID": 1,
  "UsuarioID": 5,
  "Observaciones": "Venta de equipo con instalación incluida",
  "detalles": [
    {
      "TipoItem": "EQUIPO_PURIFREEZE",
      "PlantillaEquipoID": 5,
      "Descripcion": "Dispensador Premium",
      "Cantidad": 2,
      "PrecioUnitario": 5000,
      "MesesGarantia": 12
    },
    {
      "TipoItem": "SERVICIO",
      "Descripcion": "Instalación",
      "Cantidad": 2,
      "PrecioUnitario": 500
    }
  ]
}
```

**Response Exitoso (201):**
```json
{
  "status": 201,
  "message": "Venta obtenida",
  "error": false,
  "data": {
    "VentaID": 1,
    "NumeroVenta": "V-2025-0001",
    "ClienteID": 1,
    "SucursalID": 1,
    "PresupuestoID": null,
    "FechaVenta": "2025-12-23",
    "Subtotal": 11000,
    "DescuentoPorcentaje": null,
    "DescuentoEfectivo": null,
    "IVA": 1760,
    "Total": 12760,
    "Estatus": "PENDIENTE",
    "Observaciones": "Venta de equipo con instalación incluida",
    "UsuarioID": 5,
    "FechaCreacion": "2025-12-23T10:00:00.000Z",
    "IsActive": 1,
    "cliente": {
      "ClienteID": 1,
      "NombreComercio": "Empresa ABC"
    },
    "sucursal": {
      "SucursalID": 1,
      "NombreSucursal": "Sucursal Centro"
    },
    "detalles": [...],
    "pagos": [],
    "TotalPagado": 0,
    "SaldoPendiente": 12760
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | Bad Request (detalles: Debe incluir al menos un item) | Sin detalles |
| 404 | El cliente no existe | ClienteID no encontrado |
| 300 | El cliente no está activo | Cliente inactivo |
| 300 | La sucursal no pertenece al cliente | Sucursal inválida |

---

### 2. Obtener Todas las Ventas

**Endpoint:** `GET /ventas`

**Descripción:** Obtiene la lista de todas las ventas.

**Headers:**
```
Authorization: Bearer {token}
```

**Query Params:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `estatus` | string | No | PENDIENTE, PAGADA, PARCIAL, CANCELADA |
| `fechaDesde` | string | No | Fecha inicial (ISO) |
| `fechaHasta` | string | No | Fecha final (ISO) |

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Ventas obtenidas",
  "error": false,
  "data": [
    {
      "VentaID": 1,
      "NumeroVenta": "V-2025-0001",
      "ClienteID": 1,
      "FechaVenta": "2025-12-23",
      "Total": 12760,
      "Estatus": "PENDIENTE",
      "cliente": {
        "ClienteID": 1,
        "NombreComercio": "Empresa ABC"
      },
      "sucursal": {
        "SucursalID": 1,
        "NombreSucursal": "Sucursal Centro"
      },
      "_count": {
        "detalles": 2,
        "pagos": 0
      }
    }
  ]
}
```

---

### 3. Obtener Ventas por Cliente

**Endpoint:** `GET /ventas/cliente/{ClienteID}`

**Descripción:** Obtiene todas las ventas de un cliente específico.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `ClienteID` | number | Sí | ID del cliente |

**Query Params:** (igual que el endpoint anterior)

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Ventas del cliente obtenidas",
  "error": false,
  "data": [...]
}
```

---

### 4. Obtener Venta por ID

**Endpoint:** `GET /ventas/{VentaID}`

**Descripción:** Obtiene el detalle completo de una venta con sus pagos.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `VentaID` | number | Sí | ID de la venta |

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Venta obtenida",
  "error": false,
  "data": {
    "VentaID": 1,
    "NumeroVenta": "V-2025-0001",
    "ClienteID": 1,
    "SucursalID": 1,
    "PresupuestoID": null,
    "FechaVenta": "2025-12-23",
    "Subtotal": 11000,
    "DescuentoPorcentaje": null,
    "DescuentoEfectivo": null,
    "IVA": 1760,
    "Total": 12760,
    "Estatus": "PARCIAL",
    "Observaciones": "Venta de equipo con instalación incluida",
    "cliente": {
      "ClienteID": 1,
      "NombreComercio": "Empresa ABC",
      "Observaciones": "Cliente preferente"
    },
    "sucursal": {
      "SucursalID": 1,
      "NombreSucursal": "Sucursal Centro",
      "Direccion": "Calle 123",
      "Telefono": "555-1234"
    },
    "presupuesto": null,
    "detalles": [
      {
        "VentaDetalleID": 1,
        "TipoItem": "EQUIPO_PURIFREEZE",
        "Descripcion": "Dispensador Premium",
        "Cantidad": 2,
        "PrecioUnitario": 5000,
        "Subtotal": 10000,
        "MesesGarantia": 12,
        "FechaFinGarantia": "2026-12-23",
        "equipo": null,
        "plantilla": {
          "PlantillaEquipoID": 5,
          "NombreEquipo": "Dispensador Premium",
          "Codigo": "DISP-001"
        },
        "refaccion": null
      },
      {
        "VentaDetalleID": 2,
        "TipoItem": "SERVICIO",
        "Descripcion": "Instalación",
        "Cantidad": 2,
        "PrecioUnitario": 500,
        "Subtotal": 1000
      }
    ],
    "pagos": [
      {
        "VentaPagoID": 1,
        "Monto": 5000,
        "FechaPago": "2025-12-23",
        "Referencia": "TRF-001",
        "metodo_pago": {
          "MetodosDePagoID": 1,
          "MetodoDePago": "Transferencia"
        }
      }
    ],
    "TotalPagado": 5000,
    "SaldoPendiente": 7760
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | Venta no encontrada | ID no existe |

---

### 5. Actualizar Venta

**Endpoint:** `PUT /ventas/{VentaID}`

**Descripción:** Actualiza el encabezado de una venta.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `VentaID` | number | Sí | ID de la venta |

**Payload:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `SucursalID` | number | No | Nueva sucursal |
| `FechaVenta` | string | No | Nueva fecha |
| `Observaciones` | string | No | Nuevas observaciones |
| `DescuentoPorcentaje` | number | No | Nuevo descuento % |
| `DescuentoEfectivo` | number | No | Nuevo descuento $ |

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Venta obtenida",
  "error": false,
  "data": {...}
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | Venta no encontrada | ID no existe |
| 300 | No se puede editar una venta cancelada | Estatus CANCELADA |
| 300 | No se puede editar una venta pagada | Estatus PAGADA |

---

### 6. Cambiar Estatus de Venta

**Endpoint:** `PATCH /ventas/{VentaID}/estatus`

**Descripción:** Cambia el estatus de una venta manualmente.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `VentaID` | number | Sí | ID de la venta |

**Payload:**

| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `Estatus` | string | Sí | enum | PENDIENTE, PAGADA, PARCIAL, CANCELADA |

**Ejemplo de Request:**
```json
{
  "Estatus": "CANCELADA"
}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Venta obtenida",
  "error": false,
  "data": {...}
}
```

---

### 7. Agregar Item a Venta

**Endpoint:** `POST /ventas/{VentaID}/detalle`

**Descripción:** Agrega un nuevo item a una venta existente.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `VentaID` | number | Sí | ID de la venta |

**Payload:** (igual que los detalles en crear venta)

**Response Exitoso (201):**
```json
{
  "status": 201,
  "message": "Venta obtenida",
  "error": false,
  "data": {...}
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | Venta no encontrada | ID no existe |
| 300 | No se pueden agregar items a una venta cancelada | Estatus CANCELADA |
| 300 | No se pueden agregar items a una venta pagada | Estatus PAGADA |

---

### 8. Actualizar Item de Venta

**Endpoint:** `PUT /ventas/detalle/{VentaDetalleID}`

**Descripción:** Actualiza un item de venta.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `VentaDetalleID` | number | Sí | ID del detalle |

**Payload:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `Cantidad` | number | No | Nueva cantidad |
| `PrecioUnitario` | number | No | Nuevo precio |
| `DescuentoPorcentaje` | number | No | Nuevo descuento % |
| `DescuentoEfectivo` | number | No | Nuevo descuento $ |
| `Descripcion` | string | No | Nueva descripción |
| `MesesGarantia` | number | No | Nuevos meses de garantía |

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Venta obtenida",
  "error": false,
  "data": {...}
}
```

---

### 9. Eliminar Item de Venta

**Endpoint:** `DELETE /ventas/detalle/{VentaDetalleID}`

**Descripción:** Elimina un item de venta (soft delete).

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `VentaDetalleID` | number | Sí | ID del detalle |

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Item eliminado de la venta",
  "error": false,
  "data": {
    "VentaDetalleID": 1
  }
}
```

---

### 10. Registrar Pago

**Endpoint:** `POST /ventas/{VentaID}/pago`

**Descripción:** Registra un pago para una venta. El estatus se actualiza automáticamente.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `VentaID` | number | Sí | ID de la venta |

**Payload:**

| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `MetodoPagoID` | number | Sí | - | ID del método de pago |
| `Monto` | number | Sí | min: 0.01 | Monto del pago |
| `FechaPago` | string | Sí | formato ISO | Fecha del pago |
| `Referencia` | string | No | max: 100 | Referencia del pago |
| `Observaciones` | string | No | max: 255 | Observaciones |
| `UsuarioID` | number | Sí | - | ID del usuario que registra |

**Ejemplo de Request:**
```json
{
  "MetodoPagoID": 1,
  "Monto": 5000,
  "FechaPago": "2025-12-23",
  "Referencia": "TRF-12345",
  "UsuarioID": 5
}
```

**Response Exitoso (201):**
```json
{
  "status": 201,
  "message": "Venta obtenida",
  "error": false,
  "data": {
    ...
    "Estatus": "PARCIAL",
    "TotalPagado": 5000,
    "SaldoPendiente": 7760
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | Venta no encontrada | ID no existe |
| 300 | No se puede pagar una venta cancelada | Estatus CANCELADA |
| 404 | El método de pago no existe | MetodoPagoID inválido |

---

### 11. Eliminar Pago

**Endpoint:** `DELETE /ventas/pago/{VentaPagoID}`

**Descripción:** Elimina un pago registrado (soft delete).

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `VentaPagoID` | number | Sí | ID del pago |

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Pago eliminado",
  "error": false,
  "data": {
    "VentaPagoID": 1
  }
}
```

---

### 12. Dar de Baja Venta

**Endpoint:** `PATCH /ventas/baja/{VentaID}`

**Descripción:** Elimina lógicamente una venta.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `VentaID` | number | Sí | ID de la venta |

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Venta dada de baja",
  "error": false,
  "data": {
    "VentaID": 1,
    "IsActive": 0
  }
}
```

---

### 13. Activar Venta

**Endpoint:** `PATCH /ventas/activar/{VentaID}`

**Descripción:** Reactiva una venta dada de baja.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `VentaID` | number | Sí | ID de la venta |

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Venta activada",
  "error": false,
  "data": {
    "VentaID": 1,
    "IsActive": 1
  }
}
```

---

## Modelos de Datos

### ventas_encabezado

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| VentaID | Int | No | Clave primaria |
| NumeroVenta | String | No | Número único (V-YYYY-XXXX) |
| ClienteID | Int | No | FK a catalogo_clientes |
| SucursalID | Int | Sí | FK a clientes_sucursales |
| PresupuestoID | Int | Sí | FK a presupuestos_encabezado |
| FechaVenta | Date | No | Fecha de la venta |
| Subtotal | Float | No | Subtotal antes de IVA |
| DescuentoPorcentaje | Float | Sí | Descuento global % |
| DescuentoEfectivo | Float | Sí | Descuento global $ |
| IVA | Float | No | Monto del IVA (16%) |
| Total | Float | No | Total con IVA |
| Estatus | Enum | No | PENDIENTE, PAGADA, PARCIAL, CANCELADA |
| Observaciones | String | Sí | Observaciones |
| UsuarioID | Int | No | Usuario que registra |
| FechaCreacion | DateTime | No | Timestamp de creación |
| IsActive | Int | No | 1 = Activo, 0 = Eliminado |

### ventas_detalle

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| VentaDetalleID | Int | No | Clave primaria |
| VentaID | Int | No | FK a ventas_encabezado |
| TipoItem | Enum | No | EQUIPO_PURIFREEZE, EQUIPO_EXTERNO, REFACCION, SERVICIO |
| EquipoID | Int | Sí | FK a equipos |
| PlantillaEquipoID | Int | Sí | FK a plantillas_equipo |
| RefaccionID | Int | Sí | FK a catalogo_refacciones |
| PresupuestoDetalleID | Int | Sí | FK a presupuestos_detalle |
| Descripcion | String | Sí | Descripción del item |
| Cantidad | Int | No | Cantidad vendida |
| PrecioUnitario | Float | No | Precio por unidad |
| DescuentoPorcentaje | Float | Sí | Descuento % |
| DescuentoEfectivo | Float | Sí | Descuento $ |
| Subtotal | Float | No | Subtotal del item |
| NumeroSerie | String | Sí | Número de serie |
| MesesGarantia | Int | Sí | Meses de garantía (default: 12) |
| FechaFinGarantia | Date | Sí | Fecha fin de garantía |
| IsActive | Int | No | 1 = Activo, 0 = Eliminado |

### ventas_pagos

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| VentaPagoID | Int | No | Clave primaria |
| VentaID | Int | No | FK a ventas_encabezado |
| MetodoPagoID | Int | No | FK a catalogo_metodos_pago |
| Monto | Float | No | Monto del pago |
| FechaPago | Date | No | Fecha del pago |
| Referencia | String | Sí | Referencia del pago |
| Observaciones | String | Sí | Observaciones |
| UsuarioID | Int | No | Usuario que registra |
| FechaRegistro | DateTime | No | Timestamp de registro |
| IsActive | Int | No | 1 = Activo, 0 = Eliminado |

## Notas Importantes

1. **Numeración Automática:** Las ventas se numeran automáticamente con formato `V-YYYY-XXXX`.

2. **IVA:** Se calcula automáticamente al 16% sobre el subtotal.

3. **Estatus Automático:** El estatus cambia automáticamente según los pagos:
   - `PENDIENTE`: Sin pagos
   - `PARCIAL`: Pagos parciales
   - `PAGADA`: Pagos completos

4. **Generación Automática:** Al aprobar un presupuesto con items de venta, se genera automáticamente la venta correspondiente.

5. **Campos Calculados:** `TotalPagado` y `SaldoPendiente` se calculan dinámicamente.

---

**Última actualización:** 2025-12-23
