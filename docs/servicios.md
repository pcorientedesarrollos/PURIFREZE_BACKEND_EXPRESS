# API de Servicios - Purifreeze Backend

## Información General

**Base URL:** `http://localhost:3000`

**Prefijo de ruta:** `/servicios`

**Autenticación:** Bearer Token (JWT)

---

## Flujo de Negocio - Guía para Frontend

### ¿Cómo funciona el módulo de servicios?

El módulo de servicios es el corazón operativo del sistema. Aquí se gestionan todas las visitas técnicas a los clientes: instalaciones, mantenimientos, reparaciones y desinstalaciones.

### Flujo General para Crear un Servicio

```
1. Usuario selecciona un CONTRATO ACTIVO
   └── GET /contratos/:ContratoID (ver docs/contratos.md)

2. El contrato trae los EQUIPOS vinculados
   └── Cada equipo tiene: PlantillaEquipoID, EquipoID (si está asignado), Modalidad, etc.

3. Usuario selecciona:
   - Tipo de servicio (INSTALACION, MANTENIMIENTO, REPARACION, DESINSTALACION)
   - Fecha y hora programada
   - Técnico (opcional al crear, requerido para confirmar)
   - Equipos a incluir en el servicio (puede ser 1 o varios)

4. Sistema valida reglas de negocio y crea el servicio
   └── Carga automáticamente las refacciones de cada equipo
```

### APIs de Apoyo que Necesitarás

| Endpoint | Módulo | ¿Para qué? |
|----------|--------|------------|
| `GET /contratos?clienteId=X&estatus=ACTIVO` | contratos | Buscar contratos activos del cliente |
| `GET /contratos/:ContratoID` | contratos | Obtener equipos del contrato |
| `GET /tecnicos` | tecnicos | Listar técnicos disponibles |
| `GET /inventario-tecnico/:TecnicoID` | inventario-tecnico | Ver stock del técnico asignado |
| `GET /inventario` | inventario | Ver stock de bodega principal |
| `GET /refacciones` | refacciones | Buscar refacciones para agregar |

### Casos de Uso por Tipo de Servicio

#### CASO 1: INSTALACIÓN (Solo equipos Purifreeze)

```
Escenario: Cliente firmó contrato, hay que instalar 2 equipos osmosis

Prerrequisitos:
- Contrato en estado ACTIVO
- Equipos asignados al contrato (EquipoID != null)
- Equipos en estado "Armado" o "Reacondicionado"

Flujo:
1. Crear servicio tipo INSTALACION
2. Seleccionar los 2 equipos del contrato
3. Asignar técnico y fecha
4. Al FINALIZAR:
   - Los equipos cambian a estado "Instalado"
   - Se actualiza contratos_equipos.Estatus = "INSTALADO"
   - Se descuenta inventario si hubo cambios de refacciones
```

#### CASO 2: MANTENIMIENTO (Equipos Purifreeze o Externos)

```
Escenario: Visita programada de mantenimiento, cliente tiene 3 equipos

Prerrequisitos:
- Equipos Purifreeze deben estar "Instalados"
- Equipos externos pueden atenderse siempre

Flujo:
1. Crear servicio tipo MANTENIMIENTO
2. Seleccionar equipos (pueden ser 1, 2 o los 3)
3. Al abrir el servicio se cargan las refacciones de cada equipo
4. Técnico marca por cada refacción:
   - ☐ Cambio (reemplazar pieza)
   - ☐ Limpieza (solo limpiar)
   - ☐ Verificación (revisar estado)
5. Si hay CAMBIO:
   - Indicar cantidad que trae el técnico (CantidadTecnico)
   - Opcionalmente cambiar por otra refacción diferente (RefaccionNuevaID)
6. Agregar INSUMOS adicionales si se usaron (cloro, etc.)
7. Al FINALIZAR:
   - Se descuenta del inventario del técnico o bodega
   - Se actualiza el equipo con las nuevas refacciones
   - Se registra en kardex
```

#### CASO 3: REPARACIÓN

```
Escenario: Cliente reporta falla, se agenda reparación urgente

Flujo: Similar a MANTENIMIENTO pero:
- Puede incluir más cambios de refacciones
- Puede requerir piezas que no están en el equipo originalmente
- Usar "Agregar refacción" para piezas nuevas
```

#### CASO 4: DESINSTALACIÓN (Solo equipos Purifreeze)

```
Escenario: Cliente cancela contrato, hay que retirar equipos

Prerrequisitos:
- Equipos deben estar "Instalados"
- Solo equipos Purifreeze pueden desinstalarse

Flujo:
1. Crear servicio tipo DESINSTALACION
2. Seleccionar equipos a retirar
3. Configurar QUÉ HACER con cada equipo:

   OPCIÓN A: "EQUIPO_COMPLETO"
   - El equipo regresa completo a bodega
   - Estado cambia a "Reacondicionado"
   - Se puede editar desde panel de equipos para dejarlo como nuevo
   - Reutilizable en otro contrato

   OPCIÓN B: "PIEZAS_INDIVIDUALES"
   - Se configura el destino de CADA refacción:
     * INVENTARIO = regresa a bodega (stock bueno)
     * DANADA = va a refacciones dañadas (con motivo)
     * PERMANECE = se queda (no aplica normalmente)
   - Estado del equipo cambia a "Desmontado"
   - El equipo ya no es reutilizable (desarmado)
```

### Pantalla Principal del Servicio (Detalle)

Cuando abres un servicio con `GET /servicios/:ServicioID`, recibes toda esta información:

```
┌─────────────────────────────────────────────────────────────────┐
│ SERVICIO #1 - MANTENIMIENTO                                     │
│ Estado: CONFIRMADO                                              │
├─────────────────────────────────────────────────────────────────┤
│ CONTRATO: CNT-25-0001                                           │
│ CLIENTE: Empresa XYZ                                            │
│ SUCURSAL: Sucursal Centro - Calle 123                          │
│ CONTACTO: María García - 555-1234                               │
├─────────────────────────────────────────────────────────────────┤
│ FECHA: 2025-01-20  HORA: 10:00                                  │
│ TÉCNICO: Juan Pérez (TEC-001) - 555-5678                        │
│ ORIGEN INVENTARIO: [TÉCNICO ▼]                                  │
├─────────────────────────────────────────────────────────────────┤
│ EQUIPOS EN ESTE SERVICIO:                                       │
│                                                                 │
│ ┌─ EQUIPO 1: OSMOSIS PF 100 - PF-OIP-100-058 ─────────────────┐│
│ │                                                              ││
│ │ Refacción          │ C-Equipo │ C-Técnico │ Cambio │ Limp │ ││
│ │ FILTRO GAC 2.5x10  │    1     │    5      │   ☐    │  ☐   │ ││
│ │ MEMBRANA 100 GPD   │    1     │    0      │   ☐    │  ☑   │ ││
│ │ FILTRO SEDIMENTOS  │    1     │    3      │   ☑    │  ☐   │ ││
│ │                                            [+ Agregar]      ││
│ └──────────────────────────────────────────────────────────────┘│
│                                                                 │
│ ┌─ EQUIPO 2: DISPENSADOR AGUA - EXT-001 ──────────────────────┐│
│ │ (Equipo externo - sin refacciones registradas)              ││
│ └──────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│ INSUMOS DEL SERVICIO:                                           │
│ Refacción      │ Cantidad │ Origen  │ Costo    │                │
│ Cloro          │    2     │ Técnico │ $100.00  │ [x]            │
│ [Buscar refacciones...]                        [+ Agregar]      │
├─────────────────────────────────────────────────────────────────┤
│ OBSERVACIONES ANTES: PPM22                                      │
│ OBSERVACIONES DESPUÉS: _______________                          │
├─────────────────────────────────────────────────────────────────┤
│ COSTO TOTAL: $250.00                                            │
│                                                                 │
│ [Cancelar] [Reagendar] [Cambiar Estado ▼] [Finalizar Servicio] │
└─────────────────────────────────────────────────────────────────┘
```

### Flujo de Estados y Acciones

```
┌──────────────┐
│ POR_CONFIRMAR│ ← Servicio creado, falta asignar técnico
└──────┬───────┘
       │ Asignar técnico
       ▼
┌──────────────┐
│  PENDIENTE   │ ← Tiene técnico, esperando confirmar cita con cliente
└──────┬───────┘
       │ Cliente confirma disponibilidad
       ▼
┌──────────────┐
│  CONFIRMADO  │ ← Cita confirmada, esperando la fecha
└──────┬───────┘
       │ Técnico llega al sitio
       ▼
┌──────────────┐
│  EN_PROCESO  │ ← Técnico trabajando, se pueden editar refacciones
└──────┬───────┘
       │ Finalizar servicio
       ▼
┌──────────────┐
│  REALIZADO   │ ← Servicio completado, inventarios actualizados
└──────────────┘

* Desde cualquier estado (excepto REALIZADO) se puede:
  - CANCELAR → Estado CANCELADO
  - REAGENDAR → Crea nuevo servicio, cancela el actual
```

### Reagendamiento

Cuando se reagenda un servicio:

1. El servicio actual se CANCELA con el motivo de reagendamiento
2. Se crea un NUEVO servicio con:
   - Mismos equipos
   - Nueva fecha/hora
   - Mismo o nuevo técnico
   - Referencia al servicio original (ServicioOrigenID)
3. Las refacciones se cargan FRESCAS del estado actual del equipo

```json
// POST /servicios/:ServicioID/reagendar
{
  "NuevaFechaProgramada": "2025-01-25",
  "NuevaHoraProgramada": "14:00",
  "MotivoReagendamiento": "Cliente solicitó cambio de fecha",
  "NuevoTecnicoID": 2  // Opcional
}
```

### Próximo Servicio Automático

Al finalizar un servicio, se puede programar el siguiente:

```json
// POST /servicios/:ServicioID/finalizar
{
  "ObservacionesDespues": "Todo OK",
  "ProximoServicioMeses": 3  // En 3 meses se crea recordatorio
}
```

Esto crea una NOTIFICACIÓN en `servicios_notificaciones` que aparecerá en la agenda cuando llegue la fecha.

### Consultar Stock para el Servicio

**Stock del Técnico Asignado:**
```
GET /inventario-tecnico/:TecnicoID
```

Respuesta incluye StockNuevo y StockUsado por refacción.

**Stock de Bodega Principal:**
```
GET /inventario
```

**Buscar Refacciones para Agregar:**
```
GET /refacciones?q=filtro
GET /equipos/refacciones?q=filtro  // Este incluye stock disponible
```

### Validaciones Importantes

| Validación | Mensaje de Error |
|------------|------------------|
| Equipo externo + INSTALACION | "Equipos externos no requieren instalación" |
| Equipo externo + DESINSTALACION | "Equipos externos no pueden desinstalarse" |
| Equipo no instalado + MANTENIMIENTO | "El equipo debe estar instalado" |
| Equipo no instalado + DESINSTALACION | "El equipo debe estar instalado para desinstalarse" |
| Equipo no armado + INSTALACION | "El equipo debe estar en estado Armado o Reacondicionado" |
| Sin técnico + PENDIENTE | "Debe asignar un técnico antes de pasar a PENDIENTE" |
| Stock insuficiente al finalizar | "Stock insuficiente del técnico para [refacción]" |

### Bloqueo de Equipos

**Importante:** Mientras un equipo esté en un servicio activo (no REALIZADO ni CANCELADO), **no se puede editar desde el panel de equipos**.

Para saber si un equipo está bloqueado:
- Verificar si tiene servicios en estado: POR_CONFIRMAR, PENDIENTE, CONFIRMADO, EN_PROCESO

---

## Tipos de Servicio

| Tipo | Descripción |
|------|-------------|
| `INSTALACION` | Instalación de equipo Purifreeze (Armado/Reacondicionado → Instalado) |
| `MANTENIMIENTO` | Mantenimiento preventivo o correctivo |
| `REPARACION` | Reparación de equipo |
| `DESINSTALACION` | Desinstalación de equipo (Instalado → Reacondicionado/Desmontado) |

## Estados del Servicio

| Estado | Descripción |
|--------|-------------|
| `POR_CONFIRMAR` | Falta contactar al cliente y asignar técnico |
| `PENDIENTE` | Tiene técnico asignado, esperando confirmación de cita |
| `CONFIRMADO` | Cita confirmada, esperando fecha |
| `EN_PROCESO` | Técnico en sitio trabajando |
| `REALIZADO` | Servicio finalizado exitosamente |
| `CANCELADO` | Servicio cancelado |

## Flujo de Estados

```
POR_CONFIRMAR → PENDIENTE → CONFIRMADO → EN_PROCESO → REALIZADO
      ↓             ↓           ↓            ↓
  CANCELADO    CANCELADO   CANCELADO    CANCELADO
```

---

## Endpoints

### 1. Crear Servicio

**Endpoint:** `POST /servicios`

**Descripción:** Crea un nuevo servicio para un contrato activo

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Payload:**
| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `ContratoID` | number | Sí | - | ID del contrato |
| `TipoServicio` | string | Sí | enum | INSTALACION, MANTENIMIENTO, REPARACION, DESINSTALACION |
| `FechaProgramada` | string | Sí | formato fecha | Fecha programada YYYY-MM-DD |
| `HoraProgramada` | string | No | formato HH:mm | Hora programada |
| `TecnicoID` | number | No | - | ID del técnico asignado |
| `OrigenInventario` | string | No | enum | TECNICO (default) o BODEGA |
| `ObservacionesGenerales` | string | No | max: 1000 | Observaciones generales |
| `EquiposIDs` | number[] | Sí | min: 1 | IDs de contratos_equipos a incluir |

**Ejemplo de Request:**
```json
{
  "ContratoID": 1,
  "TipoServicio": "MANTENIMIENTO",
  "FechaProgramada": "2025-01-20",
  "HoraProgramada": "10:00",
  "TecnicoID": 1,
  "OrigenInventario": "TECNICO",
  "EquiposIDs": [1, 2]
}
```

**Response Exitoso (201):**
```json
{
  "status": 201,
  "message": "Servicio obtenido",
  "error": false,
  "data": {
    "ServicioID": 1,
    "TipoServicio": "MANTENIMIENTO",
    "FechaProgramada": "2025-01-20",
    "HoraProgramada": "10:00",
    "Estatus": "PENDIENTE",
    "Contrato": { "ContratoID": 1, "NumeroContrato": "CNT-25-0001" },
    "Cliente": { "ClienteID": 1, "NombreComercio": "Empresa XYZ" },
    "Tecnico": { "TecnicoID": 1, "Nombre": "Juan Pérez" },
    "Equipos": [...]
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | Debe incluir al menos un equipo | EquiposIDs vacío |
| 400 | Algunos equipos seleccionados no pertenecen al contrato | IDs inválidos |
| 400 | Equipos externos no requieren instalación | Tipo incompatible |
| 400 | El equipo debe estar en estado Armado para instalarse | Estado inválido |
| 404 | Contrato no encontrado o no está activo | Contrato inválido |

---

### 2. Obtener Todos los Servicios

**Endpoint:** `GET /servicios`

**Descripción:** Lista servicios con filtros opcionales

**Query Params:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `q` | string | No | Búsqueda por número de contrato, cliente u observaciones |
| `estatus` | string | No | Filtrar por estado |
| `tipo` | string | No | Filtrar por tipo de servicio |
| `tecnicoId` | number | No | Filtrar por técnico |
| `contratoId` | number | No | Filtrar por contrato |
| `clienteId` | number | No | Filtrar por cliente |
| `fechaDesde` | string | No | Fecha mínima YYYY-MM-DD |
| `fechaHasta` | string | No | Fecha máxima YYYY-MM-DD |

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Servicios obtenidos",
  "error": false,
  "data": [
    {
      "ServicioID": 1,
      "TipoServicio": "MANTENIMIENTO",
      "FechaProgramada": "2025-01-20",
      "HoraProgramada": "10:00",
      "Estatus": "CONFIRMADO",
      "OrigenInventario": "TECNICO",
      "Contrato": { "ContratoID": 1, "NumeroContrato": "CNT-25-0001" },
      "Cliente": { "ClienteID": 1, "NombreComercio": "Empresa XYZ" },
      "Sucursal": { "SucursalID": 1, "NombreSucursal": "Sucursal Centro", "Direccion": "..." },
      "Tecnico": { "TecnicoID": 1, "Codigo": "TEC-001", "Nombre": "Juan Pérez", "Telefono": "..." },
      "TotalEquipos": 2
    }
  ]
}
```

---

### 3. Obtener Servicio por ID

**Endpoint:** `GET /servicios/:ServicioID`

**Descripción:** Obtiene el detalle completo de un servicio con equipos, refacciones e insumos

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Servicio obtenido",
  "error": false,
  "data": {
    "ServicioID": 1,
    "TipoServicio": "MANTENIMIENTO",
    "FechaProgramada": "2025-01-20",
    "HoraProgramada": "10:00",
    "FechaEjecucion": null,
    "Estatus": "CONFIRMADO",
    "OrigenInventario": "TECNICO",
    "ObservacionesAntes": "PPM22",
    "ObservacionesDespues": null,
    "ObservacionesGenerales": null,
    "CostoTotal": 0,
    "Contrato": {
      "ContratoID": 1,
      "NumeroContrato": "CNT-25-0001",
      "FrecuenciaMantenimiento": 3
    },
    "Cliente": { "ClienteID": 1, "NombreComercio": "Empresa XYZ" },
    "Sucursal": {
      "SucursalID": 1,
      "NombreSucursal": "Sucursal Centro",
      "Direccion": "Calle 123",
      "Telefono": "555-1234",
      "Contacto": "María García"
    },
    "Tecnico": {
      "TecnicoID": 1,
      "Codigo": "TEC-001",
      "Nombre": "Juan Pérez",
      "Telefono": "555-5678"
    },
    "Equipos": [
      {
        "ServicioEquipoID": 1,
        "ContratoEquipoID": 1,
        "AccionDesinstalacion": null,
        "Equipo": {
          "EquipoID": 1,
          "NumeroSerie": "PF-OIP-100-058",
          "Estatus": "Instalado",
          "EsExterno": false,
          "NombreEquipo": "OSMOSIS PF 100 GDP -UV TDS",
          "Codigo": "OIP-100"
        },
        "Refacciones": [
          {
            "ServicioEquipoRefaccionID": 1,
            "RefaccionID": 10,
            "NombrePieza": "FILTRO (GAC) DE 2.5\" X 10\"",
            "NombreCorto": "FILTRO GAC",
            "Codigo": "FG-250",
            "Unidad": "Pieza",
            "CostoPromedio": 150.00,
            "CantidadEquipo": 1,
            "CantidadTecnico": 5,
            "Cambio": false,
            "Limpieza": false,
            "Verificacion": false,
            "RefaccionNueva": null,
            "CantidadNueva": 0,
            "DestinoRefaccion": null,
            "Observaciones": null
          }
        ]
      }
    ],
    "Insumos": [
      {
        "ServicioInsumoID": 1,
        "RefaccionID": 20,
        "NombrePieza": "Cloro",
        "Cantidad": 2,
        "OrigenInventario": "TECNICO",
        "CostoUnitario": 50.00,
        "Subtotal": 100.00
      }
    ],
    "Firmas": [],
    "FechaCreacion": "2025-01-15 09:30"
  }
}
```

---

### 4. Obtener Agenda

**Endpoint:** `GET /servicios/agenda`

**Descripción:** Obtiene la agenda de servicios pendientes

**Query Params:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `fechaDesde` | string | No | Fecha inicio (default: inicio de semana) |
| `fechaHasta` | string | No | Fecha fin (default: +2 semanas) |
| `tecnicoId` | number | No | Filtrar por técnico |

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Agenda obtenida",
  "error": false,
  "data": [
    {
      "ServicioID": 1,
      "TipoServicio": "MANTENIMIENTO",
      "FechaProgramada": "2025-01-20",
      "HoraProgramada": "10:00",
      "Estatus": "CONFIRMADO",
      "NumeroContrato": "CNT-25-0001",
      "NombreCliente": "Empresa XYZ",
      "Sucursal": "Sucursal Centro",
      "Direccion": "Calle 123",
      "Tecnico": { "TecnicoID": 1, "Codigo": "TEC-001", "Nombre": "Juan Pérez" },
      "TotalEquipos": 2
    }
  ]
}
```

---

### 5. Actualizar Servicio

**Endpoint:** `PUT /servicios/:ServicioID`

**Descripción:** Actualiza datos del servicio (solo estados: POR_CONFIRMAR, PENDIENTE, CONFIRMADO)

**Payload:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `FechaProgramada` | string | No | Nueva fecha |
| `HoraProgramada` | string | No | Nueva hora |
| `TecnicoID` | number | No | Nuevo técnico |
| `OrigenInventario` | string | No | TECNICO o BODEGA |
| `ObservacionesAntes` | string | No | Observaciones antes del servicio |
| `ObservacionesDespues` | string | No | Observaciones después |
| `ObservacionesGenerales` | string | No | Observaciones generales |

---

### 6. Cambiar Estatus

**Endpoint:** `PATCH /servicios/:ServicioID/estatus`

**Descripción:** Cambia el estado del servicio

**Payload:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `Estatus` | string | Sí | Nuevo estado |
| `Observaciones` | string | No | Observaciones del cambio |

**Ejemplo:**
```json
{
  "Estatus": "CONFIRMADO",
  "Observaciones": "Cliente confirmó disponibilidad"
}
```

---

### 7. Cancelar Servicio

**Endpoint:** `PATCH /servicios/:ServicioID/cancelar`

**Descripción:** Cancela un servicio

**Payload:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `MotivoCancelacion` | string | Sí | Motivo de cancelación (max: 255) |

---

### 8. Reagendar Servicio

**Endpoint:** `POST /servicios/:ServicioID/reagendar`

**Descripción:** Reagenda un servicio (crea uno nuevo y cancela el original)

**Payload:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `NuevaFechaProgramada` | string | Sí | Nueva fecha |
| `NuevaHoraProgramada` | string | No | Nueva hora |
| `MotivoReagendamiento` | string | Sí | Motivo del reagendamiento |
| `NuevoTecnicoID` | number | No | Nuevo técnico (opcional) |

**Response:** Devuelve el nuevo servicio creado (201)

---

### 9. Actualizar Refacción en Equipo

**Endpoint:** `PATCH /servicios/:ServicioID/refacciones`

**Descripción:** Actualiza las acciones realizadas sobre una refacción (cambio, limpieza, verificación)

**Payload:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `ServicioEquipoRefaccionID` | number | Sí | ID de la refacción en el servicio |
| `CantidadTecnico` | number | No | Cantidad que trae el técnico |
| `Cambio` | boolean | No | Se cambió la pieza |
| `Limpieza` | boolean | No | Se limpió la pieza |
| `Verificacion` | boolean | No | Se verificó la pieza |
| `RefaccionNuevaID` | number | No | Si se cambia por otra refacción diferente |
| `CantidadNueva` | number | No | Cantidad de la nueva refacción |
| `Observaciones` | string | No | Observaciones |

**Ejemplo:**
```json
{
  "ServicioEquipoRefaccionID": 1,
  "CantidadTecnico": 5,
  "Cambio": true,
  "Limpieza": false,
  "Verificacion": true
}
```

---

### 10. Agregar Refacción a Equipo

**Endpoint:** `POST /servicios/:ServicioID/refacciones`

**Descripción:** Agrega una nueva refacción a un equipo durante el servicio

**Payload:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `ServicioEquipoID` | number | Sí | ID del equipo en el servicio |
| `RefaccionID` | number | Sí | ID de la refacción a agregar |
| `CantidadTecnico` | number | Sí | Cantidad a instalar |
| `Cambio` | boolean | No | Default: true |
| `Observaciones` | string | No | Observaciones |

---

### 11. Eliminar Refacción de Equipo

**Endpoint:** `DELETE /servicios/:ServicioID/refacciones`

**Descripción:** Elimina una refacción del equipo, especificando su destino

**Payload:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `ServicioEquipoRefaccionID` | number | Sí | ID de la refacción |
| `DestinoRefaccion` | string | Sí | INVENTARIO, DANADA o PERMANECE |
| `MotivoDano` | string | Condicional | Requerido si destino es DANADA |
| `ObservacionesDano` | string | No | Observaciones del daño |

**Motivos de daño válidos:** `Defecto_Fabrica`, `Mal_Uso`, `Desgaste_Normal`, `Accidente`, `Otro`

---

### 12. Agregar Insumo

**Endpoint:** `POST /servicios/:ServicioID/insumos`

**Descripción:** Agrega un insumo adicional al servicio

**Payload:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `RefaccionID` | number | Sí | ID de la refacción/insumo |
| `Cantidad` | number | Sí | Cantidad a usar |
| `OrigenInventario` | string | No | TECNICO o BODEGA |
| `Observaciones` | string | No | Observaciones |

---

### 13. Modificar Insumo

**Endpoint:** `PATCH /servicios/:ServicioID/insumos`

**Payload:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `ServicioInsumoID` | number | Sí | ID del insumo |
| `Cantidad` | number | No | Nueva cantidad |
| `Observaciones` | string | No | Nuevas observaciones |

---

### 14. Eliminar Insumo

**Endpoint:** `DELETE /servicios/:ServicioID/insumos/:ServicioInsumoID`

---

### 15. Configurar Desinstalación

**Endpoint:** `PATCH /servicios/:ServicioID/desinstalacion`

**Descripción:** Configura cómo se manejará la desinstalación de un equipo

**Payload:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `ServicioEquipoID` | number | Sí | ID del equipo en el servicio |
| `AccionDesinstalacion` | string | Sí | PIEZAS_INDIVIDUALES o EQUIPO_COMPLETO |
| `Refacciones` | array | Condicional | Requerido si es PIEZAS_INDIVIDUALES |

**Estructura de Refacciones:**
```json
{
  "ServicioEquipoID": 1,
  "AccionDesinstalacion": "PIEZAS_INDIVIDUALES",
  "Refacciones": [
    {
      "ServicioEquipoRefaccionID": 1,
      "DestinoRefaccion": "INVENTARIO"
    },
    {
      "ServicioEquipoRefaccionID": 2,
      "DestinoRefaccion": "DANADA",
      "MotivoDano": "Desgaste_Normal",
      "ObservacionesDano": "Filtro muy usado"
    }
  ]
}
```

**Acciones de Desinstalación:**
- `PIEZAS_INDIVIDUALES`: Se especifica el destino de cada refacción (inventario o dañada). El equipo queda en estado "Desmontado".
- `EQUIPO_COMPLETO`: El equipo regresa completo y queda en estado "Reacondicionado", listo para editarse y reutilizarse.

---

### 16. Finalizar Servicio

**Endpoint:** `POST /servicios/:ServicioID/finalizar`

**Descripción:** Finaliza el servicio, procesa inventarios, actualiza equipos y opcionalmente agenda el próximo servicio

**Payload:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `ObservacionesDespues` | string | No | Observaciones finales |
| `ObservacionesGenerales` | string | No | Observaciones generales |
| `ProximoServicioMeses` | number | No | Meses para agendar próximo servicio (1-24) |
| `FirmaCliente` | object | No | Firma digital del cliente |
| `FirmaTecnico` | object | No | Firma digital del técnico |

**Estructura de Firma:**
```json
{
  "NombreFirmante": "Juan Cliente",
  "FirmaData": "base64..."
}
```

**Ejemplo completo:**
```json
{
  "ObservacionesDespues": "Equipo funcionando correctamente",
  "ProximoServicioMeses": 3,
  "FirmaCliente": {
    "NombreFirmante": "María García",
    "FirmaData": "data:image/png;base64,..."
  },
  "FirmaTecnico": {
    "NombreFirmante": "Juan Pérez",
    "FirmaData": "data:image/png;base64,..."
  }
}
```

**Acciones que realiza:**
1. Descuenta refacciones del inventario (técnico o bodega según configuración)
2. Actualiza los equipos_detalle con los cambios realizados
3. Actualiza estado del equipo (si es instalación o desinstalación)
4. Procesa devoluciones al inventario o registro de dañadas
5. Registra en kardex todos los movimientos
6. Crea notificación para próximo servicio si se especifica
7. Guarda firmas digitales

---

## Reglas de Negocio

### Equipos Purifreeze (Internos)
- **Primero deben instalarse** antes de recibir otros servicios
- Estado inicial: `Armado` o `Reacondicionado`
- Al instalar: cambia a `Instalado`
- Al desinstalar:
  - `PIEZAS_INDIVIDUALES` → `Desmontado`
  - `EQUIPO_COMPLETO` → `Reacondicionado`

### Equipos Externos
- **No requieren instalación ni desinstalación**
- Solo pueden recibir `MANTENIMIENTO` o `REPARACION`

### Inventario
- Por defecto se consume del **inventario del técnico**
- Se puede cambiar a **bodega** por servicio o por insumo
- Todo movimiento se registra en **kardex**

### Bloqueo de Edición
- Un equipo en servicio activo **no puede editarse** desde el panel de equipos
- Solo puede modificarse desde el módulo de servicios

---

## Modelo de Datos

### servicios
| Campo | Tipo | Descripción |
|-------|------|-------------|
| ServicioID | Int | Clave primaria |
| ContratoID | Int | FK a contratos |
| TipoServicio | Enum | Tipo de servicio |
| FechaProgramada | Date | Fecha programada |
| HoraProgramada | Time | Hora programada |
| TecnicoID | Int | FK a catalogo_tecnicos |
| Estatus | Enum | Estado del servicio |
| OrigenInventario | Enum | TECNICO o BODEGA |

### servicios_equipos
| Campo | Tipo | Descripción |
|-------|------|-------------|
| ServicioEquipoID | Int | Clave primaria |
| ServicioID | Int | FK a servicios |
| ContratoEquipoID | Int | FK a contratos_equipos |
| EquipoID | Int | FK a equipos |
| AccionDesinstalacion | Enum | Para desinstalaciones |

### servicios_equipos_refacciones
| Campo | Tipo | Descripción |
|-------|------|-------------|
| ServicioEquipoRefaccionID | Int | Clave primaria |
| ServicioEquipoID | Int | FK a servicios_equipos |
| RefaccionID | Int | FK a catalogo_refacciones |
| CantidadEquipo | Int | Cantidad actual en equipo |
| CantidadTecnico | Int | Cantidad del técnico |
| Cambio | Boolean | Se cambió |
| Limpieza | Boolean | Se limpió |
| Verificacion | Boolean | Se verificó |

### servicios_insumos
| Campo | Tipo | Descripción |
|-------|------|-------------|
| ServicioInsumoID | Int | Clave primaria |
| ServicioID | Int | FK a servicios |
| RefaccionID | Int | FK a catalogo_refacciones |
| Cantidad | Int | Cantidad usada |
| OrigenInventario | Enum | Origen del insumo |

---

## Notas Importantes

- **Soft Delete:** El campo `IsActive` indica si el registro está activo
- **Historial:** Todas las acciones se registran en `servicios_historial`
- **Notificaciones:** Se crean automáticamente para próximos servicios
- **Kardex:** Todos los movimientos de inventario quedan registrados
- **Firmas:** Se almacenan en base64 en la tabla `servicios_firmas`

---

**Última actualización:** 2025-01-XX
