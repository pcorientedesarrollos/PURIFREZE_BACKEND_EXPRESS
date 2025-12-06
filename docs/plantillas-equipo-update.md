# Actualización: Campo EsExterno en Plantillas de Equipo

**Fecha:** 2024-12-06

**Módulo:** Plantillas de Equipo

---

## Resumen del Cambio

Se agregó el campo `EsExterno` para distinguir entre:
- **Plantillas Internas** (`EsExterno: false`): Equipos armados en la planta de Purifreeze
- **Plantillas Externas** (`EsExterno: true`): Equipos que vienen de otras empresas/compañías

---

## Cambios en el API

### 1. Crear Plantilla - `POST /plantillas-equipo`

**Nuevo campo en el payload:**

| Campo | Tipo | Requerido | Default | Descripción |
|-------|------|-----------|---------|-------------|
| `EsExterno` | boolean | No | `false` | `true` = equipo externo, `false` = armado en planta |

**Ejemplo de Request (plantilla externa):**
```json
{
  "Codigo": "EXT-CULLIGAN-01",
  "NombreEquipo": "Purificador Culligan X100",
  "Observaciones": "Equipo de cliente, marca Culligan",
  "EsExterno": true,
  "PorcentajeVenta": 35,
  "PorcentajeRenta": 15,
  "Detalles": [
    { "RefaccionID": 1, "Cantidad": 1 }
  ]
}
```

---

### 2. Listar Plantillas - `GET /plantillas-equipo`

**Nuevo query param para filtrar:**

| Parámetro | Tipo | Valores | Descripción |
|-----------|------|---------|-------------|
| `tipo` | string | `todos`, `interno`, `externo` | Filtrar por tipo de plantilla |

**Ejemplos:**
```
GET /plantillas-equipo                     → Todas las plantillas
GET /plantillas-equipo?tipo=interno        → Solo armadas en planta
GET /plantillas-equipo?tipo=externo        → Solo equipos externos
GET /plantillas-equipo?q=osmosis&tipo=interno → Buscar + filtrar
```

**Nuevo campo en la respuesta:**

```json
{
  "status": 200,
  "message": "Plantillas obtenidas",
  "error": false,
  "data": [
    {
      "PlantillaEquipoID": 1,
      "Codigo": "OSM-5ET",
      "NombreEquipo": "Osmosis Inversa 5 Etapas",
      "EsExterno": false,
      ...
    },
    {
      "PlantillaEquipoID": 2,
      "Codigo": "EXT-CULLIGAN-01",
      "NombreEquipo": "Purificador Culligan X100",
      "EsExterno": true,
      ...
    }
  ]
}
```

---

### 3. Obtener Plantilla - `GET /plantillas-equipo/:id`

**Nuevo campo en la respuesta:**

```json
{
  "status": 200,
  "message": "Plantilla obtenida",
  "error": false,
  "data": {
    "PlantillaEquipoID": 1,
    "Codigo": "OSM-5ET",
    "NombreEquipo": "Osmosis Inversa 5 Etapas",
    "EsExterno": false,
    "PorcentajeVenta": 35,
    "PorcentajeRenta": 15,
    ...
  }
}
```

---

### 4. Actualizar Plantilla - `PUT /plantillas-equipo/:id`

**Nuevo campo opcional en el payload:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `EsExterno` | boolean | No | Cambiar tipo de plantilla |

**Ejemplo - Cambiar a externa:**
```json
{
  "EsExterno": true
}
```

---

### 5. Duplicar Plantilla - `POST /plantillas-equipo/:id/duplicar`

El campo `EsExterno` se copia de la plantilla original.

---

## Sugerencias para el Frontend

### Interfaz de Usuario

1. **Formulario de Crear/Editar:**
   - Agregar un toggle o checkbox: "Equipo Externo"
   - Si está marcado, enviar `EsExterno: true`

2. **Listado de Plantillas:**
   - Agregar filtro/tabs: "Todas | Internas | Externas"
   - Mostrar badge o etiqueta visual para diferenciar

3. **Visualización:**
   - Icono o color diferente para plantillas externas
   - Ejemplo: 🏭 Interna | 🏢 Externa

### Ejemplo de Filtros (UI)

```
┌─────────────────────────────────────────┐
│  [Todas] [Internas] [Externas]          │
│                                         │
│  🔍 Buscar plantilla...                 │
├─────────────────────────────────────────┤
│  🏭 Osmosis 5 Etapas         $2,025.00  │
│  🏭 Purificador Básico       $850.00    │
│  🏢 Culligan X100            $3,500.00  │
│  🏢 Rotoplas Industrial      $5,200.00  │
└─────────────────────────────────────────┘
```

---

## SQL para Migración

Si la tabla ya existe en producción, ejecutar:

```sql
ALTER TABLE `plantillas_equipo`
ADD COLUMN `EsExterno` TINYINT NOT NULL DEFAULT 0
COMMENT '0 = Interno (armado en planta), 1 = Externo (equipo de otra empresa)'
AFTER `Observaciones`;
```

---

## Modelo de Datos Actualizado

### plantillas_equipo

| Campo | Tipo | Nullable | Default | Descripción |
|-------|------|----------|---------|-------------|
| PlantillaEquipoID | Int | No | Auto | Clave primaria |
| Codigo | String(50) | Sí | null | Código único |
| NombreEquipo | String(255) | No | - | Nombre del equipo |
| Observaciones | String(500) | Sí | null | Notas |
| **EsExterno** | **TinyInt** | **No** | **0** | **0=Interno, 1=Externo** |
| PorcentajeVenta | Float | No | 35 | % utilidad venta |
| PorcentajeRenta | Float | No | 15 | % para renta |
| IsActive | TinyInt | Sí | 1 | Estado |
| FechaCreacion | Date | No | now() | Fecha creación |
| FechaModificacion | Date | Sí | null | Última modificación |

---

**Nota:** Los registros existentes tendrán `EsExterno = 0` (interno) por defecto.
