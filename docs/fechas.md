# Manejo de Fechas - Backend

## Problema

JavaScript/Node.js interpreta fechas ISO como UTC. Cuando usamos `moment(fecha).format()`, convierte la fecha a la zona horaria local antes de formatear, causando desfase de un día en zonas horarias negativas (ej: México UTC-6).

**Ejemplo del problema:**
```javascript
// BD guarda: 2026-03-20T00:00:00.000Z (UTC medianoche del 20)

moment(fecha).format('YYYY-MM-DD')      // → '2026-03-19' ❌ (convierte a México: 19 a las 18:00)
moment.utc(fecha).format('YYYY-MM-DD')  // → '2026-03-20' ✅ (preserva UTC)
```

## Solución

**SIEMPRE usar `moment.utc()` para formatear fechas que vienen de la base de datos:**

```typescript
// ❌ INCORRECTO
FechaCompra: moment(compra.FechaCompra).format('YYYY-MM-DD')

// ✅ CORRECTO
FechaCompra: moment.utc(compra.FechaCompra).format('YYYY-MM-DD')
```

## Archivos Corregidos

Los siguientes servicios ya usan `moment.utc()` para formatear fechas:

| Archivo | Fechas Formateadas |
|---------|-------------------|
| `compras.service.ts` | FechaCompra, FechaCreacion |
| `compras-recepciones.service.ts` | FechaCompra, FechaRecepcion, FechaPago |
| `compras-pagos.service.ts` | FechaPago, FechaRegistro |
| `notas-credito.service.ts` | Fecha, FechaCreacion, FechaCompra, FechaAplicacion |
| `equipos-virtuales.service.ts` | FechaCreacion, FechaActualizacion, FechaCambio |
| `inventario.service.ts` | FechaUltimoMovimiento |
| `plantillas-equipo.service.ts` | FechaCreacion, FechaModificacion |
| `cotizaciones-compra.service.ts` | FechaCotizacion, FechaCreacion, FechaEnvio |
| `cotizaciones-proveedor.service.ts` | FechaRespuesta, FechaAsignacion, FechaCotizacion |
| `servicios.service.ts` | FechaProgramada, FechaEjecucion, FechaFirma, etc. |
| `equipos.service.ts` | FechaCreacion, FechaInstalacion, FechaDesmontaje, etc. |

## Regla para Nuevos Módulos

Al crear un nuevo servicio que devuelva fechas formateadas:

```typescript
import moment from 'moment';

// Al formatear fechas de la BD para respuesta JSON:
const response = {
    FechaCreacion: registro.FechaCreacion
        ? moment.utc(registro.FechaCreacion).format('YYYY-MM-DD')
        : null,
    FechaHora: registro.FechaHora
        ? moment.utc(registro.FechaHora).format('YYYY-MM-DD HH:mm:ss')
        : null,
};
```

## Nota sobre Entrada de Datos

Para **recibir** fechas del frontend y guardarlas en BD, `moment()` normal está bien porque el frontend ya envía la fecha con hora (`2026-03-20T12:00:00`):

```typescript
// Esto está bien para INPUT
FechaCompra: moment(dto.FechaCompra).toDate()
```

El problema solo ocurre al **formatear** fechas que vienen de la BD para enviarlas al frontend.

## Verificación

Para verificar que el fix funciona:

1. Crear un registro con fecha de hoy
2. Consultar el registro vía API
3. La fecha en la respuesta JSON debe coincidir con la fecha ingresada

```bash
# Crear compra con fecha 2026-03-20
curl -X POST /compras -d '{"FechaCompra": "2026-03-20T12:00:00", ...}'

# Consultar - debe devolver "FechaCompra": "2026-03-20", NO "2026-03-19"
curl /compras/1
```
