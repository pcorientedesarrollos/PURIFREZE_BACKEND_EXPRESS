# API de Detalle de Cliente - Purifreeze Backend

## Información General

**Base URL:** `http://localhost:3000`

**Endpoint:** `GET /clientes/:ClienteID/detalle`

**Descripción:** Obtiene el detalle completo de un cliente con TODAS sus relaciones activas.

---

## Endpoint

### Obtener Detalle Completo del Cliente

**Método:** `GET`

**URL:** `/clientes/:ClienteID/detalle`

**Headers:**
```
Content-Type: application/json
```

**Parámetros de URL:**
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `ClienteID` | number | Sí | ID del cliente |

**Ejemplo de Request:**
```
GET /clientes/1/detalle
```

---

## Response Exitoso (200)

```json
{
  "status": 200,
  "message": "Detalle del cliente obtenido",
  "error": false,
  "data": {
    "ClienteID": 1,
    "NombreComercio": "Tiendas XYZ",
    "Observaciones": "Cliente mayorista",
    "IsActive": true,
    "sucursales": [],
    "direcciones": [],
    "empleados": [],
    "correos": [],
    "datosFiscales": null
  }
}
```

---

## Estructura Completa del Campo `data`

### Campos del Cliente Principal

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| `ClienteID` | number | No | ID único del cliente |
| `NombreComercio` | string | Sí | Nombre del comercio |
| `Observaciones` | string | Sí | Notas adicionales |
| `IsActive` | boolean | Sí | Estado del cliente |
| `sucursales` | array | No | Array de sucursales (puede estar vacío) |
| `direcciones` | array | No | Array de direcciones (puede estar vacío) |
| `empleados` | array | No | Array de empleados (puede estar vacío) |
| `correos` | array | No | Array de correos directos del cliente (puede estar vacío) |
| `datosFiscales` | object \| null | Sí | Datos fiscales o null si no tiene |

---

## Detalle de Cada Relación

### 1. Sucursales (`sucursales`)

**Descripción:** Sucursales activas del cliente, ordenadas por nombre alfabéticamente.

**Filtros aplicados:**
- `IsActive: true`

**Ordenamiento:** `NombreSucursal ASC`

**Estructura de cada sucursal:**

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| `SucursalID` | number | No | ID único de la sucursal |
| `ClienteID` | number | No | ID del cliente padre |
| `NombreSucursal` | string | No | Nombre de la sucursal |
| `Direccion` | string | Sí | Dirección física |
| `Ubicacion` | string | Sí | Coordenadas o referencia |
| `Telefono` | string | Sí | Teléfono de contacto |
| `Contacto` | string | Sí | Nombre del contacto |
| `Observaciones` | string | Sí | Notas adicionales |
| `IsActive` | boolean | Sí | Siempre `true` en esta respuesta |

**Ejemplo:**
```json
"sucursales": [
  {
    "SucursalID": 1,
    "ClienteID": 1,
    "NombreSucursal": "Sucursal Centro",
    "Direccion": "Av. Principal #123, Col. Centro",
    "Ubicacion": "25.4284,-100.9737",
    "Telefono": "844-123-4567",
    "Contacto": "Juan Pérez",
    "Observaciones": "Horario: Lun-Vie 9am-6pm",
    "IsActive": true
  },
  {
    "SucursalID": 2,
    "ClienteID": 1,
    "NombreSucursal": "Sucursal Norte",
    "Direccion": "Blvd. Norte #456",
    "Ubicacion": null,
    "Telefono": "844-987-6543",
    "Contacto": "María García",
    "Observaciones": null,
    "IsActive": true
  }
]
```

---

### 2. Direcciones (`direcciones`)

**Descripción:** Direcciones activas del cliente.

**Filtros aplicados:**
- `ClienteID: {ClienteID}`
- `IsActive: true`

**Ordenamiento:** `DireccionID DESC` (más recientes primero)

**Estructura de cada dirección:**

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| `DireccionID` | number | No | ID único de la dirección |
| `ClienteID` | number | Sí | ID del cliente |
| `Direccion` | string | Sí | Dirección completa |
| `Ubicacion` | string | Sí | Coordenadas o referencia de ubicación |
| `Observaciones` | string | Sí | Notas adicionales |
| `IsActive` | boolean | Sí | Siempre `true` en esta respuesta |

**Ejemplo:**
```json
"direcciones": [
  {
    "DireccionID": 2,
    "ClienteID": 1,
    "Direccion": "Calle Secundaria #456, Col. Industrial",
    "Ubicacion": "25.4300,-100.9800",
    "Observaciones": "Entrada por la puerta trasera",
    "IsActive": true
  },
  {
    "DireccionID": 1,
    "ClienteID": 1,
    "Direccion": "Av. Principal #123, Col. Centro",
    "Ubicacion": "25.4284,-100.9737",
    "Observaciones": null,
    "IsActive": true
  }
]
```

---

### 3. Empleados (`empleados`)

**Descripción:** Empleados activos del cliente, cada uno con sus teléfonos y correos.

**Filtros aplicados:**
- `ClienteID: {ClienteID}`
- `IsActive: true`

**Ordenamiento:** `NombreEmpleado ASC` (alfabético)

**Estructura de cada empleado:**

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| `EmpleadoID` | number | No | ID único del empleado |
| `ClienteID` | number | Sí | ID del cliente |
| `PuestoTrabajoID` | number | Sí | ID del puesto de trabajo |
| `NombreEmpleado` | string | Sí | Nombre completo |
| `Observaciones` | string | Sí | Notas adicionales |
| `IsActive` | boolean | Sí | Siempre `true` en esta respuesta |
| `telefonos` | array | No | Array de teléfonos del empleado |
| `correos` | array | No | Array de correos del empleado |

**Ejemplo:**
```json
"empleados": [
  {
    "EmpleadoID": 1,
    "ClienteID": 1,
    "PuestoTrabajoID": 1,
    "NombreEmpleado": "Juan Pérez",
    "Observaciones": "Gerente de sucursal",
    "IsActive": true,
    "telefonos": [
      {
        "TelefonoID": 1,
        "EmpleadoID": 1,
        "Telefono": "844-111-2222",
        "Tipo": "Trabajo",
        "IsActive": true
      },
      {
        "TelefonoID": 2,
        "EmpleadoID": 1,
        "Telefono": "844-333-4444",
        "Tipo": "Personal",
        "IsActive": true
      }
    ],
    "correos": [
      {
        "CorreoID": 1,
        "ClienteID": null,
        "EmpleadoID": 1,
        "Correo": "juan.perez@tiendasxyz.com",
        "TipoCorreo": "trabajo",
        "Observaciones": null,
        "IsActive": true
      }
    ]
  },
  {
    "EmpleadoID": 2,
    "ClienteID": 1,
    "PuestoTrabajoID": 2,
    "NombreEmpleado": "María García",
    "Observaciones": null,
    "IsActive": true,
    "telefonos": [],
    "correos": []
  }
]
```

#### 3.1 Teléfonos del Empleado (`empleados[].telefonos`)

**Filtros aplicados:**
- `EmpleadoID: {EmpleadoID}`
- `IsActive: true`

**Estructura de cada teléfono:**

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| `TelefonoID` | number | No | ID único del teléfono |
| `EmpleadoID` | number | Sí | ID del empleado |
| `Telefono` | string | Sí | Número de teléfono |
| `Tipo` | string | Sí | Tipo de teléfono |
| `IsActive` | boolean | Sí | Siempre `true` en esta respuesta |

**Valores posibles para `Tipo`:**
- `"Trabajo"`
- `"Personal"`
- `"Otros"`
- `"Ejemplo"`

#### 3.2 Correos del Empleado (`empleados[].correos`)

**Filtros aplicados:**
- `EmpleadoID: {EmpleadoID}`
- `IsActive: true`

**Estructura de cada correo:**

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| `CorreoID` | number | No | ID único del correo |
| `ClienteID` | number | Sí | Siempre `null` para correos de empleado |
| `EmpleadoID` | number | Sí | ID del empleado |
| `Correo` | string | Sí | Dirección de correo electrónico |
| `TipoCorreo` | string | Sí | Tipo de correo |
| `Observaciones` | string | Sí | Notas adicionales |
| `IsActive` | boolean | Sí | Siempre `true` en esta respuesta |

**Valores posibles para `TipoCorreo`:**
- `"trabajo"`
- `"personal"`
- `"otros"`

---

### 4. Correos del Cliente (`correos`)

**Descripción:** Correos directos del cliente (NO asociados a empleados).

**Filtros aplicados:**
- `ClienteID: {ClienteID}`
- `EmpleadoID: null` (solo correos directos del cliente)
- `IsActive: true`

**Ordenamiento:** `CorreoID DESC` (más recientes primero)

**Estructura de cada correo:**

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| `CorreoID` | number | No | ID único del correo |
| `ClienteID` | number | Sí | ID del cliente |
| `EmpleadoID` | number | Sí | Siempre `null` para correos del cliente |
| `Correo` | string | Sí | Dirección de correo electrónico |
| `TipoCorreo` | string | Sí | Tipo de correo |
| `Observaciones` | string | Sí | Notas adicionales |
| `IsActive` | boolean | Sí | Siempre `true` en esta respuesta |

**Valores posibles para `TipoCorreo`:**
- `"trabajo"`
- `"personal"`
- `"otros"`

**Ejemplo:**
```json
"correos": [
  {
    "CorreoID": 10,
    "ClienteID": 1,
    "EmpleadoID": null,
    "Correo": "facturacion@tiendasxyz.com",
    "TipoCorreo": "trabajo",
    "Observaciones": "Para envío de facturas",
    "IsActive": true
  },
  {
    "CorreoID": 5,
    "ClienteID": 1,
    "EmpleadoID": null,
    "Correo": "contacto@tiendasxyz.com",
    "TipoCorreo": "trabajo",
    "Observaciones": "Correo general",
    "IsActive": true
  }
]
```

---

### 5. Datos Fiscales (`datosFiscales`)

**Descripción:** Datos fiscales activos del cliente. Retorna `null` si no tiene datos fiscales registrados.

**Filtros aplicados:**
- `ClienteID: {ClienteID}`
- `IsActive: true`

**Nota:** Usa `findFirst`, por lo que si hay múltiples registros activos, solo retorna el primero.

**Estructura del objeto:**

| Campo | Tipo | Nullable | Descripción |
|-------|------|----------|-------------|
| `DatosFiscalesID` | number | No | ID único |
| `ClienteID` | number | Sí | ID del cliente |
| `RazonSocial` | string | Sí | Razón social |
| `RFC` | string | Sí | Registro Federal de Contribuyentes |
| `Regimen` | string | Sí | Régimen fiscal |
| `DireccionFiscal` | string | Sí | Dirección fiscal |
| `CodigoPostal` | string | Sí | Código postal |
| `Observaciones` | string | Sí | Notas adicionales |
| `IsActive` | boolean | Sí | Siempre `true` en esta respuesta |

**Ejemplo con datos:**
```json
"datosFiscales": {
  "DatosFiscalesID": 1,
  "ClienteID": 1,
  "RazonSocial": "Tiendas XYZ S.A. de C.V.",
  "RFC": "TXY123456ABC",
  "Regimen": "601 - General de Ley Personas Morales",
  "DireccionFiscal": "Av. Fiscal #100, Col. Centro, Saltillo, Coahuila",
  "CodigoPostal": "25000",
  "Observaciones": null,
  "IsActive": true
}
```

**Ejemplo sin datos:**
```json
"datosFiscales": null
```

---

## Ejemplo de Response Completo

```json
{
  "status": 200,
  "message": "Detalle del cliente obtenido",
  "error": false,
  "data": {
    "ClienteID": 1,
    "NombreComercio": "Tiendas XYZ",
    "Observaciones": "Cliente mayorista premium",
    "IsActive": true,
    "sucursales": [
      {
        "SucursalID": 1,
        "ClienteID": 1,
        "NombreSucursal": "Sucursal Centro",
        "Direccion": "Av. Principal #123, Col. Centro",
        "Ubicacion": "25.4284,-100.9737",
        "Telefono": "844-123-4567",
        "Contacto": "Juan Pérez",
        "Observaciones": "Lun-Vie 9am-6pm",
        "IsActive": true
      },
      {
        "SucursalID": 2,
        "ClienteID": 1,
        "NombreSucursal": "Sucursal Norte",
        "Direccion": "Blvd. Norte #456",
        "Ubicacion": null,
        "Telefono": "844-987-6543",
        "Contacto": "María García",
        "Observaciones": null,
        "IsActive": true
      }
    ],
    "direcciones": [
      {
        "DireccionID": 1,
        "ClienteID": 1,
        "Direccion": "Av. Principal #123, Col. Centro",
        "Ubicacion": "25.4284,-100.9737",
        "Observaciones": null,
        "IsActive": true
      }
    ],
    "empleados": [
      {
        "EmpleadoID": 1,
        "ClienteID": 1,
        "PuestoTrabajoID": 1,
        "NombreEmpleado": "Juan Pérez",
        "Observaciones": "Gerente general",
        "IsActive": true,
        "telefonos": [
          {
            "TelefonoID": 1,
            "EmpleadoID": 1,
            "Telefono": "844-111-2222",
            "Tipo": "Trabajo",
            "IsActive": true
          },
          {
            "TelefonoID": 2,
            "EmpleadoID": 1,
            "Telefono": "844-333-4444",
            "Tipo": "Personal",
            "IsActive": true
          }
        ],
        "correos": [
          {
            "CorreoID": 1,
            "ClienteID": null,
            "EmpleadoID": 1,
            "Correo": "juan.perez@tiendasxyz.com",
            "TipoCorreo": "trabajo",
            "Observaciones": null,
            "IsActive": true
          }
        ]
      },
      {
        "EmpleadoID": 2,
        "ClienteID": 1,
        "PuestoTrabajoID": 2,
        "NombreEmpleado": "María García",
        "Observaciones": null,
        "IsActive": true,
        "telefonos": [],
        "correos": []
      }
    ],
    "correos": [
      {
        "CorreoID": 5,
        "ClienteID": 1,
        "EmpleadoID": null,
        "Correo": "contacto@tiendasxyz.com",
        "TipoCorreo": "trabajo",
        "Observaciones": "Correo general de la empresa",
        "IsActive": true
      }
    ],
    "datosFiscales": {
      "DatosFiscalesID": 1,
      "ClienteID": 1,
      "RazonSocial": "Tiendas XYZ S.A. de C.V.",
      "RFC": "TXY123456ABC",
      "Regimen": "601 - General de Ley Personas Morales",
      "DireccionFiscal": "Av. Fiscal #100, Col. Centro",
      "CodigoPostal": "25000",
      "Observaciones": null,
      "IsActive": true
    }
  }
}
```

---

## Ejemplo de Response Vacío (Cliente sin relaciones)

```json
{
  "status": 200,
  "message": "Detalle del cliente obtenido",
  "error": false,
  "data": {
    "ClienteID": 5,
    "NombreComercio": "Cliente Nuevo",
    "Observaciones": null,
    "IsActive": true,
    "sucursales": [],
    "direcciones": [],
    "empleados": [],
    "correos": [],
    "datosFiscales": null
  }
}
```

---

## Errores Posibles

### Error 400 - ID Inválido

**Causa:** El parámetro ClienteID no es un número válido.

```json
{
  "status": 400,
  "message": "Bad Request (ClienteID: ID debe ser un número válido)",
  "error": true,
  "data": []
}
```

### Error 404 - Cliente No Encontrado

**Causa:** No existe un cliente con el ID proporcionado.

```json
{
  "status": 404,
  "message": "Cliente no encontrado",
  "error": true,
  "data": []
}
```

---

## TypeScript Interfaces (para Frontend)

```typescript
// Tipos de enums
type TipoTelefono = 'Trabajo' | 'Personal' | 'Otros' | 'Ejemplo';
type TipoCorreo = 'trabajo' | 'personal' | 'otros';

// Interfaces de cada entidad
interface Sucursal {
  SucursalID: number;
  ClienteID: number;
  NombreSucursal: string;
  Direccion: string | null;
  Ubicacion: string | null;
  Telefono: string | null;
  Contacto: string | null;
  Observaciones: string | null;
  IsActive: boolean;
}

interface Direccion {
  DireccionID: number;
  ClienteID: number | null;
  Direccion: string | null;
  Ubicacion: string | null;
  Observaciones: string | null;
  IsActive: boolean;
}

interface Telefono {
  TelefonoID: number;
  EmpleadoID: number | null;
  Telefono: string | null;
  Tipo: TipoTelefono | null;
  IsActive: boolean;
}

interface Correo {
  CorreoID: number;
  ClienteID: number | null;
  EmpleadoID: number | null;
  Correo: string | null;
  TipoCorreo: TipoCorreo | null;
  Observaciones: string | null;
  IsActive: boolean;
}

interface Empleado {
  EmpleadoID: number;
  ClienteID: number | null;
  PuestoTrabajoID: number | null;
  NombreEmpleado: string | null;
  Observaciones: string | null;
  IsActive: boolean;
  telefonos: Telefono[];
  correos: Correo[];
}

interface DatosFiscales {
  DatosFiscalesID: number;
  ClienteID: number | null;
  RazonSocial: string | null;
  RFC: string | null;
  Regimen: string | null;
  DireccionFiscal: string | null;
  CodigoPostal: string | null;
  Observaciones: string | null;
  IsActive: boolean;
}

// Interface principal del detalle
interface ClienteDetalle {
  ClienteID: number;
  NombreComercio: string | null;
  Observaciones: string | null;
  IsActive: boolean | null;
  sucursales: Sucursal[];
  direcciones: Direccion[];
  empleados: Empleado[];
  correos: Correo[];
  datosFiscales: DatosFiscales | null;
}

// Interface de la respuesta completa
interface ClienteDetalleResponse {
  status: number;
  message: string;
  error: boolean;
  data: ClienteDetalle;
}
```

---

## Ejemplo de Uso en Frontend

```typescript
// Función para obtener el detalle del cliente
async function getClienteDetalle(clienteId: number): Promise<ClienteDetalleResponse> {
  const response = await fetch(`/clientes/${clienteId}/detalle`);
  return response.json();
}

// Uso
const { data: cliente } = await getClienteDetalle(1);

// Acceder a las sucursales
cliente.sucursales.forEach(sucursal => {
  console.log(`${sucursal.NombreSucursal} - ${sucursal.Telefono}`);
});

// Acceder a empleados con sus contactos
cliente.empleados.forEach(empleado => {
  console.log(`Empleado: ${empleado.NombreEmpleado}`);

  empleado.telefonos.forEach(tel => {
    console.log(`  Tel (${tel.Tipo}): ${tel.Telefono}`);
  });

  empleado.correos.forEach(correo => {
    console.log(`  Email (${correo.TipoCorreo}): ${correo.Correo}`);
  });
});

// Verificar si tiene datos fiscales
if (cliente.datosFiscales) {
  console.log(`RFC: ${cliente.datosFiscales.RFC}`);
} else {
  console.log('Sin datos fiscales registrados');
}

// Verificar si tiene sucursales
const tieneSucursales = cliente.sucursales.length > 0;
```

---

## Notas Importantes

1. **Solo datos activos:** Todas las relaciones retornan únicamente registros con `IsActive: true`.

2. **Arrays vacíos:** Si el cliente no tiene registros en alguna relación, se retorna un array vacío `[]`, nunca `null`.

3. **Datos fiscales:** Es el único campo que puede ser `null` si no existe registro.

4. **Correos del cliente vs empleado:**
   - `correos` (en raíz): Correos directos del cliente (`EmpleadoID: null`)
   - `empleados[].correos`: Correos del empleado (`EmpleadoID: {id}`)

5. **Telefonos:** Solo están asociados a empleados, no directamente al cliente. Las sucursales tienen su propio campo `Telefono`.

---

**Última actualización:** 2025-12-11
