# Módulo Pedidos — Funcionamiento (Pagos, Notas de Crédito y Recepciones)

**Última actualización:** 2026-06-27

Documento funcional del módulo **Pedidos** de Purifreze ERP. Cubre el modelo de
cobertura/saldo, el flujo de **pagos con pronto pago**, **notas de crédito** y
**recepciones**. Backend Express + Prisma; frontend Angular 21 (signals).

> El módulo Pedidos es independiente del módulo `compras` (no comparten tablas ni
> código), pero replica su comportamiento. Conectado al módulo Facturas CFDI.

---

## 1. Conceptos base

### Tablas
| Tabla | Rol |
|---|---|
| `pedidos_encabezado` | Cabecera. Totales cache: `TotalNeto`, `TotalPagado`, `TotalNotasCredito`, `TotalDescuentos`, `TotalRecibido`. Estados: `EstadoPago`, `EstadoEntrega`. |
| `pedidos_detalle` | Renglones (refacción / equipo virtual), `Cantidad`, `PrecioUnitario`. |
| `pedidos_facturas` | Facturas CFDI asociadas al pedido. |
| `pedidos_pagos` | Pagos al proveedor. `Monto` = neto pagado. |
| `pedidos_descuentos` | Movimientos que reducen lo adeudado: `PRONTO_PAGO` y `NOTA_CREDITO`. |
| `pedidos_recepciones_encabezado` / `_detalle` | Recepciones de mercancía. |

### Dos ejes independientes
El pedido avanza por dos ejes que NO dependen entre sí:

| Eje | Campo | Estados |
|---|---|---|
| **Pago** | `EstadoPago` | PENDIENTE → PARCIAL → PAGADO |
| **Entrega** | `EstadoEntrega` | PEDIDO → PARCIAL → ENTREGADO |

`TotalNeto = TotalBruto + IVA` y es **fijo** (no baja por descuentos).

---

## 2. Cobertura y saldo — Modelo PRONTO PAGO v4

**Regla central (v4):** los descuentos por pronto pago **SÍ cubren saldo**. El descuento
es dinero que el proveedor condona; lo facturado se salda con el pago neto + el descuento.

```
TotalDescuentosPP = SUM(pedidos_descuentos.MontoDescuento)
                    WHERE IsActive = true AND TipoDescuento = 'PRONTO_PAGO'

TotalCubierto  = TotalPagado + TotalNotasCredito + TotalDescuentosPP
SaldoPendiente = TotalNeto - TotalPagado - TotalNotasCredito - TotalDescuentosPP

EstadoPago: PAGADO si TotalCubierto >= TotalNeto
            PARCIAL si TotalCubierto > 0
            PENDIENTE si TotalCubierto = 0
```

Esta fórmula es **idéntica** en los 7 puntos del backend que tocan cobertura/saldo:
`pedidos-pagos: create / getByPedido / actualizarEstadoPagoPedido`,
`pedidos-descuentos: recalcularEstadoPago / aplicarNotaCredito`,
`pedidos: findAll / findOneRaw`.

> **Por qué v4:** antes (v3) los descuentos no contaban como cobertura y quedaba un
> "saldo fantasma" igual a la suma de descuentos (ej. pedido #9: saldo $205.28 que en
> realidad estaba saldado). v4 lo corrige.

**Ejemplo (pedido #9):** Neto $10,263.68 = Pagado $10,058.40 + Descuento PP $205.28 +
NC $0.00 → Saldo $0.00, EstadoPago PAGADO.

---

## 3. Pagos (`/pedidos-pagos`)

El **frontend envía el `Monto` ya neto** (con el descuento de pronto pago restado). El
banco egresa ese monto directo.

### Endpoints
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/pedidos-pagos` | Registra un pago. Acepta pronto pago opcional. |
| GET | `/pedidos-pagos/pedido/:PedidoID` | Pagos + `resumen` (incluye `TotalDescuentos`). |
| DELETE | `/pedidos-pagos/:PedidoPagoID` | Soft-delete; revierte saldo bancario y descuento PP vinculado. |

### Pronto pago (integrado en POST /pedidos-pagos)
Campos opcionales en el body: `DescuentoPorcentaje`, `DiasProntoPago`, `FechaBase`,
`MontoDescuento`.

Flujo:
1. Valida el plazo: `FechaPago <= FechaBase + DiasProntoPago` (si vence → 400).
2. Guarda un registro `pedidos_descuentos` tipo `PRONTO_PAGO` (histórico + cobertura).
3. `pedidos_pagos.Monto` se guarda neto. El descuento suma a `TotalDescuentos` y cubre saldo.
4. La validación de saldo en `create` resta los descuentos PP previos (evita sobrepago).

### Frontend — pantalla `pedido-pagos`
- Header con desglose: **Total Pedido · Pagado · Descuento Pronto Pago · Notas de Crédito · Saldo Pendiente** + línea de cuadre (Pagado + Descuento + NC + Saldo = Total).
- Al elegir factura: autollena Monto, Referencia, FechaBase y **Fecha de Pago = FechaEmisión + 7 días**.
- Checkbox "Aplicar descuento por pronto pago" con %, Días y Fecha base; preview del neto.
- **Advertencia** de vigencia: si hoy está dentro del rango `[FechaBase, FechaBase + Días]`, muestra el tiempo restante para que expire el descuento (no bloquea el pago).

---

## 4. Notas de Crédito (`/pedidos-descuentos`)

Las NC del proveedor cubren saldo del pedido **sin bajar el neto** (suman a `TotalNotasCredito`).

### Endpoints
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/pedidos-descuentos/nota-credito` | Aplica una NC al pedido. Body `{ PedidoID, NotaCreditoID, MontoAplicado? }`. |
| GET | `/pedidos-descuentos/pedido/:PedidoID` | Lista descuentos activos (PRONTO_PAGO + NOTA_CREDITO). |
| DELETE | `/pedidos-descuentos/:PedidoDescuentoID` | Soft-delete + revierte (NC baja `TotalNotasCredito`; PP solo recalcula estado). |

### Comportamiento de aplicar NC
1. Valida que la NC pertenezca al **mismo proveedor** y esté `DISPONIBLE`.
2. Calcula el saldo pendiente (modelo v4, restando también descuentos PP).
3. Aplica `min(montoNota, saldoPendiente)`. Si la NC excede el saldo, **parte la NC**:
   marca la original `APLICADO` y genera una NC nueva `DISPONIBLE` con el excedente.
4. Sube `TotalNotasCredito` y recalcula `EstadoPago`.

> Importante: aplicar NC en pedidos es `POST /pedidos-descuentos/nota-credito`
> (NO `/notas-credito/:id/aplicar`, que es de compras).

### Frontend (en la pantalla `pedido-pagos`)
- Sección **"Notas de Crédito Disponibles"** del proveedor con botón *Aplicar*.
- Sección **"Descuentos Aplicados"** (pronto pago + NC) con badge de tipo, monto, % y
  eliminación con confirmación.

---

## 5. Recepciones (`/pedidos-recepciones`)

Funcionan igual que en compras. Registran mercancía recibida (parcial o total), mueven
**inventario + kardex + costo promedio** (solo refacciones; equipos virtuales no) y
actualizan el eje de **entrega**.

### Endpoints
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/pedidos-recepciones` | Registra una recepción. Body `{ PedidoID, FechaRecepcion?, NumeroFactura?, Observaciones?, UsuarioID, Detalles:[{ PedidoDetalleID, CantidadRecibida }] }`. |
| GET | `/pedidos-recepciones/pedido/:PedidoID` | Recepciones crudas del pedido. |
| GET | `/pedidos-recepciones/pedido/:PedidoID/with-pagos` | **Enriquecido**: items con pedido/recibido/pendiente/subtotales + recepciones + pagos + resumen. |
| GET | `/pedidos-recepciones/:PedidoRecepcionID` | Una recepción por ID. |

### Reglas de negocio (POST)
- No se recibe sobre un pedido ya `ENTREGADO`.
- Cada `PedidoDetalleID` debe pertenecer al pedido.
- No exceder lo pendiente: `pendiente = Cantidad_pedida − Σ recibido_previo`.
- `MontoRecepcion = Σ(CantidadRecibida × PrecioUnitario)`.
- Solo refacciones mueven inventario/kardex/costo (equipos virtuales no).
- Recalcula `EstadoEntrega` (PEDIDO/PARCIAL/ENTREGADO) y `TotalRecibido`.

### Endpoint enriquecido `/with-pagos` — shape
```
data: {
  pedido:   { PedidoID, ProveedorID, FechaPedido, TotalBruto, TotalIVA, TotalNeto },
  refacciones: [{ PedidoDetalleID, RefaccionID, EquipoVirtualID, EsEquipoVirtual,
                  NombreRefaccion, Descripcion, CantidadPedida, CantidadRecibida,
                  CantidadPendiente, PrecioUnitario, SubtotalPedido, SubtotalRecibido,
                  SubtotalPendiente, Completado }],
  recepciones: [ ...activas con pedidos_recepciones_detalle ],
  pagos:    [ ...desde pedidos_pagos (NO la tabla pagos genérica) ],
  resumen:  { totalRecepciones, totalPagos, montoTotalPedido, montoTotalRecibido,
              montoTotalPagado, montoPendientePago, totalItemsPedidos,
              totalItemsRecibidos, totalItemsPendientes, recepcionCompleta, pagoCompleto }
}
```
El cálculo de pendientes vive **solo en el backend** (fuente única de verdad); el
frontend no recalcula.

### Frontend — modal `pedido-recepciones-modal`
- Se abre desde la acción **"Recepciones"** en la lista de pedidos (`pedidos-lista`).
- Portado de `compra-recepciones-modal` (mismo patrón).
- Muestra: header del pedido + badge Completo/Pendiente, tabla de items con
  **Pedido / Recibido / Pendiente** y campo *Recibir*, botón **"Recibir Todo"**, y un
  **historial colapsable** de recepciones y pagos.
- Si no hay items pendientes: mensaje "Todas las refacciones han sido recibidas".
- Al registrar, recarga datos y notifica a la lista (`recepcionCreated`).

> **Nota técnica:** los montos (`TotalNeto`, `Monto`) pueden llegar como string (Prisma
> `Decimal`). En el template se castean con `+valor` / `Number(...)` antes de `.toFixed(2)`
> para no romper el render.

---

## 6. Estado de implementación

| Área | Estado |
|---|---|
| Backend pedidos (CRUD, facturas, pagos, descuentos, NC, recepciones) | Completo |
| Pronto pago v4 (cobertura) | Completo, 7 puntos consistentes |
| Frontend pagos (incl. pronto pago, NC, descuentos, desglose header) | Completo |
| Frontend recepciones (modal + endpoint enriquecido) | Completo |
| Validación runtime extremo a extremo | Parcial (pendiente prueba final del usuario) |

Pendiente / siguiente: autollenado de detalle desde XML (match `Modelo = NoIdentificacion`)
y comparación pedido-vs-facturado.
