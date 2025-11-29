# API de Compras Recepciones - Purifreeze Backend

## Información General

**Base URL:** `http://localhost:3000`

**Prefijo de ruta:** `/compras-recepciones`

**Autenticación:** Bearer Token (JWT)

---

## Endpoints

### 1. Crear Recepción de Compra

**Endpoint:** `POST /compras-recepciones`

**Descripción:** Registra una recepción parcial o completa de una compra. Automáticamente actualiza inventario, crea registros en Kardex, actualiza costo promedio de refacciones y genera el pago correspondiente.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Payload:**

| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `CompraEncabezadoID` | number | Sí | Debe existir y no estar finalizada | ID de la compra a recepcionar |
| `FechaRecepcion` | string | No | Formato: "YYYY-MM-DD" | Fecha de recepción (default: fecha actual) |
| `Observaciones` | string | No | - | Notas de la recepción (default: "Recepción parcial de compra") |
| `MontoRecepcion` | number | Sí | No puede exceder monto pendiente | Monto a pagar en esta recepción |
| `UsuarioID` | number | Sí | - | ID del usuario que registra |
| `MetodoPagoID` | number | Sí | - | ID del método de pago |
| `CuentaBancariaID` | number | Sí | Debe tener saldo suficiente | ID de la cuenta bancaria |
| `Detalles` | array | Sí | Mínimo 1 elemento | Lista de refacciones a recibir |

**Estructura de Detalles:**

| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `RefaccionID` | number | Sí | Debe existir en la compra | ID de la refacción |
| `CantidadEstablecida` | number | Sí | No puede exceder cantidad pendiente | Cantidad a recibir |

**Ejemplo de Request:**
```json
{
  "CompraEncabezadoID": 15,
  "FechaRecepcion": "2025-11-28",
  "Observaciones": "Primera entrega parcial",
  "MontoRecepcion": 5000.00,
  "UsuarioID": 1,
  "MetodoPagoID": 1,
  "CuentaBancariaID": 2,
  "Detalles": [
    {
      "RefaccionID": 5,
      "CantidadEstablecida": 10
    },
    {
      "RefaccionID": 8,
      "CantidadEstablecida": 5
    }
  ]
}
```

**Response Exitoso (201):**
```json
{
  "status": 201,
  "message": "Recepción de compra registrada correctamente",
  "error": false,
  "data": {
    "recepcion": {
      "ComprasRecepcionesEncabezadoID": 12,
      "CompraEncabezadoID": 15,
      "FechaRecepcion": "2025-11-28",
      "Observaciones": "Primera entrega parcial",
      "MontoRecepcion": 5000.00,
      "UsuarioID": 1,
      "IsActive": 1
    },
    "compraFinalizada": false
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | Bad Request (campo: mensaje) | Validación Zod fallida |
| 400 | No ingresaste ninguna refacción en la recepción | Array de detalles vacío |
| 400 | La compra ya está finalizada | Intentar recepcionar compra con estatus "Finalizado" |
| 400 | Saldo insuficiente en la cuenta bancaria | Cuenta sin fondos suficientes |
| 400 | La refacción {ID} no existe en la compra | RefaccionID no pertenece a la compra |
| 400 | La cantidad a recibir ({X}) para la refacción {ID} excede la cantidad pendiente ({Y}) | Cantidad excede lo pendiente |
| 400 | El monto de la recepción (${X}) excede el monto pendiente por pagar (${Y}) | Monto mayor al adeudado |
| 404 | Compra no encontrada | CompraEncabezadoID no existe |
| 404 | La cuenta bancaria no existe | CuentaBancariaID inválido |

**Ejemplo de Error:**
```json
{
  "status": 400,
  "message": "La cantidad a recibir (20) para la refacción 5 excede la cantidad pendiente (10)",
  "error": true,
  "data": []
}
```

**Efectos Secundarios:**
- Crea registro en `compras_recepciones_encabezado`
- Crea registros en `compras_recepciones_detalle` por cada refacción
- Actualiza `inventario` (suma cantidad a bodega general)
- Crea registros en `kardex` (tipo: "Entrada_Compra")
- Actualiza `CostoPromedio` en `catalogo_refacciones`
- Crea registro en `pagos`
- Crea registro en `historial_movimientos_bancarios`
- Actualiza saldo en `catalogo_cuentasBancarias`
- Si la recepción completa todas las cantidades y pagos, cambia `Estatus` de la compra a "Finalizado"

---

### 2. Obtener Todas las Recepciones

**Endpoint:** `GET /compras-recepciones`

**Descripción:** Obtiene lista de todas las recepciones registradas con sus detalles.

**Headers:**
```
Authorization: Bearer {token}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Recepciones obtenidas",
  "error": false,
  "data": [
    {
      "ComprasRecepcionesEncabezadoID": 12,
      "CompraEncabezadoID": 15,
      "FechaRecepcion": "2025-11-28T00:00:00.000Z",
      "Observaciones": "Primera entrega parcial",
      "MontoRecepcion": 5000.00,
      "UsuarioID": 1,
      "IsActive": 1,
      "compras_recepciones_detalle": [
        {
          "ComprasRecepcionesDetalleID": 20,
          "ComprasRecepcionesEncabezadoID": 12,
          "RefaccionID": 5,
          "CantidadEstablecida": 10,
          "IsActive": 1
        }
      ]
    }
  ]
}
```

---

### 3. Obtener Todas las Recepciones con Pagos

**Endpoint:** `GET /compras-recepciones/with-pagos`

**Descripción:** Obtiene todas las recepciones incluyendo información de los pagos asociados a cada compra.

**Headers:**
```
Authorization: Bearer {token}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Recepciones con pagos obtenidas",
  "error": false,
  "data": [
    {
      "ComprasRecepcionesEncabezadoID": 12,
      "CompraEncabezadoID": 15,
      "FechaRecepcion": "2025-11-28T00:00:00.000Z",
      "Observaciones": "Primera entrega parcial",
      "MontoRecepcion": 5000.00,
      "UsuarioID": 1,
      "IsActive": 1,
      "compras_recepciones_detalle": [...],
      "Pagos": [
        {
          "PagosID": 8,
          "ReferenciaTipo": "Compras",
          "ReferenciaID": 15,
          "MetodoPagoID": 1,
          "CuentaBancariaID": 2,
          "Monto": 5000.00,
          "FechaPago": "2025-11-28T00:00:00.000Z",
          "Observaciones": "Pago parcial de compra #15 - Recepción #12",
          "IsActive": 1
        }
      ]
    }
  ]
}
```

---

### 4. Obtener Recepción por ID

**Endpoint:** `GET /compras-recepciones/:ComprasRecepcionesEncabezadoID`

**Descripción:** Obtiene una recepción específica por su ID.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `ComprasRecepcionesEncabezadoID` | number | Sí | ID de la recepción |

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Recepción obtenida",
  "error": false,
  "data": {
    "ComprasRecepcionesEncabezadoID": 12,
    "CompraEncabezadoID": 15,
    "FechaRecepcion": "2025-11-28T00:00:00.000Z",
    "Observaciones": "Primera entrega parcial",
    "MontoRecepcion": 5000.00,
    "UsuarioID": 1,
    "IsActive": 1,
    "compras_recepciones_detalle": [
      {
        "ComprasRecepcionesDetalleID": 20,
        "ComprasRecepcionesEncabezadoID": 12,
        "RefaccionID": 5,
        "CantidadEstablecida": 10,
        "IsActive": 1
      }
    ]
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | Bad Request (ComprasRecepcionesEncabezadoID: ID debe ser un número válido) | Parámetro no numérico |
| 404 | Recepción no encontrada | ID no existe |

---

### 5. Obtener Recepciones por Compra

**Endpoint:** `GET /compras-recepciones/compra/:CompraEncabezadoID`

**Descripción:** Obtiene todas las recepciones asociadas a una compra específica.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `CompraEncabezadoID` | number | Sí | ID de la compra |

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Recepciones de la compra obtenidas",
  "error": false,
  "data": [
    {
      "ComprasRecepcionesEncabezadoID": 12,
      "CompraEncabezadoID": 15,
      "FechaRecepcion": "2025-11-28T00:00:00.000Z",
      "Observaciones": "Primera entrega parcial",
      "MontoRecepcion": 5000.00,
      "UsuarioID": 1,
      "IsActive": 1,
      "compras_recepciones_detalle": [...]
    },
    {
      "ComprasRecepcionesEncabezadoID": 14,
      "CompraEncabezadoID": 15,
      "FechaRecepcion": "2025-11-29T00:00:00.000Z",
      "Observaciones": "Segunda entrega",
      "MontoRecepcion": 3000.00,
      "UsuarioID": 1,
      "IsActive": 1,
      "compras_recepciones_detalle": [...]
    }
  ]
}
```

---

### 6. Obtener Recepciones por Compra con Pagos y Resumen

**Endpoint:** `GET /compras-recepciones/compra/:CompraEncabezadoID/with-pagos`

**Descripción:** Obtiene recepciones, pagos y un resumen de totales para una compra específica. Ideal para mostrar el estado completo de una compra.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `CompraEncabezadoID` | number | Sí | ID de la compra |

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Recepciones con pagos de la compra obtenidas",
  "error": false,
  "data": {
    "recepciones": [
      {
        "ComprasRecepcionesEncabezadoID": 12,
        "CompraEncabezadoID": 15,
        "FechaRecepcion": "2025-11-28T00:00:00.000Z",
        "Observaciones": "Primera entrega parcial",
        "MontoRecepcion": 5000.00,
        "UsuarioID": 1,
        "IsActive": 1,
        "compras_recepciones_detalle": [...]
      }
    ],
    "pagos": [
      {
        "PagosID": 8,
        "ReferenciaTipo": "Compras",
        "ReferenciaID": 15,
        "MetodoPagoID": 1,
        "CuentaBancariaID": 2,
        "Monto": 5000.00,
        "FechaPago": "2025-11-28T00:00:00.000Z",
        "Observaciones": "Pago parcial de compra #15 - Recepción #12",
        "IsActive": 1
      }
    ],
    "resumen": {
      "totalRecepciones": 1,
      "totalPagos": 1,
      "montoTotalRecibido": 5000.00,
      "montoTotalPagado": 5000.00
    }
  }
}
```

---

## Modelo de Datos

### compras_recepciones_encabezado

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| `ComprasRecepcionesEncabezadoID` | Int | No | Clave primaria (autoincrement) |
| `CompraEncabezadoID` | Int | Sí | FK a `compras_encabezado` |
| `FechaRecepcion` | DateTime | Sí | Fecha de la recepción |
| `Observaciones` | String(255) | Sí | Notas de la recepción |
| `MontoRecepcion` | Float | Sí | Monto pagado en esta recepción |
| `UsuarioID` | Int | Sí | Usuario que registró |
| `IsActive` | TinyInt | Sí | 1=Activo, 0=Inactivo |

### compras_recepciones_detalle

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| `ComprasRecepcionesDetalleID` | Int | No | Clave primaria (autoincrement) |
| `ComprasRecepcionesEncabezadoID` | Int | Sí | FK a `compras_recepciones_encabezado` |
| `RefaccionID` | Int | Sí | FK a `catalogo_refacciones` |
| `CantidadEstablecida` | Float | Sí | Cantidad recibida |
| `IsActive` | TinyInt | Sí | 1=Activo, 0=Inactivo |

---

## Relaciones

```
compras_encabezado (1) ◄──── (N) compras_recepciones_encabezado
                                        │
                                        └──── (N) compras_recepciones_detalle
```

- **compras_encabezado → compras_recepciones_encabezado:** Una compra puede tener múltiples recepciones (parciales)
- **compras_recepciones_encabezado → compras_recepciones_detalle:** Una recepción tiene múltiples líneas de detalle

---

## Flujo de Trabajo Típico

### Escenario: Recepción Parcial de Compra

1. **Compra creada** con `Estatus: "Pendiente"` y 3 refacciones
2. **Primera recepción:** Se recibe 50% de las refacciones y se paga 50% del total
   - Sistema actualiza inventario y kardex
   - Sistema crea pago automático
   - Compra sigue en `Estatus: "Pendiente"`
3. **Segunda recepción:** Se recibe el 50% restante y se paga el resto
   - Sistema actualiza inventario y kardex
   - Sistema crea pago automático
   - Sistema detecta que cantidades y pagos están completos
   - **Compra cambia automáticamente a `Estatus: "Finalizado"`**

### Validaciones Automáticas

1. **Cantidad:** No se puede recibir más de lo pendiente por cada refacción
2. **Monto:** No se puede pagar más de lo adeudado
3. **Saldo:** La cuenta bancaria debe tener saldo suficiente
4. **Estatus:** No se puede recepcionar una compra ya finalizada

---

## Notas Importantes

- **Transaccional:** Todas las operaciones de creación son atómicas (si algo falla, se revierte todo)
- **Pago Automático:** Cada recepción crea automáticamente un pago y movimiento bancario
- **Costo Promedio:** Se actualiza automáticamente usando promedio ponderado
- **Kardex:** Se crea entrada tipo "Entrada_Compra" por cada refacción recibida
- **Finalización Automática:** La compra se finaliza cuando:
  - Todas las cantidades de refacciones están recibidas (cantidad recibida >= cantidad comprada)
  - El monto total pagado >= total neto de la compra

---

**Última actualización:** 2025-11-28
