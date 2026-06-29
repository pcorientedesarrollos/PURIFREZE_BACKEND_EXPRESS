# API de Pedidos - Purifreeze Backend

Módulo de compras a proveedores rehecho e **independiente** del módulo `compras`. Registra pedidos, sus recepciones (entradas de mercancía a inventario), pagos, descuentos por pronto pago y aplicación de notas de crédito.

## Información General

**Base URL:** `http://localhost:3000`

**Autenticación:** Todas las rutas requieren `Authorization: Bearer {token}` (rutas protegidas).

**Prefijos de ruta del módulo:**

| Prefijo | Submódulo |
|---------|-----------|
| `/pedidos` | CRUD de pedidos + asociación de facturas |
| `/pedidos-pagos` | Pagos (con descuento pronto pago integrado) |
| `/pedidos-recepciones` | Recepciones de mercancía (inventario/kardex) |
| `/pedidos-descuentos` | Notas de crédito + listado/eliminación de descuentos |

---

## Concepto del módulo

El **total rector** sale del PEDIDO (conceptos + IVA opcional), NO de las facturas. Las facturas CFDI se asocian como documentos de respaldo (entregas parciales) pero no alimentan los totales.

Un pedido se mueve por **dos ejes independientes**:

| Eje | Campo | Estados |
|-----|-------|---------|
| Pago | `EstadoPago` | `PENDIENTE` → `PARCIAL` → `PAGADO` |
| Entrega | `EstadoEntrega` | `PEDIDO` → `EN_ESPERA_DE_ENVIO` → `PARCIAL` → `ENTREGADO` |

### Cálculo de totales (Modelo 2)

Los totales los **calcula siempre el backend** desde los renglones (`pedidos_detalle`), nunca se confían del payload:

```
SubTotal (por línea) = Cantidad × PrecioUnitario
TotalBruto           = Σ SubTotal
TotalIVA             = AplicaIVA ? round(TotalBruto × TasaIVA) : 0
TotalNeto            = TotalBruto + TotalIVA − TotalDescuentos
```

| Concepto | Efecto |
|----------|--------|
| **Descuento pronto pago** | Baja `TotalDescuentos` → reduce `TotalNeto` (afecta el valor del pedido) |
| **Nota de crédito** | Sube `TotalNotasCredito` → cubre saldo (NO baja el neto) |

```
TotalCubierto  = TotalPagado + TotalNotasCredito
SaldoPendiente = TotalNeto − TotalPagado − TotalNotasCredito
```

---

# 1. Pedidos (`/pedidos`)

## 1.1 Crear pedido

**Endpoint:** `POST /pedidos`

**Descripción:** Crea un pedido con sus renglones. El backend calcula los totales.

**Payload:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `ProveedorID` | number | Sí | Proveedor del pedido |
| `NumeroPedido` | string(100) | No | Número manual del pedido (puede repetirse) |
| `FechaPedido` | string (date) | No | Default: hoy |
| `FormaPago` | enum | No | `CONTADO` \| `CREDITO` (default `CREDITO`) |
| `AplicaIVA` | boolean | No | Default `true` |
| `TasaIVA` | number | No | Default `0.16` |
| `DiasCredito` | number | No | Días de crédito (calcula fecha de vencimiento) |
| `FechaVencimientoCredito` | string (date) | No | Alternativa a DiasCredito |
| `Observaciones` | string(500) | No | |
| `UsuarioID` | number | No | |
| `Detalles` | array | Sí | Mínimo 1 renglón |

**Detalle (cada elemento de `Detalles`):**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `RefaccionID` | number | * | Al menos uno de Refaccion/Equipo/EquipoVirtual |
| `EquipoID` | number | * | |
| `EquipoVirtualID` | number | * | |
| `Cantidad` | number | Sí | Entero |
| `PrecioUnitario` | number | Sí | |

> `SubTotal` y `Total` NO se envían: los calcula el backend.

**Ejemplo de Request:**
```json
{
  "ProveedorID": 3,
  "NumeroPedido": "PED-001",
  "FormaPago": "CREDITO",
  "AplicaIVA": true,
  "TasaIVA": 0.16,
  "DiasCredito": 30,
  "UsuarioID": 14,
  "Detalles": [
    { "RefaccionID": 766, "Cantidad": 10, "PrecioUnitario": 100 }
  ]
}
```

**Response Exitoso (201):**
```json
{
  "status": 201,
  "message": "Pedido registrado correctamente",
  "error": false,
  "data": {
    "PedidoID": 1,
    "TotalBruto": "1000",
    "TotalIVA": "160",
    "TotalNeto": "1160",
    "AplicaIVA": true,
    "EstadoPago": "PENDIENTE",
    "EstadoEntrega": "PEDIDO",
    "TotalPagado": "0",
    "TotalNotasCredito": "0",
    "TotalDescuentos": "0",
    "pedidos_detalle": [ { "PedidoDetalleID": 1, "Cantidad": 10, "PrecioUnitario": "100", "SubTotal": "1000", "Total": "1000" } ],
    "proveedor": { "ProveedorID": 3, "NombreProveedor": "VALTO TECNOLOGÍA" },
    "TotalCubierto": 0,
    "SaldoPendiente": 1160
  }
}
```

**Errores:** `400` (validación Zod / detalle sin Refaccion-Equipo-EquipoVirtual).

## 1.2 Listar pedidos

**Endpoint:** `GET /pedidos` — Devuelve pedidos activos con detalles, proveedor, totales y `SaldoPendiente`.

## 1.3 Obtener pedido por ID

**Endpoint:** `GET /pedidos/:PedidoID` — Pedido completo con detalles, facturas asociadas (+conceptos), pagos, descuentos. `404` si no existe.

## 1.4 Actualizar pedido

**Endpoint:** `PUT /pedidos/:PedidoID`

**Descripción:** Actualiza encabezado y/o detalles. Recalcula totales. NO se bloquea por estado.

**Payload (todos opcionales):** mismos campos del create + `Detalles` (con `PedidoDetalleID` para editar) + `DetallesEliminar` (array de IDs a dar de baja).

## 1.5 Eliminar pedido

**Endpoint:** `DELETE /pedidos/:PedidoID` — Soft delete (`IsActive = false`).

## 1.6 Asociar factura

**Endpoint:** `POST /pedidos/:PedidoID/facturas`

**Payload:** `{ "FacturaID": number }`

**Reglas:** una factura solo puede estar en UN pedido (`@unique`); un pedido admite N facturas. Valida que la factura exista y esté activa. Si estaba desasociada, la reactiva.

**Errores:** `404` factura/pedido no encontrado; `400` "La factura ya está asociada a un pedido".

## 1.7 Desasociar factura

**Endpoint:** `DELETE /pedidos/:PedidoID/facturas/:FacturaID` — Soft delete de la asociación.

## 1.8 Listar facturas del pedido

**Endpoint:** `GET /pedidos/:PedidoID/facturas` — Facturas asociadas con sus conceptos.

---

# 2. Pagos (`/pedidos-pagos`)

## 2.1 Registrar pago (con pronto pago opcional)

**Endpoint:** `POST /pedidos-pagos`

**Descripción:** Registra un pago de un pedido. Si se envían los campos de pronto pago, aplica el descuento en la misma transacción **antes** de validar el pago (baja el neto). Si hay cuenta bancaria, genera el egreso y descuenta el saldo.

**Payload:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `PedidoID` | number | Sí | |
| `Monto` | number | Sí | Positivo. No puede exceder el saldo pendiente |
| `FechaPago` | string (date) | Sí | |
| `MetodoPagoID` | number | No | |
| `CuentaBancariaID` | number | No | Si se envía, mueve saldo bancario |
| `Referencia` | string(150) | No | |
| `Observaciones` | string(500) | No | |
| `UsuarioID` | number | No | |
| `DescuentoPorcentaje` | number (0-100) | No | Pronto pago: % sobre `TotalBruto` |
| `DiasProntoPago` | number (≥1) | No | Días de vigencia del descuento |
| `FechaBase` | string (date) | No | Inicio del plazo (fecha de recepción/factura). Default: `FechaPago` |

**Lógica del pronto pago:**
1. `FechaLimite = FechaBase + DiasProntoPago`. Si `hoy > FechaLimite` → `400` plazo vencido.
2. `MontoDescuento = round(TotalBruto × DescuentoPorcentaje / 100)`.
3. Registra el descuento (`PRONTO_PAGO`), baja `TotalDescuentos` y `TotalNeto`.
4. Valida el pago contra el nuevo saldo.

**Ejemplo de Request:**
```json
{
  "PedidoID": 1,
  "Monto": 500,
  "FechaPago": "2026-06-25",
  "DescuentoPorcentaje": 2,
  "DiasProntoPago": 7,
  "FechaBase": "2026-06-25",
  "UsuarioID": 14
}
```

**Response Exitoso (201):** `{ status, message: "Pago registrado correctamente", data: { PedidoPagoID, ... } }`

**Errores:**
| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | Pedido no encontrado | |
| 400 | El pedido ya está completamente pagado | EstadoPago = PAGADO |
| 400 | El monto (...) excede el saldo pendiente (...) | Sobrepago |
| 400 | Los pedidos de CONTADO requieren pago completo | Primer pago CONTADO parcial |
| 400 | El plazo de pronto pago venció. Fecha límite: ... | Pronto pago fuera de plazo |

## 2.2 Pagos de un pedido

**Endpoint:** `GET /pedidos-pagos/pedido/:PedidoID`

**Response:** lista de pagos + `resumen` `{ TotalPedido, TotalPagado, TotalNotasCredito, SaldoPendiente, EstadoPago, FormaPago }`.

## 2.3 Eliminar pago

**Endpoint:** `DELETE /pedidos-pagos/:PedidoPagoID`

**Descripción:** Soft delete + revierte saldo bancario + recalcula `EstadoPago`.

**Errores:** `404` pago no encontrado; `400` "El pago ya fue eliminado"; `400` "No se puede eliminar un pago de un pedido ya entregado" (EstadoEntrega = ENTREGADO).

---

# 3. Recepciones (`/pedidos-recepciones`)

## 3.1 Registrar recepción

**Endpoint:** `POST /pedidos-recepciones`

**Descripción:** Registra la entrada (parcial o total) de mercancía. Mueve inventario y kardex (solo refacciones), recalcula `EstadoEntrega` y `TotalRecibido`. Transaccional.

**Payload:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `PedidoID` | number | Sí | |
| `FechaRecepcion` | string (date) | No | Default: hoy |
| `NumeroFactura` | string(100) | No | |
| `Observaciones` | string(500) | No | |
| `UsuarioID` | number | No | |
| `Detalles` | array | Sí | Mínimo 1 |

**Detalle:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `PedidoDetalleID` | number | Sí | Renglón del pedido a recibir |
| `CantidadRecibida` | number | Sí | Positivo. No puede exceder lo pendiente |

> `MontoRecepcion` lo calcula el backend = Σ(CantidadRecibida × PrecioUnitario).

**Ejemplo de Request:**
```json
{
  "PedidoID": 1,
  "FechaRecepcion": "2026-06-25",
  "UsuarioID": 14,
  "Detalles": [ { "PedidoDetalleID": 1, "CantidadRecibida": 4 } ]
}
```

**Response Exitoso (201):** `{ status: 201, message: "Recepción registrada correctamente", data: { PedidoRecepcionID, MontoRecepcion, pedidos_recepciones_detalle: [...] } }`

**Errores:**
| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | Pedido no encontrado | |
| 400 | El pedido ya está completamente entregado | EstadoEntrega = ENTREGADO |
| 400 | El detalle X no pertenece al pedido Y | Pertenencia |
| 400 | La cantidad a recibir (X) excede lo pendiente (Y) del detalle Z | Exceso |

## 3.2 Recepciones de un pedido

**Endpoint:** `GET /pedidos-recepciones/pedido/:PedidoID`

## 3.3 Obtener recepción por ID

**Endpoint:** `GET /pedidos-recepciones/:PedidoRecepcionID` — `404` si no existe.

---

# 4. Descuentos y Notas de Crédito (`/pedidos-descuentos`)

> El descuento por pronto pago se aplica vía `/pedidos-pagos` (ver 2.1). Este módulo gestiona la aplicación de notas de crédito y el listado/eliminación de descuentos.

## 4.1 Aplicar nota de crédito

**Endpoint:** `POST /pedidos-descuentos/nota-credito`

**Descripción:** Aplica una NC existente (del módulo `notas-credito`, estado `DISPONIBLE`) a un pedido. Cubre saldo (Modelo 2). Si la NC excede el saldo, aplica lo necesario y **genera una NC nueva con el excedente**. Marca la NC original como `APLICADO`.

**Payload:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `PedidoID` | number | Sí | |
| `NotaCreditoID` | number | Sí | NC del mismo proveedor que el pedido |
| `MontoAplicado` | number | No | Default: monto total de la NC |

**Ejemplo de Request:**
```json
{ "PedidoID": 1, "NotaCreditoID": 36 }
```

**Response Exitoso (201):**
```json
{
  "status": 201,
  "message": "Nota de crédito aplicada correctamente",
  "error": false,
  "data": {
    "PedidoID": 1,
    "NotaCreditoID": 36,
    "MontoAplicado": 400,
    "MontoExcedente": 0,
    "NotaExcedente": null
  }
}
```

**Errores:**
| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | Pedido no encontrado / Nota de crédito no encontrada | |
| 400 | Esta nota de crédito ya fue aplicada | Estado APLICADO |
| 400 | La nota de crédito no pertenece al proveedor de este pedido | Proveedor distinto |
| 400 | Este pedido ya está completamente cubierto | Saldo ≤ 0 |

## 4.2 Listar descuentos de un pedido

**Endpoint:** `GET /pedidos-descuentos/pedido/:PedidoID` — Todos los descuentos activos (PRONTO_PAGO + NOTA_CREDITO).

## 4.3 Eliminar descuento

**Endpoint:** `DELETE /pedidos-descuentos/:PedidoDescuentoID`

**Descripción:** Soft delete + revierte el efecto:
- `PRONTO_PAGO` → revierte `TotalDescuentos` y recalcula `TotalNeto`.
- `NOTA_CREDITO` → revierte `TotalNotasCredito` y recalcula `EstadoPago`.

---

## Modelo de Datos

### pedidos_encabezado
| Campo | Tipo | Descripción |
|-------|------|-------------|
| PedidoID | Int (PK) | |
| ProveedorID | Int? | FK escalar a catalogo_proveedores |
| NumeroPedido | VarChar(100)? | Manual, no único |
| FechaPedido | Date? | |
| TotalBruto / TotalIVA / TotalNeto | Decimal(14,2) | Calculados por backend |
| AplicaIVA | TinyInt | 1/0 (boolean en API) |
| TasaIVA | Decimal(6,4) | Default 0.1600 |
| TotalPagado / TotalRecibido / TotalNotasCredito / TotalDescuentos | Decimal(14,2) | Acumulados (cache) |
| FormaPago / EstadoPago / EstadoEntrega | Enum | Reusan enums de compras |
| DiasCredito / FechaVencimientoCredito | Int? / Date? | |
| UsuarioID / Observaciones / FechaAlta / IsActive | | |

### pedidos_detalle
PedidoDetalleID (PK), PedidoID, RefaccionID?/EquipoID?/EquipoVirtualID?, Cantidad (Int), PrecioUnitario/SubTotal/Total (Decimal 14,2), IsActive.

### pedidos_facturas
PedidoFacturaID (PK), PedidoID, FacturaID (@unique), FechaAsociacion, UsuarioID, IsActive.

### pedidos_pagos
PedidoPagoID (PK), PedidoID, FechaPago (Date), Monto (Decimal 14,2), MetodoPagoID?, CuentaBancariaID?, Referencia?, Observaciones?, UsuarioID?, FechaAlta, IsActive.

### pedidos_descuentos
PedidoDescuentoID (PK), PedidoID, PedidoFacturaID?, PedidoPagoID?, NotaCreditoID?, TipoDescuento (enum: PRONTO_PAGO / AJUSTE / BONIFICACION / NOTA_CREDITO), MontoBase, PorcentajeDescuento, MontoDescuento (Decimal 14,2), FechaBase?/FechaLimite?/FechaAplicacion (Date), Observaciones?, UsuarioID?, FechaAlta, IsActive.

### pedidos_recepciones_encabezado
PedidoRecepcionID (PK), PedidoID, FechaRecepcion (Date), Observaciones?, MontoRecepcion (Decimal 14,2), NumeroFactura?, UsuarioID?, FechaAlta, IsActive.

### pedidos_recepciones_detalle
PedidoRecepcionDetalleID (PK), PedidoRecepcionID, PedidoDetalleID?, RefaccionID?, CantidadRecibida (Int), IsActive.

---

## Notas Importantes

- **Soft delete:** todas las entidades usan `IsActive` (no se borra físicamente).
- **Totales = cache calculado:** los `Total*` del encabezado los calcula el backend desde las tablas hijas; nunca se editan a mano ni se confían del payload.
- **Inventario:** solo las **refacciones** mueven inventario/kardex en las recepciones (kardex tipo `Entrada_Compra`). Los equipos virtuales se registran pero no tocan stock.
- **Facturas:** se asocian como respaldo documental; no alimentan los totales del pedido.
- **Independencia:** el módulo no modifica `compras` ni `notas_credito` (solo consume/aplica NC existentes).
- **Saldo bancario:** los pagos con `CuentaBancariaID` registran egreso en `historial_movimientos_bancarios` y descuentan `catalogo_cuentasBancarias.Saldo`. Al eliminar el pago, se revierte.

---

**Última actualización:** 2026-06-25
