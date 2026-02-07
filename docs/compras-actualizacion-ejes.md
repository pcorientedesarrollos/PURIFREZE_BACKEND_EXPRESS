# Actualización API de Compras - Sistema de Ejes Independientes

**Fecha:** 2026-02-06

Este documento describe los cambios en las APIs existentes para soportar el nuevo sistema de ejes independientes (PAGO y ENTREGA).

---

## Resumen de Cambios

| Módulo | Cambios |
|--------|---------|
| `/compras` | Nuevos campos en request/response |
| `/compras-recepciones` | Ya no crea pagos automáticos |
| `/compras-pagos` | **NUEVO** - Gestión de pagos |

---

## Cambios en `/compras`

### POST /compras - Crear Compra

**Nuevos campos en el payload:**

| Campo | Tipo | Requerido | Default | Descripción |
|-------|------|-----------|---------|-------------|
| `FormaPago` | string | No | `"CREDITO"` | `"CONTADO"` o `"CREDITO"` |
| `DiasCredito` | number | No | null | Días de crédito |
| `FechaVencimientoCredito` | string | No | null | Fecha límite (YYYY-MM-DD) |

**Nota:** `CuentaBancariaID` ahora es **opcional** (solo requerido para CONTADO).

**Ejemplo - Compra a Crédito:**
```json
{
  "ProveedorID": 1,
  "FechaCompra": "2026-02-06",
  "FormaPago": "CREDITO",
  "DiasCredito": 30,
  "TotalBruto": 10000,
  "TotalNeto": 11600,
  "Estatus": "Pendiente",
  "Detalles": [...]
}
```

**Ejemplo - Compra de Contado:**
```json
{
  "ProveedorID": 1,
  "FechaCompra": "2026-02-06",
  "FormaPago": "CONTADO",
  "CuentaBancariaID": 1,
  "MetodoPagoID": 2,
  "TotalBruto": 10000,
  "TotalNeto": 11600,
  "Estatus": "Pendiente",
  "Detalles": [...]
}
```

### GET /compras - Listar Compras

**Nuevos campos en la respuesta:**

```json
{
  "CompraEncabezadoID": 15,
  "ProveedorID": 1,
  "FechaCompra": "2026-02-06",
  "TotalNeto": 11600,
  "Estatus": "Pendiente",

  "FormaPago": "CREDITO",
  "EstadoPago": "PARCIAL",
  "EstadoEntrega": "NO_ENTREGADO",
  "TotalPagado": 5000,
  "TotalRecibido": 0,
  "DiasCredito": 30,
  "FechaVencimientoCredito": "2026-03-08",

  "compras_pagos": [
    {
      "CompraPagoID": 1,
      "Monto": 5000,
      "FechaPago": "2026-02-06"
    }
  ]
}
```

### GET /compras/:CompraEncabezadoID - Obtener Compra

**Nuevos campos en la respuesta:**

Incluye todo lo anterior más:
- `compras_pagos[]` - Lista de pagos
- `compras_recepciones[]` - Lista de recepciones con detalles

---

## Cambios en `/compras-recepciones`

### POST /compras-recepciones - Crear Recepción

**Campos que ya NO son requeridos:**

| Campo | Antes | Ahora |
|-------|-------|-------|
| `MetodoPagoID` | Requerido | Opcional (ignorado) |
| `CuentaBancariaID` | Requerido | Opcional (ignorado) |
| `MontoRecepcion` | Requerido | Opcional, default: 0 |

**Comportamiento anterior:** Creaba pago automático al recibir.

**Comportamiento nuevo:** Solo registra la recepción. Los pagos se hacen por separado en `/compras-pagos`.

**Ejemplo - Request simplificado:**
```json
{
  "CompraEncabezadoID": 15,
  "FechaRecepcion": "2026-02-06",
  "Observaciones": "Recepción parcial",
  "UsuarioID": 1,
  "Detalles": [
    { "RefaccionID": 100, "CantidadEstablecida": 10 },
    { "RefaccionID": 101, "CantidadEstablecida": 5 }
  ]
}
```

**Nueva respuesta:**
```json
{
  "status": 200,
  "message": "Recepción de compra registrada correctamente",
  "error": false,
  "data": {
    "recepcion": { ... },
    "estadoEntrega": "PARCIAL",
    "estadoPago": "PENDIENTE",
    "compraFinalizada": false
  }
}
```

---

## Nuevo Módulo `/compras-pagos`

Ver documentación completa en: `docs/compras-pagos.md`

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/compras-pagos` | POST | Registrar pago |
| `/compras-pagos/compra/:ID` | GET | Obtener pagos de compra |
| `/compras-pagos/:ID` | DELETE | Eliminar pago |

---

## Matriz de Estados

### EstadoPago x EstadoEntrega

| FormaPago | EstadoPago | EstadoEntrega | Interpretación |
|-----------|------------|---------------|----------------|
| CONTADO | PAGADO | NO_ENTREGADO | Pagado, esperando mercancía |
| CONTADO | PAGADO | PARCIAL | Recibiendo mercancía |
| CONTADO | PAGADO | ENTREGADO | Compra cerrada |
| CREDITO | PENDIENTE | NO_ENTREGADO | Compra nueva |
| CREDITO | PENDIENTE | PARCIAL | Recibiendo, sin pagar |
| CREDITO | PENDIENTE | ENTREGADO | **ALERTA**: Debe dinero |
| CREDITO | PARCIAL | * | Pagando |
| CREDITO | PAGADO | ENTREGADO | Compra cerrada |

---

## Migración Frontend

### Cambios requeridos:

1. **Formulario de Compras:**
   - Agregar selector `FormaPago` (CONTADO/CREDITO)
   - Agregar campo `DiasCredito` (opcional)
   - `CuentaBancariaID` solo visible si CONTADO

2. **Listado de Compras:**
   - Mostrar badges para `EstadoPago` y `EstadoEntrega`
   - Usar colores:
     - PENDIENTE: gris
     - PARCIAL: amarillo
     - PAGADO/ENTREGADO: verde

3. **Detalle de Compra:**
   - Sección de Pagos (usar `/compras-pagos/compra/:ID`)
   - Botón "Agregar Pago" si `EstadoPago !== 'PAGADO'`
   - Mostrar resumen: TotalPagado, SaldoPendiente

4. **Formulario de Recepciones:**
   - Remover campos `MetodoPagoID`, `CuentaBancariaID`
   - Remover campo `MontoRecepcion` (o hacerlo informativo)

5. **Nuevo Formulario de Pagos:**
   - Crear vista para registrar pagos
   - Campos: MetodoPagoID, CuentaBancariaID, Monto, FechaPago, Referencia

---

## Compatibilidad

- El campo `Estatus` (Pendiente/Pagado/Finalizado) se mantiene por compatibilidad
- Se actualiza automáticamente cuando `EstadoPago=PAGADO` y `EstadoEntrega=ENTREGADO`
- Recomendación: Usar los nuevos campos `EstadoPago` y `EstadoEntrega` en el frontend

---

**Última actualización:** 2026-02-06
