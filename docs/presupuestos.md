# API de Presupuestos - Purifreeze Backend

## Información General

**Base URL:** `http://localhost:3000`

**Prefijo de ruta:** `/presupuestos`

**Autenticación:** No requerida (verificar si se implementa middleware de auth)

---

## Descripción

Este módulo permite crear y gestionar presupuestos para clientes. Un presupuesto puede contener:
- **Equipos Purifreeze:** Para venta o renta (usa plantillas internas)
- **Equipos Externos:** Para mantenimiento (usa plantillas externas)
- **Refacciones:** Venta directa de piezas
- **Servicios:** Descripción libre con precio manual

### Estructura

```
presupuestos_encabezado
├── Cliente (catalogo_clientes)
├── Sucursal (clientes_sucursales) [opcional]
└── presupuestos_detalle[]
    ├── Equipo Purifreeze (plantilla + VENTA/RENTA)
    ├── Equipo Externo (plantilla + MANTENIMIENTO)
    ├── Refacción (refacción + VENTA)
    └── Servicio (descripción libre)
```

---

## Enums

### EstatusPresupuesto
| Valor | Descripción |
|-------|-------------|
| `Pendiente` | En edición, se puede modificar |
| `Enviado` | Enviado al cliente |
| `Aprobado` | Cliente aceptó |
| `Rechazado` | Cliente rechazó |
| `Vencido` | Pasó la fecha de vigencia |

### TipoItemPresupuesto
| Valor | Descripción |
|-------|-------------|
| `EQUIPO_PURIFREEZE` | Equipo fabricado por Purifreeze |
| `EQUIPO_EXTERNO` | Equipo de otra marca |
| `REFACCION` | Pieza/refacción del catálogo |
| `SERVICIO` | Servicio con descripción libre |

### ModalidadPresupuesto
| Valor | Descripción |
|-------|-------------|
| `VENTA` | Venta del equipo/refacción |
| `RENTA` | Renta mensual del equipo |
| `MANTENIMIENTO` | Servicio de mantenimiento |

---

## Endpoints

### 1. Crear Presupuesto

**Endpoint:** `POST /presupuestos`

**Descripción:** Crea un presupuesto completo con encabezado y detalles. Los precios se calculan automáticamente si no se proporcionan.

**Headers:**
```
Content-Type: application/json
```

**Payload:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `ClienteID` | number | Sí | ID del cliente |
| `SucursalID` | number | No | ID de la sucursal (null = cliente directo) |
| `FechaVigencia` | string | Sí | Fecha límite del presupuesto (YYYY-MM-DD) |
| `Observaciones` | string | No | Notas generales (max 500) |
| `UsuarioID` | number | Sí | ID del usuario que crea |
| `DescuentoPorcentaje` | number | No | Descuento global en % (0-100) |
| `DescuentoEfectivo` | number | No | Descuento global en $ |
| `GastosAdicionales` | number | No | Gastos extra (envío, etc.) |
| `detalles` | array | Sí | Array de items (mínimo 1) |

**Estructura de cada detalle:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `TipoItem` | enum | Sí | EQUIPO_PURIFREEZE, EQUIPO_EXTERNO, REFACCION, SERVICIO |
| `Modalidad` | enum | No* | VENTA, RENTA, MANTENIMIENTO |
| `PlantillaEquipoID` | number | No* | Para equipos |
| `RefaccionID` | number | No* | Para refacciones |
| `Descripcion` | string | No | Descripción adicional o para servicios |
| `Cantidad` | number | Sí | Cantidad (default: 1) |
| `PeriodoRenta` | number | No | Meses de renta (solo para RENTA) |
| `PrecioUnitario` | number | No | Precio manual (0 = automático) |
| `DescuentoPorcentaje` | number | No | Descuento del item en % |
| `DescuentoEfectivo` | number | No | Descuento del item en $ |

**Notas:**
- `*` Requerido según TipoItem
- Si `PrecioUnitario = 0`, se calcula automáticamente
- IVA se calcula al 16% sobre el subtotal

**Ejemplo de Request:**
```json
{
  "ClienteID": 1,
  "SucursalID": 2,
  "FechaVigencia": "2025-01-15",
  "Observaciones": "Presupuesto para nueva sucursal",
  "UsuarioID": 1,
  "DescuentoPorcentaje": 5,
  "GastosAdicionales": 500,
  "detalles": [
    {
      "TipoItem": "EQUIPO_PURIFREEZE",
      "Modalidad": "RENTA",
      "PlantillaEquipoID": 1,
      "Cantidad": 2,
      "PeriodoRenta": 12,
      "PrecioUnitario": 0
    },
    {
      "TipoItem": "REFACCION",
      "Modalidad": "VENTA",
      "RefaccionID": 5,
      "Cantidad": 10,
      "PrecioUnitario": 0
    },
    {
      "TipoItem": "SERVICIO",
      "Descripcion": "Instalación y configuración inicial",
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
    "FechaCreacion": "2024-12-11T00:00:00.000Z",
    "FechaVigencia": "2025-01-15T00:00:00.000Z",
    "Estatus": "Pendiente",
    "Observaciones": "Presupuesto para nueva sucursal",
    "UsuarioID": 1,
    "Subtotal": 15000.00,
    "DescuentoPorcentaje": 5,
    "DescuentoEfectivo": null,
    "GastosAdicionales": 500,
    "IVA": 2356.00,
    "Total": 17106.00,
    "IsActive": 1,
    "cliente": {
      "ClienteID": 1,
      "NombreComercio": "Tiendas XYZ",
      "Observaciones": null
    },
    "sucursal": {
      "SucursalID": 2,
      "NombreSucursal": "Sucursal Norte",
      "Direccion": "Blvd. Norte #456",
      "Telefono": "844-987-6543",
      "Contacto": "María García"
    },
    "detalles": [
      {
        "DetalleID": 1,
        "PresupuestoID": 1,
        "TipoItem": "EQUIPO_PURIFREEZE",
        "Modalidad": "RENTA",
        "PlantillaEquipoID": 1,
        "RefaccionID": null,
        "Descripcion": null,
        "Cantidad": 2,
        "PeriodoRenta": 12,
        "PrecioUnitario": 450.00,
        "DescuentoPorcentaje": null,
        "DescuentoEfectivo": null,
        "Subtotal": 10800.00,
        "IsActive": 1,
        "plantilla": {
          "PlantillaEquipoID": 1,
          "Codigo": "PF-001",
          "NombreEquipo": "Purificador Estándar",
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

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | Bad Request (detalles: Debe incluir al menos un item) | Sin detalles |
| 404 | El cliente no existe | ClienteID inválido |
| 300 | El cliente no está activo | Cliente dado de baja |
| 404 | La sucursal no existe | SucursalID inválido |
| 300 | La sucursal no pertenece al cliente | Sucursal de otro cliente |
| 404 | La refacción X no existe o no está activa | RefaccionID inválido |
| 404 | La plantilla X no existe o no está activa | PlantillaEquipoID inválido |
| 300 | La plantilla es de tipo externo, use EQUIPO_EXTERNO | Tipo incorrecto |

---

### 2. Obtener Todos los Presupuestos

**Endpoint:** `GET /presupuestos`

**Descripción:** Lista todos los presupuestos activos.

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Presupuestos obtenidos",
  "error": false,
  "data": [
    {
      "PresupuestoID": 2,
      "ClienteID": 1,
      "SucursalID": null,
      "FechaCreacion": "2024-12-11T00:00:00.000Z",
      "FechaVigencia": "2025-01-20T00:00:00.000Z",
      "Estatus": "Enviado",
      "Observaciones": null,
      "UsuarioID": 1,
      "Subtotal": 5000.00,
      "DescuentoPorcentaje": null,
      "DescuentoEfectivo": null,
      "GastosAdicionales": null,
      "IVA": 800.00,
      "Total": 5800.00,
      "IsActive": 1,
      "cliente": {
        "ClienteID": 1,
        "NombreComercio": "Tiendas XYZ"
      },
      "sucursal": null,
      "_count": {
        "detalles": 3
      }
    }
  ]
}
```

---

### 3. Obtener Presupuesto por ID

**Endpoint:** `GET /presupuestos/:PresupuestoID`

**Descripción:** Obtiene un presupuesto con todos sus detalles.

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `PresupuestoID` | number | Sí | ID del presupuesto |

**Ejemplo:** `GET /presupuestos/1`

**Response:** Ver ejemplo en "Crear Presupuesto"

---

### 4. Obtener Presupuestos por Cliente

**Endpoint:** `GET /presupuestos/cliente/:ClienteID`

**Descripción:** Lista todos los presupuestos de un cliente.

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `ClienteID` | number | Sí | ID del cliente |

**Ejemplo:** `GET /presupuestos/cliente/1`

---

### 5. Obtener Precio de Plantilla

**Endpoint:** `GET /presupuestos/precio-plantilla/:PlantillaEquipoID`

**Descripción:** Calcula el precio de un equipo según la modalidad. Útil para mostrar precios antes de agregar al presupuesto.

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `PlantillaEquipoID` | number | Sí | ID de la plantilla |

**Query Params:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `modalidad` | enum | Sí | VENTA, RENTA, MANTENIMIENTO |

**Ejemplo:** `GET /presupuestos/precio-plantilla/1?modalidad=RENTA`

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Precio calculado",
  "error": false,
  "data": {
    "PlantillaEquipoID": 1,
    "NombreEquipo": "Purificador Estándar",
    "EsExterno": 0,
    "CostoTotal": 3000.00,
    "Modalidad": "RENTA",
    "PorcentajeAplicado": 15,
    "PrecioCalculado": 450.00
  }
}
```

---

### 6. Actualizar Presupuesto (Encabezado)

**Endpoint:** `PUT /presupuestos/:PresupuestoID`

**Descripción:** Actualiza los datos del encabezado. Solo funciona si el estatus es "Pendiente".

**Payload:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `ClienteID` | number | No | Nuevo cliente |
| `SucursalID` | number | No | Nueva sucursal (null para quitar) |
| `FechaVigencia` | string | No | Nueva fecha (YYYY-MM-DD) |
| `Observaciones` | string | No | Nuevas observaciones |
| `DescuentoPorcentaje` | number | No | Nuevo descuento % |
| `DescuentoEfectivo` | number | No | Nuevo descuento $ |
| `GastosAdicionales` | number | No | Nuevos gastos |

**Ejemplo:**
```json
{
  "FechaVigencia": "2025-02-01",
  "DescuentoPorcentaje": 10
}
```

---

### 7. Cambiar Estatus

**Endpoint:** `PATCH /presupuestos/:PresupuestoID/estatus`

**Descripción:** Cambia el estatus del presupuesto.

**Payload:**
```json
{
  "Estatus": "Enviado"
}
```

**Valores válidos:** `Pendiente`, `Enviado`, `Aprobado`, `Rechazado`, `Vencido`

---

### 8. Agregar Item al Presupuesto

**Endpoint:** `POST /presupuestos/:PresupuestoID/detalle`

**Descripción:** Agrega un nuevo item. Solo funciona si el estatus es "Pendiente".

**Payload:** Mismo formato que un detalle en la creación.

**Ejemplo:**
```json
{
  "TipoItem": "REFACCION",
  "Modalidad": "VENTA",
  "RefaccionID": 10,
  "Cantidad": 5,
  "PrecioUnitario": 0
}
```

---

### 9. Actualizar Item

**Endpoint:** `PUT /presupuestos/detalle/:DetalleID`

**Descripción:** Actualiza un item existente. Solo funciona si el presupuesto está "Pendiente".

**Payload:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `Cantidad` | number | No | Nueva cantidad |
| `PeriodoRenta` | number | No | Nuevos meses de renta |
| `PrecioUnitario` | number | No | Nuevo precio |
| `DescuentoPorcentaje` | number | No | Nuevo descuento % |
| `DescuentoEfectivo` | number | No | Nuevo descuento $ |
| `Descripcion` | string | No | Nueva descripción |

---

### 10. Eliminar Item

**Endpoint:** `DELETE /presupuestos/detalle/:DetalleID`

**Descripción:** Elimina un item (soft delete). Solo funciona si el presupuesto está "Pendiente".

---

### 11. Dar de Baja Presupuesto

**Endpoint:** `PATCH /presupuestos/baja/:PresupuestoID`

---

### 12. Activar Presupuesto

**Endpoint:** `PATCH /presupuestos/activar/:PresupuestoID`

---

## Cálculo de Precios

### Precio Automático por Tipo

| TipoItem | Fuente del Precio |
|----------|-------------------|
| `EQUIPO_PURIFREEZE` (VENTA) | CostoTotal × (1 + PorcentajeVenta/100) |
| `EQUIPO_PURIFREEZE` (RENTA) | CostoTotal × (PorcentajeRenta/100) |
| `EQUIPO_EXTERNO` (MANTO) | CostoTotal × 0.20 |
| `REFACCION` | PrecioVenta de la refacción |
| `SERVICIO` | Manual (requerido) |

**CostoTotal** = Suma de (CostoPromedio × Cantidad) de todas las refacciones de la plantilla.

### Cálculo de Subtotal del Detalle

```
base = PrecioUnitario × Cantidad
si PeriodoRenta > 0:
    base = base × PeriodoRenta
subtotal = base - (base × DescuentoPorcentaje/100) - DescuentoEfectivo
```

### Cálculo de Totales del Presupuesto

```
subtotalDetalles = Suma de Subtotal de todos los detalles
subtotal = subtotalDetalles - (subtotalDetalles × DescuentoPorcentaje/100) - DescuentoEfectivo + GastosAdicionales
IVA = subtotal × 0.16
Total = subtotal + IVA
```

---

## Modelo de Datos

### presupuestos_encabezado

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| PresupuestoID | Int | No | PK, autoincrement |
| ClienteID | Int | No | FK a catalogo_clientes |
| SucursalID | Int | Sí | FK a clientes_sucursales |
| FechaCreacion | DateTime | No | Fecha de creación |
| FechaVigencia | DateTime | No | Fecha límite |
| Estatus | Enum | No | Estado del presupuesto |
| Observaciones | String(500) | Sí | Notas |
| UsuarioID | Int | No | Quien creó |
| Subtotal | Float | No | Subtotal calculado |
| DescuentoPorcentaje | Float | Sí | Descuento global % |
| DescuentoEfectivo | Float | Sí | Descuento global $ |
| GastosAdicionales | Float | Sí | Gastos extra |
| IVA | Float | No | IVA calculado (16%) |
| Total | Float | No | Total final |
| IsActive | Int | Sí | 1=activo, 0=baja |

### presupuestos_detalle

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| DetalleID | Int | No | PK, autoincrement |
| PresupuestoID | Int | No | FK a encabezado |
| TipoItem | Enum | No | Tipo de item |
| Modalidad | Enum | Sí | VENTA/RENTA/MANTO |
| PlantillaEquipoID | Int | Sí | FK a plantillas_equipo |
| RefaccionID | Int | Sí | FK a catalogo_refacciones |
| Descripcion | String(500) | Sí | Descripción libre |
| Cantidad | Int | No | Cantidad |
| PeriodoRenta | Int | Sí | Meses de renta |
| PrecioUnitario | Float | No | Precio por unidad |
| DescuentoPorcentaje | Float | Sí | Descuento % |
| DescuentoEfectivo | Float | Sí | Descuento $ |
| Subtotal | Float | No | Subtotal calculado |
| IsActive | Int | Sí | 1=activo, 0=baja |

---

## Reglas de Negocio

1. **Solo se editan presupuestos en Pendiente:** Cualquier modificación de detalles requiere estatus "Pendiente".

2. **Mínimo un detalle:** No se puede crear un presupuesto sin al menos un item.

3. **Validación de plantillas:**
   - EQUIPO_PURIFREEZE requiere plantilla con EsExterno=0
   - EQUIPO_EXTERNO requiere plantilla con EsExterno=1

4. **Sucursal debe pertenecer al cliente:** Si se proporciona SucursalID, debe ser del mismo ClienteID.

5. **Recálculo automático:** Al modificar detalles o descuentos, los totales se recalculan automáticamente.

6. **Precio automático:** Si PrecioUnitario=0, se calcula según el tipo de item.

---

## TypeScript Interfaces

```typescript
type EstatusPresupuesto = 'Pendiente' | 'Enviado' | 'Aprobado' | 'Rechazado' | 'Vencido';
type TipoItemPresupuesto = 'EQUIPO_PURIFREEZE' | 'EQUIPO_EXTERNO' | 'REFACCION' | 'SERVICIO';
type ModalidadPresupuesto = 'VENTA' | 'RENTA' | 'MANTENIMIENTO';

interface PresupuestoDetalle {
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
    NombrePieza: string | null;
    NombreCorto: string | null;
    Codigo: string | null;
    PrecioVenta: number | null;
  } | null;
}

interface PresupuestoEncabezado {
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
    NombreComercio: string | null;
    Observaciones: string | null;
  };
  sucursal: {
    SucursalID: number;
    NombreSucursal: string;
    Direccion: string | null;
    Telefono: string | null;
    Contacto: string | null;
  } | null;
  detalles: PresupuestoDetalle[];
}

interface CreatePresupuestoDetalle {
  TipoItem: TipoItemPresupuesto;
  Modalidad?: ModalidadPresupuesto | null;
  PlantillaEquipoID?: number | null;
  RefaccionID?: number | null;
  Descripcion?: string | null;
  Cantidad: number;
  PeriodoRenta?: number | null;
  PrecioUnitario?: number;
  DescuentoPorcentaje?: number | null;
  DescuentoEfectivo?: number | null;
}

interface CreatePresupuesto {
  ClienteID: number;
  SucursalID?: number | null;
  FechaVigencia: string;
  Observaciones?: string | null;
  UsuarioID: number;
  DescuentoPorcentaje?: number | null;
  DescuentoEfectivo?: number | null;
  GastosAdicionales?: number | null;
  detalles: CreatePresupuestoDetalle[];
}
```

---

## Flujo de Uso Típico

```javascript
// 1. Consultar precio de un equipo antes de agregar
const precio = await fetch('/presupuestos/precio-plantilla/1?modalidad=RENTA');

// 2. Crear presupuesto
const presupuesto = await fetch('/presupuestos', {
  method: 'POST',
  body: JSON.stringify({
    ClienteID: 1,
    FechaVigencia: '2025-01-15',
    UsuarioID: 1,
    detalles: [
      { TipoItem: 'EQUIPO_PURIFREEZE', Modalidad: 'RENTA', PlantillaEquipoID: 1, Cantidad: 2, PeriodoRenta: 12 }
    ]
  })
});

// 3. Agregar más items
await fetch(`/presupuestos/${presupuestoId}/detalle`, {
  method: 'POST',
  body: JSON.stringify({ TipoItem: 'SERVICIO', Descripcion: 'Instalación', Cantidad: 1, PrecioUnitario: 1500 })
});

// 4. Enviar al cliente
await fetch(`/presupuestos/${presupuestoId}/estatus`, {
  method: 'PATCH',
  body: JSON.stringify({ Estatus: 'Enviado' })
});

// 5. Cliente aprueba
await fetch(`/presupuestos/${presupuestoId}/estatus`, {
  method: 'PATCH',
  body: JSON.stringify({ Estatus: 'Aprobado' })
});
```

---

**Última actualización:** 2025-12-11
