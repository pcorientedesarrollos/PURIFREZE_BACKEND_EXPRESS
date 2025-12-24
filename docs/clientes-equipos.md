# API de Clientes Equipos - Purifreeze Backend

## Información General

**Base URL:** `http://localhost:3000`

**Prefijo de ruta:** `/clientes-equipos`

**Autenticación:** Bearer Token requerido

---

## Descripción del Módulo

Este módulo gestiona la asignación de equipos a clientes, independientemente de si son:
- **RENTA:** Equipos Purifreeze rentados (vinculados a un contrato)
- **COMPRA:** Equipos Purifreeze vendidos al cliente
- **EXTERNO:** Equipos del cliente que reciben mantenimiento

Permite rastrear el historial de servicios por equipo y mantener un registro de todos los equipos que tiene cada cliente.

---

## Endpoints

### 1. Asignar Equipo a Cliente

**Endpoint:** `POST /clientes-equipos`

**Descripción:** Crea una nueva asignación de equipo a un cliente.

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
| `EquipoID` | number | No | - | ID del equipo físico (para Purifreeze) |
| `PlantillaEquipoID` | number | No | - | ID de la plantilla de equipo |
| `TipoPropiedad` | string | Sí | enum: RENTA, COMPRA, EXTERNO | Tipo de propiedad del equipo |
| `ContratoID` | number | No | - | ID del contrato (solo para RENTA) |
| `PresupuestoDetalleID` | number | No | - | ID del detalle del presupuesto origen |
| `VentaDetalleID` | number | No | - | ID del detalle de venta |
| `DescripcionEquipo` | string | No | max: 255 | Descripción del equipo externo |
| `NumeroSerieExterno` | string | No | max: 100 | Número de serie del equipo externo |
| `MarcaEquipo` | string | No | max: 100 | Marca del equipo externo |
| `ModeloEquipo` | string | No | max: 100 | Modelo del equipo externo |
| `FechaAsignacion` | string | No | formato ISO | Fecha de asignación (default: hoy) |
| `Observaciones` | string | No | max: 500 | Observaciones generales |
| `UsuarioAsignaID` | number | No | - | ID del usuario que asigna |

**Ejemplo de Request:**
```json
{
  "ClienteID": 1,
  "SucursalID": 1,
  "PlantillaEquipoID": 5,
  "TipoPropiedad": "COMPRA",
  "DescripcionEquipo": "Dispensador de agua fría/caliente",
  "Observaciones": "Equipo adquirido en promoción"
}
```

**Response Exitoso (201):**
```json
{
  "status": 201,
  "message": "Equipo de cliente obtenido",
  "error": false,
  "data": {
    "ClienteEquipoID": 1,
    "ClienteID": 1,
    "SucursalID": 1,
    "EquipoID": null,
    "PlantillaEquipoID": 5,
    "TipoPropiedad": "COMPRA",
    "ContratoID": null,
    "PresupuestoDetalleID": null,
    "VentaDetalleID": null,
    "DescripcionEquipo": "Dispensador de agua fría/caliente",
    "NumeroSerieExterno": null,
    "MarcaEquipo": null,
    "ModeloEquipo": null,
    "FechaAsignacion": "2025-12-23",
    "FechaRetiro": null,
    "MotivoRetiro": null,
    "Estatus": "ACTIVO",
    "Observaciones": "Equipo adquirido en promoción",
    "UsuarioAsignaID": null,
    "IsActive": 1,
    "cliente": {
      "ClienteID": 1,
      "NombreComercio": "Empresa ABC"
    },
    "sucursal": {
      "SucursalID": 1,
      "NombreSucursal": "Sucursal Centro"
    },
    "plantilla": {
      "PlantillaEquipoID": 5,
      "NombreEquipo": "Dispensador Premium",
      "Codigo": "DISP-001"
    }
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | Bad Request (TipoPropiedad: Invalid enum value) | Tipo de propiedad inválido |
| 404 | El cliente no existe | ClienteID no encontrado |
| 300 | El cliente no está activo | Cliente inactivo |
| 404 | La sucursal no existe | SucursalID no encontrado |
| 300 | La sucursal no pertenece al cliente | Sucursal de otro cliente |
| 404 | El equipo no existe | EquipoID no encontrado |
| 300 | El equipo no está activo | Equipo inactivo |
| 300 | El equipo ya está asignado a un cliente | Equipo ya en uso |

---

### 2. Obtener Todos los Equipos de Clientes

**Endpoint:** `GET /clientes-equipos`

**Descripción:** Obtiene la lista de todos los equipos asignados a clientes.

**Headers:**
```
Authorization: Bearer {token}
```

**Query Params:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `tipoPropiedad` | string | No | Filtrar por tipo: RENTA, COMPRA, EXTERNO |
| `estatus` | string | No | Filtrar por estatus: ACTIVO, RETIRADO, DEVUELTO, VENDIDO |
| `sucursalId` | number | No | Filtrar por sucursal |

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Equipos de clientes obtenidos",
  "error": false,
  "data": [
    {
      "ClienteEquipoID": 1,
      "ClienteID": 1,
      "TipoPropiedad": "COMPRA",
      "Estatus": "ACTIVO",
      "cliente": {
        "ClienteID": 1,
        "NombreComercio": "Empresa ABC"
      },
      "sucursal": {
        "SucursalID": 1,
        "NombreSucursal": "Sucursal Centro"
      },
      "equipo": null,
      "plantilla": {
        "PlantillaEquipoID": 5,
        "NombreEquipo": "Dispensador Premium",
        "Codigo": "DISP-001",
        "EsExterno": 0
      },
      "contrato": null,
      "_count": {
        "servicios": 3
      }
    }
  ]
}
```

---

### 3. Obtener Equipos por Cliente

**Endpoint:** `GET /clientes-equipos/cliente/{ClienteID}`

**Descripción:** Obtiene todos los equipos asignados a un cliente específico.

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
  "message": "Equipos del cliente obtenidos",
  "error": false,
  "data": [...]
}
```

---

### 4. Obtener Equipo de Cliente por ID

**Endpoint:** `GET /clientes-equipos/{ClienteEquipoID}`

**Descripción:** Obtiene el detalle completo de un equipo de cliente.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `ClienteEquipoID` | number | Sí | ID del registro |

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Equipo de cliente obtenido",
  "error": false,
  "data": {
    "ClienteEquipoID": 1,
    "ClienteID": 1,
    "SucursalID": 1,
    "EquipoID": null,
    "PlantillaEquipoID": 5,
    "TipoPropiedad": "COMPRA",
    "ContratoID": null,
    "PresupuestoDetalleID": 10,
    "VentaDetalleID": 5,
    "DescripcionEquipo": "Dispensador de agua fría/caliente",
    "NumeroSerieExterno": null,
    "MarcaEquipo": null,
    "ModeloEquipo": null,
    "FechaAsignacion": "2025-12-23",
    "FechaRetiro": null,
    "MotivoRetiro": null,
    "Estatus": "ACTIVO",
    "Observaciones": "Equipo adquirido en promoción",
    "UsuarioAsignaID": 1,
    "IsActive": 1,
    "cliente": {
      "ClienteID": 1,
      "NombreComercio": "Empresa ABC",
      "Observaciones": "Cliente preferente"
    },
    "sucursal": {
      "SucursalID": 1,
      "NombreSucursal": "Sucursal Centro",
      "Direccion": "Calle 123",
      "Telefono": "555-1234",
      "Contacto": "Juan Pérez"
    },
    "equipo": null,
    "plantilla": {
      "PlantillaEquipoID": 5,
      "NombreEquipo": "Dispensador Premium",
      "Codigo": "DISP-001",
      "EsExterno": 0,
      "PorcentajeVenta": 35,
      "PorcentajeRenta": 8
    },
    "contrato": null,
    "presupuesto_detalle": {
      "DetalleID": 10,
      "TipoItem": "EQUIPO_PURIFREEZE",
      "Modalidad": "VENTA",
      "Cantidad": 1,
      "PrecioUnitario": 5000,
      "Subtotal": 5000
    },
    "venta_detalle": {
      "VentaDetalleID": 5,
      "TipoItem": "EQUIPO_PURIFREEZE",
      "Cantidad": 1,
      "PrecioUnitario": 5000,
      "Subtotal": 5000,
      "MesesGarantia": 12,
      "FechaFinGarantia": "2026-12-23"
    },
    "servicios": [
      {
        "ServicioID": 15,
        "TipoServicio": "INSTALACION",
        "FechaProgramada": "2025-12-25",
        "FechaEjecucion": "2025-12-25",
        "Estatus": "REALIZADO",
        "CostoTotal": 500
      }
    ]
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | Equipo de cliente no encontrado | ID no existe |

---

### 5. Actualizar Equipo de Cliente

**Endpoint:** `PUT /clientes-equipos/{ClienteEquipoID}`

**Descripción:** Actualiza los datos de un equipo de cliente.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `ClienteEquipoID` | number | Sí | ID del registro |

**Payload:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `SucursalID` | number | No | Nueva sucursal |
| `DescripcionEquipo` | string | No | Nueva descripción |
| `NumeroSerieExterno` | string | No | Nuevo número de serie |
| `MarcaEquipo` | string | No | Nueva marca |
| `ModeloEquipo` | string | No | Nuevo modelo |
| `Observaciones` | string | No | Nuevas observaciones |

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Equipo de cliente obtenido",
  "error": false,
  "data": {...}
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | Equipo de cliente no encontrado | ID no existe |
| 300 | Solo se pueden editar equipos con estatus ACTIVO | Equipo no activo |
| 300 | La sucursal no pertenece al cliente | Sucursal inválida |

---

### 6. Retirar Equipo de Cliente

**Endpoint:** `PATCH /clientes-equipos/retirar/{ClienteEquipoID}`

**Descripción:** Marca un equipo como retirado, devuelto o vendido.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `ClienteEquipoID` | number | Sí | ID del registro |

**Payload:**

| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `Estatus` | string | Sí | enum: RETIRADO, DEVUELTO, VENDIDO | Nuevo estatus |
| `MotivoRetiro` | string | Sí | max: 255 | Motivo del retiro |

**Ejemplo de Request:**
```json
{
  "Estatus": "DEVUELTO",
  "MotivoRetiro": "Fin del contrato de renta"
}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Equipo devuelto",
  "error": false,
  "data": {
    "ClienteEquipoID": 1,
    "Estatus": "DEVUELTO",
    "FechaRetiro": "2025-12-23",
    "MotivoRetiro": "Fin del contrato de renta"
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | Equipo de cliente no encontrado | ID no existe |
| 300 | El equipo ya no está activo | Ya fue retirado |

---

### 7. Reactivar Equipo

**Endpoint:** `PATCH /clientes-equipos/activar/{ClienteEquipoID}`

**Descripción:** Reactiva un equipo previamente retirado.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `ClienteEquipoID` | number | Sí | ID del registro |

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Equipo reactivado",
  "error": false,
  "data": {
    "ClienteEquipoID": 1,
    "Estatus": "ACTIVO",
    "FechaRetiro": null,
    "MotivoRetiro": null
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | Equipo de cliente no encontrado | ID no existe |
| 300 | El equipo ya está activo | Ya está activo |

---

### 8. Dar de Baja (Soft Delete)

**Endpoint:** `PATCH /clientes-equipos/baja/{ClienteEquipoID}`

**Descripción:** Elimina lógicamente el registro.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `ClienteEquipoID` | number | Sí | ID del registro |

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Registro dado de baja",
  "error": false,
  "data": {
    "ClienteEquipoID": 1,
    "IsActive": 0
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | Equipo de cliente no encontrado | ID no existe |
| 300 | El registro ya está dado de baja | IsActive = 0 |

---

## Modelo de Datos

### clientes_equipos

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| ClienteEquipoID | Int | No | Clave primaria |
| ClienteID | Int | No | FK a catalogo_clientes |
| SucursalID | Int | Sí | FK a clientes_sucursales |
| EquipoID | Int | Sí | FK a equipos (Purifreeze físico) |
| PlantillaEquipoID | Int | Sí | FK a plantillas_equipo |
| TipoPropiedad | Enum | No | RENTA, COMPRA, EXTERNO |
| ContratoID | Int | Sí | FK a contratos (solo RENTA) |
| PresupuestoDetalleID | Int | Sí | FK a presupuestos_detalle |
| VentaDetalleID | Int | Sí | FK a ventas_detalle |
| DescripcionEquipo | String | Sí | Para equipos externos |
| NumeroSerieExterno | String | Sí | Serie del equipo externo |
| MarcaEquipo | String | Sí | Marca del equipo externo |
| ModeloEquipo | String | Sí | Modelo del equipo externo |
| FechaAsignacion | Date | No | Fecha de asignación |
| FechaRetiro | Date | Sí | Fecha de retiro |
| MotivoRetiro | String | Sí | Motivo del retiro |
| Estatus | Enum | No | ACTIVO, RETIRADO, DEVUELTO, VENDIDO |
| Observaciones | String | Sí | Observaciones generales |
| UsuarioAsignaID | Int | Sí | Usuario que asignó |
| IsActive | Int | No | 1 = Activo, 0 = Eliminado |

## Relaciones

- **cliente:** Relación con `catalogo_clientes`
- **sucursal:** Relación con `clientes_sucursales`
- **equipo:** Relación con `equipos` (para equipos físicos Purifreeze)
- **plantilla:** Relación con `plantillas_equipo`
- **contrato:** Relación con `contratos`
- **presupuesto_detalle:** Relación con `presupuestos_detalle`
- **venta_detalle:** Relación con `ventas_detalle`
- **servicios:** Historial de servicios del equipo

## Notas Importantes

1. **Tipos de Propiedad:**
   - `RENTA`: Equipos Purifreeze en renta, vinculados a un contrato
   - `COMPRA`: Equipos Purifreeze vendidos al cliente
   - `EXTERNO`: Equipos del cliente que reciben mantenimiento

2. **Generación Automática:** Cuando se aprueba un presupuesto, se crean automáticamente los registros en esta tabla según el tipo de item.

3. **Historial de Servicios:** El campo `servicios` contiene los últimos 10 servicios realizados a este equipo.

4. **Soft Delete:** El campo `IsActive` indica si el registro está activo (1) o eliminado (0).

---

**Última actualización:** 2025-12-23
