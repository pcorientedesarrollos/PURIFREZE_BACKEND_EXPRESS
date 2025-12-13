# API de Contratos - Purifreeze Backend

## Información General

**Base URL:** `http://localhost:3000`

**Prefijo de ruta:** `/contratos`

**Autenticación:** No requerida (verificar si se implementa middleware de auth)

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

### 1. Crear Contrato

**Endpoint:** `POST /contratos`

**Descripción:** Crea un contrato desde un presupuesto aprobado.

**Headers:**
```
Content-Type: application/json
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
    "FechaCreacion": "2025-12-13T00:00:00.000Z",
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
    "equipos": [
      {
        "ContratoEquipoID": 1,
        "ContratoID": 1,
        "EquipoID": null,
        "Modalidad": "RENTA",
        "PrecioUnitario": 450.00,
        "PeriodoMeses": 12,
        "Estatus": "PENDIENTE",
        "TipoItem": "EQUIPO_PURIFREEZE",
        "Descripcion": "[PF-001] Enfriador Industrial 5000",
        "CantidadRequerida": 2,
        "CantidadAsignada": 0,
        "plantilla": {
          "PlantillaEquipoID": 1,
          "NombreEquipo": "Enfriador Industrial 5000",
          "Codigo": "PF-001"
        }
      }
    ],
    "historial": []
  }
}
```

**Nota:** Los items del presupuesto se pre-cargan automáticamente con `EquipoID: null` indicando que están pendientes de asignar un equipo físico.

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | El presupuesto no existe | PresupuestoID inválido |
| 300 | Solo se pueden crear contratos de presupuestos aprobados | Presupuesto no aprobado |
| 300 | Ya existe un contrato activo para este presupuesto | Contrato duplicado |

---

### 2. Obtener Todos los Contratos

**Endpoint:** `GET /contratos`

**Descripción:** Lista todos los contratos con filtros opcionales.

**Query Params:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `estatus` | enum | No | Filtrar por estatus |
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
      "ClienteID": 1,
      "Estatus": "ACTIVO",
      "FechaInicio": "2025-01-01T00:00:00.000Z",
      "FechaFin": "2025-12-31T00:00:00.000Z",
      "MontoTotal": 5400.00,
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

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `ContratoID` | number | Sí | ID del contrato |

---

### 4. Obtener Contratos por Cliente

**Endpoint:** `GET /contratos/cliente/:ClienteID`

**Descripción:** Lista todos los contratos de un cliente.

---

### 5. Actualizar Contrato

**Endpoint:** `PUT /contratos/:ContratoID`

**Descripción:** Actualiza datos del contrato. Solo funciona si está EN_REVISION.

**Payload:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `FechaInicio` | string | No | Nueva fecha de inicio |
| `FechaFin` | string | No | Nueva fecha de fin |
| `CondicionesPago` | enum | No | Nuevas condiciones |
| `DiaPago` | number | No | Nuevo día de pago |
| `FrecuenciaMantenimiento` | number | No | Nueva frecuencia |
| `PenalizacionCancelacion` | number | No | Nueva penalización |
| `Observaciones` | string | No | Nuevas observaciones |
| `UsuarioID` | number | Sí | Usuario que modifica |

---

### 6. Activar Contrato

**Endpoint:** `PATCH /contratos/:ContratoID/activar-contrato`

**Descripción:** Cambia el estatus de EN_REVISION a ACTIVO. Requiere al menos un equipo asignado.

**Payload:**
```json
{
  "UsuarioID": 1
}
```

**Errores Posibles:**
| Código | Mensaje | Causa |
|--------|---------|-------|
| 300 | Solo se pueden activar contratos en revisión | Estatus incorrecto |
| 300 | El contrato debe tener al menos un equipo asignado | Sin equipos |

---

### 7. Cancelar Contrato

**Endpoint:** `PATCH /contratos/:ContratoID/cancelar`

**Descripción:** Cancela el contrato y retira todos los equipos instalados.

**Payload:**
```json
{
  "MotivosCancelacion": "Cliente solicitó cancelación anticipada",
  "UsuarioID": 1
}
```

---

### 8. Renovar Contrato

**Endpoint:** `POST /contratos/:ContratoID/renovar`

**Descripción:** Crea un nuevo contrato vinculado al actual. Transfiere automáticamente los equipos instalados.

**Payload:**
```json
{
  "FechaInicio": "2026-01-01",
  "FechaFin": "2026-12-31",
  "CondicionesPago": "MENSUAL",
  "DiaPago": 15,
  "UsuarioID": 1
}
```

**Response:** Retorna el nuevo contrato con estatus ACTIVO.

---

### 9. Actualizar Monto

**Endpoint:** `PATCH /contratos/:ContratoID/monto`

**Descripción:** Actualiza manualmente el monto total del contrato (solo contratos activos).

**Payload:**
```json
{
  "MontoTotal": 6000.00,
  "UsuarioID": 1
}
```

---

### 10. Dar de Baja / Activar Registro

**Endpoints:**
- `PATCH /contratos/baja/:ContratoID` - Soft delete
- `PATCH /contratos/activar/:ContratoID` - Reactivar registro

---

## Equipos del Contrato

### 11. Obtener Items Pendientes de Asignar

**Endpoint:** `GET /contratos/:ContratoID/items-pendientes`

**Descripción:** Lista los items pre-cargados del presupuesto que aún no tienen un equipo físico asignado.

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
      "Estatus": "PENDIENTE",
      "TipoItem": "EQUIPO_PURIFREEZE",
      "Descripcion": "[PF-001] Enfriador Industrial 5000",
      "CantidadRequerida": 2,
      "CantidadAsignada": 0,
      "PlantillaEquipoID": 1,
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

---

### 12. Obtener Equipos Disponibles para un Item

**Endpoint:** `GET /contratos/equipos/:ContratoEquipoID/disponibles`

**Descripción:** Lista los equipos físicos disponibles que pueden asignarse a un item pendiente. Filtra automáticamente por la plantilla requerida.

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

---

### 13. Asignar Equipo Físico a Item Pendiente

**Endpoint:** `PATCH /contratos/equipos/:ContratoEquipoID/asignar`

**Descripción:** Asigna un equipo físico (con número de serie) a un item pendiente del contrato.

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `ContratoEquipoID` | number | Sí | ID del item del contrato |

**Payload:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `EquipoID` | number | Sí | ID del equipo físico a asignar |
| `Observaciones` | string | No | Notas adicionales |
| `UsuarioID` | number | Sí | Usuario que realiza la asignación |

**Ejemplo:**
```json
{
  "EquipoID": 5,
  "Observaciones": "Equipo nuevo de almacén",
  "UsuarioID": 1
}
```

**Response Exitoso (200):** Retorna el contrato completo actualizado.

**Errores Posibles:**
| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | Item del contrato no encontrado | ContratoEquipoID inválido |
| 300 | Este item ya tiene un equipo físico asignado | Ya asignado |
| 404 | El equipo no existe | EquipoID inválido |
| 300 | El equipo no está activo | Equipo dado de baja |
| 300 | El equipo debe estar en estado Armado o Desmontado | Estado incorrecto |
| 300 | El equipo ya está asignado a otro contrato | Ocupado |
| 300 | El equipo ya está asignado a otro item de este contrato | Duplicado |
| 300 | El equipo es de plantilla "X" pero se requiere plantilla "Y" | Plantilla incorrecta |

---

### 14. Agregar Equipo al Contrato (Nuevo)

**Endpoint:** `POST /contratos/:ContratoID/equipos`

**Descripción:** Agrega un equipo físico adicional al contrato (no viene del presupuesto original).

**Payload:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `EquipoID` | number | Sí | ID del equipo físico |
| `Modalidad` | enum | Sí | VENTA/RENTA/COMODATO/MANTENIMIENTO |
| `PrecioUnitario` | number | No | Precio del equipo. Default: 0 |
| `PeriodoMeses` | number | No | Meses (para RENTA) |
| `Observaciones` | string | No | Notas |
| `UsuarioID` | number | Sí | Usuario que agrega |

**Ejemplo:**
```json
{
  "EquipoID": 5,
  "Modalidad": "RENTA",
  "PrecioUnitario": 450.00,
  "PeriodoMeses": 12,
  "UsuarioID": 1
}
```

**Errores Posibles:**
| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | El equipo no existe | EquipoID inválido |
| 300 | El equipo no está activo | Equipo dado de baja |
| 300 | El equipo debe estar en estado Armado o Desmontado | Estado incorrecto |
| 300 | El equipo ya está asignado a otro contrato | Equipo ocupado |
| 300 | El equipo ya está asignado a este contrato | Duplicado |

---

### 15. Actualizar Equipo del Contrato

**Endpoint:** `PUT /contratos/equipos/:ContratoEquipoID`

**Descripción:** Modifica precio o período de un equipo asignado.

**Payload:**
```json
{
  "PrecioUnitario": 500.00,
  "PeriodoMeses": 24,
  "Observaciones": "Ajuste de precio",
  "UsuarioID": 1
}
```

---

### 16. Instalar Equipo

**Endpoint:** `PATCH /contratos/equipos/:ContratoEquipoID/instalar`

**Descripción:** Marca el equipo como instalado. Actualiza la ubicación del equipo físico (ClienteID, SucursalID, ContratoID).

**Payload:**
```json
{
  "UsuarioID": 1
}
```

**Efectos:**
- `contratos_equipos.Estatus` → `INSTALADO`
- `contratos_equipos.FechaInstalacion` → fecha actual
- `equipos.Estatus` → `Instalado`
- `equipos.ClienteID` → del contrato
- `equipos.SucursalID` → del contrato
- `equipos.ContratoID` → del contrato

---

### 17. Retirar Equipo

**Endpoint:** `PATCH /contratos/equipos/:ContratoEquipoID/retirar`

**Descripción:** Retira un equipo instalado del cliente.

**Payload:**
```json
{
  "UsuarioID": 1
}
```

**Efectos:**
- `contratos_equipos.Estatus` → `RETIRADO`
- `contratos_equipos.FechaRetiro` → fecha actual
- `equipos.Estatus` → `Desmontado`
- `equipos.ClienteID` → `null`
- `equipos.SucursalID` → `null`
- `equipos.ContratoID` → `null`

---

## Servicios

### 18. Programar Servicio

**Endpoint:** `POST /contratos/equipos/:ContratoEquipoID/servicios`

**Descripción:** Programa un servicio para un equipo del contrato.

**Payload:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `TipoServicio` | enum | Sí | Tipo de servicio |
| `FechaProgramada` | string | Sí | Fecha programada (YYYY-MM-DD) |
| `TecnicoID` | number | No | Técnico asignado |
| `Costo` | number | No | Costo del servicio. Default: 0 |
| `Observaciones` | string | No | Notas |
| `UsuarioID` | number | No | Usuario que programa |

**Ejemplo:**
```json
{
  "TipoServicio": "MANTENIMIENTO_PREVENTIVO",
  "FechaProgramada": "2025-03-15",
  "TecnicoID": 2,
  "Costo": 500.00,
  "Observaciones": "Mantenimiento trimestral"
}
```

---

### 19. Obtener Servicios del Contrato

**Endpoint:** `GET /contratos/:ContratoID/servicios`

**Descripción:** Lista todos los servicios de un contrato.

---

### 20. Obtener Agenda de Servicios

**Endpoint:** `GET /contratos/servicios/programados`

**Descripción:** Lista servicios programados con filtros. Útil para agenda de técnicos.

**Query Params:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `estatus` | enum | No | PROGRAMADO/EN_PROCESO/COMPLETADO/CANCELADO |
| `tecnicoId` | number | No | Filtrar por técnico |
| `fechaDesde` | string | No | Desde fecha (YYYY-MM-DD) |
| `fechaHasta` | string | No | Hasta fecha (YYYY-MM-DD) |

**Ejemplo:** `GET /contratos/servicios/programados?estatus=PROGRAMADO&fechaDesde=2025-01-01&fechaHasta=2025-01-31`

**Response:**
```json
{
  "status": 200,
  "message": "Servicios programados obtenidos",
  "error": false,
  "data": [
    {
      "ServicioID": 1,
      "TipoServicio": "MANTENIMIENTO_PREVENTIVO",
      "FechaProgramada": "2025-01-15T00:00:00.000Z",
      "Estatus": "PROGRAMADO",
      "Costo": 500.00,
      "contrato_equipo": {
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

### 21. Actualizar Servicio

**Endpoint:** `PUT /contratos/servicios/:ServicioID`

**Descripción:** Modifica un servicio programado o en proceso.

---

### 22. Completar Servicio

**Endpoint:** `PATCH /contratos/servicios/:ServicioID/completar`

**Descripción:** Marca un servicio como completado.

**Payload:**
```json
{
  "FechaEjecucion": "2025-01-15",
  "Observaciones": "Se realizó cambio de filtros",
  "Costo": 550.00
}
```

---

### 23. Cancelar Servicio

**Endpoint:** `PATCH /contratos/servicios/:ServicioID/cancelar`

**Descripción:** Cancela un servicio programado.

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
| FechaCreacion | Date | No | Fecha de creación |
| IsActive | Int | Sí | 1=activo, 0=baja |

### contratos_equipos

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| ContratoEquipoID | Int | No | PK, autoincrement |
| ContratoID | Int | No | FK a contratos |
| EquipoID | Int | Sí | FK a equipos (null = pendiente de asignar) |
| ItemPendienteID | Int | Sí | Referencia al item pendiente que satisface |
| Modalidad | Enum | No | VENTA/RENTA/COMODATO/MANTENIMIENTO |
| PrecioUnitario | Float | No | Precio del equipo |
| PeriodoMeses | Int | Sí | Meses (para renta) |
| FechaAsignacion | Date | No | Fecha de asignación |
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
| IsActive | Int | Sí | 1=activo, 0=baja |

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
| IsActive | Int | Sí | 1=activo, 0=baja |

### contratos_historial

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| HistorialID | Int | No | PK, autoincrement |
| ContratoID | Int | No | FK a contratos |
| TipoAccion | Enum | No | Tipo de acción |
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

4. **Activación requiere equipos:** Para activar un contrato debe tener al menos un equipo asignado.

5. **Modificaciones en revisión:** La mayoría de cambios solo son posibles mientras el contrato está EN_REVISION.

6. **Actualización de ubicación:** Al instalar un equipo, se actualiza automáticamente su ubicación (ClienteID, SucursalID, ContratoID).

7. **Renovación automática:** Al renovar, los equipos instalados se transfieren al nuevo contrato.

8. **Cancelación limpia equipos:** Al cancelar un contrato, todos los equipos instalados se marcan como retirados y se limpia su ubicación.

9. **Historial automático:** Todas las acciones importantes se registran en contratos_historial.

10. **Recálculo de monto:** El monto total se recalcula automáticamente al agregar/retirar equipos (para contratos activos).

---

## Cálculo del Monto Total

```
MontoTotal = SUM(
  PrecioUnitario × (PeriodoMeses || 1)
) para todos los equipos activos
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
  FechaCreacion: string;
  IsActive: number;
}

interface ContratoEquipo {
  ContratoEquipoID: number;
  ContratoID: number;
  EquipoID: number | null; // null = pendiente de asignar
  ItemPendienteID: number | null;
  Modalidad: ModalidadContrato;
  PrecioUnitario: number;
  PeriodoMeses: number | null;
  FechaAsignacion: string;
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
    FechaProgramada: '2025-03-15',
    TecnicoID: 2
  })
});

// 8. Completar servicio
await fetch(`/contratos/servicios/${servicioId}/completar`, {
  method: 'PATCH',
  body: JSON.stringify({
    FechaEjecucion: '2025-03-15',
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

**Última actualización:** 2025-12-13
