# API de Contratos - Purifreeze Backend

## Información General

**Base URL:** `http://localhost:3000`

**Prefijo de ruta:** `/contratos`

**Autenticación:** Bearer Token requerido

---

## Descripción

El módulo de contratos permite gestionar acuerdos comerciales con clientes basados en presupuestos aprobados. Un contrato vincula equipos físicos (con número de serie) a un cliente y gestiona los servicios asociados.

### Flujo Principal

```
PRESUPUESTO (Aprobado)
       │
       ▼
   CONTRATO (En Revisión)
       │ Items pre-cargados del presupuesto
       │ (pendientes de asignar equipo físico)
       │
       ├──→ Asignar equipos físicos a cada item
       │
       ▼
   CONTRATO (Activo)
       │
       ├──→ Instalar equipos
       ├──→ Programar servicios/mantenimientos
       ├──→ Agregar/Retirar equipos
       │
       ▼
   VENCIDO ──→ RENOVADO (nuevo contrato)
       │
       ▼
   CANCELADO
```

### Flujo de Asignación de Equipos

Cuando se crea un contrato desde un presupuesto:
1. Se pre-cargan automáticamente los items del presupuesto como "pendientes de asignar"
2. Cada item tiene referencia a la plantilla de equipo esperada
3. El usuario selecciona equipos físicos (con número de serie) para cada item
4. Solo se pueden asignar equipos que coincidan con la plantilla esperada

---

## Enums

### EstatusContrato
| Valor | Descripción |
|-------|-------------|
| `EN_REVISION` | Contrato en preparación, se pueden agregar equipos |
| `ACTIVO` | Contrato en vigor |
| `VENCIDO` | Pasó la fecha de fin |
| `CANCELADO` | Cancelado antes de vencer |
| `RENOVADO` | Reemplazado por un nuevo contrato |

### CondicionesPago
| Valor | Descripción |
|-------|-------------|
| `MENSUAL` | Pago cada mes |
| `TRIMESTRAL` | Pago cada 3 meses |
| `SEMESTRAL` | Pago cada 6 meses |
| `ANUAL` | Pago cada 12 meses |

### ModalidadContrato
| Valor | Descripción |
|-------|-------------|
| `VENTA` | Venta del equipo |
| `RENTA` | Renta mensual |
| `COMODATO` | Préstamo a cambio de consumo |
| `MANTENIMIENTO` | Servicio de mantenimiento |

### EstatusContratoEquipo
| Valor | Descripción |
|-------|-------------|
| `PENDIENTE` | Equipo asignado, no instalado |
| `INSTALADO` | Equipo instalado en el cliente |
| `RETIRADO` | Equipo retirado del cliente |

### TipoServicioContrato
| Valor | Descripción |
|-------|-------------|
| `INSTALACION` | Instalación inicial |
| `MANTENIMIENTO_PREVENTIVO` | Mantenimiento programado |
| `MANTENIMIENTO_CORRECTIVO` | Reparación de fallas |
| `REPARACION` | Reparación mayor |
| `DESMONTAJE` | Retiro del equipo |

### EstatusServicio
| Valor | Descripción |
|-------|-------------|
| `PROGRAMADO` | Pendiente de ejecutar |
| `EN_PROCESO` | En ejecución |
| `COMPLETADO` | Finalizado |
| `CANCELADO` | Cancelado |

---

## Endpoints

---

## CONTRATOS - CRUD

---

### 1. Crear Contrato

**Endpoint:** `POST /contratos`

**Descripción:** Crea un contrato desde un presupuesto aprobado. Los items del presupuesto se pre-cargan automáticamente como pendientes de asignar equipo físico.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Payload:**
| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `PresupuestoID` | number | Sí | - | ID del presupuesto aprobado |
| `FechaInicio` | string | Sí | YYYY-MM-DD | Fecha de inicio del contrato |
| `FechaFin` | string | Sí | YYYY-MM-DD | Fecha de fin del contrato |
| `CondicionesPago` | enum | No | MENSUAL/TRIMESTRAL/SEMESTRAL/ANUAL | Default: MENSUAL |
| `DiaPago` | number | No | 1-28 | Día del mes para pago. Default: 1 |
| `FrecuenciaMantenimiento` | number | No | min: 1 | Meses entre mantenimientos |
| `PenalizacionCancelacion` | number | No | 0-100 | Porcentaje de penalización |
| `Observaciones` | string | No | max: 500 | Notas adicionales |
| `UsuarioID` | number | Sí | - | ID del usuario que crea |

**Ejemplo de Request:**
```json
{
  "PresupuestoID": 1,
  "FechaInicio": "2025-01-01",
  "FechaFin": "2025-12-31",
  "CondicionesPago": "MENSUAL",
  "DiaPago": 15,
  "FrecuenciaMantenimiento": 3,
  "PenalizacionCancelacion": 10,
  "Observaciones": "Contrato de renta anual",
  "UsuarioID": 1
}
```

**Response Exitoso (201):**
```json
{
  "status": 201,
  "message": "Contrato obtenido",
  "error": false,
  "data": {
    "ContratoID": 1,
    "NumeroContrato": "CTR-25-0001",
    "PresupuestoID": 1,
    "ClienteID": 1,
    "SucursalID": null,
    "FechaInicio": "2025-01-01T00:00:00.000Z",
    "FechaFin": "2025-12-31T00:00:00.000Z",
    "Estatus": "EN_REVISION",
    "CondicionesPago": "MENSUAL",
    "DiaPago": 15,
    "MontoTotal": 0,
    "FrecuenciaMantenimiento": 3,
    "PenalizacionCancelacion": 10,
    "MotivosCancelacion": null,
    "Observaciones": "Contrato de renta anual",
    "ContratoOrigenID": null,
    "UsuarioID": 1,
    "IsActive": 1,
    "cliente": {
      "ClienteID": 1,
      "NombreComercio": "Tiendas XYZ",
      "Observaciones": null
    },
    "sucursal": null,
    "presupuesto": {
      "PresupuestoID": 1,
      "Total": 15000.00,
      "FechaCreacion": "2025-12-10T00:00:00.000Z"
    },
    "contrato_origen": null,
    "equipos": [
      {
        "ContratoEquipoID": 1,
        "ContratoID": 1,
        "EquipoID": null,
        "Modalidad": "RENTA",
        "PrecioUnitario": 450.00,
        "PeriodoMeses": 12,
        "FechaInstalacion": null,
        "FechaRetiro": null,
        "Estatus": "PENDIENTE",
        "Observaciones": null,
        "IsActive": 1,
        "PlantillaEquipoID": 1,
        "RefaccionID": null,
        "TipoItem": "EQUIPO_PURIFREEZE",
        "Descripcion": "[PF-001] Enfriador Industrial 5000",
        "CantidadRequerida": 2,
        "CantidadAsignada": 0,
        "equipo": null,
        "plantilla": {
          "PlantillaEquipoID": 1,
          "NombreEquipo": "Enfriador Industrial 5000",
          "Codigo": "PF-001",
          "EsExterno": false
        },
        "refaccion": null,
        "servicios": []
      }
    ],
    "historial": [
      {
        "HistorialID": 1,
        "ContratoID": 1,
        "TipoAccion": "CREACION",
        "Descripcion": "Contrato CTR-25-0001 creado desde presupuesto #1 con 2 items pendientes de asignar",
        "UsuarioID": 1,
        "ValorAnterior": null,
        "ValorNuevo": null,
        "FechaAccion": "2025-01-01T12:00:00.000Z"
      }
    ]
  }
}
```

**Nota:** Los items del presupuesto se pre-cargan automáticamente con `EquipoID: null` indicando que están pendientes de asignar un equipo físico.

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | Bad Request (PresupuestoID: El PresupuestoID es requerido) | Falta el ID del presupuesto |
| 400 | Bad Request (FechaInicio: La fecha de inicio es requerida) | Falta la fecha de inicio |
| 400 | Bad Request (DiaPago: Number must be less than or equal to 28) | Día de pago fuera de rango |
| 404 | El presupuesto no existe | PresupuestoID inválido |
| 300 | Solo se pueden crear contratos de presupuestos aprobados | Presupuesto no aprobado |
| 300 | Ya existe un contrato activo para este presupuesto | Contrato duplicado |

---

### 2. Obtener Todos los Contratos

**Endpoint:** `GET /contratos`

**Descripción:** Lista todos los contratos con filtros opcionales.

**Headers:**
```
Authorization: Bearer {token}
```

**Query Params:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `estatus` | enum | No | Filtrar por estatus: EN_REVISION, ACTIVO, VENCIDO, CANCELADO, RENOVADO |
| `clienteId` | number | No | Filtrar por cliente |
| `fechaDesde` | string | No | Fecha inicio desde (YYYY-MM-DD) |
| `fechaHasta` | string | No | Fecha inicio hasta (YYYY-MM-DD) |

**Ejemplo:** `GET /contratos?estatus=ACTIVO&clienteId=1`

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Contratos obtenidos",
  "error": false,
  "data": [
    {
      "ContratoID": 1,
      "NumeroContrato": "CTR-25-0001",
      "PresupuestoID": 1,
      "ClienteID": 1,
      "SucursalID": null,
      "FechaInicio": "2025-01-01T00:00:00.000Z",
      "FechaFin": "2025-12-31T00:00:00.000Z",
      "MontoTotal": 5400.00,
      "CondicionesPago": "MENSUAL",
      "DiaPago": 15,
      "FrecuenciaMantenimiento": 3,
      "PenalizacionCancelacion": 10,
      "Estatus": "ACTIVO",
      "MotivosCancelacion": null,
      "ContratoOrigenID": null,
      "Observaciones": null,
      "UsuarioID": 1,
      "IsActive": 1,
      "cliente": {
        "ClienteID": 1,
        "NombreComercio": "Tiendas XYZ"
      },
      "sucursal": null,
      "presupuesto": {
        "PresupuestoID": 1,
        "Total": 15000.00
      },
      "_count": {
        "equipos": 3
      }
    }
  ]
}
```

---

### 3. Obtener Contrato por ID

**Endpoint:** `GET /contratos/:ContratoID`

**Descripción:** Obtiene un contrato con todos sus detalles, equipos, servicios e historial.

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
  "message": "Contrato obtenido",
  "error": false,
  "data": {
    "ContratoID": 1,
    "NumeroContrato": "CTR-25-0001",
    "PresupuestoID": 1,
    "ClienteID": 1,
    "SucursalID": 2,
    "FechaInicio": "2025-01-01T00:00:00.000Z",
    "FechaFin": "2025-12-31T00:00:00.000Z",
    "MontoTotal": 5400.00,
    "CondicionesPago": "MENSUAL",
    "DiaPago": 15,
    "FrecuenciaMantenimiento": 3,
    "PenalizacionCancelacion": 10,
    "Estatus": "ACTIVO",
    "MotivosCancelacion": null,
    "ContratoOrigenID": null,
    "Observaciones": null,
    "UsuarioID": 1,
    "IsActive": 1,
    "cliente": {
      "ClienteID": 1,
      "NombreComercio": "Tiendas XYZ",
      "Observaciones": "Cliente preferente"
    },
    "sucursal": {
      "SucursalID": 2,
      "NombreSucursal": "Sucursal Norte",
      "Direccion": "Blvd. Norte #456",
      "Telefono": "844-111-2222",
      "Contacto": "Juan Pérez"
    },
    "presupuesto": {
      "PresupuestoID": 1,
      "Total": 15000.00,
      "FechaCreacion": "2025-12-10T00:00:00.000Z"
    },
    "contrato_origen": null,
    "equipos": [
      {
        "ContratoEquipoID": 1,
        "ContratoID": 1,
        "EquipoID": 5,
        "Modalidad": "RENTA",
        "PrecioUnitario": 450.00,
        "PeriodoMeses": 12,
        "FechaInstalacion": "2025-01-05T14:00:00.000Z",
        "FechaRetiro": null,
        "Estatus": "INSTALADO",
        "Observaciones": null,
        "IsActive": 1,
        "PlantillaEquipoID": 1,
        "RefaccionID": null,
        "TipoItem": "EQUIPO_PURIFREEZE",
        "Descripcion": "[PF-001] Enfriador Industrial 5000",
        "CantidadRequerida": 1,
        "CantidadAsignada": 1,
        "equipo": {
          "EquipoID": 5,
          "NumeroSerie": "PUR-25-0005",
          "EsExterno": false,
          "Estatus": "Instalado",
          "plantilla": {
            "PlantillaEquipoID": 1,
            "NombreEquipo": "Enfriador Industrial 5000",
            "Codigo": "PF-001"
          }
        },
        "plantilla": {
          "PlantillaEquipoID": 1,
          "NombreEquipo": "Enfriador Industrial 5000",
          "Codigo": "PF-001",
          "EsExterno": false
        },
        "refaccion": null,
        "servicios": [
          {
            "ServicioID": 1,
            "ContratoEquipoID": 1,
            "TipoServicio": "INSTALACION",
            "FechaProgramada": "2025-01-05T10:00:00.000Z",
            "FechaEjecucion": "2025-01-05T14:00:00.000Z",
            "TecnicoID": 2,
            "Costo": 500,
            "Estatus": "COMPLETADO",
            "Observaciones": "Instalación exitosa",
            "UsuarioID": 1,
            "IsActive": 1
          }
        ]
      }
    ],
    "historial": [
      {
        "HistorialID": 3,
        "ContratoID": 1,
        "TipoAccion": "ACTIVACION",
        "Descripcion": "Contrato activado con monto total: $5400.00",
        "UsuarioID": 1,
        "ValorAnterior": null,
        "ValorNuevo": null,
        "FechaAccion": "2025-01-02T09:00:00.000Z"
      },
      {
        "HistorialID": 2,
        "ContratoID": 1,
        "TipoAccion": "AGREGAR_EQUIPO",
        "Descripcion": "Equipo PUR-25-0005 asignado al item: [PF-001] Enfriador Industrial 5000",
        "UsuarioID": 1,
        "ValorAnterior": null,
        "ValorNuevo": null,
        "FechaAccion": "2025-01-01T15:00:00.000Z"
      },
      {
        "HistorialID": 1,
        "ContratoID": 1,
        "TipoAccion": "CREACION",
        "Descripcion": "Contrato CTR-25-0001 creado desde presupuesto #1",
        "UsuarioID": 1,
        "ValorAnterior": null,
        "ValorNuevo": null,
        "FechaAccion": "2025-01-01T12:00:00.000Z"
      }
    ]
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | Bad Request (ContratoID: ID debe ser un número válido) | ID no es número |
| 404 | Contrato no encontrado | ContratoID no existe |

---

### 4. Obtener Contratos por Cliente

**Endpoint:** `GET /contratos/cliente/:ClienteID`

**Descripción:** Lista todos los contratos de un cliente específico.

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
  "message": "Contratos del cliente obtenidos",
  "error": false,
  "data": [
    {
      "ContratoID": 1,
      "NumeroContrato": "CTR-25-0001",
      "PresupuestoID": 1,
      "ClienteID": 1,
      "SucursalID": 2,
      "FechaInicio": "2025-01-01T00:00:00.000Z",
      "FechaFin": "2025-12-31T00:00:00.000Z",
      "MontoTotal": 5400.00,
      "Estatus": "ACTIVO",
      "cliente": {
        "ClienteID": 1,
        "NombreComercio": "Tiendas XYZ"
      },
      "sucursal": {
        "SucursalID": 2,
        "NombreSucursal": "Sucursal Norte"
      },
      "_count": {
        "equipos": 3
      }
    }
  ]
}
```

---

### 5. Actualizar Contrato

**Endpoint:** `PUT /contratos/:ContratoID`

**Descripción:** Actualiza datos del contrato. **Solo funciona si está EN_REVISION.**

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
| `FechaInicio` | string | No | Formato fecha | Nueva fecha de inicio |
| `FechaFin` | string | No | Formato fecha | Nueva fecha de fin |
| `CondicionesPago` | enum | No | Enum | Nuevas condiciones |
| `DiaPago` | number | No | 1-28 | Nuevo día de pago |
| `FrecuenciaMantenimiento` | number | No | min: 1 | Nueva frecuencia |
| `PenalizacionCancelacion` | number | No | 0-100 | Nueva penalización |
| `Observaciones` | string | No | max: 500 | Nuevas observaciones |
| `UsuarioID` | number | Sí | - | Usuario que modifica |

**Ejemplo de Request:**
```json
{
  "FechaFin": "2026-06-30",
  "DiaPago": 20,
  "Observaciones": "Se extendió el contrato 6 meses",
  "UsuarioID": 1
}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Contrato obtenido",
  "error": false,
  "data": { /* Contrato completo actualizado */ }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | Contrato no encontrado | ContratoID no existe |
| 300 | Solo se pueden editar contratos en revisión | Contrato no está EN_REVISION |

---

### 6. Activar Contrato

**Endpoint:** `PATCH /contratos/:ContratoID/activar-contrato`

**Descripción:** Cambia el estatus de `EN_REVISION` a `ACTIVO`. El contrato debe tener al menos un equipo asignado. Recalcula el monto total automáticamente.

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
| `UsuarioID` | number | Sí | ID del usuario que activa |

**Ejemplo de Request:**
```json
{
  "UsuarioID": 1
}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Contrato activado",
  "error": false,
  "data": {
    "ContratoID": 1,
    "NumeroContrato": "CTR-25-0001",
    "Estatus": "ACTIVO",
    "MontoTotal": 5400.00
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | Contrato no encontrado | ContratoID no existe |
| 300 | Solo se pueden activar contratos en revisión | Estatus no es EN_REVISION |
| 300 | El contrato debe tener al menos un equipo asignado | Sin equipos |

---

### 7. Cancelar Contrato

**Endpoint:** `PATCH /contratos/:ContratoID/cancelar`

**Descripción:** Cancela el contrato y retira automáticamente todos los equipos instalados.

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
| `MotivosCancelacion` | string | Sí | max: 500 | Razón de la cancelación |
| `UsuarioID` | number | Sí | - | ID del usuario que cancela |

**Ejemplo de Request:**
```json
{
  "MotivosCancelacion": "Cliente solicitó cancelación anticipada por cierre de negocio",
  "UsuarioID": 1
}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Contrato obtenido",
  "error": false,
  "data": {
    "ContratoID": 1,
    "NumeroContrato": "CTR-25-0001",
    "Estatus": "CANCELADO",
    "MotivosCancelacion": "Cliente solicitó cancelación anticipada por cierre de negocio",
    "equipos": [
      {
        "ContratoEquipoID": 1,
        "Estatus": "RETIRADO",
        "FechaRetiro": "2025-06-15T10:00:00.000Z"
      }
    ]
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | Contrato no encontrado | ContratoID no existe |
| 300 | El contrato ya está cancelado o renovado | Estatus es CANCELADO o RENOVADO |

---

### 8. Renovar Contrato

**Endpoint:** `POST /contratos/:ContratoID/renovar`

**Descripción:** Crea un nuevo contrato vinculado al actual. Transfiere automáticamente los equipos instalados al nuevo contrato. El contrato original cambia a estatus `RENOVADO`.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `ContratoID` | number | Sí | ID del contrato a renovar |

**Payload:**
| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `FechaInicio` | string | Sí | Formato fecha | Fecha inicio del nuevo contrato |
| `FechaFin` | string | Sí | Formato fecha | Fecha fin del nuevo contrato |
| `CondicionesPago` | enum | No | Enum | Mantiene las del original si no se especifica |
| `DiaPago` | number | No | 1-28 | Mantiene el del original si no se especifica |
| `FrecuenciaMantenimiento` | number | No | min: 1 | Frecuencia de mantenimiento |
| `PenalizacionCancelacion` | number | No | 0-100 | Penalización |
| `Observaciones` | string | No | max: 500 | Notas del nuevo contrato |
| `UsuarioID` | number | Sí | - | ID del usuario |

**Ejemplo de Request:**
```json
{
  "FechaInicio": "2026-01-01",
  "FechaFin": "2026-12-31",
  "CondicionesPago": "MENSUAL",
  "DiaPago": 15,
  "Observaciones": "Renovación anual",
  "UsuarioID": 1
}
```

**Response Exitoso (201):**
```json
{
  "status": 201,
  "message": "Contrato obtenido",
  "error": false,
  "data": {
    "ContratoID": 2,
    "NumeroContrato": "CTR-26-0001",
    "ContratoOrigenID": 1,
    "Estatus": "ACTIVO",
    "MontoTotal": 5400.00,
    "contrato_origen": {
      "ContratoID": 1,
      "NumeroContrato": "CTR-25-0001"
    },
    "equipos": [
      {
        "ContratoEquipoID": 5,
        "EquipoID": 5,
        "Estatus": "INSTALADO"
      }
    ]
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | Contrato no encontrado | ContratoID no existe |
| 300 | Solo se pueden renovar contratos activos o vencidos | Estatus no es ACTIVO ni VENCIDO |

---

### 9. Actualizar Monto del Contrato

**Endpoint:** `PATCH /contratos/:ContratoID/monto`

**Descripción:** Actualiza manualmente el monto total del contrato. Solo para contratos activos.

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
| `MontoTotal` | number | Sí | min: 0 | Nuevo monto total |
| `UsuarioID` | number | Sí | - | ID del usuario |

**Ejemplo de Request:**
```json
{
  "MontoTotal": 6000.00,
  "UsuarioID": 1
}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Monto actualizado",
  "error": false,
  "data": {
    "ContratoID": 1,
    "MontoTotal": 6000.00
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | Contrato no encontrado | ContratoID no existe |
| 300 | Solo se puede actualizar el monto de contratos activos | Estatus no es ACTIVO |

---

### 10. Dar de Baja Contrato (Soft Delete)

**Endpoint:** `PATCH /contratos/baja/:ContratoID`

**Descripción:** Marca el contrato como inactivo (IsActive = 0). No elimina el registro.

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
  "message": "Contrato dado de baja",
  "error": false,
  "data": {
    "ContratoID": 1,
    "IsActive": 0
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | Contrato no encontrado | ContratoID no existe |
| 300 | El contrato ya está dado de baja | IsActive ya es 0 |

---

### 11. Activar Registro de Contrato

**Endpoint:** `PATCH /contratos/activar/:ContratoID`

**Descripción:** Reactiva un contrato que fue dado de baja (IsActive = 1).

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
  "message": "Contrato activado",
  "error": false,
  "data": {
    "ContratoID": 1,
    "IsActive": 1
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | Contrato no encontrado | ContratoID no existe |
| 300 | El contrato ya está activo | IsActive ya es 1 |

---

## EQUIPOS DEL CONTRATO

---

### 12. Obtener Items Pendientes de Asignar

**Endpoint:** `GET /contratos/:ContratoID/items-pendientes`

**Descripción:** Lista los items pre-cargados del presupuesto que aún no tienen un equipo físico asignado (EquipoID = null).

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
  "message": "Items pendientes obtenidos",
  "error": false,
  "data": [
    {
      "ContratoEquipoID": 1,
      "ContratoID": 1,
      "EquipoID": null,
      "Modalidad": "RENTA",
      "PrecioUnitario": 450.00,
      "PeriodoMeses": 12,
      "FechaInstalacion": null,
      "FechaRetiro": null,
      "Estatus": "PENDIENTE",
      "Observaciones": null,
      "IsActive": 1,
      "PlantillaEquipoID": 1,
      "RefaccionID": null,
      "TipoItem": "EQUIPO_PURIFREEZE",
      "Descripcion": "[PF-001] Enfriador Industrial 5000",
      "CantidadRequerida": 2,
      "CantidadAsignada": 0,
      "plantilla": {
        "PlantillaEquipoID": 1,
        "NombreEquipo": "Enfriador Industrial 5000",
        "Codigo": "PF-001",
        "EsExterno": false
      },
      "refaccion": null
    }
  ]
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | Contrato no encontrado | ContratoID no existe |

---

### 13. Obtener Equipos Disponibles para un Item

**Endpoint:** `GET /contratos/equipos/:ContratoEquipoID/disponibles`

**Descripción:** Lista los equipos físicos disponibles que pueden asignarse a un item pendiente. Filtra automáticamente por la plantilla requerida.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `ContratoEquipoID` | number | Sí | ID del item del contrato |

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Equipos disponibles obtenidos",
  "error": false,
  "data": {
    "item": {
      "ContratoEquipoID": 1,
      "Descripcion": "[PF-001] Enfriador Industrial 5000",
      "TipoItem": "EQUIPO_PURIFREEZE",
      "PlantillaEquipoID": 1,
      "plantilla": {
        "PlantillaEquipoID": 1,
        "NombreEquipo": "Enfriador Industrial 5000",
        "Codigo": "PF-001"
      }
    },
    "equipos": [
      {
        "EquipoID": 5,
        "NumeroSerie": "PUR-25-0005",
        "Estatus": "Armado",
        "EsExterno": false,
        "plantilla": {
          "PlantillaEquipoID": 1,
          "NombreEquipo": "Enfriador Industrial 5000",
          "Codigo": "PF-001"
        }
      },
      {
        "EquipoID": 8,
        "NumeroSerie": "PUR-25-0008",
        "Estatus": "Desmontado",
        "EsExterno": false,
        "plantilla": {
          "PlantillaEquipoID": 1,
          "NombreEquipo": "Enfriador Industrial 5000",
          "Codigo": "PF-001"
        }
      }
    ]
  }
}
```

**Nota:** Solo muestra equipos en estado "Armado" o "Desmontado" que coincidan con la plantilla del item y que no estén ya asignados a otro item de este contrato.

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | Item del contrato no encontrado | ContratoEquipoID no existe |

---

### 14. Asignar Equipo Físico a Item Pendiente

**Endpoint:** `PATCH /contratos/equipos/:ContratoEquipoID/asignar`

**Descripción:** Asigna un equipo físico (con número de serie) a un item pendiente del contrato. Valida que el equipo corresponda a la plantilla requerida.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `ContratoEquipoID` | number | Sí | ID del item del contrato |

**Payload:**
| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `EquipoID` | number | Sí | - | ID del equipo físico a asignar |
| `Observaciones` | string | No | max: 500 | Notas adicionales |
| `UsuarioID` | number | Sí | - | Usuario que realiza la asignación |

**Ejemplo de Request:**
```json
{
  "EquipoID": 5,
  "Observaciones": "Equipo nuevo de almacén",
  "UsuarioID": 1
}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Contrato obtenido",
  "error": false,
  "data": { /* Contrato completo actualizado */ }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | Item del contrato no encontrado | ContratoEquipoID inválido |
| 404 | El equipo no existe | EquipoID inválido |
| 300 | Este item ya tiene un equipo físico asignado | Ya asignado |
| 300 | Solo se pueden asignar equipos a contratos en revisión o activos | Estatus no permitido |
| 300 | El equipo no está activo | Equipo dado de baja |
| 300 | El equipo debe estar en estado Armado o Desmontado | Estado incorrecto |
| 300 | El equipo ya está asignado a otro contrato | Ocupado |
| 300 | El equipo ya está asignado a otro item de este contrato | Duplicado |
| 300 | El equipo es de plantilla "X" pero se requiere plantilla "Y" | Plantilla incorrecta |

---

### 15. Agregar Equipo al Contrato (Nuevo)

**Endpoint:** `POST /contratos/:ContratoID/equipos`

**Descripción:** Agrega un equipo físico adicional al contrato (no viene del presupuesto original). Útil para agregar equipos después de crear el contrato.

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
| `EquipoID` | number | Sí | - | ID del equipo físico |
| `Modalidad` | enum | Sí | VENTA/RENTA/COMODATO/MANTENIMIENTO | Modalidad del equipo |
| `PrecioUnitario` | number | No | min: 0 | Precio del equipo. Default: 0 |
| `PeriodoMeses` | number | No | min: 1 | Meses (para RENTA) |
| `Observaciones` | string | No | max: 500 | Notas |
| `UsuarioID` | number | Sí | - | Usuario que agrega |

**Ejemplo de Request:**
```json
{
  "EquipoID": 10,
  "Modalidad": "RENTA",
  "PrecioUnitario": 450.00,
  "PeriodoMeses": 12,
  "Observaciones": "Equipo adicional solicitado por cliente",
  "UsuarioID": 1
}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Contrato obtenido",
  "error": false,
  "data": { /* Contrato completo actualizado */ }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | Contrato no encontrado | ContratoID no existe |
| 404 | El equipo no existe | EquipoID inválido |
| 300 | Solo se pueden agregar equipos a contratos en revisión o activos | Estatus no permitido |
| 300 | El equipo no está activo | Equipo dado de baja |
| 300 | El equipo debe estar en estado Armado o Desmontado para asignarlo | Estado incorrecto |
| 300 | El equipo ya está asignado a otro contrato | Equipo ocupado |
| 300 | El equipo ya está asignado a este contrato | Duplicado |

---

### 16. Actualizar Equipo del Contrato

**Endpoint:** `PUT /contratos/equipos/:ContratoEquipoID`

**Descripción:** Modifica precio, período u observaciones de un equipo asignado.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `ContratoEquipoID` | number | Sí | ID del equipo en el contrato |

**Payload:**
| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `PrecioUnitario` | number | No | min: 0 | Nuevo precio |
| `PeriodoMeses` | number | No | min: 1 | Nuevo período |
| `Observaciones` | string | No | max: 500 | Nuevas notas |
| `UsuarioID` | number | Sí | - | ID del usuario |

**Ejemplo de Request:**
```json
{
  "PrecioUnitario": 500.00,
  "PeriodoMeses": 24,
  "Observaciones": "Ajuste de precio por promoción",
  "UsuarioID": 1
}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Contrato obtenido",
  "error": false,
  "data": { /* Contrato completo actualizado */ }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | Equipo del contrato no encontrado | ContratoEquipoID no existe |
| 300 | Solo se pueden modificar equipos de contratos en revisión o activos | Estatus no permitido |

---

### 17. Instalar Equipo

**Endpoint:** `PATCH /contratos/equipos/:ContratoEquipoID/instalar`

**Descripción:** Marca el equipo como instalado. Actualiza la ubicación del equipo físico (ClienteID, SucursalID, ContratoID).

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `ContratoEquipoID` | number | Sí | ID del equipo en el contrato |

**Payload:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `UsuarioID` | number | Sí | ID del usuario |

**Ejemplo de Request:**
```json
{
  "UsuarioID": 1
}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Contrato obtenido",
  "error": false,
  "data": { /* Contrato completo actualizado */ }
}
```

**Efectos en la base de datos:**
- `contratos_equipos.Estatus` → `INSTALADO`
- `contratos_equipos.FechaInstalacion` → fecha actual
- `equipos.Estatus` → `Instalado`
- `equipos.FechaInstalacion` → fecha actual
- `equipos.ClienteID` → del contrato
- `equipos.SucursalID` → del contrato
- `equipos.ContratoID` → del contrato

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | Equipo del contrato no encontrado | ContratoEquipoID no existe |
| 300 | El equipo ya está instalado o retirado | Estatus no es PENDIENTE |
| 300 | Solo se pueden instalar equipos de contratos activos | Contrato no está ACTIVO |

---

### 18. Retirar Equipo

**Endpoint:** `PATCH /contratos/equipos/:ContratoEquipoID/retirar`

**Descripción:** Retira un equipo instalado del cliente. Limpia la ubicación del equipo físico.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `ContratoEquipoID` | number | Sí | ID del equipo en el contrato |

**Payload:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `UsuarioID` | number | Sí | ID del usuario |

**Ejemplo de Request:**
```json
{
  "UsuarioID": 1
}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Contrato obtenido",
  "error": false,
  "data": { /* Contrato completo actualizado */ }
}
```

**Efectos en la base de datos:**
- `contratos_equipos.Estatus` → `RETIRADO`
- `contratos_equipos.FechaRetiro` → fecha actual
- `equipos.Estatus` → `Desmontado`
- `equipos.FechaDesmontaje` → fecha actual
- `equipos.ClienteID` → `null`
- `equipos.SucursalID` → `null`
- `equipos.ContratoID` → `null`

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | Equipo del contrato no encontrado | ContratoEquipoID no existe |
| 300 | Solo se pueden retirar equipos instalados | Estatus no es INSTALADO |

---

## SERVICIOS

---

### 19. Obtener Servicios Programados (Agenda Global)

**Endpoint:** `GET /contratos/servicios/programados`

**Descripción:** Lista servicios programados con filtros. Útil para agenda de técnicos.

**Headers:**
```
Authorization: Bearer {token}
```

**Query Params:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `estatus` | enum | No | PROGRAMADO/EN_PROCESO/COMPLETADO/CANCELADO |
| `tecnicoId` | number | No | Filtrar por técnico asignado |
| `fechaDesde` | string | No | Desde fecha (YYYY-MM-DD) |
| `fechaHasta` | string | No | Hasta fecha (YYYY-MM-DD) |

**Ejemplo:** `GET /contratos/servicios/programados?estatus=PROGRAMADO&fechaDesde=2025-01-01&fechaHasta=2025-01-31`

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Servicios programados obtenidos",
  "error": false,
  "data": [
    {
      "ServicioID": 1,
      "ContratoEquipoID": 1,
      "TipoServicio": "MANTENIMIENTO_PREVENTIVO",
      "FechaProgramada": "2025-01-15T00:00:00.000Z",
      "FechaEjecucion": null,
      "TecnicoID": 2,
      "Costo": 500.00,
      "Estatus": "PROGRAMADO",
      "Observaciones": "Mantenimiento trimestral",
      "UsuarioID": 1,
      "IsActive": 1,
      "contrato_equipo": {
        "ContratoEquipoID": 1,
        "contrato": {
          "ContratoID": 1,
          "NumeroContrato": "CTR-25-0001",
          "cliente": {
            "ClienteID": 1,
            "NombreComercio": "Tiendas XYZ"
          },
          "sucursal": {
            "SucursalID": 2,
            "NombreSucursal": "Sucursal Norte",
            "Direccion": "Blvd. Norte #456"
          }
        },
        "equipo": {
          "EquipoID": 5,
          "NumeroSerie": "PUR-25-0005"
        }
      },
      "tecnico": {
        "TecnicoID": 2,
        "Codigo": "TEC-002",
        "Telefono": "844-111-2222",
        "usuario": {
          "NombreCompleto": "Juan Pérez"
        }
      }
    }
  ]
}
```

---

### 20. Obtener Servicios de un Contrato

**Endpoint:** `GET /contratos/:ContratoID/servicios`

**Descripción:** Lista todos los servicios de un contrato específico.

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
  "message": "Servicios obtenidos",
  "error": false,
  "data": [
    {
      "ServicioID": 1,
      "ContratoEquipoID": 1,
      "TipoServicio": "INSTALACION",
      "FechaProgramada": "2025-01-05T10:00:00.000Z",
      "FechaEjecucion": "2025-01-05T14:00:00.000Z",
      "TecnicoID": 2,
      "Costo": 500,
      "Estatus": "COMPLETADO",
      "Observaciones": "Instalación exitosa",
      "UsuarioID": 1,
      "IsActive": 1,
      "contrato_equipo": {
        "ContratoEquipoID": 1,
        "equipo": {
          "EquipoID": 5,
          "NumeroSerie": "PUR-25-0005"
        }
      },
      "tecnico": {
        "TecnicoID": 2,
        "Codigo": "TEC-002",
        "usuario": {
          "NombreCompleto": "Juan Pérez"
        }
      }
    }
  ]
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | Contrato no encontrado | ContratoID no existe |

---

### 21. Programar Servicio

**Endpoint:** `POST /contratos/equipos/:ContratoEquipoID/servicios`

**Descripción:** Programa un servicio para un equipo del contrato.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `ContratoEquipoID` | number | Sí | ID del equipo en el contrato |

**Payload:**
| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `TipoServicio` | enum | Sí | Ver enums | Tipo de servicio |
| `FechaProgramada` | string | Sí | Formato fecha/hora | Fecha programada |
| `TecnicoID` | number | No | - | Técnico asignado |
| `Costo` | number | No | min: 0 | Costo del servicio. Default: 0 |
| `Observaciones` | string | No | max: 500 | Notas |
| `UsuarioID` | number | No | - | Usuario que programa |

**Ejemplo de Request:**
```json
{
  "TipoServicio": "MANTENIMIENTO_PREVENTIVO",
  "FechaProgramada": "2025-03-15T10:00:00",
  "TecnicoID": 2,
  "Costo": 500.00,
  "Observaciones": "Mantenimiento trimestral programado",
  "UsuarioID": 1
}
```

**Response Exitoso (201):**
```json
{
  "status": 201,
  "message": "Servicio programado",
  "error": false,
  "data": {
    "ServicioID": 5,
    "ContratoEquipoID": 1,
    "TipoServicio": "MANTENIMIENTO_PREVENTIVO",
    "FechaProgramada": "2025-03-15T10:00:00.000Z",
    "FechaEjecucion": null,
    "TecnicoID": 2,
    "Costo": 500.00,
    "Estatus": "PROGRAMADO",
    "Observaciones": "Mantenimiento trimestral programado",
    "UsuarioID": 1,
    "IsActive": 1
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | Equipo del contrato no encontrado | ContratoEquipoID no existe |
| 404 | El técnico no existe o no está activo | TecnicoID inválido |
| 300 | Solo se pueden programar servicios en contratos activos | Contrato no está ACTIVO |

---

### 22. Actualizar Servicio

**Endpoint:** `PUT /contratos/servicios/:ServicioID`

**Descripción:** Modifica un servicio programado o en proceso. No se pueden modificar servicios completados o cancelados.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `ServicioID` | number | Sí | ID del servicio |

**Payload:**
| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `FechaProgramada` | string | No | Formato fecha | Nueva fecha |
| `TecnicoID` | number | No | - | Nuevo técnico |
| `Costo` | number | No | min: 0 | Nuevo costo |
| `Observaciones` | string | No | max: 500 | Nuevas notas |
| `Estatus` | enum | No | Ver enums | Nuevo estatus |

**Ejemplo de Request:**
```json
{
  "FechaProgramada": "2025-03-20T14:00:00",
  "TecnicoID": 3,
  "Observaciones": "Reprogramado por solicitud del cliente"
}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Servicio actualizado",
  "error": false,
  "data": {
    "ServicioID": 5,
    "FechaProgramada": "2025-03-20T14:00:00.000Z",
    "TecnicoID": 3,
    "Observaciones": "Reprogramado por solicitud del cliente"
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | Servicio no encontrado | ServicioID no existe |
| 300 | No se puede modificar un servicio completado o cancelado | Estatus no permitido |

---

### 23. Completar Servicio

**Endpoint:** `PATCH /contratos/servicios/:ServicioID/completar`

**Descripción:** Marca un servicio como completado.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `ServicioID` | number | Sí | ID del servicio |

**Payload:**
| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `FechaEjecucion` | string | No | Formato fecha | Fecha real de ejecución. Default: ahora |
| `Observaciones` | string | No | max: 500 | Notas de finalización |
| `Costo` | number | No | min: 0 | Costo final (si cambió) |

**Ejemplo de Request:**
```json
{
  "FechaEjecucion": "2025-03-15T16:30:00",
  "Observaciones": "Se realizó cambio de filtros y limpieza general",
  "Costo": 550.00
}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Servicio completado",
  "error": false,
  "data": {
    "ServicioID": 5,
    "Estatus": "COMPLETADO",
    "FechaEjecucion": "2025-03-15T16:30:00.000Z",
    "Observaciones": "Se realizó cambio de filtros y limpieza general",
    "Costo": 550.00
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | Servicio no encontrado | ServicioID no existe |
| 300 | El servicio ya está completado | Ya tiene estatus COMPLETADO |
| 300 | No se puede completar un servicio cancelado | Estatus es CANCELADO |

---

### 24. Cancelar Servicio

**Endpoint:** `PATCH /contratos/servicios/:ServicioID/cancelar`

**Descripción:** Cancela un servicio programado.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `ServicioID` | number | Sí | ID del servicio |

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Servicio cancelado",
  "error": false,
  "data": {
    "ServicioID": 5,
    "Estatus": "CANCELADO"
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | Servicio no encontrado | ServicioID no existe |
| 300 | No se puede cancelar un servicio completado | Estatus es COMPLETADO |

---

## Modelo de Datos

### contratos

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| ContratoID | Int | No | PK, autoincrement |
| NumeroContrato | String(20) | No | Único, formato CTR-YY-XXXX |
| PresupuestoID | Int | No | FK a presupuestos_encabezado |
| ClienteID | Int | No | FK a catalogo_clientes |
| SucursalID | Int | Sí | FK a clientes_sucursales |
| FechaInicio | Date | No | Inicio de vigencia |
| FechaFin | Date | No | Fin de vigencia |
| Estatus | Enum | No | Estado del contrato |
| CondicionesPago | Enum | No | Frecuencia de pago |
| DiaPago | Int | No | Día del mes (1-28) |
| MontoTotal | Float | No | Monto calculado |
| FrecuenciaMantenimiento | Int | Sí | Meses entre mantenimientos |
| PenalizacionCancelacion | Float | Sí | Porcentaje |
| MotivosCancelacion | String(500) | Sí | Razón de cancelación |
| Observaciones | String(500) | Sí | Notas |
| ContratoOrigenID | Int | Sí | FK para renovaciones |
| UsuarioID | Int | No | Quien creó |
| IsActive | Int | No | 1=activo, 0=baja |

### contratos_equipos

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| ContratoEquipoID | Int | No | PK, autoincrement |
| ContratoID | Int | No | FK a contratos |
| EquipoID | Int | Sí | FK a equipos (null = pendiente de asignar) |
| Modalidad | Enum | No | VENTA/RENTA/COMODATO/MANTENIMIENTO |
| PrecioUnitario | Float | No | Precio del equipo |
| PeriodoMeses | Int | Sí | Meses (para renta) |
| FechaInstalacion | Date | Sí | Fecha de instalación |
| FechaRetiro | Date | Sí | Fecha de retiro |
| Estatus | Enum | No | PENDIENTE/INSTALADO/RETIRADO |
| Observaciones | String(500) | Sí | Notas |
| PlantillaEquipoID | Int | Sí | FK a plantillas_equipo (referencia del presupuesto) |
| RefaccionID | Int | Sí | FK a catalogo_refacciones |
| TipoItem | String(50) | Sí | EQUIPO_PURIFREEZE/EQUIPO_EXTERNO/REFACCION/SERVICIO |
| Descripcion | String(500) | Sí | Descripción del item |
| CantidadRequerida | Int | No | Cantidad del presupuesto. Default: 1 |
| CantidadAsignada | Int | No | Cantidad de equipos asignados. Default: 0 |
| IsActive | Int | No | 1=activo, 0=baja |

### contratos_servicios

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| ServicioID | Int | No | PK, autoincrement |
| ContratoEquipoID | Int | No | FK a contratos_equipos |
| TipoServicio | Enum | No | Tipo de servicio |
| FechaProgramada | Date | No | Fecha programada |
| FechaEjecucion | Date | Sí | Fecha real de ejecución |
| TecnicoID | Int | Sí | FK a catalogo_tecnicos |
| Estatus | Enum | No | Estado del servicio |
| Costo | Float | No | Costo del servicio |
| Observaciones | String(500) | Sí | Notas |
| UsuarioID | Int | Sí | Quien programó |
| IsActive | Int | No | 1=activo, 0=baja |

### contratos_historial

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| HistorialID | Int | No | PK, autoincrement |
| ContratoID | Int | No | FK a contratos |
| TipoAccion | Enum | No | CREACION, ACTIVACION, MODIFICACION, AGREGAR_EQUIPO, RETIRAR_EQUIPO, ACTUALIZACION_MONTO, CANCELACION, RENOVACION |
| Descripcion | String(500) | No | Descripción de la acción |
| ValorAnterior | Text | Sí | JSON con valor anterior |
| ValorNuevo | Text | Sí | JSON con valor nuevo |
| UsuarioID | Int | No | Quien realizó la acción |
| FechaAccion | DateTime | No | Fecha y hora |

---

## Reglas de Negocio

1. **Solo presupuestos aprobados:** Un contrato solo puede crearse desde un presupuesto con estatus "Aprobado".

2. **Un contrato por presupuesto:** No puede haber dos contratos activos (EN_REVISION o ACTIVO) para el mismo presupuesto.

3. **Equipos disponibles:** Solo se pueden agregar equipos en estado "Armado" o "Desmontado" que no estén asignados a otro contrato.

4. **Validación de plantilla:** Al asignar un equipo a un item pendiente, debe coincidir con la plantilla requerida.

5. **Activación requiere equipos:** Para activar un contrato debe tener al menos un equipo asignado.

6. **Modificaciones en revisión:** La mayoría de cambios solo son posibles mientras el contrato está EN_REVISION.

7. **Actualización de ubicación:** Al instalar un equipo, se actualiza automáticamente su ubicación (ClienteID, SucursalID, ContratoID).

8. **Renovación automática:** Al renovar, los equipos instalados se transfieren al nuevo contrato con estatus INSTALADO.

9. **Cancelación limpia equipos:** Al cancelar un contrato, todos los equipos instalados se marcan como retirados y se limpia su ubicación.

10. **Historial automático:** Todas las acciones importantes se registran en contratos_historial.

11. **Recálculo de monto:** El monto total se recalcula automáticamente al activar, agregar o retirar equipos.

---

## Cálculo del Monto Total

```
MontoTotal = SUM(PrecioUnitario × (PeriodoMeses || 1)) para todos los equipos activos
```

El monto se recalcula automáticamente en:
- Activación del contrato
- Agregar equipo (si contrato activo)
- Retirar equipo (si contrato activo)
- Modificar equipo (si contrato activo)

---

## Número de Contrato

- **Formato:** `CTR-YY-XXXX`
- **Ejemplo:** `CTR-25-0001`
- Se genera automáticamente al crear el contrato
- El consecutivo se reinicia cada año

---

## Flujo de Estados

### Contrato
```
EN_REVISION ──→ ACTIVO ──→ VENCIDO
     │            │           │
     │            ▼           ▼
     │       CANCELADO    RENOVADO
     │
     └──→ (baja/activar registro)
```

### Equipo del Contrato
```
PENDIENTE ──→ INSTALADO ──→ RETIRADO
```

### Servicio
```
PROGRAMADO ──→ EN_PROCESO ──→ COMPLETADO
     │              │
     ▼              ▼
 CANCELADO      CANCELADO
```

---

## TypeScript Interfaces

```typescript
type EstatusContrato = 'EN_REVISION' | 'ACTIVO' | 'VENCIDO' | 'CANCELADO' | 'RENOVADO';
type CondicionesPago = 'MENSUAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL';
type ModalidadContrato = 'VENTA' | 'RENTA' | 'COMODATO' | 'MANTENIMIENTO';
type EstatusContratoEquipo = 'PENDIENTE' | 'INSTALADO' | 'RETIRADO';
type TipoServicioContrato = 'INSTALACION' | 'MANTENIMIENTO_PREVENTIVO' | 'MANTENIMIENTO_CORRECTIVO' | 'REPARACION' | 'DESMONTAJE';
type EstatusServicio = 'PROGRAMADO' | 'EN_PROCESO' | 'COMPLETADO' | 'CANCELADO';

interface Contrato {
  ContratoID: number;
  NumeroContrato: string;
  PresupuestoID: number;
  ClienteID: number;
  SucursalID: number | null;
  FechaInicio: string;
  FechaFin: string;
  Estatus: EstatusContrato;
  CondicionesPago: CondicionesPago;
  DiaPago: number;
  MontoTotal: number;
  FrecuenciaMantenimiento: number | null;
  PenalizacionCancelacion: number | null;
  MotivosCancelacion: string | null;
  Observaciones: string | null;
  ContratoOrigenID: number | null;
  UsuarioID: number;
  IsActive: number;
}

interface ContratoEquipo {
  ContratoEquipoID: number;
  ContratoID: number;
  EquipoID: number | null; // null = pendiente de asignar
  Modalidad: ModalidadContrato;
  PrecioUnitario: number;
  PeriodoMeses: number | null;
  FechaInstalacion: string | null;
  FechaRetiro: string | null;
  Estatus: EstatusContratoEquipo;
  Observaciones: string | null;
  // Datos del presupuesto
  PlantillaEquipoID: number | null;
  RefaccionID: number | null;
  TipoItem: string | null;
  Descripcion: string | null;
  CantidadRequerida: number;
  CantidadAsignada: number;
  IsActive: number;
}

interface ContratoServicio {
  ServicioID: number;
  ContratoEquipoID: number;
  TipoServicio: TipoServicioContrato;
  FechaProgramada: string;
  FechaEjecucion: string | null;
  TecnicoID: number | null;
  Estatus: EstatusServicio;
  Costo: number;
  Observaciones: string | null;
  UsuarioID: number | null;
  IsActive: number;
}

// DTOs para crear/actualizar
interface CreateContrato {
  PresupuestoID: number;
  FechaInicio: string;
  FechaFin: string;
  CondicionesPago?: CondicionesPago;
  DiaPago?: number;
  FrecuenciaMantenimiento?: number | null;
  PenalizacionCancelacion?: number | null;
  Observaciones?: string | null;
  UsuarioID: number;
}

interface AddEquipo {
  EquipoID: number;
  Modalidad: ModalidadContrato;
  PrecioUnitario?: number;
  PeriodoMeses?: number | null;
  Observaciones?: string | null;
  UsuarioID: number;
}

interface AsignarEquipo {
  EquipoID: number;
  Observaciones?: string | null;
  UsuarioID: number;
}

interface CreateServicio {
  TipoServicio: TipoServicioContrato;
  FechaProgramada: string;
  TecnicoID?: number | null;
  Costo?: number;
  Observaciones?: string | null;
  UsuarioID?: number | null;
}
```

---

## Flujo de Uso Típico

```javascript
// 1. Crear contrato desde presupuesto aprobado
// Los items del presupuesto se pre-cargan automáticamente como "pendientes de asignar"
const contrato = await fetch('/contratos', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer token' },
  body: JSON.stringify({
    PresupuestoID: 1,
    FechaInicio: '2025-01-01',
    FechaFin: '2025-12-31',
    CondicionesPago: 'MENSUAL',
    FrecuenciaMantenimiento: 3,
    UsuarioID: 1
  })
});

// 2. Ver items pendientes de asignar equipo
const itemsPendientes = await fetch(`/contratos/${contratoId}/items-pendientes`);
// Retorna items con EquipoID: null que necesitan un equipo físico

// 3. Ver equipos disponibles para un item específico
const equiposDisponibles = await fetch(`/contratos/equipos/${contratoEquipoId}/disponibles`);
// Retorna equipos que coinciden con la plantilla del item

// 4. Asignar equipo físico a cada item pendiente
await fetch(`/contratos/equipos/${contratoEquipoId}/asignar`, {
  method: 'PATCH',
  body: JSON.stringify({
    EquipoID: 5, // Equipo con número de serie real
    Observaciones: 'Equipo nuevo de almacén',
    UsuarioID: 1
  })
});

// 5. Activar el contrato (requiere al menos un equipo asignado)
await fetch(`/contratos/${contratoId}/activar-contrato`, {
  method: 'PATCH',
  body: JSON.stringify({ UsuarioID: 1 })
});

// 6. Instalar equipo en el cliente
await fetch(`/contratos/equipos/${contratoEquipoId}/instalar`, {
  method: 'PATCH',
  body: JSON.stringify({ UsuarioID: 1 })
});

// 7. Programar mantenimiento
await fetch(`/contratos/equipos/${contratoEquipoId}/servicios`, {
  method: 'POST',
  body: JSON.stringify({
    TipoServicio: 'MANTENIMIENTO_PREVENTIVO',
    FechaProgramada: '2025-03-15T10:00:00',
    TecnicoID: 2,
    Costo: 500
  })
});

// 8. Completar servicio
await fetch(`/contratos/servicios/${servicioId}/completar`, {
  method: 'PATCH',
  body: JSON.stringify({
    FechaEjecucion: '2025-03-15T14:30:00',
    Observaciones: 'Mantenimiento completado sin novedades'
  })
});

// 9. Al vencer, renovar contrato
await fetch(`/contratos/${contratoId}/renovar`, {
  method: 'POST',
  body: JSON.stringify({
    FechaInicio: '2026-01-01',
    FechaFin: '2026-12-31',
    UsuarioID: 1
  })
});
```

---

**Última actualización:** 2025-12-15
