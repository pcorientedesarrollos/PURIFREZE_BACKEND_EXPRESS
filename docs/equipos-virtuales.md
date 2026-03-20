# API Equipos Virtuales

Un "equipo virtual" es una plantilla de refacciones con costos predefinidos que se puede usar para agregar rapidamente a compras y cotizaciones.

## Endpoints

### GET /equipos-virtuales
Obtiene todos los equipos virtuales activos.

**Query Params:**
- `search` (opcional): Buscar por nombre o descripcion

**Response:**
```json
{
    "status": 200,
    "message": "Equipos virtuales obtenidos",
    "error": false,
    "data": [
        {
            "EquipoVirtualID": 1,
            "Nombre": "Equipo Refrigeracion Basico",
            "Descripcion": "Equipo para congeladores",
            "Codigo": "EQ-001",
            "TotalCosto": 15000.00,
            "TotalRefacciones": 5,
            "TotalCantidad": 12,
            "FechaCreacion": "2024-01-15",
            "FechaActualizacion": "2024-03-10"
        }
    ]
}
```

**Campos de respuesta:**
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| EquipoVirtualID | number | ID unico del equipo |
| Nombre | string | Nombre del equipo virtual |
| Descripcion | string | Descripcion opcional |
| Codigo | string | Codigo interno opcional |
| TotalCosto | number | Suma de TotalFinal de todos los detalles |
| TotalRefacciones | number | Cantidad de lineas de detalle (tipos de refacciones) |
| TotalCantidad | number | Suma de la columna Cantidad de todos los detalles |
| FechaCreacion | string | Fecha de creacion (YYYY-MM-DD) |
| FechaActualizacion | string | Ultima actualizacion (YYYY-MM-DD) |

---

### GET /equipos-virtuales/:EquipoVirtualID
Obtiene un equipo virtual con todos sus detalles.

**Params:**
- `EquipoVirtualID` (required): ID del equipo virtual

**Response:**
```json
{
    "status": 200,
    "message": "Equipo virtual obtenido",
    "error": false,
    "data": {
        "EquipoVirtualID": 1,
        "Nombre": "Equipo Refrigeracion Basico",
        "Descripcion": "Equipo completo",
        "Codigo": "EQ-001",
        "TotalCosto": 15000.00,
        "IsActive": true,
        "FechaCreacion": "2024-01-15",
        "FechaActualizacion": "2024-03-10",
        "detalles": [
            {
                "DetalleID": 1,
                "RefaccionID": 10,
                "Cantidad": 2,
                "CostoUnitario": 500.00,
                "Descuento": 0,
                "TotalUnitario": 1000.00,
                "Otros": 0,
                "TotalOtros": 0,
                "CostoImportacion": 50.00,
                "TotalUnidad": 1218.00,
                "TotalFinal": 1218.00,
                "IVA": 16,
                "CantidadPiezasPorEquipo": 1,
                "NumeroEquipos": 1,
                "CostoAnterior": 480.00,
                "CostoActual": 500.00,
                "Diferencia": 20.00,
                "Refaccion": {
                    "NombrePieza": "Motor Compresor 1HP",
                    "NombreCorto": "Motor 1HP",
                    "Codigo": "MC-001",
                    "Modelo": "ABC123",
                    "CostoPromedio": 500.00,
                    "Unidad": "Pieza"
                }
            }
        ]
    }
}
```

---

### GET /equipos-virtuales/:EquipoVirtualID/resumen
Obtiene resumen simplificado para agregar a compras.

**Response:**
```json
{
    "status": 200,
    "message": "Resumen de equipo virtual",
    "error": false,
    "data": {
        "EquipoVirtualID": 1,
        "Nombre": "Equipo Refrigeracion Basico",
        "Descripcion": "Equipo completo",
        "TotalCosto": 15000.00,
        "TotalRefacciones": 5,
        "detalles": [
            {
                "RefaccionID": 10,
                "Refaccion": "Motor Compresor 1HP",
                "Codigo": "MC-001",
                "Cantidad": 2,
                "CostoUnitario": 500.00,
                "TotalFinal": 1218.00
            }
        ]
    }
}
```

---

### GET /equipos-virtuales/:EquipoVirtualID/historial
Obtiene historial de cambios de precio del equipo virtual.

**Response:**
```json
{
    "status": 200,
    "message": "Historial de equipo virtual",
    "error": false,
    "data": {
        "EquipoVirtualID": 1,
        "Nombre": "Equipo Refrigeracion Basico",
        "Codigo": "EQ-001",
        "TotalCosto": 15000.00,
        "historial": [
            {
                "HistorialID": 1,
                "FechaCambio": "2024-03-10 14:30:00",
                "PrecioAnterior": 14500.00,
                "PrecioNuevo": 15000.00,
                "Diferencia": 500.00,
                "DetallesCambio": [],
                "Observaciones": null,
                "Cotizacion": {
                    "CotizacionCompraID": 5,
                    "Folio": "COT-2024-005",
                    "FechaCotizacion": "2024-03-10"
                }
            }
        ]
    }
}
```

---

### POST /equipos-virtuales
Crea un nuevo equipo virtual con sus detalles.

**Body:**
```json
{
    "Nombre": "Equipo Refrigeracion Basico",
    "Codigo": "EQ-001",
    "Descripcion": "Equipo completo para congeladores",
    "Detalles": [
        {
            "RefaccionID": 10,
            "Cantidad": 2,
            "CostoUnitario": 500.00,
            "Descuento": 0,
            "Otros": 0,
            "CostoImportacion": 50.00,
            "IVA": 16,
            "CantidadPiezasPorEquipo": 1,
            "NumeroEquipos": 1,
            "CostoAnterior": 480.00
        }
    ]
}
```

**Validaciones:**
- `Nombre`: requerido, max 255 caracteres
- `Codigo`: opcional, max 50 caracteres
- `Descripcion`: opcional, max 500 caracteres
- `Detalles`: requerido, minimo 1 detalle
- `Detalles[].RefaccionID`: requerido
- `Detalles[].Cantidad`: requerido, minimo 1
- No se permiten refacciones duplicadas en el mismo equipo

---

### PUT /equipos-virtuales/:EquipoVirtualID
Actualiza un equipo virtual existente.

**Body:**
```json
{
    "Nombre": "Equipo Refrigeracion Basico v2",
    "Codigo": "EQ-001",
    "Descripcion": "Equipo actualizado",
    "Detalles": [
        {
            "DetalleID": 1,
            "RefaccionID": 10,
            "Cantidad": 3,
            "CostoUnitario": 520.00,
            "Descuento": 5,
            "Otros": 10,
            "CostoImportacion": 50.00,
            "IVA": 16,
            "CantidadPiezasPorEquipo": 1,
            "NumeroEquipos": 1,
            "CostoAnterior": 500.00
        }
    ],
    "DetallesEliminar": [2, 3]
}
```

**Notas:**
- Si `DetalleID` existe, se actualiza el detalle
- Si `DetalleID` no existe, se crea un nuevo detalle
- `DetallesEliminar`: array de IDs de detalles a eliminar (soft delete)

---

### POST /equipos-virtuales/:EquipoVirtualID/duplicar
Duplica un equipo virtual existente.

**Response:**
```json
{
    "status": 200,
    "message": "Equipo virtual duplicado correctamente",
    "error": false,
    "data": {
        "EquipoVirtualID": 2,
        "Nombre": "Equipo Refrigeracion Basico (Copia)"
    }
}
```

---

### PATCH /equipos-virtuales/baja/:EquipoVirtualID
Da de baja un equipo virtual (soft delete).

**Response:**
```json
{
    "status": 200,
    "message": "Equipo virtual dado de baja correctamente",
    "error": false,
    "data": {
        "EquipoVirtualID": 1
    }
}
```

---

### PATCH /equipos-virtuales/activar/:EquipoVirtualID
Activa un equipo virtual dado de baja.

**Response:**
```json
{
    "status": 200,
    "message": "Equipo virtual activado correctamente",
    "error": false,
    "data": {
        "EquipoVirtualID": 1
    }
}
```

---

## Calculos de Totales

El sistema calcula automaticamente los totales de cada detalle:

1. **TotalUnitario** = CostoUnitario * Cantidad * (1 - Descuento/100)
2. **TotalOtros** = Otros * Cantidad
3. **TotalUnidad** = (TotalUnitario + TotalOtros + CostoImportacion) * (1 + IVA/100)
4. **TotalFinal** = TotalUnidad * CantidadPiezasPorEquipo * NumeroEquipos
5. **TotalCosto** (encabezado) = Suma de TotalFinal de todos los detalles

---

## Errores Comunes

| Codigo | Mensaje | Causa |
|--------|---------|-------|
| 400 | No se pueden agregar refacciones duplicadas | Intento de agregar la misma refaccion dos veces |
| 404 | Equipo virtual no encontrado | ID no existe o esta inactivo |
| 404 | Refacciones no encontradas o inactivas | RefaccionID no existe |
