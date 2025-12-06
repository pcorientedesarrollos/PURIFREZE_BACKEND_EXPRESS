# API de Equipos - Purifreeze Backend

## Información General

**Base URL:** `http://localhost:3000`

**Prefijo de ruta:** `/equipos`

**Autenticación:** Bearer Token (opcional, pero se registra el usuario en movimientos)

---

## Conceptos Importantes

### Estados del Equipo

| Estado | Descripción | Acciones Permitidas |
|--------|-------------|---------------------|
| `Armado` | Estado inicial al crear el equipo | Modificar refacciones, actualizar observaciones, instalar |
| `Instalado` | El equipo está en uso con un cliente | Desmontar (solo Purifreeze) |
| `Desmontado` | El equipo fue retirado | Solo consulta (historial) |

### Tipos de Equipo

| Tipo | EsExterno | Afecta Inventario | Puede Desmontarse |
|------|-----------|-------------------|-------------------|
| **Interno (Purifreeze)** | `false` | ✅ Sí | ✅ Sí |
| **Externo (otra empresa)** | `true` | ❌ No | ❌ No |

### Número de Serie

Se genera automáticamente con el formato: `PREFIJO-AÑO-CONSECUTIVO`

**Ejemplos:**
- Plantilla "Purificador Básico" → `PUR-24-0001`, `PUR-24-0002`
- Plantilla "Frigorífico Industrial" → `FI-24-0001`

El prefijo se genera desde el nombre de la plantilla:
- Una palabra: primeras 3 letras
- Múltiples palabras: inicial de cada palabra (máx. 4)

---

## Endpoints

### 1. Buscar Refacciones con Stock Disponible

**Endpoint:** `GET /equipos/refacciones`

**Descripción:** Busca refacciones del catálogo mostrando el stock disponible en el inventario general. Útil para seleccionar refacciones al armar o editar un equipo interno.

**Query Params:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `q` | string | No | Búsqueda por nombre, nombre corto o código |

**Ejemplo de Request:**
```
GET /equipos/refacciones?q=membrana
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Refacciones encontradas",
  "error": false,
  "data": [
    {
      "RefaccionID": 10,
      "NombrePieza": "Membrana RO 75GPD",
      "NombreCorto": "MEM-RO-75",
      "Codigo": "REF-010",
      "CostoPromedio": 350.00,
      "Unidad": "Pieza",
      "StockDisponible": 25
    },
    {
      "RefaccionID": 11,
      "NombrePieza": "Membrana RO 100GPD",
      "NombreCorto": "MEM-RO-100",
      "Codigo": "REF-011",
      "CostoPromedio": 450.00,
      "Unidad": "Pieza",
      "StockDisponible": 15
    }
  ]
}
```

**Notas:**
- Devuelve máximo 30 resultados
- `StockDisponible` muestra el stock actual en bodega general
- Para equipos externos no es necesario validar stock, pero este endpoint ayuda a visualizar disponibilidad

---

### 2. Crear Equipos desde Plantilla

**Endpoint:** `POST /equipos`

**Descripción:** Crea uno o varios equipos idénticos basados en una plantilla. Si la plantilla es interna (Purifreeze), valida y descuenta del inventario.

> **Nota:** Antes de crear equipos internos, use `GET /equipos/refacciones` para verificar que hay stock suficiente de las refacciones de la plantilla.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Payload:**
| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `PlantillaEquipoID` | number | Sí | - | ID de la plantilla base |
| `Cantidad` | number | Sí | min: 1, max: 50 | Cantidad de equipos a crear |
| `Observaciones` | string | No | max: 500 | Observaciones para todos los equipos |

**Ejemplo de Request:**
```json
{
  "PlantillaEquipoID": 1,
  "Cantidad": 5,
  "Observaciones": "Lote para cliente ABC"
}
```

**Response Exitoso (201):**
```json
{
  "status": 201,
  "message": "5 equipo(s) creado(s) correctamente",
  "error": false,
  "data": [
    {
      "EquipoID": 1,
      "NumeroSerie": "PUR-24-0001",
      "NombreEquipo": "Purificador Básico",
      "Estatus": "Armado",
      "EsExterno": false,
      "FechaCreacion": "2024-12-06"
    },
    {
      "EquipoID": 2,
      "NumeroSerie": "PUR-24-0002",
      "NombreEquipo": "Purificador Básico",
      "Estatus": "Armado",
      "EsExterno": false,
      "FechaCreacion": "2024-12-06"
    }
  ]
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | Stock insuficiente para "{NombrePieza}". Disponible: X, Requerido: Y | No hay stock suficiente para crear los equipos |
| 404 | Plantilla no encontrada | PlantillaEquipoID inválido o inactivo |

---

### 2. Obtener Todos los Equipos

**Endpoint:** `GET /equipos`

**Descripción:** Obtiene la lista de equipos con filtros opcionales.

**Query Params:**
| Parámetro | Tipo | Requerido | Valores | Descripción |
|-----------|------|-----------|---------|-------------|
| `q` | string | No | - | Búsqueda por número de serie, observaciones o nombre de plantilla |
| `estatus` | string | No | `todos`, `Armado`, `Instalado`, `Desmontado` | Filtrar por estado |
| `tipo` | string | No | `todos`, `interno`, `externo` | Filtrar por tipo de equipo |
| `plantillaId` | number | No | - | Filtrar por plantilla específica |

**Ejemplo de Request:**
```
GET /equipos?estatus=Armado&tipo=interno
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Equipos obtenidos",
  "error": false,
  "data": [
    {
      "EquipoID": 1,
      "NumeroSerie": "PUR-24-0001",
      "EsExterno": false,
      "Estatus": "Armado",
      "Observaciones": "Lote para cliente ABC",
      "FechaCreacion": "2024-12-06",
      "FechaInstalacion": null,
      "FechaDesmontaje": null,
      "Plantilla": {
        "PlantillaEquipoID": 1,
        "NombreEquipo": "Purificador Básico",
        "Codigo": "PB-001"
      },
      "TotalRefacciones": 8,
      "CostoTotal": 1500.00,
      "PrecioVenta": 2025.00,
      "PrecioRenta": 225.00
    }
  ]
}
```

---

### 3. Obtener Equipo por ID

**Endpoint:** `GET /equipos/:EquipoID`

**Descripción:** Obtiene los detalles completos de un equipo incluyendo todas sus refacciones.

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `EquipoID` | number | Sí | ID del equipo |

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Equipo obtenido",
  "error": false,
  "data": {
    "EquipoID": 1,
    "NumeroSerie": "PUR-24-0001",
    "EsExterno": false,
    "Estatus": "Armado",
    "Observaciones": "Lote para cliente ABC",
    "FechaCreacion": "2024-12-06",
    "FechaInstalacion": null,
    "FechaDesmontaje": null,
    "UsuarioCreadorID": 5,
    "Plantilla": {
      "PlantillaEquipoID": 1,
      "NombreEquipo": "Purificador Básico",
      "Codigo": "PB-001",
      "PorcentajeVenta": 35,
      "PorcentajeRenta": 15
    },
    "CostoTotal": 1500.00,
    "PrecioVenta": 2025.00,
    "PrecioRenta": 225.00,
    "Detalles": [
      {
        "EquipoDetalleID": 1,
        "RefaccionID": 10,
        "Cantidad": 2,
        "Refaccion": {
          "NombrePieza": "Membrana RO",
          "NombreCorto": "MEM-RO",
          "Codigo": "REF-010",
          "CostoPromedio": 350.00,
          "Unidad": "Pieza"
        },
        "Subtotal": 700.00
      },
      {
        "EquipoDetalleID": 2,
        "RefaccionID": 15,
        "Cantidad": 1,
        "Refaccion": {
          "NombrePieza": "Bomba de presión",
          "NombreCorto": "BOMBA",
          "Codigo": "REF-015",
          "CostoPromedio": 800.00,
          "Unidad": "Pieza"
        },
        "Subtotal": 800.00
      }
    ]
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | Equipo no encontrado | EquipoID inválido o inactivo |

---

### 4. Actualizar Observaciones del Equipo

**Endpoint:** `PUT /equipos/:EquipoID`

**Descripción:** Actualiza las observaciones de un equipo. Solo disponible en estado `Armado`.

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `EquipoID` | number | Sí | ID del equipo |

**Payload:**
| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `Observaciones` | string | No | max: 500, nullable | Nuevas observaciones |

**Ejemplo de Request:**
```json
{
  "Observaciones": "Equipo ajustado para cliente especial"
}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Equipo actualizado correctamente",
  "error": false,
  "data": { ... equipo completo actualizado ... }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | Esta operación solo está permitida para equipos en estado: Armado. Estado actual: Instalado | El equipo no está en estado Armado |
| 404 | Equipo no encontrado | EquipoID inválido o inactivo |

---

### 5. Agregar Refacción al Equipo

**Endpoint:** `POST /equipos/:EquipoID/refacciones`

**Descripción:** Agrega una nueva refacción al equipo. Solo disponible en estado `Armado`. Si es equipo interno, valida y descuenta del inventario.

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `EquipoID` | number | Sí | ID del equipo |

**Payload:**
| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `RefaccionID` | number | Sí | - | ID de la refacción a agregar |
| `Cantidad` | number | Sí | min: 1 | Cantidad a agregar |

**Ejemplo de Request:**
```json
{
  "RefaccionID": 25,
  "Cantidad": 2
}
```

**Response Exitoso (201):**
```json
{
  "status": 201,
  "message": "Refacción agregada correctamente",
  "error": false,
  "data": { ... equipo completo actualizado ... }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | Esta refacción ya existe en el equipo | La refacción ya está en el equipo |
| 400 | Stock insuficiente para "{NombrePieza}" | No hay stock suficiente (solo equipos internos) |
| 400 | Esta operación solo está permitida para equipos en estado: Armado | El equipo no está en estado Armado |
| 404 | Refacción no encontrada | RefaccionID inválido o inactivo |
| 404 | Equipo no encontrado | EquipoID inválido o inactivo |

---

### 6. Modificar Cantidad de Refacción

**Endpoint:** `PATCH /equipos/:EquipoID/refacciones/:EquipoDetalleID/cantidad`

**Descripción:** Modifica la cantidad de una refacción existente en el equipo. Solo disponible en estado `Armado`. Si es equipo interno, ajusta el inventario automáticamente.

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `EquipoID` | number | Sí | ID del equipo |
| `EquipoDetalleID` | number | Sí | ID del detalle a modificar |

**Payload:**
| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `Cantidad` | number | Sí | min: 1 | Nueva cantidad |

**Ejemplo de Request:**
```json
{
  "Cantidad": 3
}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Cantidad actualizada correctamente",
  "error": false,
  "data": { ... equipo completo actualizado ... }
}
```

**Comportamiento de Inventario (equipos internos):**
- Si la nueva cantidad es **mayor**: descuenta la diferencia del inventario
- Si la nueva cantidad es **menor**: devuelve la diferencia al inventario

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | Stock insuficiente para "{NombrePieza}" | No hay stock para incrementar (solo internos) |
| 400 | Esta operación solo está permitida para equipos en estado: Armado | El equipo no está en estado Armado |
| 404 | Detalle de equipo no encontrado | EquipoDetalleID inválido |
| 404 | Equipo no encontrado | EquipoID inválido o inactivo |

---

### 7. Eliminar Refacción del Equipo

**Endpoint:** `DELETE /equipos/:EquipoID/refacciones/:EquipoDetalleID`

**Descripción:** Elimina una refacción del equipo. Solo disponible en estado `Armado`. Para equipos internos, se debe especificar el destino de las refacciones.

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `EquipoID` | number | Sí | ID del equipo |
| `EquipoDetalleID` | number | Sí | ID del detalle a eliminar |

**Payload:**
| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `Destino` | string | Sí | `inventario` o `danada` | A dónde van las refacciones |
| `MotivoDano` | string | Condicional | Ver valores permitidos | Requerido si Destino = `danada` |
| `Observaciones` | string | No | max: 255 | Observaciones del daño |

**Valores de MotivoDano:**
- `Defecto_Fabrica`
- `Mal_Uso`
- `Desgaste_Normal`
- `Accidente`
- `Otro`

**Ejemplo de Request (regresar a inventario):**
```json
{
  "Destino": "inventario"
}
```

**Ejemplo de Request (refacción dañada):**
```json
{
  "Destino": "danada",
  "MotivoDano": "Defecto_Fabrica",
  "Observaciones": "La pieza venía defectuosa"
}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Refacción eliminada correctamente",
  "error": false,
  "data": { ... equipo completo actualizado ... }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | MotivoDano es requerido cuando el destino es dañada | Falta MotivoDano |
| 400 | Esta operación solo está permitida para equipos en estado: Armado | El equipo no está en estado Armado |
| 404 | Detalle de equipo no encontrado | EquipoDetalleID inválido |
| 404 | Equipo no encontrado | EquipoID inválido o inactivo |

---

### 8. Instalar Equipo

**Endpoint:** `PATCH /equipos/:EquipoID/instalar`

**Descripción:** Cambia el estado del equipo de `Armado` a `Instalado`. Una vez instalado, no se pueden modificar las refacciones.

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `EquipoID` | number | Sí | ID del equipo |

**Payload:**
| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `FechaInstalacion` | string | No | formato fecha | Fecha de instalación (default: hoy) |

**Ejemplo de Request:**
```json
{
  "FechaInstalacion": "2024-12-06"
}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Equipo instalado correctamente",
  "error": false,
  "data": {
    "EquipoID": 1,
    "NumeroSerie": "PUR-24-0001",
    "Estatus": "Instalado",
    "FechaInstalacion": "2024-12-06",
    ...
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | Esta operación solo está permitida para equipos en estado: Armado | El equipo ya está instalado o desmontado |
| 404 | Equipo no encontrado | EquipoID inválido o inactivo |

---

### 9. Desmontar Equipo

**Endpoint:** `PATCH /equipos/:EquipoID/desmontar`

**Descripción:** Cambia el estado del equipo de `Instalado` a `Desmontado`. **Solo disponible para equipos Purifreeze (internos)**. Permite especificar el destino de cada refacción.

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `EquipoID` | number | Sí | ID del equipo |

**Payload:**
| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `FechaDesmontaje` | string | No | formato fecha | Fecha de desmontaje (default: hoy) |
| `Observaciones` | string | No | max: 500 | Observaciones del desmontaje |
| `Refacciones` | array | No | - | Lista de refacciones con su destino |

**Estructura de cada elemento en Refacciones:**
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `RefaccionID` | number | Sí | ID de la refacción |
| `Cantidad` | number | Sí | Cantidad a procesar |
| `Destino` | string | Sí | `inventario` o `danada` |
| `MotivoDano` | string | Condicional | Requerido si Destino = `danada` |
| `ObservacionesDano` | string | No | Observaciones del daño |

**Ejemplo de Request:**
```json
{
  "FechaDesmontaje": "2024-12-06",
  "Observaciones": "Equipo retirado por fin de contrato",
  "Refacciones": [
    {
      "RefaccionID": 10,
      "Cantidad": 2,
      "Destino": "inventario"
    },
    {
      "RefaccionID": 15,
      "Cantidad": 1,
      "Destino": "danada",
      "MotivoDano": "Desgaste_Normal",
      "ObservacionesDano": "Bomba con desgaste después de 2 años de uso"
    }
  ]
}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Equipo desmontado correctamente",
  "error": false,
  "data": {
    "EquipoID": 1,
    "NumeroSerie": "PUR-24-0001",
    "Estatus": "Desmontado",
    "FechaDesmontaje": "2024-12-06",
    ...
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | Solo equipos Purifreeze pueden desmontarse | Intentando desmontar equipo externo |
| 400 | Esta operación solo está permitida para equipos en estado: Instalado | El equipo no está instalado |
| 400 | Cantidad excede lo disponible para refacción X | Cantidad mayor a la del equipo |
| 400 | MotivoDano es requerido para refacción X | Falta MotivoDano cuando Destino = `danada` |
| 404 | Refacción X no encontrada en el equipo | RefaccionID no pertenece al equipo |
| 404 | Equipo no encontrado | EquipoID inválido o inactivo |

---

### 10. Dar de Baja Equipo

**Endpoint:** `PATCH /equipos/baja/:EquipoID`

**Descripción:** Desactiva un equipo (soft delete).

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `EquipoID` | number | Sí | ID del equipo |

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Equipo dado de baja correctamente",
  "error": false,
  "data": {
    "EquipoID": 1
  }
}
```

---

### 11. Activar Equipo

**Endpoint:** `PATCH /equipos/activar/:EquipoID`

**Descripción:** Reactiva un equipo previamente dado de baja.

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `EquipoID` | number | Sí | ID del equipo |

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Equipo activado correctamente",
  "error": false,
  "data": {
    "EquipoID": 1
  }
}
```

---

## Modelo de Datos

### equipos

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| EquipoID | Int | No | Clave primaria |
| PlantillaEquipoID | Int | No | FK a plantillas_equipo |
| NumeroSerie | String | No | Identificador único auto-generado |
| EsExterno | Int (0/1) | No | 0 = Interno, 1 = Externo |
| Estatus | Enum | No | Armado, Instalado, Desmontado |
| Observaciones | String | Sí | Máx 500 caracteres |
| FechaCreacion | Date | No | Fecha de creación |
| FechaInstalacion | Date | Sí | Fecha de instalación |
| FechaDesmontaje | Date | Sí | Fecha de desmontaje |
| UsuarioCreadorID | Int | Sí | FK a usuarios |
| IsActive | Int (0/1) | Sí | Soft delete |

### equipos_detalle

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| EquipoDetalleID | Int | No | Clave primaria |
| EquipoID | Int | No | FK a equipos |
| RefaccionID | Int | No | FK a catalogo_refacciones |
| Cantidad | Int | No | Cantidad de la refacción |
| IsActive | Int (0/1) | Sí | Soft delete |

---

## Relaciones

- **equipos → plantillas_equipo:** Cada equipo se basa en una plantilla
- **equipos → equipos_detalle:** Un equipo tiene múltiples refacciones
- **equipos_detalle → catalogo_refacciones:** Cada detalle referencia una refacción
- **equipos → refacciones_danadas:** Las piezas dañadas se vinculan al equipo origen

---

## Flujo de Trabajo Típico

### Crear y Armar Equipos

```
1. POST /equipos (crear desde plantilla)
   ↓
2. Si necesita ajustes:
   - POST /equipos/:id/refacciones (agregar)
   - PATCH /equipos/:id/refacciones/:id/cantidad (modificar)
   - DELETE /equipos/:id/refacciones/:id (eliminar)
   ↓
3. PATCH /equipos/:id/instalar (cuando esté listo)
```

### Desmontar Equipo

```
1. PATCH /equipos/:id/desmontar
   - Especificar destino de cada refacción
   - inventario: piezas en buen estado
   - danada: piezas deterioradas
```

---

## Notas Importantes

1. **Equipos Externos (otra empresa):**
   - No afectan el inventario en ninguna operación
   - No pueden ser desmontados
   - Se usan para registro y seguimiento únicamente

2. **Kardex:** Todos los movimientos de inventario se registran automáticamente en `kardex_inventario` con tipo `Traspaso_Bodega_Equipo` (salidas) o `Traspaso_Equipo` (entradas).

3. **Refacciones Dañadas:** Se registran en `refacciones_danadas` con referencia al EquipoID de origen.

4. **Precios Calculados:** CostoTotal, PrecioVenta y PrecioRenta se calculan dinámicamente basados en:
   - Suma de (CostoPromedio × Cantidad) de cada refacción
   - PorcentajeVenta y PorcentajeRenta de la plantilla

5. **Soft Delete:** El campo `IsActive` indica si el registro está activo (1) o dado de baja (0).

---

**Última actualización:** 2024-12-06
