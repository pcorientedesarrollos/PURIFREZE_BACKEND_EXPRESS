-- =============================================
-- ALTER: ajustes IVA modulo pedidos
-- Fecha: 2026-06-24
-- Aplicar sobre BD que YA tiene las tablas de pedidos creadas.
-- Cambios:
--   1. pedidos_detalle: quitar columna IVA (el IVA solo vive en el encabezado).
--   2. pedidos_encabezado: agregar AplicaIVA + TasaIVA (flag + tasa persistidos).
-- =============================================

ALTER TABLE pedidos_detalle
    DROP COLUMN IVA;

ALTER TABLE pedidos_encabezado
    ADD COLUMN AplicaIVA TINYINT(1) NOT NULL DEFAULT 1 AFTER TotalNeto,
    ADD COLUMN TasaIVA DECIMAL(6,4) NOT NULL DEFAULT 0.1600 AFTER AplicaIVA;
