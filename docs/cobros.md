# API de Cobros - Purifreeze Backend

## Información General

**Base URL:** `http://localhost:3000`

**Prefijo de ruta:** `/cobros`

**Autenticación:** Bearer Token requerido

---

## Descripción del Módulo

El módulo de **Cobros** gestiona los cargos recurrentes generados por contratos de renta de equipos. A diferencia de las **Ventas** (transacciones únicas), los cobros son cargos periódicos que se generan automáticamente según la configuración del contrato.

### Flujo General:
1. Se crea un **Contrato** de renta con un cliente
2. Se **configura** la generación de cobros (frecuencia, monto, duración)
3. Se **generan** los cobros automáticamente (al activar el contrato)
4. Se **gestionan** los cobros: pagos, descuentos, regalos, cancelaciones

### Estatus de un Cobro:
| Estatus | Descripción |
|---------|-------------|
| `PENDIENTE` | Cobro sin pagar, dentro de fecha |
| `VENCIDO` | Cobro sin pagar, fecha ya pasó |
| `PARCIAL` | Con pagos parciales (no cubre el total) |
| `PAGADO` | Completamente pagado |
| `REGALADO` | Marcado como cortesía (monto = 0) |
| `PROMOCION` | Cubierto por promoción |
| `CANCELADO` | Cobro cancelado |

### Frecuencias de Cobro Disponibles:
- `SEMANAL` - Cada semana
- `QUINCENAL` - Cada 15 días
- `MENSUAL` - Cada mes
- `BIMESTRAL` - Cada 2 meses
- `TRIMESTRAL` - Cada 3 meses
- `SEMESTRAL` - Cada 6 meses
- `ANUAL` - Cada año

### Formato de Número de Cobro:
`{NumeroContrato}-C###` (Ejemplo: CTR-2026-0001-C001, CTR-2026-0001-C002, etc.)

---

## Endpoints

---

## CONFIGURACIÓN Y GENERACIÓN DE COBROS

### 1. Configurar Cobros de un Contrato

**Endpoint:** `POST /cobros/contrato/:ContratoID/configurar`

**Descripción:** Define cómo se generarán los cobros para un contrato. Solo funciona para contratos en estatus `EN_REVISION` o `ACTIVO`. Calcula automáticamente el número total de cobros según la duración y frecuencia.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `ContratoID` | number | Sí | ID del contrato |

**Payload:**

| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `FechaInicialCobros` | string | Sí | ISO-8601 | Fecha del primer cobro |
| `MontoCobro` | number | Sí | min: 0 | Monto de cada cobro |
| `TipoTiempoContrato` | string | Sí | enum | ANIOS, MESES, SEMANAS, DIAS |
| `TiempoContrato` | number | Sí | min: 1 | Duración del contrato |
| `FrecuenciaCobro` | string | Sí | enum | SEMANAL, QUINCENAL, MENSUAL, etc. |
| `TiempoFrecuencia` | number | No | min: 1 | Multiplicador (default: 1). Ej: 2 = cada 2 meses |
| `Observaciones` | string | No | max: 500 | Notas de la configuración |
| `UsuarioID` | number | Sí | - | Usuario que configura |

**Ejemplo de Request:**
```json
{
  "FechaInicialCobros": "2026-02-01",
  "MontoCobro": 550,
  "TipoTiempoContrato": "ANIOS",
  "TiempoContrato": 1,
  "FrecuenciaCobro": "MENSUAL",
  "TiempoFrecuencia": 1,
  "Observaciones": "Cobro mensual por renta de purificador",
  "UsuarioID": 5
}
```

**Cálculo del Total de Cobros:**
- Contrato: 1 año = 12 meses
- Frecuencia: Mensual (cada 1 mes)
- **Total de Cobros: 12**

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Configuración de cobros guardada exitosamente",
  "error": false,
  "data": {
    "configuracion": {
      "ConfiguracionID": 1,
      "ContratoID": 10,
      "FechaInicialCobros": "2026-02-01T00:00:00.000Z",
      "MontoCobro": 550,
      "TipoTiempoContrato": "ANIOS",
      "TiempoContrato": 1,
      "FrecuenciaCobro": "MENSUAL",
      "TiempoFrecuencia": 1,
      "TotalCobros": 12,
      "CobrosGenerados": 0,
      "Observaciones": "Cobro mensual por renta de purificador",
      "UsuarioID": 5
    },
    "totalCobrosAGenerar": 12
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | El contrato no existe | ContratoID inválido |
| 300 | Solo se pueden configurar cobros para contratos EN_REVISION o ACTIVO | Estatus inválido |

---

### 2. Obtener Configuración de Cobros

**Endpoint:** `GET /cobros/contrato/:ContratoID/configuracion`

**Descripción:** Obtiene la configuración de cobros de un contrato.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `ContratoID` | number | Sí | ID del contrato |

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Configuración obtenida exitosamente",
  "error": false,
  "data": {
    "ConfiguracionID": 1,
    "ContratoID": 10,
    "FechaInicialCobros": "2026-02-01T00:00:00.000Z",
    "MontoCobro": 550,
    "TipoTiempoContrato": "ANIOS",
    "TiempoContrato": 1,
    "FrecuenciaCobro": "MENSUAL",
    "TiempoFrecuencia": 1,
    "TotalCobros": 12,
    "CobrosGenerados": 12
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | No hay configuración de cobros para este contrato | Sin configuración |

---

### 3. Generar Cobros

**Endpoint:** `POST /cobros/contrato/:ContratoID/generar`

**Descripción:** Genera todos los cobros pendientes según la configuración. Típicamente se ejecuta al activar el contrato. Crea los registros de cobro con fechas de vencimiento calculadas.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `ContratoID` | number | Sí | ID del contrato |

**Payload:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `UsuarioID` | number | Sí | Usuario que genera los cobros |

**Ejemplo de Request:**
```json
{
  "UsuarioID": 5
}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Se generaron 12 cobros exitosamente",
  "error": false,
  "data": {
    "cobrosGenerados": 12,
    "totalCobros": 12,
    "cobros": [
      {
        "CobroID": 1,
        "ContratoID": 10,
        "NumeroCobro": "CTR-2026-0001-C001",
        "NumeroPeriodo": 1,
        "FechaVencimiento": "2026-02-01T00:00:00.000Z",
        "MontoOriginal": 550,
        "MontoFinal": 550,
        "Estatus": "PENDIENTE"
      },
      {
        "CobroID": 2,
        "NumeroCobro": "CTR-2026-0001-C002",
        "NumeroPeriodo": 2,
        "FechaVencimiento": "2026-03-01T00:00:00.000Z",
        "MontoOriginal": 550,
        "MontoFinal": 550,
        "Estatus": "PENDIENTE"
      }
    ]
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | No hay configuración de cobros para este contrato | Sin configurar |
| 300 | Todos los cobros ya han sido generados | Ya se generaron |

---

## CONSULTAS

### 4. Obtener Todos los Cobros

**Endpoint:** `GET /cobros`

**Descripción:** Lista todos los cobros con filtros opcionales y paginación.

**Headers:**
```
Authorization: Bearer {token}
```

**Query Params:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `ContratoID` | number | No | Filtrar por contrato |
| `ClienteID` | number | No | Filtrar por cliente |
| `Estatus` | string | No | PENDIENTE, PAGADO, PARCIAL, VENCIDO, REGALADO, PROMOCION, CANCELADO |
| `FechaDesde` | string | No | Fecha inicial de vencimiento |
| `FechaHasta` | string | No | Fecha final de vencimiento |
| `Vencidos` | string | No | "true" para solo vencidos |
| `page` | number | No | Página (default: 1) |
| `limit` | number | No | Registros por página (default: 20) |

**Ejemplo de Request:**
```
GET /cobros?Estatus=PENDIENTE&page=1&limit=10
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Cobros obtenidos exitosamente",
  "error": false,
  "data": {
    "cobros": [
      {
        "CobroID": 1,
        "NumeroCobro": "CTR-2026-0001-C001",
        "NumeroPeriodo": 1,
        "FechaVencimiento": "2026-02-01T00:00:00.000Z",
        "MontoOriginal": 550,
        "MontoFinal": 550,
        "Estatus": "PENDIENTE",
        "contrato": {
          "ContratoID": 10,
          "NumeroContrato": "CTR-2026-0001",
          "cliente": {
            "ClienteID": 1,
            "NombreComercio": "Restaurante El Buen Sabor"
          }
        },
        "cliente_equipo": {
          "plantilla": {
            "PlantillaEquipoID": 3,
            "NombreEquipo": "Purificador Industrial"
          }
        }
      }
    ],
    "pagination": {
      "total": 50,
      "page": 1,
      "limit": 10,
      "totalPages": 5
    }
  }
}
```

---

### 5. Obtener Cobros Vencidos

**Endpoint:** `GET /cobros/vencidos`

**Descripción:** Lista todos los cobros pendientes cuya fecha de vencimiento ya pasó.

**Headers:**
```
Authorization: Bearer {token}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Cobros vencidos obtenidos exitosamente",
  "error": false,
  "data": [
    {
      "CobroID": 5,
      "NumeroCobro": "CTR-2026-0001-C001",
      "FechaVencimiento": "2026-01-01T00:00:00.000Z",
      "MontoFinal": 550,
      "Estatus": "PENDIENTE",
      "contrato": {
        "cliente": {
          "ClienteID": 1,
          "NombreComercio": "Restaurante El Buen Sabor"
        }
      }
    }
  ]
}
```

---

### 6. Obtener Cobros por Contrato

**Endpoint:** `GET /cobros/contrato/:ContratoID`

**Descripción:** Lista todos los cobros de un contrato específico con resumen de estados.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `ContratoID` | number | Sí | ID del contrato |

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Cobros del contrato obtenidos exitosamente",
  "error": false,
  "data": {
    "cobros": [
      {
        "CobroID": 1,
        "NumeroCobro": "CTR-2026-0001-C001",
        "NumeroPeriodo": 1,
        "FechaVencimiento": "2026-02-01T00:00:00.000Z",
        "MontoOriginal": 550,
        "MontoFinal": 550,
        "MontoPagado": 550,
        "Estatus": "PAGADO",
        "FechaPago": "2026-02-01T00:00:00.000Z"
      },
      {
        "CobroID": 2,
        "NumeroCobro": "CTR-2026-0001-C002",
        "NumeroPeriodo": 2,
        "FechaVencimiento": "2026-03-01T00:00:00.000Z",
        "MontoOriginal": 550,
        "MontoFinal": 550,
        "MontoPagado": null,
        "Estatus": "PENDIENTE"
      }
    ],
    "resumen": {
      "totalCobros": 12,
      "pendientes": 10,
      "pagados": 1,
      "parciales": 0,
      "vencidos": 1,
      "regalados": 0,
      "promociones": 0,
      "cancelados": 0,
      "montoTotalEsperado": 6600,
      "montoTotalCobrado": 550
    }
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | El contrato no existe | ContratoID inválido |

---

### 7. Obtener Resumen de Cobros por Cliente

**Endpoint:** `GET /cobros/cliente/:ClienteID/resumen`

**Descripción:** Obtiene un resumen consolidado de todos los cobros de un cliente.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `ClienteID` | number | Sí | ID del cliente |

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Resumen del cliente obtenido exitosamente",
  "error": false,
  "data": {
    "cliente": {
      "ClienteID": 1,
      "NombreComercio": "Restaurante El Buen Sabor"
    },
    "totalCobros": 24,
    "pendientes": 20,
    "vencidos": 2,
    "pagados": 4,
    "montoTotalPendiente": 11000,
    "montoTotalPagado": 2200
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | El cliente no existe | ClienteID inválido |

---

### 8. Obtener Cobro por ID

**Endpoint:** `GET /cobros/:CobroID`

**Descripción:** Obtiene el detalle completo de un cobro incluyendo historial de acciones.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `CobroID` | number | Sí | ID del cobro |

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Cobro obtenido exitosamente",
  "error": false,
  "data": {
    "CobroID": 1,
    "ContratoID": 10,
    "NumeroCobro": "CTR-2026-0001-C001",
    "NumeroPeriodo": 1,
    "FechaVencimiento": "2026-02-01T00:00:00.000Z",
    "MontoOriginal": 550,
    "MontoDescuento": null,
    "MontoPromocion": null,
    "MontoFinal": 550,
    "MontoPagado": 550,
    "Estatus": "PAGADO",
    "FechaPago": "2026-02-01T00:00:00.000Z",
    "MetodoPagoID": 1,
    "Referencia": "TRF-001",
    "MotivoEspecial": null,
    "DescripcionMotivo": null,
    "MotivoCancelacion": null,
    "Observaciones": null,
    "contrato": {
      "ContratoID": 10,
      "NumeroContrato": "CTR-2026-0001",
      "cliente": {
        "ClienteID": 1,
        "NombreComercio": "Restaurante El Buen Sabor"
      },
      "sucursal": {
        "SucursalID": 2,
        "NombreSucursal": "Sucursal Centro"
      }
    },
    "cliente_equipo": {
      "plantilla": {...},
      "equipo": {...}
    },
    "historial": [
      {
        "HistorialID": 1,
        "TipoAccion": "CREACION",
        "Descripcion": "Cobro generado automáticamente - Periodo 1/12",
        "FechaAccion": "2026-01-15T10:00:00.000Z"
      },
      {
        "HistorialID": 2,
        "TipoAccion": "PAGO",
        "Descripcion": "Pago registrado por $550",
        "ValorAnterior": "{\"Estatus\":\"PENDIENTE\"}",
        "ValorNuevo": "{\"Estatus\":\"PAGADO\",\"MontoPagado\":550}",
        "FechaAccion": "2026-02-01T14:30:00.000Z"
      }
    ]
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | El cobro no existe | CobroID inválido |

---

## ACCIONES SOBRE COBROS

### 9. Registrar Pago Completo

**Endpoint:** `PATCH /cobros/:CobroID/pagar`

**Descripción:** Registra el pago completo de un cobro. Cambia el estatus a `PAGADO`.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `CobroID` | number | Sí | ID del cobro |

**Payload:**

| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `MetodoPagoID` | number | Sí | - | ID del método de pago |
| `MontoPagado` | number | Sí | min: 0 | Monto del pago |
| `FechaPago` | string | No | ISO-8601 | Fecha del pago (default: hoy) |
| `Referencia` | string | No | max: 100 | Referencia bancaria/voucher |
| `Observaciones` | string | No | max: 500 | Observaciones |
| `UsuarioID` | number | Sí | - | Usuario que registra |

**Ejemplo de Request:**
```json
{
  "MetodoPagoID": 1,
  "MontoPagado": 550,
  "FechaPago": "2026-02-01",
  "Referencia": "TRF-001",
  "UsuarioID": 5
}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Pago registrado exitosamente",
  "error": false,
  "data": {
    "CobroID": 1,
    "Estatus": "PAGADO",
    "MontoPagado": 550,
    "FechaPago": "2026-02-01T00:00:00.000Z"
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | El cobro no existe | CobroID inválido |
| 300 | No se puede registrar pago en un cobro con estatus PAGADO | Ya está pagado |
| 300 | No se puede registrar pago en un cobro con estatus REGALADO | Es regalo |
| 300 | No se puede registrar pago en un cobro con estatus CANCELADO | Está cancelado |

---

### 10. Registrar Pago Parcial

**Endpoint:** `PATCH /cobros/:CobroID/pago-parcial`

**Descripción:** Registra un pago parcial. Acumula el monto al pagado anterior. Si completa el monto, cambia a `PAGADO`, si no, cambia a `PARCIAL`.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `CobroID` | number | Sí | ID del cobro |

**Payload:** (Mismo que pago completo)

| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `MetodoPagoID` | number | Sí | - | ID del método de pago |
| `MontoPagado` | number | Sí | min: 0.01 | Monto del pago parcial |
| `FechaPago` | string | No | ISO-8601 | Fecha del pago |
| `Referencia` | string | No | max: 100 | Referencia |
| `Observaciones` | string | No | max: 500 | Observaciones |
| `UsuarioID` | number | Sí | - | Usuario que registra |

**Ejemplo de Request:**
```json
{
  "MetodoPagoID": 1,
  "MontoPagado": 300,
  "FechaPago": "2026-02-01",
  "Observaciones": "Primer abono",
  "UsuarioID": 5
}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Pago parcial registrado exitosamente",
  "error": false,
  "data": {
    "CobroID": 1,
    "Estatus": "PARCIAL",
    "MontoFinal": 550,
    "MontoPagado": 300
  }
}
```

**Lógica:**
- Si `MontoPagado acumulado >= MontoFinal` → Estatus = `PAGADO`
- Si `MontoPagado acumulado < MontoFinal` → Estatus = `PARCIAL`

---

### 11. Aplicar Regalo/Cortesía

**Endpoint:** `PATCH /cobros/:CobroID/regalar`

**Descripción:** Marca el cobro como regalo/cortesía. El monto final se convierte en 0 y el estatus cambia a `REGALADO`.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `CobroID` | number | Sí | ID del cobro |

**Payload:**

| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `MotivoEspecial` | string | No | enum | REGALO, PROMOCION, DESCUENTO, BONIFICACION, CORTESIA (default: REGALO) |
| `DescripcionMotivo` | string | No | max: 255 | Descripción del motivo |
| `Observaciones` | string | No | max: 500 | Observaciones |
| `UsuarioID` | number | Sí | - | Usuario que aplica |

**Ejemplo de Request:**
```json
{
  "MotivoEspecial": "CORTESIA",
  "DescripcionMotivo": "Cliente preferente - primer mes gratis",
  "UsuarioID": 5
}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Cobro marcado como regalo exitosamente",
  "error": false,
  "data": {
    "CobroID": 1,
    "Estatus": "REGALADO",
    "MontoFinal": 0,
    "MontoPagado": 0,
    "MotivoEspecial": "CORTESIA",
    "DescripcionMotivo": "Cliente preferente - primer mes gratis"
  }
}
```

---

### 12. Aplicar Descuento

**Endpoint:** `PATCH /cobros/:CobroID/descuento`

**Descripción:** Aplica un descuento o promoción al cobro. Reduce el monto final pero NO lo marca como pagado. Si el descuento es 100%, el estatus cambia a `PROMOCION`.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `CobroID` | number | Sí | ID del cobro |

**Payload:**

| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `TipoDescuento` | string | Sí | enum | PORCENTAJE o MONTO |
| `ValorDescuento` | number | Sí | min: 0.01 | Valor del descuento |
| `MotivoEspecial` | string | No | enum | REGALO, PROMOCION, DESCUENTO, BONIFICACION, CORTESIA |
| `DescripcionMotivo` | string | No | max: 255 | Descripción |
| `Observaciones` | string | No | max: 500 | Observaciones |
| `UsuarioID` | number | Sí | - | Usuario que aplica |

**Ejemplo de Request (Descuento Porcentaje):**
```json
{
  "TipoDescuento": "PORCENTAJE",
  "ValorDescuento": 20,
  "MotivoEspecial": "DESCUENTO",
  "DescripcionMotivo": "Descuento por pago anticipado",
  "UsuarioID": 5
}
```

**Ejemplo de Request (Descuento Monto Fijo):**
```json
{
  "TipoDescuento": "MONTO",
  "ValorDescuento": 100,
  "MotivoEspecial": "BONIFICACION",
  "DescripcionMotivo": "Bonificación por referido",
  "UsuarioID": 5
}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Descuento aplicado exitosamente",
  "error": false,
  "data": {
    "CobroID": 1,
    "MontoOriginal": 550,
    "MontoDescuento": 110,
    "MontoFinal": 440,
    "Estatus": "PENDIENTE"
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 300 | El porcentaje de descuento no puede ser mayor a 100 | Porcentaje > 100 |
| 300 | El monto del descuento no puede ser mayor al monto original | Monto > Original |

---

### 13. Pagar con Descuento (Operación Combinada)

**Endpoint:** `PATCH /cobros/:CobroID/pagar-con-descuento`

**Descripción:** Aplica un descuento y registra el pago en una sola operación. Útil cuando se negocia un descuento en el momento del pago.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `CobroID` | number | Sí | ID del cobro |

**Payload:**

| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `TipoDescuento` | string | Sí | enum | PORCENTAJE o MONTO |
| `ValorDescuento` | number | Sí | min: 0 | Valor del descuento |
| `MetodoPagoID` | number | Sí | - | ID del método de pago |
| `FechaPago` | string | No | ISO-8601 | Fecha del pago |
| `Referencia` | string | No | max: 100 | Referencia |
| `MotivoEspecial` | string | No | enum | Motivo del descuento |
| `DescripcionMotivo` | string | No | max: 255 | Descripción |
| `Observaciones` | string | No | max: 500 | Observaciones |
| `UsuarioID` | number | Sí | - | Usuario |

**Ejemplo de Request:**
```json
{
  "TipoDescuento": "PORCENTAJE",
  "ValorDescuento": 50,
  "MetodoPagoID": 1,
  "FechaPago": "2026-02-01",
  "Referencia": "EFE-001",
  "MotivoEspecial": "DESCUENTO",
  "DescripcionMotivo": "50% descuento por pago en efectivo",
  "UsuarioID": 5
}
```

**Cálculo:**
- Monto Original: $550
- Descuento 50%: -$275
- Monto Final: $275
- Monto Pagado: $275
- Estatus: `PAGADO`

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Cobro pagado con descuento exitosamente. Original: $550, Descuento: $275.00, Pagado: $275.00",
  "error": false,
  "data": {
    "CobroID": 1,
    "MontoOriginal": 550,
    "MontoDescuento": 275,
    "MontoFinal": 275,
    "MontoPagado": 275,
    "Estatus": "PAGADO"
  }
}
```

**Nota:** Si el descuento es 100%, el estatus será `REGALADO` en lugar de `PAGADO`.

---

### 14. Cancelar Cobro

**Endpoint:** `PATCH /cobros/:CobroID/cancelar`

**Descripción:** Cancela un cobro. No se pueden cancelar cobros ya pagados.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `CobroID` | number | Sí | ID del cobro |

**Payload:**

| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `MotivoCancelacion` | string | Sí | max: 255 | Motivo de la cancelación |
| `Observaciones` | string | No | max: 500 | Observaciones adicionales |
| `UsuarioID` | number | Sí | - | Usuario que cancela |

**Ejemplo de Request:**
```json
{
  "MotivoCancelacion": "Contrato terminado anticipadamente",
  "Observaciones": "Cliente solicitó baja del servicio",
  "UsuarioID": 5
}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Cobro cancelado exitosamente",
  "error": false,
  "data": {
    "CobroID": 1,
    "Estatus": "CANCELADO",
    "MotivoCancelacion": "Contrato terminado anticipadamente"
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 300 | No se puede cancelar un cobro con estatus PAGADO | Ya pagado |
| 300 | No se puede cancelar un cobro con estatus CANCELADO | Ya cancelado |

---

### 15. Modificar Monto de Cobro

**Endpoint:** `PATCH /cobros/:CobroID/monto`

**Descripción:** Modifica el monto original de un cobro. Útil para ajustes de precio acordados con el cliente.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `CobroID` | number | Sí | ID del cobro |

**Payload:**

| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `MontoNuevo` | number | Sí | min: 0 | Nuevo monto del cobro |
| `Motivo` | string | No | max: 255 | Motivo del cambio |
| `UsuarioID` | number | Sí | - | Usuario que modifica |

**Ejemplo de Request:**
```json
{
  "MontoNuevo": 500,
  "Motivo": "Ajuste de tarifa acordado con cliente",
  "UsuarioID": 5
}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Monto modificado exitosamente",
  "error": false,
  "data": {
    "CobroID": 1,
    "MontoOriginal": 500,
    "MontoFinal": 500
  }
}
```

---

## TAREAS ADMINISTRATIVAS

### 16. Marcar Cobros Vencidos

**Endpoint:** `POST /cobros/marcar-vencidos`

**Descripción:** Actualiza el estatus de todos los cobros pendientes cuya fecha de vencimiento ya pasó a `VENCIDO`. Esta es una tarea administrativa que típicamente se ejecuta mediante un cron job.

**Headers:**
```
Authorization: Bearer {token}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Se marcaron 5 cobros como vencidos",
  "error": false,
  "data": {
    "cobrosActualizados": 5
  }
}
```

---

## Flujo de Trabajo Típico

### 1. Configurar un Contrato para Cobros
```
POST /cobros/contrato/:ContratoID/configurar
→ Define frecuencia, monto, duración
→ Calcula total de cobros
```

### 2. Generar los Cobros
```
POST /cobros/contrato/:ContratoID/generar
→ Crea todos los registros de cobro
→ Asigna fechas de vencimiento
→ Estado inicial: PENDIENTE
```

### 3. Gestionar Cobros del Día a Día
```
GET /cobros?Estatus=PENDIENTE               → Ver pendientes
GET /cobros/vencidos                        → Ver vencidos
GET /cobros/cliente/:ClienteID/resumen      → Ver situación del cliente
```

### 4. Registrar Pagos
```
PATCH /cobros/:CobroID/pagar                → Pago completo
PATCH /cobros/:CobroID/pago-parcial         → Pago parcial
PATCH /cobros/:CobroID/pagar-con-descuento  → Pago con descuento
```

### 5. Casos Especiales
```
PATCH /cobros/:CobroID/regalar              → Marcar como cortesía
PATCH /cobros/:CobroID/descuento            → Aplicar descuento
PATCH /cobros/:CobroID/cancelar             → Cancelar cobro
PATCH /cobros/:CobroID/monto                → Ajustar monto
```

---

## Historial de Acciones

Cada acción sobre un cobro genera un registro en el historial con:
- `TipoAccion`: CREACION, PAGO, PAGO_PARCIAL, DESCUENTO, PROMOCION, REGALO, CANCELACION, MODIFICACION
- `Descripcion`: Texto descriptivo de la acción
- `ValorAnterior`: Estado previo (JSON)
- `ValorNuevo`: Estado nuevo (JSON)
- `UsuarioID`: Quién realizó la acción
- `FechaAccion`: Cuándo se realizó

---

## Diferencia entre Cobros y Ventas

| Aspecto | Cobros | Ventas |
|---------|--------|--------|
| **Propósito** | Cargos recurrentes por renta | Venta directa de productos/servicios |
| **Origen** | Generados desde contratos | Manuales o desde presupuestos |
| **Items** | Periodos de renta | Equipos, refacciones, servicios |
| **Recurrencia** | Múltiple (según frecuencia) | Única |
| **IVA** | Ya incluido en monto configurado | Calculado automáticamente (16%) |
| **Módulo relacionado** | `/cobros` | `/ventas` |

Ver documentación de [Ventas](./ventas.md) para venta directa de productos.

---

## Notas Importantes

1. **Soft Delete:** El campo `IsActive` indica si el registro está activo
2. **Historial:** Todas las acciones quedan registradas en el historial del cobro
3. **Estatus automático:** Al registrar pagos, el estatus se actualiza automáticamente
4. **Descuentos acumulables:** Los descuentos reducen el MontoFinal respecto al MontoOriginal
5. **Pago parcial acumulativo:** Cada pago parcial se suma al MontoPagado anterior
6. **Tarea programada:** Se recomienda ejecutar `/marcar-vencidos` diariamente

---

**Última actualización:** 2026-01-15
