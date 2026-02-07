-- ============================================================================
-- MIGRACIÓN: Sistema de Compras con Ejes Independientes (PAGO y ENTREGA)
-- Fecha: 2026-02-06
-- ============================================================================
-- IMPORTANTE: Ejecutar este script DESPUÉS de correr `npx prisma db push`
-- Este script migra los datos existentes al nuevo sistema
-- ============================================================================

-- ============================================================================
-- PASO 1: Verificar que las columnas existen (Prisma ya las creó)
-- ============================================================================

-- Las siguientes columnas deberían existir después de prisma db push:
-- - FormaPago (ENUM: CONTADO, CREDITO)
-- - EstadoPago (ENUM: PENDIENTE, PARCIAL, PAGADO)
-- - EstadoEntrega (ENUM: NO_ENTREGADO, PARCIAL, ENTREGADO)
-- - TotalPagado (FLOAT)
-- - TotalRecibido (FLOAT)
-- - DiasCredito (INT)
-- - FechaVencimientoCredito (DATE)

-- ============================================================================
-- PASO 2: Migrar estados según Estatus actual (campo legacy)
-- ============================================================================

-- Establecer FormaPago a CREDITO por defecto (las compras antiguas eran crédito)
UPDATE compras_encabezado
SET FormaPago = 'CREDITO'
WHERE FormaPago IS NULL;

-- Migrar EstadoPago basado en el Estatus legacy
UPDATE compras_encabezado SET EstadoPago =
  CASE
    WHEN Estatus = 'Pendiente' THEN 'PENDIENTE'
    WHEN Estatus = 'Pagado' THEN 'PAGADO'
    WHEN Estatus = 'Finalizado' THEN 'PAGADO'
    ELSE 'PENDIENTE'
  END
WHERE EstadoPago IS NULL OR EstadoPago = 'PENDIENTE';

-- Migrar EstadoEntrega basado en el Estatus legacy
UPDATE compras_encabezado SET EstadoEntrega =
  CASE
    WHEN Estatus = 'Finalizado' THEN 'ENTREGADO'
    WHEN Estatus = 'Pagado' THEN 'NO_ENTREGADO'
    WHEN Estatus = 'Pendiente' THEN 'NO_ENTREGADO'
    ELSE 'NO_ENTREGADO'
  END
WHERE EstadoEntrega IS NULL OR EstadoEntrega = 'NO_ENTREGADO';

-- ============================================================================
-- PASO 3: Migrar pagos existentes de tabla 'pagos' a 'compras_pagos'
-- ============================================================================

-- Insertar pagos existentes en la nueva tabla compras_pagos
INSERT INTO compras_pagos (
  CompraEncabezadoID,
  MetodoPagoID,
  CuentaBancariaID,
  Monto,
  FechaPago,
  Referencia,
  Observaciones,
  UsuarioID,
  FechaRegistro,
  IsActive
)
SELECT
  ReferenciaID AS CompraEncabezadoID,
  MetodoPagoID,
  CuentaBancariaID,
  Monto,
  FechaPago,
  NULL AS Referencia,
  Observaciones,
  COALESCE(UsuarioID, 0) AS UsuarioID,
  NOW() AS FechaRegistro,
  IsActive
FROM pagos
WHERE ReferenciaTipo = 'Compras'
  AND IsActive = 1
  AND ReferenciaID IS NOT NULL;

-- ============================================================================
-- PASO 4: Calcular y actualizar TotalPagado por compra
-- ============================================================================

-- Actualizar TotalPagado sumando los pagos activos de compras_pagos
UPDATE compras_encabezado ce
SET TotalPagado = (
  SELECT COALESCE(SUM(Monto), 0)
  FROM compras_pagos
  WHERE CompraEncabezadoID = ce.CompraEncabezadoID
    AND IsActive = 1
);

-- ============================================================================
-- PASO 5: Calcular y actualizar TotalRecibido por compra
-- ============================================================================

-- Actualizar TotalRecibido basado en las recepciones
UPDATE compras_encabezado ce
SET TotalRecibido = (
  SELECT COALESCE(SUM(cre.MontoRecepcion), 0)
  FROM compras_recepciones_encabezado cre
  WHERE cre.CompraEncabezadoID = ce.CompraEncabezadoID
    AND cre.IsActive = 1
);

-- ============================================================================
-- PASO 6: Recalcular EstadoPago basado en TotalPagado real
-- ============================================================================

UPDATE compras_encabezado
SET EstadoPago =
  CASE
    WHEN TotalPagado >= TotalNeto THEN 'PAGADO'
    WHEN TotalPagado > 0 THEN 'PARCIAL'
    ELSE 'PENDIENTE'
  END
WHERE TotalNeto > 0;

-- ============================================================================
-- PASO 7: Recalcular EstadoEntrega basado en cantidades recibidas
-- ============================================================================

-- Crear tabla temporal con cantidades por compra
CREATE TEMPORARY TABLE IF NOT EXISTS temp_cantidades_compra AS
SELECT
  cd.CompraEncabezadoID,
  cd.RefaccionID,
  cd.Cantidad AS CantidadComprada,
  COALESCE(
    (SELECT SUM(crd.CantidadEstablecida)
     FROM compras_recepciones_detalle crd
     JOIN compras_recepciones_encabezado cre ON crd.ComprasRecepcionesEncabezadoID = cre.ComprasRecepcionesEncabezadoID
     WHERE cre.CompraEncabezadoID = cd.CompraEncabezadoID
       AND crd.RefaccionID = cd.RefaccionID
       AND crd.IsActive = 1
       AND cre.IsActive = 1
    ), 0
  ) AS CantidadRecibida
FROM compras_detalle cd
WHERE cd.IsActive = 1;

-- Actualizar EstadoEntrega basado en cantidades
UPDATE compras_encabezado ce
SET EstadoEntrega = (
  SELECT
    CASE
      WHEN SUM(CASE WHEN tc.CantidadRecibida >= tc.CantidadComprada THEN 1 ELSE 0 END) = COUNT(*)
           AND COUNT(*) > 0
        THEN 'ENTREGADO'
      WHEN SUM(tc.CantidadRecibida) > 0
        THEN 'PARCIAL'
      ELSE 'NO_ENTREGADO'
    END
  FROM temp_cantidades_compra tc
  WHERE tc.CompraEncabezadoID = ce.CompraEncabezadoID
);

-- Limpiar tabla temporal
DROP TEMPORARY TABLE IF EXISTS temp_cantidades_compra;

-- ============================================================================
-- PASO 8: Verificación de la migración
-- ============================================================================

-- Mostrar resumen de la migración
SELECT
  'Compras totales' AS Descripcion,
  COUNT(*) AS Cantidad
FROM compras_encabezado
WHERE IsActive = 1

UNION ALL

SELECT
  'Compras PAGADAS' AS Descripcion,
  COUNT(*) AS Cantidad
FROM compras_encabezado
WHERE EstadoPago = 'PAGADO' AND IsActive = 1

UNION ALL

SELECT
  'Compras con PAGO PARCIAL' AS Descripcion,
  COUNT(*) AS Cantidad
FROM compras_encabezado
WHERE EstadoPago = 'PARCIAL' AND IsActive = 1

UNION ALL

SELECT
  'Compras PENDIENTES de pago' AS Descripcion,
  COUNT(*) AS Cantidad
FROM compras_encabezado
WHERE EstadoPago = 'PENDIENTE' AND IsActive = 1

UNION ALL

SELECT
  'Compras ENTREGADAS' AS Descripcion,
  COUNT(*) AS Cantidad
FROM compras_encabezado
WHERE EstadoEntrega = 'ENTREGADO' AND IsActive = 1

UNION ALL

SELECT
  'Compras con ENTREGA PARCIAL' AS Descripcion,
  COUNT(*) AS Cantidad
FROM compras_encabezado
WHERE EstadoEntrega = 'PARCIAL' AND IsActive = 1

UNION ALL

SELECT
  'Compras NO ENTREGADAS' AS Descripcion,
  COUNT(*) AS Cantidad
FROM compras_encabezado
WHERE EstadoEntrega = 'NO_ENTREGADO' AND IsActive = 1

UNION ALL

SELECT
  'Pagos migrados a compras_pagos' AS Descripcion,
  COUNT(*) AS Cantidad
FROM compras_pagos
WHERE IsActive = 1;

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================
-- 1. El campo 'Estatus' se mantiene por compatibilidad pero es legacy
-- 2. Usar 'EstadoPago' y 'EstadoEntrega' para el nuevo sistema
-- 3. Los pagos nuevos se crean en 'compras_pagos', no en 'pagos'
-- 4. La tabla 'pagos' aún se usa para otros tipos de referencia (Servicios, Ventas, etc.)
-- ============================================================================
