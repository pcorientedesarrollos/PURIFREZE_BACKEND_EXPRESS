# API de Inventario Técnico - Purifreeze Backend

## Información General

**Base URL:** `http://localhost:3000`

**Prefijo de ruta:** `/inventario-tecnico`

**Autenticación:** Requiere Bearer Token (JWT)

---

## Descripción del Módulo

Este módulo gestiona el **inventario personal de cada técnico** (las refacciones que llevan en su camioneta). A diferencia del módulo de Ajustes de Inventario, este módulo **NO requiere flujo de autorización**.

### Características Principales
- Maneja `StockNuevo` y `StockUsado` por separado
- Al agregar stock a un técnico, se descuenta automáticamente de bodega
- Al reducir stock de un técnico, se devuelve automáticamente a bodega
- Registra todos los movimientos en el kardex
- Sin flujo de autorización (operación directa)

---

## Endpoints

### 1. Agregar/Actualizar Refacción en Inventario (Upsert)

**Endpoint:** `POST /inventario-tecnico`

**Descripción:** Agrega una refacción al inventario de un técnico o actualiza las cantidades si ya existe. Si se aumenta el stock, se descuenta de bodega. Si se reduce, se devuelve a bodega.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Payload:**

| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `TecnicoID` | number | Sí | - | ID del técnico |
| `RefaccionID` | number | Sí | - | ID de la refacción |
| `StockNuevo` | number | No | min: 0 | Cantidad de piezas nuevas (default: 0) |
| `StockUsado` | number | No | min: 0 | Cantidad de piezas usadas (default: 0) |
| `UsuarioID` | number | No | - | Usuario que realiza la asignación (para kardex) |

**Ejemplo de Request:**
```json
{
  "TecnicoID": 1,
  "RefaccionID": 15,
  "StockNuevo": 5,
  "StockUsado": 2,
  "UsuarioID": 1
}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Inventario actualizado",
  "error": false,
  "data": {
    "InventarioTecnicoID": 1,
    "TecnicoID": 1,
    "RefaccionID": 15,
    "StockNuevo": 5,
    "StockUsado": 2,
    "FechaUltimoMov": "2026-01-15T10:30:00.000Z",
    "IsActive": 1,
    "tecnico": {
      "TecnicoID": 1,
      "Codigo": "T-001",
      "usuario": {
        "NombreCompleto": "Juan Pérez García"
      }
    },
    "refaccion": {
      "RefaccionID": 15,
      "NombrePieza": "Compresor 1HP",
      "Codigo": "COMP-001"
    }
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | Bad Request (TecnicoID: TecnicoID es requerido) | Campo faltante |
| 400 | Bad Request (StockNuevo: StockNuevo no puede ser negativo) | Valor negativo |
| 404 | Técnico no encontrado | TecnicoID inválido |
| 404 | Refacción no encontrada | RefaccionID inválido |
| 300 | El técnico está dado de baja | Técnico inactivo |
| 300 | Stock insuficiente en bodega. Disponible: X, Solicitado: Y | No hay suficiente stock |

**Ejemplo de Error:**
```json
{
  "status": 300,
  "message": "Stock insuficiente en bodega. Disponible: 3, Solicitado: 5",
  "error": true,
  "data": []
}
```

**Flujo Interno:**
1. Si se aumenta stock (diferencia positiva):
   - Valida que haya suficiente stock en bodega
   - Descuenta de bodega
   - Registra salida de bodega en kardex (`Traspaso_Bodega_Tecnico`)
   - Registra entrada a técnico en kardex (`Traspaso_Bodega_Tecnico`)
2. Si se reduce stock (diferencia negativa):
   - Incrementa stock en bodega
   - Registra salida del técnico en kardex (`Traspaso_Tecnico`)
   - Registra entrada a bodega en kardex (`Traspaso_Tecnico`)

---

### 2. Obtener Resumen de Todos los Técnicos

**Endpoint:** `GET /inventario-tecnico`

**Descripción:** Obtiene un resumen del inventario de todos los técnicos activos con totales y valor estimado.

**Headers:**
```
Authorization: Bearer {token}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Resumen de inventarios obtenido",
  "error": false,
  "data": [
    {
      "TecnicoID": 1,
      "Codigo": "T-001",
      "NombreCompleto": "Juan Pérez García",
      "TotalRefacciones": 15,
      "TotalPiezasNuevas": 45,
      "TotalPiezasUsadas": 12,
      "ValorEstimado": 15000.50
    },
    {
      "TecnicoID": 2,
      "Codigo": "T-002",
      "NombreCompleto": "María García López",
      "TotalRefacciones": 10,
      "TotalPiezasNuevas": 30,
      "TotalPiezasUsadas": 8,
      "ValorEstimado": 9500.00
    }
  ]
}
```

**Campos del Resumen:**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `TecnicoID` | number | ID del técnico |
| `Codigo` | string | Código del técnico |
| `NombreCompleto` | string | Nombre completo del técnico |
| `TotalRefacciones` | number | Cantidad de tipos de refacciones diferentes |
| `TotalPiezasNuevas` | number | Suma de todas las piezas nuevas |
| `TotalPiezasUsadas` | number | Suma de todas las piezas usadas |
| `ValorEstimado` | number | Valor total calculado (stock × costo promedio) |

---

### 3. Obtener Inventario Completo de un Técnico

**Endpoint:** `GET /inventario-tecnico/tecnico/:TecnicoID`

**Descripción:** Obtiene el inventario completo de un técnico con información del técnico, totales y detalle de cada refacción.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `TecnicoID` | number | Sí | ID del técnico |

**Ejemplo de Request:**
```
GET /inventario-tecnico/tecnico/1
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Inventario del técnico obtenido",
  "error": false,
  "data": {
    "tecnico": {
      "TecnicoID": 1,
      "Codigo": "T-001",
      "NombreCompleto": "Juan Pérez García"
    },
    "totales": {
      "totalRefacciones": 15,
      "totalPiezasNuevas": 45,
      "totalPiezasUsadas": 12,
      "valorEstimado": 15000.50
    },
    "inventario": [
      {
        "InventarioTecnicoID": 1,
        "TecnicoID": 1,
        "RefaccionID": 15,
        "StockNuevo": 5,
        "StockUsado": 2,
        "FechaUltimoMov": "2026-01-15T10:30:00.000Z",
        "IsActive": 1,
        "refaccion": {
          "RefaccionID": 15,
          "NombrePieza": "Compresor 1HP",
          "NombreCorto": "Compresor",
          "Codigo": "COMP-001",
          "CostoPromedio": 1500.00,
          "catalogo_unidades": {
            "DesUnidad": "Pieza"
          }
        }
      }
    ]
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | Bad Request (TecnicoID: TecnicoID debe ser un número válido) | Parámetro no numérico |
| 404 | Técnico no encontrado | TecnicoID inválido |

---

### 4. Obtener Sugerencias de Refacciones

**Endpoint:** `GET /inventario-tecnico/tecnico/:TecnicoID/sugerencias`

**Descripción:** Obtiene sugerencias de refacciones basadas en lo que tienen otros técnicos. Muestra las refacciones más comunes que el técnico actual NO tiene. Útil para asignar stock inicial.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `TecnicoID` | number | Sí | ID del técnico |

**Ejemplo de Request:**
```
GET /inventario-tecnico/tecnico/1/sugerencias
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Sugerencias obtenidas",
  "error": false,
  "data": [
    {
      "RefaccionID": 20,
      "NombrePieza": "Filtro de agua",
      "NombreCorto": "Filtro",
      "Codigo": "FLT-001",
      "Unidad": "Pieza",
      "CostoPromedio": 150.00,
      "TecnicosQueLoTienen": 5,
      "PromedioStockNuevo": 3,
      "PromedioStockUsado": 1
    },
    {
      "RefaccionID": 25,
      "NombrePieza": "Válvula de expansión",
      "NombreCorto": "Válvula",
      "Codigo": "VAL-002",
      "Unidad": "Pieza",
      "CostoPromedio": 350.00,
      "TecnicosQueLoTienen": 4,
      "PromedioStockNuevo": 2,
      "PromedioStockUsado": 0
    }
  ]
}
```

**Campos de Sugerencias:**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `TecnicosQueLoTienen` | number | Cantidad de técnicos que tienen esta refacción |
| `PromedioStockNuevo` | number | Promedio de stock nuevo entre técnicos (redondeado) |
| `PromedioStockUsado` | number | Promedio de stock usado entre técnicos (redondeado) |

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | Técnico no encontrado | TecnicoID inválido |

---

### 5. Buscar Refacciones Disponibles para Agregar

**Endpoint:** `GET /inventario-tecnico/tecnico/:TecnicoID/buscar`

**Descripción:** Busca refacciones que el técnico aún NO tiene en su inventario. Permite buscar por nombre, nombre corto o código.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `TecnicoID` | number | Sí | ID del técnico |

**Query Params:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `q` | string | No | Término de búsqueda |

**Ejemplos de Request:**
```
GET /inventario-tecnico/tecnico/1/buscar
GET /inventario-tecnico/tecnico/1/buscar?q=compresor
GET /inventario-tecnico/tecnico/1/buscar?q=COMP-001
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Refacciones encontradas",
  "error": false,
  "data": [
    {
      "RefaccionID": 20,
      "NombrePieza": "Compresor 2HP",
      "NombreCorto": "Compresor 2HP",
      "Codigo": "COMP-002",
      "CostoPromedio": 2500.00,
      "catalogo_unidades": {
        "DesUnidad": "Pieza"
      }
    },
    {
      "RefaccionID": 21,
      "NombrePieza": "Compresor 3HP",
      "NombreCorto": "Compresor 3HP",
      "Codigo": "COMP-003",
      "CostoPromedio": 3500.00,
      "catalogo_unidades": {
        "DesUnidad": "Pieza"
      }
    }
  ]
}
```

**Notas:**
- Retorna máximo 20 resultados
- Ordenados alfabéticamente por NombrePieza
- Solo muestra refacciones activas que el técnico NO tiene

---

### 6. Obtener Detalle de una Refacción en Inventario

**Endpoint:** `GET /inventario-tecnico/tecnico/:TecnicoID/refaccion/:RefaccionID`

**Descripción:** Obtiene el detalle completo de una refacción específica en el inventario de un técnico.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `TecnicoID` | number | Sí | ID del técnico |
| `RefaccionID` | number | Sí | ID de la refacción |

**Ejemplo de Request:**
```
GET /inventario-tecnico/tecnico/1/refaccion/15
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Registro de inventario obtenido",
  "error": false,
  "data": {
    "InventarioTecnicoID": 1,
    "TecnicoID": 1,
    "RefaccionID": 15,
    "StockNuevo": 5,
    "StockUsado": 2,
    "FechaUltimoMov": "2026-01-15T10:30:00.000Z",
    "IsActive": 1,
    "tecnico": {
      "TecnicoID": 1,
      "Codigo": "T-001",
      "usuario": {
        "NombreCompleto": "Juan Pérez García"
      }
    },
    "refaccion": {
      "RefaccionID": 15,
      "NombrePieza": "Compresor 1HP",
      "NombreCorto": "Compresor",
      "Codigo": "COMP-001",
      "CostoPromedio": 1500.00,
      "catalogo_unidades": {
        "DesUnidad": "Pieza"
      }
    }
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | Bad Request (TecnicoID: TecnicoID debe ser un número válido) | Parámetro no numérico |
| 400 | Bad Request (RefaccionID: RefaccionID debe ser un número válido) | Parámetro no numérico |
| 404 | Registro de inventario no encontrado | Combinación TecnicoID+RefaccionID no existe |

---

### 7. Actualizar Stock de una Refacción

**Endpoint:** `PUT /inventario-tecnico/tecnico/:TecnicoID/refaccion/:RefaccionID`

**Descripción:** Actualiza las cantidades de stock de una refacción específica. A diferencia del POST (upsert), este endpoint NO valida ni mueve stock de bodega.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `TecnicoID` | number | Sí | ID del técnico |
| `RefaccionID` | number | Sí | ID de la refacción |

**Payload:**

| Campo | Tipo | Requerido | Validaciones | Descripción |
|-------|------|-----------|--------------|-------------|
| `StockNuevo` | number | No | min: 0 | Nueva cantidad de piezas nuevas |
| `StockUsado` | number | No | min: 0 | Nueva cantidad de piezas usadas |

**Ejemplo de Request:**
```json
{
  "StockNuevo": 8,
  "StockUsado": 3
}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Stock actualizado",
  "error": false,
  "data": {
    "InventarioTecnicoID": 1,
    "TecnicoID": 1,
    "RefaccionID": 15,
    "StockNuevo": 8,
    "StockUsado": 3,
    "FechaUltimoMov": "2026-01-15T15:00:00.000Z",
    "IsActive": 1,
    "tecnico": {
      "TecnicoID": 1,
      "Codigo": "T-001",
      "usuario": {
        "NombreCompleto": "Juan Pérez García"
      }
    },
    "refaccion": {
      "RefaccionID": 15,
      "NombrePieza": "Compresor 1HP",
      "Codigo": "COMP-001"
    }
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | Bad Request (StockNuevo: StockNuevo no puede ser negativo) | Valor negativo |
| 404 | Registro de inventario no encontrado | No existe la combinación |

**Nota:** Este endpoint actualiza directamente sin validar stock en bodega. Use con cuidado.

---

### 8. Eliminar Refacción del Inventario

**Endpoint:** `DELETE /inventario-tecnico/tecnico/:TecnicoID/refaccion/:RefaccionID`

**Descripción:** Elimina una refacción del inventario de un técnico (soft delete). **Solo funciona si el stock está en 0**.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `TecnicoID` | number | Sí | ID del técnico |
| `RefaccionID` | number | Sí | ID de la refacción |

**Ejemplo de Request:**
```
DELETE /inventario-tecnico/tecnico/1/refaccion/15
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Registro de inventario eliminado",
  "error": false,
  "data": {
    "InventarioTecnicoID": 1,
    "TecnicoID": 1,
    "RefaccionID": 15,
    "StockNuevo": 0,
    "StockUsado": 0,
    "IsActive": 0
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 404 | Registro de inventario no encontrado | No existe la combinación |
| 300 | No se puede eliminar un registro con stock. Primero transfiera las piezas. | StockNuevo > 0 o StockUsado > 0 |

**Ejemplo de Error:**
```json
{
  "status": 300,
  "message": "No se puede eliminar un registro con stock. Primero transfiera las piezas.",
  "error": true,
  "data": []
}
```

---

## Resumen de Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/inventario-tecnico` | Agregar/actualizar refacción (upsert con validación de bodega) |
| GET | `/inventario-tecnico` | Resumen de todos los técnicos |
| GET | `/inventario-tecnico/tecnico/:TecnicoID` | Inventario completo de un técnico |
| GET | `/inventario-tecnico/tecnico/:TecnicoID/sugerencias` | Sugerencias de refacciones |
| GET | `/inventario-tecnico/tecnico/:TecnicoID/buscar` | Buscar refacciones disponibles |
| GET | `/inventario-tecnico/tecnico/:TecnicoID/refaccion/:RefaccionID` | Detalle de una refacción |
| PUT | `/inventario-tecnico/tecnico/:TecnicoID/refaccion/:RefaccionID` | Actualizar stock (sin validación bodega) |
| DELETE | `/inventario-tecnico/tecnico/:TecnicoID/refaccion/:RefaccionID` | Eliminar refacción (solo si stock=0) |

---

## Modelo de Datos

### inventario_tecnico

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| InventarioTecnicoID | Int | No | Clave primaria (autoincrement) |
| TecnicoID | Int | No | FK a catalogo_tecnicos |
| RefaccionID | Int | No | FK a catalogo_refacciones |
| StockNuevo | Int | No | Cantidad de piezas nuevas (default: 0) |
| StockUsado | Int | No | Cantidad de piezas usadas en buen estado (default: 0) |
| FechaUltimoMov | DateTime | Sí | Fecha del último movimiento |
| IsActive | TinyInt | Sí | 1=Activo, 0=Eliminado (default: 1) |

**Unique Constraint:** `TecnicoID + RefaccionID` (un técnico solo puede tener un registro por refacción)

---

## Relaciones

```
catalogo_tecnicos (1) ◄──── (N) inventario_tecnico
                                    │
                                    └────► (1) catalogo_refacciones
```

- **Técnico:** Cada registro pertenece a un técnico específico
- **Refacción:** Cada registro es de una refacción específica
- **Usuario:** El técnico está vinculado a un usuario para obtener el nombre

---

## Notas Importantes

1. **Stock Nuevo vs Usado:** Se manejan por separado para distinguir el estado de las piezas. Ambos afectan el valor estimado.

2. **Validación de Bodega (POST):** Al usar el endpoint POST para agregar stock, el sistema valida que haya suficiente stock en bodega y lo descuenta automáticamente.

3. **Sin Validación de Bodega (PUT):** El endpoint PUT actualiza directamente sin validar ni mover stock de bodega. Usar con precaución.

4. **Valor Estimado:** Se calcula como `(StockNuevo + StockUsado) × CostoPromedio` de cada refacción.

5. **Sugerencias:** Se basan en las refacciones más comunes entre todos los técnicos, ordenadas por cantidad de técnicos que las tienen.

6. **Eliminación:** Solo se permite si tanto `StockNuevo` como `StockUsado` están en 0.

7. **Soft Delete:** El campo `IsActive` controla la visibilidad del registro (0 = eliminado).

8. **Kardex:** El POST registra movimientos en kardex con tipos:
   - `Traspaso_Bodega_Tecnico` - Cuando sale de bodega hacia técnico
   - `Traspaso_Tecnico` - Cuando sale de técnico hacia bodega

---

**Última actualización:** 2026-01-15
