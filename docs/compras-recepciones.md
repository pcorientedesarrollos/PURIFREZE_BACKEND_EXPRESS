# API de Compras Recepciones - Purifreeze Backend

## Informacion General

**Base URL:** `http://localhost:3000`

**Prefijo de ruta:** `/compras-recepciones`

**Autenticacion:** Bearer Token (JWT)

---

## Endpoints

### 1. Crear Recepcion de Compra

**Endpoint:** `POST /compras-recepciones`

**Descripcion:** Registra una recepcion parcial o completa de una compra. Automaticamente actualiza inventario, crea registros en Kardex, actualiza costo promedio de refacciones y genera el pago correspondiente.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Payload:**

| Campo | Tipo | Requerido | Validaciones | Descripcion |
|-------|------|-----------|--------------|-------------|
| `CompraEncabezadoID` | number | Si | Debe existir y no estar finalizada | ID de la compra a recepcionar |
| `FechaRecepcion` | string | No | Formato: "YYYY-MM-DD" | Fecha de recepcion (default: fecha actual) |
| `Observaciones` | string | No | - | Notas de la recepcion (default: "Recepcion parcial de compra") |
| `MontoRecepcion` | number | Si | No puede exceder monto pendiente | Monto a pagar en esta recepcion |
| `UsuarioID` | number | Si | - | ID del usuario que registra |
| `MetodoPagoID` | number | Si | - | ID del metodo de pago |
| `CuentaBancariaID` | number | Si | Debe tener saldo suficiente | ID de la cuenta bancaria |
| `Detalles` | array | Si | Minimo 1 elemento | Lista de refacciones a recibir |

**Estructura de Detalles:**

| Campo | Tipo | Requerido | Validaciones | Descripcion |
|-------|------|-----------|--------------|-------------|
| `RefaccionID` | number | Si | Debe existir en la compra | ID de la refaccion |
| `CantidadEstablecida` | number | Si | No puede exceder cantidad pendiente | Cantidad a recibir |

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
  "message": "Recepcion de compra registrada correctamente",
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

| Codigo | Mensaje | Causa |
|--------|---------|-------|
| 400 | Bad Request (campo: mensaje) | Validacion Zod fallida |
| 400 | No ingresaste ninguna refaccion en la recepcion | Array de detalles vacio |
| 400 | La compra ya esta finalizada | Intentar recepcionar compra con estatus "Finalizado" |
| 400 | Saldo insuficiente en la cuenta bancaria | Cuenta sin fondos suficientes |
| 400 | La refaccion {ID} no existe en la compra | RefaccionID no pertenece a la compra |
| 400 | La cantidad a recibir ({X}) para la refaccion {ID} excede la cantidad pendiente ({Y}) | Cantidad excede lo pendiente |
| 400 | El monto de la recepcion (${X}) excede el monto pendiente por pagar (${Y}) | Monto mayor al adeudado |
| 404 | Compra no encontrada | CompraEncabezadoID no existe |
| 404 | La cuenta bancaria no existe | CuentaBancariaID invalido |

**Efectos Secundarios:**
- Crea registro en `compras_recepciones_encabezado`
- Crea registros en `compras_recepciones_detalle` por cada refaccion
- Actualiza `inventario` (suma cantidad a bodega general)
- Crea registros en `kardex` (tipo: "Entrada_Compra")
- Actualiza `CostoPromedio` en `catalogo_refacciones`
- Crea registro en `pagos`
- Crea registro en `historial_movimientos_bancarios`
- Actualiza saldo en `catalogo_cuentasBancarias`
- Si la recepcion completa todas las cantidades y pagos, cambia `Estatus` de la compra a "Finalizado"

---

### 2. Obtener Todas las Recepciones

**Endpoint:** `GET /compras-recepciones`

**Descripcion:** Obtiene lista de todas las recepciones registradas con sus detalles.

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

**Descripcion:** Obtiene todas las recepciones incluyendo informacion de los pagos asociados a cada compra.

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
          "Observaciones": "Pago parcial de compra #15 - Recepcion #12",
          "IsActive": 1
        }
      ]
    }
  ]
}
```

---

### 4. Obtener Recepcion por ID

**Endpoint:** `GET /compras-recepciones/:ComprasRecepcionesEncabezadoID`

**Descripcion:** Obtiene una recepcion especifica por su ID.

**Headers:**
```
Authorization: Bearer {token}
```

**Parametros de URL:**

| Parametro | Tipo | Requerido | Descripcion |
|-----------|------|-----------|-------------|
| `ComprasRecepcionesEncabezadoID` | number | Si | ID de la recepcion |

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Recepcion obtenida",
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

| Codigo | Mensaje | Causa |
|--------|---------|-------|
| 400 | Bad Request (ComprasRecepcionesEncabezadoID: ID debe ser un numero valido) | Parametro no numerico |
| 404 | Recepcion no encontrada | ID no existe |

---

### 5. Obtener Recepciones por Compra

**Endpoint:** `GET /compras-recepciones/compra/:CompraEncabezadoID`

**Descripcion:** Obtiene todas las recepciones asociadas a una compra especifica.

**Headers:**
```
Authorization: Bearer {token}
```

**Parametros de URL:**

| Parametro | Tipo | Requerido | Descripcion |
|-----------|------|-----------|-------------|
| `CompraEncabezadoID` | number | Si | ID de la compra |

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
      "FechaRecepcion": "2025-11-28",
      "Observaciones": "Primera entrega parcial",
      "MontoRecepcion": 5000.00,
      "UsuarioID": 1,
      "IsActive": 1,
      "compras_recepciones_detalle": [...]
    }
  ]
}
```

---

### 6. Obtener Detalle Completo de Compra para Recepciones (PRINCIPAL)

**Endpoint:** `GET /compras-recepciones/compra/:CompraEncabezadoID/with-pagos`

**Descripcion:** **ENDPOINT PRINCIPAL PARA FRONTEND.** Obtiene toda la informacion necesaria para gestionar recepciones de una compra: datos de la compra, refacciones con cantidades pendientes, historial de recepciones, pagos y resumen de totales.

**Headers:**
```
Authorization: Bearer {token}
```

**Parametros de URL:**

| Parametro | Tipo | Requerido | Descripcion |
|-----------|------|-----------|-------------|
| `CompraEncabezadoID` | number | Si | ID de la compra |

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Recepciones con pagos de la compra obtenidas",
  "error": false,
  "data": {
    "compra": {
      "CompraEncabezadoID": 16,
      "ProveedorID": 1,
      "FechaCompra": "2025-11-28",
      "Estatus": "Pendiente",
      "Subtotal": 1650.00,
      "IVA": 264.00,
      "TotalNeto": 1914.00,
      "Observaciones": "Compra de refacciones"
    },
    "refacciones": [
      {
        "CompraDetalleID": 20,
        "RefaccionID": 6,
        "NombreRefaccion": "Filtro de aceite",
        "Descripcion": "Filtro para motor",
        "CantidadComprada": 30,
        "CantidadRecibida": 30,
        "CantidadPendiente": 0,
        "PrecioUnitario": 50.00,
        "SubtotalComprado": 1500.00,
        "SubtotalRecibido": 1500.00,
        "SubtotalPendiente": 0.00,
        "Completado": true
      },
      {
        "CompraDetalleID": 21,
        "RefaccionID": 3,
        "NombreRefaccion": "Bujia NGK",
        "Descripcion": "Bujia de encendido",
        "CantidadComprada": 10,
        "CantidadRecibida": 1,
        "CantidadPendiente": 9,
        "PrecioUnitario": 15.00,
        "SubtotalComprado": 150.00,
        "SubtotalRecibido": 15.00,
        "SubtotalPendiente": 135.00,
        "Completado": false
      }
    ],
    "recepciones": [
      {
        "ComprasRecepcionesEncabezadoID": 7,
        "CompraEncabezadoID": 16,
        "FechaRecepcion": "2025-11-28",
        "Observaciones": "Recepcion parcial de compra",
        "MontoRecepcion": 1914.00,
        "UsuarioID": 0,
        "IsActive": 1,
        "compras_recepciones_detalle": [
          {
            "ComprasRecepcionesDetalleID": 8,
            "ComprasRecepcionesEncabezadoID": 7,
            "RefaccionID": 6,
            "CantidadEstablecida": 30,
            "IsActive": 1
          },
          {
            "ComprasRecepcionesDetalleID": 9,
            "ComprasRecepcionesEncabezadoID": 7,
            "RefaccionID": 3,
            "CantidadEstablecida": 1,
            "IsActive": 1
          }
        ]
      }
    ],
    "pagos": [
      {
        "PagosID": 5,
        "ReferenciaTipo": "Compras",
        "ReferenciaID": 16,
        "MetodoPagoID": 1,
        "CuentaBancariaID": 5,
        "Monto": 1914.00,
        "FechaPago": "2025-11-28",
        "Observaciones": "Pago parcial de compra #16 - Recepcion #7",
        "UsuarioID": 0,
        "IsActive": 1
      }
    ],
    "resumen": {
      "totalRecepciones": 1,
      "totalPagos": 1,
      "montoTotalCompra": 1914.00,
      "montoTotalRecibido": 1914.00,
      "montoTotalPagado": 1914.00,
      "montoPendientePago": 0.00,
      "totalRefaccionesCompradas": 40,
      "totalRefaccionesRecibidas": 31,
      "totalRefaccionesPendientes": 9,
      "compraFinalizada": false,
      "recepcionCompleta": false,
      "pagoCompleto": true
    }
  }
}
```

---

## Estructura de Datos del Endpoint Principal

### Objeto `compra`
Informacion general de la compra.

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `CompraEncabezadoID` | number | ID de la compra |
| `ProveedorID` | number | ID del proveedor |
| `FechaCompra` | string | Fecha de la compra (YYYY-MM-DD) |
| `Estatus` | string | "Pendiente" o "Finalizado" |
| `Subtotal` | number | Subtotal sin IVA |
| `IVA` | number | Monto del IVA |
| `TotalNeto` | number | Total con IVA |
| `Observaciones` | string | Notas de la compra |

### Array `refacciones`
Lista de refacciones de la compra con informacion de recepciones.

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `CompraDetalleID` | number | ID del detalle de compra |
| `RefaccionID` | number | ID de la refaccion |
| `NombreRefaccion` | string | Nombre de la refaccion |
| `Descripcion` | string | Descripcion de la refaccion |
| `CantidadComprada` | number | Cantidad original de la compra |
| `CantidadRecibida` | number | Cantidad ya recibida en recepciones anteriores |
| `CantidadPendiente` | number | **Cantidad que falta por recibir** |
| `PrecioUnitario` | number | Precio unitario de la refaccion |
| `SubtotalComprado` | number | CantidadComprada * PrecioUnitario |
| `SubtotalRecibido` | number | CantidadRecibida * PrecioUnitario |
| `SubtotalPendiente` | number | **Monto pendiente por recibir de esta refaccion** |
| `Completado` | boolean | `true` si CantidadPendiente <= 0 |

### Array `recepciones`
Historial de recepciones de la compra.

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `ComprasRecepcionesEncabezadoID` | number | ID de la recepcion |
| `CompraEncabezadoID` | number | ID de la compra |
| `FechaRecepcion` | string | Fecha (YYYY-MM-DD) |
| `Observaciones` | string | Notas |
| `MontoRecepcion` | number | Monto pagado en esta recepcion |
| `UsuarioID` | number | Usuario que registro |
| `compras_recepciones_detalle` | array | Detalle de refacciones recibidas |

### Array `pagos`
Historial de pagos de la compra.

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `PagosID` | number | ID del pago |
| `Monto` | number | Monto pagado |
| `FechaPago` | string | Fecha (YYYY-MM-DD) |
| `MetodoPagoID` | number | ID del metodo de pago |
| `CuentaBancariaID` | number | ID de la cuenta bancaria |
| `Observaciones` | string | Notas del pago |

### Objeto `resumen`
Totales y estado de la compra.

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `totalRecepciones` | number | Numero de recepciones registradas |
| `totalPagos` | number | Numero de pagos registrados |
| `montoTotalCompra` | number | Total neto de la compra |
| `montoTotalRecibido` | number | Suma de MontoRecepcion de todas las recepciones |
| `montoTotalPagado` | number | Suma de todos los pagos |
| `montoPendientePago` | number | **Monto que falta por pagar** |
| `totalRefaccionesCompradas` | number | Suma de todas las cantidades compradas |
| `totalRefaccionesRecibidas` | number | Suma de todas las cantidades recibidas |
| `totalRefaccionesPendientes` | number | **Total de unidades pendientes por recibir** |
| `compraFinalizada` | boolean | `true` si Estatus = "Finalizado" |
| `recepcionCompleta` | boolean | `true` si totalRefaccionesPendientes <= 0 |
| `pagoCompleto` | boolean | `true` si montoPendientePago <= 0 |

---

## Uso en Frontend

### Mostrar Modal de Recepciones

```javascript
// 1. Obtener datos de la compra
const response = await fetch(`/compras-recepciones/compra/${compraId}/with-pagos`);
const { data } = await response.json();

// 2. Mostrar informacion de la compra
console.log(`Compra #${data.compra.CompraEncabezadoID}`);
console.log(`Total: $${data.compra.TotalNeto}`);
console.log(`Pendiente: $${data.resumen.montoPendientePago}`);

// 3. Mostrar refacciones pendientes
const pendientes = data.refacciones.filter(r => !r.Completado);
pendientes.forEach(ref => {
  console.log(`${ref.NombreRefaccion}: ${ref.CantidadPendiente} unidades pendientes`);
});

// 4. Verificar si se puede crear otra recepcion
if (data.resumen.compraFinalizada) {
  console.log('La compra ya esta finalizada');
}
```

### Calcular Monto al Seleccionar Cantidades

```javascript
// Usuario selecciona cantidades a recibir
const seleccion = [
  { RefaccionID: 6, cantidad: 10 },
  { RefaccionID: 3, cantidad: 5 }
];

// Calcular monto total
let montoTotal = 0;
seleccion.forEach(sel => {
  const refaccion = data.refacciones.find(r => r.RefaccionID === sel.RefaccionID);
  if (refaccion) {
    // Validar que no exceda la cantidad pendiente
    if (sel.cantidad > refaccion.CantidadPendiente) {
      alert(`Maximo ${refaccion.CantidadPendiente} unidades para ${refaccion.NombreRefaccion}`);
      return;
    }
    montoTotal += sel.cantidad * refaccion.PrecioUnitario;
  }
});

console.log(`Monto a pagar: $${montoTotal}`);

// Validar que no exceda el monto pendiente
if (montoTotal > data.resumen.montoPendientePago) {
  alert(`El monto maximo pendiente es $${data.resumen.montoPendientePago}`);
}
```

### Crear Nueva Recepcion

```javascript
const nuevaRecepcion = {
  CompraEncabezadoID: data.compra.CompraEncabezadoID,
  FechaRecepcion: "2025-11-29",
  Observaciones: "Segunda entrega",
  MontoRecepcion: montoTotal, // Calculado arriba
  UsuarioID: 1,
  MetodoPagoID: 1,
  CuentaBancariaID: 5,
  Detalles: seleccion.map(s => ({
    RefaccionID: s.RefaccionID,
    CantidadEstablecida: s.cantidad
  }))
};

const response = await fetch('/compras-recepciones', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(nuevaRecepcion)
});

const result = await response.json();
if (result.data.compraFinalizada) {
  alert('Compra finalizada!');
}
```

---

## Modelo de Datos

### compras_recepciones_encabezado

| Campo | Tipo | Nullable | Descripcion |
|-------|------|----------|-------------|
| `ComprasRecepcionesEncabezadoID` | Int | No | Clave primaria (autoincrement) |
| `CompraEncabezadoID` | Int | Si | FK a `compras_encabezado` |
| `FechaRecepcion` | DateTime | Si | Fecha de la recepcion |
| `Observaciones` | String(255) | Si | Notas de la recepcion |
| `MontoRecepcion` | Float | Si | Monto pagado en esta recepcion |
| `UsuarioID` | Int | Si | Usuario que registro |
| `IsActive` | TinyInt | Si | 1=Activo, 0=Inactivo |

### compras_recepciones_detalle

| Campo | Tipo | Nullable | Descripcion |
|-------|------|----------|-------------|
| `ComprasRecepcionesDetalleID` | Int | No | Clave primaria (autoincrement) |
| `ComprasRecepcionesEncabezadoID` | Int | Si | FK a `compras_recepciones_encabezado` |
| `RefaccionID` | Int | Si | FK a `catalogo_refacciones` |
| `CantidadEstablecida` | Float | Si | Cantidad recibida |
| `IsActive` | TinyInt | Si | 1=Activo, 0=Inactivo |

---

## Relaciones

```
compras_encabezado (1) <---- (N) compras_recepciones_encabezado
                                        |
                                        +---- (N) compras_recepciones_detalle
```

- **compras_encabezado -> compras_recepciones_encabezado:** Una compra puede tener multiples recepciones (parciales)
- **compras_recepciones_encabezado -> compras_recepciones_detalle:** Una recepcion tiene multiples lineas de detalle

---

## Flujo de Trabajo Tipico

### Escenario: Recepcion Parcial de Compra

1. **Compra creada** con `Estatus: "Pendiente"` y 3 refacciones
2. **Frontend llama** `GET /compras-recepciones/compra/16/with-pagos`
3. **Muestra** refacciones con sus cantidades pendientes
4. **Usuario selecciona** cantidades a recibir y monto a pagar
5. **Frontend crea** recepcion con `POST /compras-recepciones`
6. **Sistema:**
   - Actualiza inventario y kardex
   - Crea pago automatico
   - Si todo esta completo, finaliza la compra
7. **Frontend refresca** datos llamando nuevamente al endpoint

### Validaciones Automaticas

1. **Cantidad:** No se puede recibir mas de lo pendiente por cada refaccion
2. **Monto:** No se puede pagar mas de lo adeudado
3. **Saldo:** La cuenta bancaria debe tener saldo suficiente
4. **Estatus:** No se puede recepcionar una compra ya finalizada

---

## Notas Importantes

- **Transaccional:** Todas las operaciones de creacion son atomicas (si algo falla, se revierte todo)
- **Timeout extendido:** Las transacciones tienen 30 segundos de timeout
- **Pago Automatico:** Cada recepcion crea automaticamente un pago y movimiento bancario
- **Costo Promedio:** Se actualiza automaticamente usando promedio ponderado
- **Kardex:** Se crea entrada tipo "Entrada_Compra" por cada refaccion recibida
- **Finalizacion Automatica:** La compra se finaliza cuando:
  - Todas las cantidades de refacciones estan recibidas (cantidad recibida >= cantidad comprada)
  - El monto total pagado >= total neto de la compra

---

**Ultima actualizacion:** 2025-11-29
