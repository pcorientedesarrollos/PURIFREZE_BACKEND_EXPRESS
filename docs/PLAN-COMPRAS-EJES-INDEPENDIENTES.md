# Plan: Sistema de Compras con Ejes Independientes (PAGO y ENTREGA)

> **Estado:** Pendiente de implementación
> **Fecha:** 2026-02-06
> **Para continuar:** Solo di "continúa con el plan de compras" en una nueva conversación

---

## Concepto de Negocio

Una compra tiene **dos procesos independientes**:

1. **PAGO** - Cómo y cuánto ha pagado el proveedor
2. **ENTREGA** - Qué tanto producto se ha recibido

Estos procesos pueden avanzar juntos o no:
- Puedes pagar todo y recibir después (Contado)
- Puedes recibir todo y pagar después (Crédito)
- Puedes pagar y recibir parcialmente

### Matriz de Estados

| FormaPago | EstadoPago | EstadoEntrega | Interpretación |
|-----------|------------|---------------|----------------|
| CONTADO | PAGADO | NO_ENTREGADO | Pagado, falta surtir |
| CONTADO | PAGADO | PARCIAL | Entrega en proceso |
| CONTADO | PAGADO | ENTREGADO | Compra cerrada |
| CREDITO | PENDIENTE | NO_ENTREGADO | Riesgo bajo |
| CREDITO | PENDIENTE | PARCIAL | Riesgo medio |
| CREDITO | PENDIENTE | ENTREGADO | **RIESGO ALTO** - Debe dinero |
| CREDITO | PARCIAL | * | Pagando |
| CREDITO | PAGADO | * | Liquidado |

---

## Estado Actual del Sistema

### Lo que existe:
- `compras_encabezado` con `Estatus`: Pendiente | Pagado | Finalizado (mezcla pago y entrega)
- `compras_detalle` con productos
- `compras_recepciones_encabezado/detalle` para recepciones parciales
- Tabla genérica `pagos` con `ReferenciaTipo = 'Compras'`

### El problema:
El enum `Estatus` actual mezcla los dos conceptos en uno solo.

---

## Cambios en Base de Datos (Prisma Schema)

### 1. Nuevos Enums

```prisma
enum FormaPagoCompra {
  CONTADO
  CREDITO
}

enum EstadoPagoCompra {
  PENDIENTE
  PARCIAL
  PAGADO
}

enum EstadoEntregaCompra {
  NO_ENTREGADO
  PARCIAL
  ENTREGADO
}
```

### 2. Nueva Tabla `compras_pagos`

```prisma
model compras_pagos {
  CompraPagoID        Int                  @id @default(autoincrement())
  CompraEncabezadoID  Int
  MetodoPagoID        Int
  CuentaBancariaID    Int?
  Monto               Float                @db.Float
  FechaPago           DateTime             @db.Date
  Referencia          String?              @db.VarChar(100)
  Observaciones       String?              @db.VarChar(255)
  UsuarioID           Int
  FechaRegistro       DateTime             @default(now())
  IsActive            Int?                 @db.TinyInt @default(1)

  compra              compras_encabezado   @relation("CompraPagos", fields: [CompraEncabezadoID], references: [CompraEncabezadoID])

  @@index([CompraEncabezadoID])
}
```

### 3. Modificar `compras_encabezado`

Agregar estos campos:

```prisma
model compras_encabezado {
  // ... campos existentes ...

  // NUEVOS CAMPOS
  FormaPago                 FormaPagoCompra             @default(CREDITO)
  EstadoPago                EstadoPagoCompra            @default(PENDIENTE)
  EstadoEntrega             EstadoEntregaCompra         @default(NO_ENTREGADO)
  TotalPagado               Float?                      @db.Float @default(0)
  TotalRecibido             Float?                      @db.Float @default(0)
  DiasCredito               Int?
  FechaVencimientoCredito   DateTime?                   @db.Date

  // DEPRECADO - Mantener para compatibilidad
  Estatus                   compras_encabezado_Estatus?

  // Nueva relación
  compras_pagos             compras_pagos[]             @relation("CompraPagos")
}
```

### 4. Agregar relación en recepciones

```prisma
model compras_recepciones_encabezado {
  // ... campos existentes ...
  compra  compras_encabezado? @relation("CompraRecepciones", fields: [CompraEncabezadoID], references: [CompraEncabezadoID])
}
```

---

## Nuevo Módulo: `compras-pagos`

### Estructura de archivos a crear:

```
src/modules/compras-pagos/
├── compras-pagos.controller.ts
├── compras-pagos.service.ts
├── compras-pagos.schema.ts
├── compras-pagos.routes.ts
└── index.ts
```

### Endpoints:

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/compras-pagos` | Registrar nuevo pago |
| GET | `/compras-pagos/compra/:CompraEncabezadoID` | Obtener pagos de una compra |
| DELETE | `/compras-pagos/:CompraPagoID` | Eliminar pago (soft delete) |

### Schema (`compras-pagos.schema.ts`):

```typescript
import { z } from 'zod';

export const createCompraPagoSchema = z.object({
  CompraEncabezadoID: z.number({ required_error: 'CompraEncabezadoID es requerido' }),
  MetodoPagoID: z.number({ required_error: 'MetodoPagoID es requerido' }),
  CuentaBancariaID: z.number().optional(),
  Monto: z.number({ required_error: 'Monto es requerido' }).positive('El monto debe ser positivo'),
  FechaPago: z.string({ required_error: 'FechaPago es requerida' }),
  Referencia: z.string().max(100).nullish(),
  Observaciones: z.string().max(255).nullish(),
  UsuarioID: z.number({ required_error: 'UsuarioID es requerido' }),
});

export const compraPagoIdParamSchema = z.object({
  CompraPagoID: z.string().regex(/^\d+$/, 'ID debe ser número').transform(Number),
});

export const compraIdParamSchema = z.object({
  CompraEncabezadoID: z.string().regex(/^\d+$/, 'ID debe ser número').transform(Number),
});

export type CreateCompraPagoDto = z.infer<typeof createCompraPagoSchema>;
```

### Lógica del Service:

```typescript
// Al registrar pago:
1. Validar que compra existe y está activa
2. Validar que monto no exceda saldo pendiente
3. Si es CONTADO y primer pago, debe ser el total
4. Validar saldo en cuenta bancaria (si aplica)
5. Crear registro en compras_pagos
6. Crear movimiento bancario (egreso)
7. Actualizar EstadoPago de la compra

// Método actualizarEstadoPago():
totalPagado = sum(compras_pagos.Monto)
if (totalPagado >= TotalNeto) → PAGADO
else if (totalPagado > 0) → PARCIAL
else → PENDIENTE
```

---

## Modificaciones a Módulos Existentes

### Módulo `compras`

**compras.schema.ts** - Agregar campos:

```typescript
export const createCompraSchema = z.object({
  // ... campos existentes ...
  FormaPago: z.enum(['CONTADO', 'CREDITO']).default('CREDITO'),
  DiasCredito: z.number().optional(),
  FechaVencimientoCredito: z.string().optional(),
});
```

**compras.service.ts** - Modificar `create()`:

```typescript
async create(dto: CreateCompraDto) {
  // Si es CONTADO:
  if (dto.FormaPago === 'CONTADO') {
    // Validar que tenga MetodoPagoID y CuentaBancariaID
    // Validar saldo en cuenta
    // Crear pago automático
    // EstadoPago = 'PAGADO'
  }

  // Si es CREDITO:
  // EstadoPago = 'PENDIENTE'
  // Calcular FechaVencimientoCredito si tiene DiasCredito
}
```

**compras.service.ts** - Nuevo método:

```typescript
async actualizarEstadoEntrega(tx: any, compraID: number) {
  // Obtener cantidades compradas vs recibidas
  // Si todas recibidas → ENTREGADO
  // Si algunas → PARCIAL
  // Si ninguna → NO_ENTREGADO
  // Actualizar TotalRecibido (monto proporcional)
}
```

### Módulo `compras-recepciones`

**compras-recepciones.service.ts** - Simplificar:

```typescript
async create(dto) {
  // QUITAR: Validación de saldo bancario
  // QUITAR: Creación de pago automático

  // Crear recepción normalmente
  // Actualizar inventario y kardex

  // NUEVO: Llamar a actualizarEstadoEntrega()
  await comprasService.actualizarEstadoEntrega(tx, dto.CompraEncabezadoID);
}
```

---

## Migración de Datos

### Script SQL:

```sql
-- 1. Agregar nuevos campos
ALTER TABLE compras_encabezado
  ADD COLUMN FormaPago ENUM('CONTADO', 'CREDITO') DEFAULT 'CREDITO',
  ADD COLUMN EstadoPago ENUM('PENDIENTE', 'PARCIAL', 'PAGADO') DEFAULT 'PENDIENTE',
  ADD COLUMN EstadoEntrega ENUM('NO_ENTREGADO', 'PARCIAL', 'ENTREGADO') DEFAULT 'NO_ENTREGADO',
  ADD COLUMN TotalPagado FLOAT DEFAULT 0,
  ADD COLUMN TotalRecibido FLOAT DEFAULT 0,
  ADD COLUMN DiasCredito INT NULL,
  ADD COLUMN FechaVencimientoCredito DATE NULL;

-- 2. Crear tabla compras_pagos
CREATE TABLE compras_pagos (
  CompraPagoID INT PRIMARY KEY AUTO_INCREMENT,
  CompraEncabezadoID INT NOT NULL,
  MetodoPagoID INT NOT NULL,
  CuentaBancariaID INT NULL,
  Monto FLOAT NOT NULL,
  FechaPago DATE NOT NULL,
  Referencia VARCHAR(100) NULL,
  Observaciones VARCHAR(255) NULL,
  UsuarioID INT NOT NULL,
  FechaRegistro DATETIME DEFAULT CURRENT_TIMESTAMP,
  IsActive TINYINT DEFAULT 1,
  INDEX (CompraEncabezadoID),
  FOREIGN KEY (CompraEncabezadoID) REFERENCES compras_encabezado(CompraEncabezadoID)
);

-- 3. Migrar estados según Estatus actual
UPDATE compras_encabezado SET
  EstadoPago = CASE
    WHEN Estatus = 'Pendiente' THEN 'PENDIENTE'
    WHEN Estatus IN ('Pagado', 'Finalizado') THEN 'PAGADO'
    ELSE 'PENDIENTE'
  END,
  EstadoEntrega = CASE
    WHEN Estatus = 'Finalizado' THEN 'ENTREGADO'
    ELSE 'NO_ENTREGADO'
  END;

-- 4. Migrar pagos existentes
INSERT INTO compras_pagos (CompraEncabezadoID, MetodoPagoID, CuentaBancariaID, Monto, FechaPago, Observaciones, UsuarioID, IsActive)
SELECT
  ReferenciaID, MetodoPagoID, CuentaBancariaID, Monto, FechaPago, Observaciones, UsuarioID, IsActive
FROM pagos
WHERE ReferenciaTipo = 'Compras' AND IsActive = 1;

-- 5. Calcular TotalPagado
UPDATE compras_encabezado ce SET TotalPagado = (
  SELECT COALESCE(SUM(Monto), 0) FROM compras_pagos
  WHERE CompraEncabezadoID = ce.CompraEncabezadoID AND IsActive = 1
);
```

---

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `prisma/schema.prisma` | Nuevos enums, tabla compras_pagos, campos en compras_encabezado |
| `src/modules/compras/compras.schema.ts` | Agregar FormaPago, DiasCredito |
| `src/modules/compras/compras.service.ts` | Lógica CONTADO/CREDITO, actualizarEstadoEntrega() |
| `src/modules/compras-recepciones/compras-recepciones.service.ts` | Quitar pago auto, llamar actualizar estado |
| `src/index.ts` | Registrar módulo compras-pagos |

## Archivos a Crear

| Archivo | Descripción |
|---------|-------------|
| `src/modules/compras-pagos/compras-pagos.service.ts` | Lógica de pagos |
| `src/modules/compras-pagos/compras-pagos.controller.ts` | Controlador |
| `src/modules/compras-pagos/compras-pagos.schema.ts` | Validación Zod |
| `src/modules/compras-pagos/compras-pagos.routes.ts` | Rutas |
| `src/modules/compras-pagos/index.ts` | Export |

---

## Verificación (Tests)

1. **Crear compra CONTADO** → Pago automático, EstadoPago=PAGADO
2. **Crear compra CREDITO** → EstadoPago=PENDIENTE
3. **Registrar pago parcial** → EstadoPago=PARCIAL
4. **Completar pagos** → EstadoPago=PAGADO
5. **Registrar recepción parcial** → EstadoEntrega=PARCIAL
6. **Completar recepciones** → EstadoEntrega=ENTREGADO
7. **Independencia** → Pagar sin recibir, recibir sin pagar

---

## Comandos para Continuar

```bash
# 1. Aplicar cambios a Prisma
npx prisma db push

# 2. Generar cliente
npx prisma generate

# 3. Ejecutar migración de datos
# (usar script SQL de arriba)
```

---

**Para continuar la implementación, di:** "continúa con el plan de compras"
