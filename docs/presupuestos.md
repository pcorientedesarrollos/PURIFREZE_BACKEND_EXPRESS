# API de Presupuestos - Purifreeze Backend

## Información General

**Base URL:** `http://localhost:3000`

**Prefijo de ruta:** `/presupuestos`

**Autenticación:** Bearer Token requerido

---

## Conceptos Importantes

### Tipos de Items (TipoItem)

| Valor | Descripción | Requiere |
|-------|-------------|----------|
| `EQUIPO_PURIFREEZE` | Equipo fabricado por Purifreeze | `PlantillaEquipoID` + `Modalidad` (VENTA o RENTA) |
| `EQUIPO_EXTERNO` | Equipo del cliente (mantenimiento) | `PlantillaEquipoID` + `Modalidad` = MANTENIMIENTO |
| `REFACCION` | Pieza/refaccion | `RefaccionID` |
| `SERVICIO` | Servicio adicional | `Descripcion` + `PrecioUnitario` obligatorio |

### Modalidades (Solo para Equipos)

| Valor | Descripcion | Uso |
|-------|-------------|-----|
| `VENTA` | Venta del equipo | Solo EQUIPO_PURIFREEZE |
| `RENTA` | Renta mensual | Solo EQUIPO_PURIFREEZE |
| `MANTENIMIENTO` | Servicio de mantenimiento | EQUIPO_EXTERNO |

### Estatus del Presupuesto

| Valor | Descripcion | Editable |
|-------|-------------|----------|
| `Pendiente` | Recien creado, en edicion | Si |
| `Enviado` | Enviado al cliente | No |
| `Aprobado` | Cliente acepto | No |
| `Rechazado` | Cliente rechazo | No |
| `Vencido` | Paso fecha de vigencia | No |

### Calculo de Precios

#### Precio Automatico (si PrecioUnitario = 0)

| TipoItem | Modalidad | Formula |
|----------|-----------|---------|
| EQUIPO_PURIFREEZE | VENTA | CostoTotal x (1 + PorcentajeVenta/100) |
| EQUIPO_PURIFREEZE | RENTA | CostoTotal x (PorcentajeRenta/100) |
| EQUIPO_EXTERNO | MANTENIMIENTO | CostoTotal x 0.20 |
| REFACCION | - | PrecioVenta de la refaccion |
| SERVICIO | - | **Obligatorio manual** |

#### Calculo de Subtotales

```
Base = PrecioUnitario x Cantidad
Si PeriodoRenta > 0:
    Base = Base x PeriodoRenta
Subtotal = Base - (Base x DescuentoPorcentaje/100) - DescuentoEfectivo
```

#### Calculo de Totales

```
SubtotalGeneral = Suma de Subtotales de detalles
SubtotalConDescuentos = SubtotalGeneral - (SubtotalGeneral x DescuentoPorcentaje/100) - DescuentoEfectivo + GastosAdicionales
IVA = SubtotalConDescuentos x 0.16
Total = SubtotalConDescuentos + IVA
```

---

## Endpoints

### 1. Crear Presupuesto

**Endpoint:** `POST /presupuestos`

**Descripcion:** Crea un nuevo presupuesto con sus items de detalle.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Payload:**

| Campo | Tipo | Requerido | Validaciones | Descripcion |
|-------|------|-----------|--------------|-------------|
| `ClienteID` | number | Si | > 0 | ID del cliente |
| `SucursalID` | number | No | > 0 | ID de sucursal (opcional) |
| `FechaVigencia` | string | Si | YYYY-MM-DD | Fecha hasta cuando es valido |
| `Observaciones` | string | No | max: 500 | Notas adicionales |
| `UsuarioID` | number | Si | > 0 | Usuario que crea |
| `DescuentoPorcentaje` | number | No | 0-100 | Descuento global % |
| `DescuentoEfectivo` | number | No | >= 0 | Descuento global $ |
| `GastosAdicionales` | number | No | >= 0 | Gastos extra $ |
| `detalles` | array | Si | min: 1 | Items del presupuesto |

**Estructura de cada detalle:**

| Campo | Tipo | Requerido | Validaciones | Descripcion |
|-------|------|-----------|--------------|-------------|
| `TipoItem` | string | Si | enum | Tipo de item |
| `Modalidad` | string | Condicional | enum | Requerido para equipos |
| `PlantillaEquipoID` | number | Condicional | > 0 | Requerido para equipos |
| `RefaccionID` | number | Condicional | > 0 | Requerido para refacciones |
| `Descripcion` | string | Condicional | max: 500 | Requerido para SERVICIO |
| `Cantidad` | number | No | min: 1 | Default: 1 |
| `PeriodoRenta` | number | Condicional | min: 1 | Meses de renta (solo RENTA) |
| `PrecioUnitario` | number | No | >= 0 | 0 = calcula automatico |
| `DescuentoPorcentaje` | number | No | 0-100 | Descuento del item % |
| `DescuentoEfectivo` | number | No | >= 0 | Descuento del item $ |

**Ejemplo de Request (Presupuesto mixto):**
```json
{
  "ClienteID": 1,
  "SucursalID": 2,
  "FechaVigencia": "2025-01-31",
  "Observaciones": "Presupuesto para nueva sucursal",
  "UsuarioID": 1,
  "DescuentoPorcentaje": 5,
  "detalles": [
    {
      "TipoItem": "EQUIPO_PURIFREEZE",
      "Modalidad": "RENTA",
      "PlantillaEquipoID": 1,
      "Cantidad": 2,
      "PeriodoRenta": 12,
      "PrecioUnitario": 0,
      "Descripcion": "Enfriador modelo estandar"
    },
    {
      "TipoItem": "EQUIPO_PURIFREEZE",
      "Modalidad": "VENTA",
      "PlantillaEquipoID": 2,
      "Cantidad": 1,
      "PrecioUnitario": 15000
    },
    {
      "TipoItem": "EQUIPO_EXTERNO",
      "Modalidad": "MANTENIMIENTO",
      "PlantillaEquipoID": 3,
      "Cantidad": 1,
      "PrecioUnitario": 0
    },
    {
      "TipoItem": "REFACCION",
      "RefaccionID": 10,
      "Cantidad": 5,
      "PrecioUnitario": 0
    },
    {
      "TipoItem": "SERVICIO",
      "Descripcion": "Instalacion y configuracion",
      "Cantidad": 1,
      "PrecioUnitario": 2500
    }
  ]
}
```

**Response Exitoso (201):**
```json
{
  "status": 201,
  "message": "Presupuesto obtenido",
  "error": false,
  "data": {
    "PresupuestoID": 1,
    "ClienteID": 1,
    "SucursalID": 2,
    "FechaCreacion": "2025-12-23",
    "FechaVigencia": "2025-01-31",
    "Estatus": "Pendiente",
    "Observaciones": "Presupuesto para nueva sucursal",
    "UsuarioID": 1,
    "Subtotal": 45000.00,
    "DescuentoPorcentaje": 5,
    "DescuentoEfectivo": null,
    "GastosAdicionales": null,
    "IVA": 6840.00,
    "Total": 49590.00,
    "IsActive": 1,
    "cliente": {
      "ClienteID": 1,
      "NombreComercio": "Empresa ABC",
      "Observaciones": null
    },
    "sucursal": {
      "SucursalID": 2,
      "NombreSucursal": "Sucursal Centro",
      "Direccion": "Av. Principal 123",
      "Telefono": "555-1234",
      "Contacto": "Juan Perez"
    },
    "detalles": [
      {
        "DetalleID": 1,
        "PresupuestoID": 1,
        "TipoItem": "EQUIPO_PURIFREEZE",
        "Modalidad": "RENTA",
        "PlantillaEquipoID": 1,
        "RefaccionID": null,
        "Descripcion": "Enfriador modelo estandar",
        "Cantidad": 2,
        "PeriodoRenta": 12,
        "PrecioUnitario": 1500.00,
        "DescuentoPorcentaje": null,
        "DescuentoEfectivo": null,
        "Subtotal": 36000.00,
        "IsActive": 1,
        "plantilla": {
          "PlantillaEquipoID": 1,
          "Codigo": "ENF-001",
          "NombreEquipo": "Enfriador Estandar",
          "EsExterno": 0,
          "PorcentajeVenta": 35,
          "PorcentajeRenta": 15
        },
        "refaccion": null
      }
    ]
  }
}
```

**Errores Posibles:**

| Codigo | Mensaje | Causa |
|--------|---------|-------|
| 400 | Bad Request (campo: mensaje) | Validacion Zod fallida |
| 404 | El cliente no existe | ClienteID no encontrado |
| 300 | El cliente no esta activo | Cliente dado de baja |
| 404 | La sucursal no existe | SucursalID no encontrado |
| 300 | La sucursal no pertenece al cliente | Sucursal de otro cliente |
| 300 | La sucursal no esta activa | Sucursal dada de baja |
| 404 | La refaccion X no existe o no esta activa | RefaccionID invalido |
| 404 | La plantilla X no existe o no esta activa | PlantillaEquipoID invalido |
| 300 | La plantilla es de tipo externo, use EQUIPO_EXTERNO | Tipo de plantilla incorrecto |
| 300 | La plantilla es de tipo Purifreeze, use EQUIPO_PURIFREEZE | Tipo de plantilla incorrecto |

---

### 2. Obtener Todos los Presupuestos

**Endpoint:** `GET /presupuestos`

**Descripcion:** Lista todos los presupuestos activos con informacion resumida.

**Headers:**
```
Authorization: Bearer {token}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Presupuestos obtenidos",
  "error": false,
  "data": [
    {
      "PresupuestoID": 1,
      "ClienteID": 1,
      "SucursalID": 2,
      "FechaCreacion": "2025-12-23",
      "FechaVigencia": "2025-01-31",
      "Estatus": "Pendiente",
      "Observaciones": "Presupuesto para nueva sucursal",
      "UsuarioID": 1,
      "Subtotal": 45000.00,
      "DescuentoPorcentaje": 5,
      "DescuentoEfectivo": null,
      "GastosAdicionales": null,
      "IVA": 6840.00,
      "Total": 49590.00,
      "IsActive": 1,
      "cliente": {
        "ClienteID": 1,
        "NombreComercio": "Empresa ABC"
      },
      "sucursal": {
        "SucursalID": 2,
        "NombreSucursal": "Sucursal Centro"
      },
      "_count": {
        "detalles": 5
      }
    }
  ]
}
```

---

### 3. Obtener Presupuesto por ID

**Endpoint:** `GET /presupuestos/:PresupuestoID`

**Descripcion:** Obtiene un presupuesto con todos sus detalles completos.

**Headers:**
```
Authorization: Bearer {token}
```

**Parametros de URL:**

| Parametro | Tipo | Requerido | Descripcion |
|-----------|------|-----------|-------------|
| `PresupuestoID` | number | Si | ID del presupuesto |

**Errores Posibles:**

| Codigo | Mensaje | Causa |
|--------|---------|-------|
| 400 | Bad Request (PresupuestoID: ID debe ser un numero valido) | ID invalido |
| 404 | Presupuesto no encontrado | No existe |

---

### 4. Obtener Presupuestos por Cliente

**Endpoint:** `GET /presupuestos/cliente/:ClienteID`

**Descripcion:** Lista todos los presupuestos de un cliente especifico.

**Headers:**
```
Authorization: Bearer {token}
```

**Parametros de URL:**

| Parametro | Tipo | Requerido | Descripcion |
|-----------|------|-----------|-------------|
| `ClienteID` | number | Si | ID del cliente |

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Presupuestos del cliente obtenidos",
  "error": false,
  "data": []
}
```

---

### 5. Obtener Precio de Plantilla

**Endpoint:** `GET /presupuestos/precio-plantilla/:PlantillaEquipoID?modalidad={modalidad}`

**Descripcion:** Calcula el precio de un equipo segun la modalidad seleccionada. Util para mostrar precio antes de agregar al presupuesto.

**Headers:**
```
Authorization: Bearer {token}
```

**Parametros de URL:**

| Parametro | Tipo | Requerido | Descripcion |
|-----------|------|-----------|-------------|
| `PlantillaEquipoID` | number | Si | ID de la plantilla |

**Query Params:**

| Parametro | Tipo | Requerido | Descripcion |
|-----------|------|-----------|-------------|
| `modalidad` | string | Si | VENTA, RENTA o MANTENIMIENTO |

**Ejemplo de Request:**
```
GET /presupuestos/precio-plantilla/1?modalidad=RENTA
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Precio calculado",
  "error": false,
  "data": {
    "PlantillaEquipoID": 1,
    "NombreEquipo": "Enfriador Estandar",
    "EsExterno": 0,
    "CostoTotal": 10000.00,
    "Modalidad": "RENTA",
    "PorcentajeAplicado": 15,
    "PrecioCalculado": 1500.00
  }
}
```

**Errores Posibles:**

| Codigo | Mensaje | Causa |
|--------|---------|-------|
| 400 | Bad Request (modalidad: Invalid enum value) | Modalidad invalida |
| 404 | Plantilla no encontrada | PlantillaEquipoID no existe |

---

### 6. Actualizar Encabezado del Presupuesto

**Endpoint:** `PUT /presupuestos/:PresupuestoID`

**Descripcion:** Actualiza los datos generales del presupuesto (solo en estado Pendiente).

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Parametros de URL:**

| Parametro | Tipo | Requerido | Descripcion |
|-----------|------|-----------|-------------|
| `PresupuestoID` | number | Si | ID del presupuesto |

**Payload (todos opcionales):**

| Campo | Tipo | Validaciones | Descripcion |
|-------|------|--------------|-------------|
| `ClienteID` | number | > 0 | Cambiar cliente |
| `SucursalID` | number/null | > 0 | Cambiar/quitar sucursal |
| `FechaVigencia` | string | YYYY-MM-DD | Nueva fecha vigencia |
| `Observaciones` | string/null | max: 500 | Actualizar notas |
| `DescuentoPorcentaje` | number/null | 0-100 | Descuento global % |
| `DescuentoEfectivo` | number/null | >= 0 | Descuento global $ |
| `GastosAdicionales` | number/null | >= 0 | Gastos extra $ |

**Ejemplo de Request:**
```json
{
  "FechaVigencia": "2025-02-28",
  "DescuentoPorcentaje": 10,
  "Observaciones": "Cliente frecuente - descuento especial"
}
```

**Errores Posibles:**

| Codigo | Mensaje | Causa |
|--------|---------|-------|
| 404 | Presupuesto no encontrado | No existe |
| 300 | Solo se pueden editar presupuestos en estado Pendiente | Estatus != Pendiente |
| 404 | El cliente no existe o no esta activo | ClienteID invalido |
| 404 | La sucursal no existe o no esta activa | SucursalID invalido |
| 300 | La sucursal no pertenece al cliente | Sucursal de otro cliente |

---

### 7. Cambiar Estatus del Presupuesto

**Endpoint:** `PATCH /presupuestos/:PresupuestoID/estatus`

**Descripcion:** Cambia el estatus del presupuesto.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Parametros de URL:**

| Parametro | Tipo | Requerido | Descripcion |
|-----------|------|-----------|-------------|
| `PresupuestoID` | number | Si | ID del presupuesto |

**Payload:**

| Campo | Tipo | Requerido | Validaciones | Descripcion |
|-------|------|-----------|--------------|-------------|
| `Estatus` | string | Si | enum | Nuevo estatus |

**Valores validos para Estatus:**
- `Pendiente`
- `Enviado`
- `Aprobado` **(PROCESAMIENTO AUTOMATICO)**
- `Rechazado`
- `Vencido`

**Ejemplo de Request:**
```json
{
  "Estatus": "Enviado"
}
```

**Response Exitoso (200) - Cambio a Enviado:**
```json
{
  "status": 200,
  "message": "Presupuesto actualizado a Enviado",
  "error": false,
  "data": {
    "PresupuestoID": 1,
    "Estatus": "Enviado"
  }
}
```

### Procesamiento Automatico al Aprobar

Cuando se cambia el estatus a `Aprobado`, el sistema procesa automaticamente el presupuesto:

1. **Items de VENTA (Equipos Purifreeze/Externos + Refacciones + Servicios):**
   - Se crea una **venta** (`ventas_encabezado`) con todos los items
   - Cada item genera un **detalle de venta** (`ventas_detalle`)

2. **Items de RENTA (Solo Equipos Purifreeze):**
   - Se crea un **contrato** (`contratos`) con duracion basada en PeriodoRenta
   - El monto mensual es la suma de precios de los equipos en renta

3. **Asignacion de Equipos:**
   - Cada equipo se registra en `clientes_equipos` con:
     - `TipoPropiedad: 'COMPRA'` para equipos vendidos
     - `TipoPropiedad: 'RENTA'` para equipos rentados (vinculado al contrato)
     - `TipoPropiedad: 'EXTERNO'` para equipos externos en mantenimiento

**Response Exitoso (200) - Cambio a Aprobado:**
```json
{
  "status": 200,
  "message": "Presupuesto aprobado y procesado correctamente",
  "error": false,
  "data": {
    "PresupuestoID": 1,
    "Estatus": "Aprobado",
    "Procesado": {
      "VentasCreadas": true,
      "ContratosCreados": true,
      "EquiposAsignados": 5
    }
  }
}
```

**Diagrama del Flujo de Aprobacion:**

```
Presupuesto Aprobado
        |
        v
+------------------+     +------------------+     +------------------+
|  Equipos VENTA   |---->|    VENTAS       |---->| clientes_equipos |
|  Refacciones     |     | (encabezado +   |     | TipoPropiedad:   |
|  Servicios       |     |  detalles)      |     | COMPRA           |
+------------------+     +------------------+     +------------------+
        |
+------------------+     +------------------+     +------------------+
|  Equipos RENTA   |---->|    CONTRATOS    |---->| clientes_equipos |
|                  |     | (monto mensual) |     | TipoPropiedad:   |
|                  |     |                 |     | RENTA + ContratoID|
+------------------+     +------------------+     +------------------+
        |
+------------------+                              +------------------+
| Equipos EXTERNOS |----------------------------->| clientes_equipos |
| (Mantenimiento)  |                              | TipoPropiedad:   |
+------------------+                              | EXTERNO          |
                                                  +------------------+
```

**Errores Posibles:**

| Codigo | Mensaje | Causa |
|--------|---------|-------|
| 400 | Bad Request (Estatus: Invalid enum value) | Estatus invalido |
| 404 | Presupuesto no encontrado | No existe |

---

### 8. Agregar Item al Presupuesto

**Endpoint:** `POST /presupuestos/:PresupuestoID/detalle`

**Descripcion:** Agrega un nuevo item al presupuesto (solo en estado Pendiente).

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Parametros de URL:**

| Parametro | Tipo | Requerido | Descripcion |
|-----------|------|-----------|-------------|
| `PresupuestoID` | number | Si | ID del presupuesto |

**Payload:** (Igual que el detalle en crear presupuesto)

| Campo | Tipo | Requerido | Validaciones | Descripcion |
|-------|------|-----------|--------------|-------------|
| `TipoItem` | string | Si | enum | Tipo de item |
| `Modalidad` | string | Condicional | enum | Requerido para equipos |
| `PlantillaEquipoID` | number | Condicional | > 0 | Requerido para equipos |
| `RefaccionID` | number | Condicional | > 0 | Requerido para refacciones |
| `Descripcion` | string | Condicional | max: 500 | Requerido para SERVICIO |
| `Cantidad` | number | No | min: 1 | Default: 1 |
| `PeriodoRenta` | number | Condicional | min: 1 | Meses de renta |
| `PrecioUnitario` | number | No | >= 0 | 0 = calcula automatico |
| `DescuentoPorcentaje` | number | No | 0-100 | Descuento % |
| `DescuentoEfectivo` | number | No | >= 0 | Descuento $ |

**Ejemplo de Request:**
```json
{
  "TipoItem": "REFACCION",
  "RefaccionID": 15,
  "Cantidad": 3,
  "PrecioUnitario": 0,
  "DescuentoPorcentaje": 10
}
```

**Errores Posibles:**

| Codigo | Mensaje | Causa |
|--------|---------|-------|
| 404 | Presupuesto no encontrado | No existe |
| 300 | Solo se pueden agregar items a presupuestos en estado Pendiente | Estatus != Pendiente |

---

### 9. Actualizar Item del Presupuesto

**Endpoint:** `PUT /presupuestos/detalle/:DetalleID`

**Descripcion:** Actualiza un item existente del presupuesto (solo en estado Pendiente).

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Parametros de URL:**

| Parametro | Tipo | Requerido | Descripcion |
|-----------|------|-----------|-------------|
| `DetalleID` | number | Si | ID del detalle |

**Payload (todos opcionales):**

| Campo | Tipo | Validaciones | Descripcion |
|-------|------|--------------|-------------|
| `Cantidad` | number | min: 1 | Nueva cantidad |
| `PeriodoRenta` | number/null | min: 1 | Meses de renta |
| `PrecioUnitario` | number | >= 0 | Nuevo precio |
| `DescuentoPorcentaje` | number/null | 0-100 | Descuento % |
| `DescuentoEfectivo` | number/null | >= 0 | Descuento $ |
| `Descripcion` | string/null | max: 500 | Descripcion |

**Ejemplo de Request:**
```json
{
  "Cantidad": 5,
  "DescuentoPorcentaje": 15
}
```

**Errores Posibles:**

| Codigo | Mensaje | Causa |
|--------|---------|-------|
| 404 | Detalle no encontrado | DetalleID no existe |
| 300 | Solo se pueden editar items de presupuestos en estado Pendiente | Estatus != Pendiente |

---

### 10. Eliminar Item del Presupuesto

**Endpoint:** `DELETE /presupuestos/detalle/:DetalleID`

**Descripcion:** Elimina (soft delete) un item del presupuesto (solo en estado Pendiente).

**Headers:**
```
Authorization: Bearer {token}
```

**Parametros de URL:**

| Parametro | Tipo | Requerido | Descripcion |
|-----------|------|-----------|-------------|
| `DetalleID` | number | Si | ID del detalle |

**Errores Posibles:**

| Codigo | Mensaje | Causa |
|--------|---------|-------|
| 404 | Detalle no encontrado | DetalleID no existe |
| 300 | Solo se pueden eliminar items de presupuestos en estado Pendiente | Estatus != Pendiente |

---

### 11. Dar de Baja Presupuesto

**Endpoint:** `PATCH /presupuestos/baja/:PresupuestoID`

**Descripcion:** Desactiva un presupuesto (soft delete).

**Headers:**
```
Authorization: Bearer {token}
```

**Parametros de URL:**

| Parametro | Tipo | Requerido | Descripcion |
|-----------|------|-----------|-------------|
| `PresupuestoID` | number | Si | ID del presupuesto |

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Presupuesto dado de baja",
  "error": false,
  "data": {
    "PresupuestoID": 1,
    "IsActive": 0
  }
}
```

**Errores Posibles:**

| Codigo | Mensaje | Causa |
|--------|---------|-------|
| 404 | Presupuesto no encontrado | No existe |
| 300 | El presupuesto ya esta dado de baja | IsActive = 0 |

---

### 12. Activar Presupuesto

**Endpoint:** `PATCH /presupuestos/activar/:PresupuestoID`

**Descripcion:** Reactiva un presupuesto dado de baja.

**Headers:**
```
Authorization: Bearer {token}
```

**Parametros de URL:**

| Parametro | Tipo | Requerido | Descripcion |
|-----------|------|-----------|-------------|
| `PresupuestoID` | number | Si | ID del presupuesto |

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Presupuesto activado",
  "error": false,
  "data": {
    "PresupuestoID": 1,
    "IsActive": 1
  }
}
```

**Errores Posibles:**

| Codigo | Mensaje | Causa |
|--------|---------|-------|
| 404 | Presupuesto no encontrado | No existe |
| 300 | El presupuesto ya esta activo | IsActive = 1 |

---

## Modelos de Datos

### presupuestos_encabezado

| Campo | Tipo | Nullable | Descripcion |
|-------|------|----------|-------------|
| PresupuestoID | Int | No | PK, autoincrement |
| ClienteID | Int | No | FK a catalogo_clientes |
| SucursalID | Int | Si | FK a clientes_sucursales |
| FechaCreacion | Date | No | Fecha de creacion (automatica) |
| FechaVigencia | Date | No | Hasta cuando es valido |
| Estatus | Enum | No | Pendiente, Enviado, Aprobado, Rechazado, Vencido |
| Observaciones | String(500) | Si | Notas adicionales |
| UsuarioID | Int | No | Usuario que creo |
| Subtotal | Float | No | Suma de subtotales - descuentos + gastos |
| DescuentoPorcentaje | Float | Si | Descuento global % |
| DescuentoEfectivo | Float | Si | Descuento global $ |
| GastosAdicionales | Float | Si | Gastos extra $ |
| IVA | Float | No | 16% del subtotal |
| Total | Float | No | Subtotal + IVA |
| IsActive | TinyInt | No | 1=activo, 0=baja |

### presupuestos_detalle

| Campo | Tipo | Nullable | Descripcion |
|-------|------|----------|-------------|
| DetalleID | Int | No | PK, autoincrement |
| PresupuestoID | Int | No | FK a presupuestos_encabezado |
| TipoItem | Enum | No | EQUIPO_PURIFREEZE, EQUIPO_EXTERNO, REFACCION, SERVICIO |
| Modalidad | Enum | Si | VENTA, RENTA, MANTENIMIENTO |
| PlantillaEquipoID | Int | Si | FK a plantillas_equipo |
| RefaccionID | Int | Si | FK a catalogo_refacciones |
| Descripcion | String(500) | Si | Descripcion del item |
| Cantidad | Int | No | Cantidad (default: 1) |
| PeriodoRenta | Int | Si | Meses de renta |
| PrecioUnitario | Float | No | Precio por unidad |
| DescuentoPorcentaje | Float | Si | Descuento del item % |
| DescuentoEfectivo | Float | Si | Descuento del item $ |
| Subtotal | Float | No | Precio x Cantidad x Periodo - Descuentos |
| IsActive | TinyInt | No | 1=activo, 0=eliminado |

---

## Interfaces TypeScript

```typescript
// Enums
type TipoItemPresupuesto = 'EQUIPO_PURIFREEZE' | 'EQUIPO_EXTERNO' | 'REFACCION' | 'SERVICIO';
type ModalidadPresupuesto = 'VENTA' | 'RENTA' | 'MANTENIMIENTO';
type EstatusPresupuesto = 'Pendiente' | 'Enviado' | 'Aprobado' | 'Rechazado' | 'Vencido';

// Crear detalle
interface CreateDetalleDto {
  TipoItem: TipoItemPresupuesto;
  Modalidad?: ModalidadPresupuesto | null;
  PlantillaEquipoID?: number | null;
  RefaccionID?: number | null;
  Descripcion?: string | null;
  Cantidad?: number; // default: 1
  PeriodoRenta?: number | null;
  PrecioUnitario?: number; // default: 0
  DescuentoPorcentaje?: number | null;
  DescuentoEfectivo?: number | null;
}

// Crear presupuesto
interface CreatePresupuestoDto {
  ClienteID: number;
  SucursalID?: number | null;
  FechaVigencia: string; // YYYY-MM-DD
  Observaciones?: string | null;
  UsuarioID: number;
  DescuentoPorcentaje?: number | null;
  DescuentoEfectivo?: number | null;
  GastosAdicionales?: number | null;
  detalles: CreateDetalleDto[];
}

// Actualizar presupuesto
interface UpdatePresupuestoDto {
  ClienteID?: number;
  SucursalID?: number | null;
  FechaVigencia?: string;
  Observaciones?: string | null;
  DescuentoPorcentaje?: number | null;
  DescuentoEfectivo?: number | null;
  GastosAdicionales?: number | null;
}

// Actualizar estatus
interface UpdateEstatusDto {
  Estatus: EstatusPresupuesto;
}

// Actualizar detalle
interface UpdateDetalleDto {
  Cantidad?: number;
  PeriodoRenta?: number | null;
  PrecioUnitario?: number;
  DescuentoPorcentaje?: number | null;
  DescuentoEfectivo?: number | null;
  Descripcion?: string | null;
}

// Response de presupuesto
interface PresupuestoResponse {
  PresupuestoID: number;
  ClienteID: number;
  SucursalID: number | null;
  FechaCreacion: string;
  FechaVigencia: string;
  Estatus: EstatusPresupuesto;
  Observaciones: string | null;
  UsuarioID: number;
  Subtotal: number;
  DescuentoPorcentaje: number | null;
  DescuentoEfectivo: number | null;
  GastosAdicionales: number | null;
  IVA: number;
  Total: number;
  IsActive: number;
  cliente: {
    ClienteID: number;
    NombreComercio: string;
    Observaciones?: string | null;
  };
  sucursal: {
    SucursalID: number;
    NombreSucursal: string;
    Direccion?: string;
    Telefono?: string;
    Contacto?: string;
  } | null;
  detalles: DetalleResponse[];
}

interface DetalleResponse {
  DetalleID: number;
  PresupuestoID: number;
  TipoItem: TipoItemPresupuesto;
  Modalidad: ModalidadPresupuesto | null;
  PlantillaEquipoID: number | null;
  RefaccionID: number | null;
  Descripcion: string | null;
  Cantidad: number;
  PeriodoRenta: number | null;
  PrecioUnitario: number;
  DescuentoPorcentaje: number | null;
  DescuentoEfectivo: number | null;
  Subtotal: number;
  IsActive: number;
  plantilla: {
    PlantillaEquipoID: number;
    Codigo: string | null;
    NombreEquipo: string;
    EsExterno: number;
    PorcentajeVenta: number;
    PorcentajeRenta: number;
  } | null;
  refaccion: {
    RefaccionID: number;
    NombrePieza: string;
    NombreCorto: string | null;
    Codigo: string | null;
    PrecioVenta: number | null;
  } | null;
}
```

---

## Flujo de Uso Tipico

### 1. Crear un Presupuesto

```
1. GET /clientes                           -> Seleccionar cliente
2. GET /clientes-sucursales/cliente/{id}   -> Seleccionar sucursal (opcional)
3. GET /plantillas-equipo                  -> Ver equipos disponibles
4. GET /presupuestos/precio-plantilla/{id}?modalidad=RENTA -> Calcular precio
5. GET /refacciones                        -> Ver refacciones disponibles
6. POST /presupuestos                      -> Crear presupuesto con items
```

### 2. Editar un Presupuesto

```
1. GET /presupuestos/{id}                  -> Ver presupuesto actual
2. PUT /presupuestos/{id}                  -> Actualizar encabezado
3. POST /presupuestos/{id}/detalle         -> Agregar item
4. PUT /presupuestos/detalle/{id}          -> Modificar item
5. DELETE /presupuestos/detalle/{id}       -> Eliminar item
```

### 3. Enviar y Aprobar

```
1. PATCH /presupuestos/{id}/estatus        -> { "Estatus": "Enviado" }
2. (Cliente revisa)
3. PATCH /presupuestos/{id}/estatus        -> { "Estatus": "Aprobado" }
```

---

## Notas Importantes

1. **Solo se edita en Pendiente:** Una vez que el presupuesto cambia de estado, no se pueden modificar items ni encabezado.

2. **Precio automatico:** Si envias `PrecioUnitario: 0`, el sistema calcula automaticamente basandose en:
   - Equipos: Costo de plantilla x porcentaje segun modalidad
   - Refacciones: PrecioVenta de la refaccion
   - Servicios: **OBLIGATORIO** enviar precio manual

3. **Recalculo automatico:** Cada vez que se modifica un detalle o el encabezado, los totales (Subtotal, IVA, Total) se recalculan automaticamente.

4. **Soft Delete:** Los registros nunca se eliminan fisicamente, solo se marca `IsActive = 0`.

5. **Validacion de plantillas:** El sistema valida que el tipo de plantilla (EsExterno) coincida con el TipoItem seleccionado.

6. **PeriodoRenta:** Solo aplica para items con `Modalidad: "RENTA"`. Multiplica el precio por los meses.

---

**Ultima actualizacion:** 2025-12-23
