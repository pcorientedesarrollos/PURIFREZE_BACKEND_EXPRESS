# API de Compras-Pagos - Purifreeze Backend

## Información General

**Base URL:** `http://localhost:3000`

**Prefijo de ruta:** `/compras-pagos`

**Autenticación:** Bearer Token requerido

---

## Concepto de Negocio

Este módulo implementa el **eje de PAGO** del sistema de compras con ejes independientes:

- **PAGO** - Se gestiona aquí (compras-pagos)
- **ENTREGA** - Se gestiona en compras-recepciones

Ambos procesos son **independientes**: puedes pagar sin recibir, o recibir sin pagar.

### Estados de Pago

| EstadoPago | Descripción |
|------------|-------------|
| `PENDIENTE` | No se ha realizado ningún pago |
| `PARCIAL` | Se han realizado pagos pero no cubren el total |
| `PAGADO` | El total de pagos cubre o excede el TotalNeto |

---

## Endpoints

### 1. Registrar Nuevo Pago

**Endpoint:** `POST /compras-pagos`

**Descripción:** Registra un pago para una compra existente. Actualiza automáticamente el `EstadoPago` y `TotalPagado` de la compra.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Payload:**

| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `CompraEncabezadoID` | number | Sí | - | ID de la compra |
| `MetodoPagoID` | number | Sí | - | ID del método de pago |
| `CuentaBancariaID` | number | No | - | ID de cuenta bancaria (si aplica) |
| `Monto` | number | Sí | > 0 | Monto del pago |
| `FechaPago` | string | Sí | formato fecha | Fecha del pago (YYYY-MM-DD) |
| `Referencia` | string | No | max: 100 | Referencia del pago |
| `Observaciones` | string | No | max: 255 | Observaciones adicionales |
| `UsuarioID` | number | Sí | - | ID del usuario que registra |

**Ejemplo de Request:**
```json
{
  "CompraEncabezadoID": 15,
  "MetodoPagoID": 2,
  "CuentaBancariaID": 1,
  "Monto": 5000.00,
  "FechaPago": "2026-02-06",
  "Referencia": "TRANSF-001",
  "Observaciones": "Primer abono",
  "UsuarioID": 1
}
```

**Response Exitoso (201):**
```json
{
  "status": 201,
  "message": "Pago registrado correctamente",
  "error": false,
  "data": {
    "CompraPagoID": 1,
    "CompraEncabezadoID": 15,
    "MetodoPagoID": 2,
    "CuentaBancariaID": 1,
    "Monto": 5000.00,
    "FechaPago": "2026-02-06T00:00:00.000Z",
    "Referencia": "TRANSF-001",
    "Observaciones": "Primer abono",
    "UsuarioID": 1,
    "FechaRegistro": "2026-02-06T18:30:00.000Z",
    "IsActive": 1
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | El monto ($X) excede el saldo pendiente ($Y) | Monto mayor al pendiente |
| 400 | Las compras de CONTADO requieren pago completo | Pago parcial en compra CONTADO |
| 400 | La compra ya está completamente pagada | EstadoPago = PAGADO |
| 400 | La compra no está activa | IsActive = false |
| 400 | Saldo insuficiente. Saldo actual: $X | Cuenta bancaria sin fondos |
| 404 | Compra no encontrada | ID inválido |

---

### 2. Obtener Pagos de una Compra

**Endpoint:** `GET /compras-pagos/compra/:CompraEncabezadoID`

**Descripción:** Obtiene todos los pagos activos de una compra con resumen de montos.

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
  "message": "Pagos obtenidos",
  "error": false,
  "data": {
    "pagos": [
      {
        "CompraPagoID": 2,
        "CompraEncabezadoID": 15,
        "MetodoPagoID": 2,
        "CuentaBancariaID": 1,
        "Monto": 3000.00,
        "FechaPago": "2026-02-06",
        "Referencia": "TRANSF-002",
        "Observaciones": "Segundo abono",
        "UsuarioID": 1,
        "FechaRegistro": "2026-02-06 19:00:00",
        "IsActive": 1
      },
      {
        "CompraPagoID": 1,
        "CompraEncabezadoID": 15,
        "MetodoPagoID": 2,
        "CuentaBancariaID": 1,
        "Monto": 5000.00,
        "FechaPago": "2026-02-06",
        "Referencia": "TRANSF-001",
        "Observaciones": "Primer abono",
        "UsuarioID": 1,
        "FechaRegistro": "2026-02-06 18:30:00",
        "IsActive": 1
      }
    ],
    "resumen": {
      "TotalCompra": 10000.00,
      "TotalPagado": 8000.00,
      "SaldoPendiente": 2000.00,
      "EstadoPago": "PARCIAL",
      "FormaPago": "CREDITO"
    }
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | Compra no encontrada | ID inválido |

---

### 3. Eliminar Pago (Soft Delete)

**Endpoint:** `DELETE /compras-pagos/:CompraPagoID`

**Descripción:** Elimina un pago (soft delete). Revierte el movimiento bancario y actualiza el estado de la compra.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `CompraPagoID` | number | Sí | ID del pago a eliminar |

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Pago eliminado correctamente",
  "error": false,
  "data": {
    "CompraPagoID": 1
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | El pago ya fue eliminado | IsActive = 0 |
| 400 | No se puede eliminar un pago de una compra ya entregada | EstadoEntrega = ENTREGADO |
| 404 | Pago no encontrado | ID inválido |

---

## Modelo de Datos

### compras_pagos

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| CompraPagoID | Int | No | Clave primaria |
| CompraEncabezadoID | Int | No | FK a compras_encabezado |
| MetodoPagoID | Int | No | FK a catalogo_metodos_pago |
| CuentaBancariaID | Int | Sí | FK a catalogo_cuentasBancarias |
| Monto | Float | No | Monto del pago |
| FechaPago | Date | No | Fecha del pago |
| Referencia | String(100) | Sí | Referencia bancaria |
| Observaciones | String(255) | Sí | Observaciones |
| UsuarioID | Int | No | Usuario que registró |
| FechaRegistro | DateTime | No | Fecha de registro |
| IsActive | TinyInt | Sí | 1=Activo, 0=Eliminado |

---

## Campos Nuevos en compras_encabezado

| Campo | Tipo | Descripción |
|-------|------|-------------|
| FormaPago | Enum | `CONTADO` o `CREDITO` |
| EstadoPago | Enum | `PENDIENTE`, `PARCIAL`, `PAGADO` |
| EstadoEntrega | Enum | `NO_ENTREGADO`, `PARCIAL`, `ENTREGADO` |
| TotalPagado | Float | Suma de pagos activos |
| TotalRecibido | Float | Monto de mercancía recibida |
| DiasCredito | Int | Días de crédito (si aplica) |
| FechaVencimientoCredito | Date | Fecha límite de pago |

---

## Flujo de Trabajo

### Compra a CREDITO (por defecto)
```
1. Crear compra (FormaPago: CREDITO) → EstadoPago: PENDIENTE
2. Registrar recepciones parciales → EstadoEntrega: PARCIAL
3. Registrar pagos parciales → EstadoPago: PARCIAL
4. Completar recepciones → EstadoEntrega: ENTREGADO
5. Completar pagos → EstadoPago: PAGADO
```

### Compra de CONTADO
```
1. Crear compra (FormaPago: CONTADO) → Pago automático → EstadoPago: PAGADO
2. Registrar recepciones → EstadoEntrega: PARCIAL/ENTREGADO
```

---

## Notas Importantes

- Los pagos y entregas son **independientes**: el orden no importa
- Al eliminar un pago, se **revierte el saldo** de la cuenta bancaria
- No se pueden eliminar pagos de compras ya **entregadas** (EstadoEntrega = ENTREGADO)
- Las compras de **CONTADO** requieren pago completo al momento de crearlas
- El campo `Estatus` (legacy) se mantiene por compatibilidad

---

**Última actualización:** 2026-02-06
