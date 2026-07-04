-- ============================================================================
-- Migración: compras_encabezado / compras_detalle -> pedidos_encabezado / pedidos_detalle
-- ----------------------------------------------------------------------------
-- Precondiciones:
--   * pedidos_encabezado y pedidos_detalle se vacían al inicio (TRUNCATE)
--   * No se tocan compras_* (solo lectura)
--   * No se migran recepciones, pagos, descuentos, facturas ni notas de crédito
--   * PedidoID = CompraEncabezadoID (se preserva el ID para el join de detalles)
-- Campos SIN destino (se descartan):
--   compras_encabezado: TotalDescuentosPorcentaje, TotalDescuentoEfectivo,
--                       TotalGastosOperativos, TotalGastosImportacion,
--                       CotizacionCompraID, Factura, Estatus
--   compras_detalle:    DescuentoPorcentaje, DescuentoEfectivo,
--                       GastosOperativos, GastosImportacion
-- Campos nuevos con default (no vienen de compras):
--   pedidos_encabezado.AplicaIVA=1, TasaIVA=0.16, TotalDescuentos=0
-- ============================================================================

START TRANSACTION;
SET FOREIGN_KEY_CHECKS = 0;

-- Vaciar tablas hijas (dependen de encabezado/detalle) para arrancar desde 0.
-- IsActive queda en 1 en el CREATE, pero las tablas quedan sin filas.
TRUNCATE TABLE pedidos_recepciones_detalle;
TRUNCATE TABLE pedidos_recepciones_encabezado;
TRUNCATE TABLE pedidos_descuentos;
TRUNCATE TABLE pedidos_pagos;
TRUNCATE TABLE pedidos_facturas;

DROP TABLE IF EXISTS pedidos_detalle;
DROP TABLE IF EXISTS pedidos_encabezado;

-- ── Recrear estructura (copiada de sql/pedidos_schema.sql + pedidos_alter_iva) ─
CREATE TABLE pedidos_encabezado (
    PedidoID INT AUTO_INCREMENT PRIMARY KEY,
    ProveedorID INT NULL,
    NumeroPedido VARCHAR(100) NULL,
    FechaPedido DATE NULL,

    TotalBruto DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    TotalIVA DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    TotalNeto DECIMAL(14,2) NOT NULL DEFAULT 0.00,

    AplicaIVA TINYINT(1) NOT NULL DEFAULT 1,
    TasaIVA DECIMAL(6,4) NOT NULL DEFAULT 0.1600,

    TotalPagado DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    TotalRecibido DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    TotalNotasCredito DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    TotalDescuentos DECIMAL(14,2) NOT NULL DEFAULT 0.00,

    FormaPago ENUM('CONTADO', 'CREDITO') DEFAULT 'CREDITO',
    EstadoPago ENUM('PENDIENTE', 'PARCIAL', 'PAGADO') DEFAULT 'PENDIENTE',
    EstadoEntrega ENUM('PEDIDO', 'EN_ESPERA_DE_ENVIO', 'PARCIAL', 'ENTREGADO') DEFAULT 'PEDIDO',

    DiasCredito INT NULL,
    FechaVencimientoCredito DATE NULL,
    Observaciones VARCHAR(500) NULL,

    UsuarioID INT NULL,
    FechaAlta DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    IsActive BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT fk_pedidos_encabezado_proveedor
        FOREIGN KEY (ProveedorID)
        REFERENCES catalogo_proveedores(ProveedorID),

    INDEX idx_pedidos_proveedor (ProveedorID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pedidos_detalle (
    PedidoDetalleID INT AUTO_INCREMENT PRIMARY KEY,
    PedidoID INT NOT NULL,
    RefaccionID INT NULL,
    EquipoID INT NULL,
    EquipoVirtualID INT NULL,

    Cantidad INT NOT NULL DEFAULT 0,
    PrecioUnitario DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    SubTotal DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    Total DECIMAL(14,2) NOT NULL DEFAULT 0.00,

    IsActive BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT fk_pedidos_detalle_pedido
        FOREIGN KEY (PedidoID)
        REFERENCES pedidos_encabezado(PedidoID),

    CONSTRAINT fk_pedidos_detalle_refaccion
        FOREIGN KEY (RefaccionID)
        REFERENCES catalogo_refacciones(RefaccionID),

    CONSTRAINT fk_pedidos_detalle_equipo
        FOREIGN KEY (EquipoID)
        REFERENCES equipos(EquipoID),

    CONSTRAINT fk_pedidos_detalle_equipo_virtual
        FOREIGN KEY (EquipoVirtualID)
        REFERENCES equipos_virtuales(EquipoVirtualID),

    INDEX idx_pedidos_detalle_pedido (PedidoID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Encabezados ────────────────────────────────────────────────────────────
INSERT INTO pedidos_encabezado (
    PedidoID,
    ProveedorID,
    NumeroPedido,
    FechaPedido,
    TotalBruto,
    TotalIVA,
    TotalNeto,
    AplicaIVA,
    TasaIVA,
    TotalPagado,
    TotalRecibido,
    TotalNotasCredito,
    TotalDescuentos,
    FormaPago,
    EstadoPago,
    EstadoEntrega,
    DiasCredito,
    FechaVencimientoCredito,
    Observaciones,
    UsuarioID,
    FechaAlta,
    IsActive
)
SELECT
    c.CompraEncabezadoID,
    c.ProveedorID,
    c.NumeroPedido,
    c.FechaCompra,
    COALESCE(c.TotalBruto, 0),
    COALESCE(c.TotalIVA, 0),
    COALESCE(c.TotalNeto, 0),
    1,
    0.1600,
    -- Cache de movimientos: se arranca desde 0 (pagos/recepciones/NC no se migran)
    0,
    0,
    0,
    0,
    c.FormaPago,
    'PENDIENTE',
    'PEDIDO',
    c.DiasCredito,
    c.FechaVencimientoCredito,
    c.Observaciones,
    c.UsuarioID,
    COALESCE(
        STR_TO_DATE(c.FechaAlta, '%Y-%m-%d %H:%i:%s'),
        STR_TO_DATE(c.FechaAlta, '%Y-%m-%d'),
        NOW()
    ),
    COALESCE(c.IsActive, 1)
FROM compras_encabezado c;

-- ── Detalles ───────────────────────────────────────────────────────────────
INSERT INTO pedidos_detalle (
    PedidoDetalleID,
    PedidoID,
    RefaccionID,
    EquipoID,
    EquipoVirtualID,
    Cantidad,
    PrecioUnitario,
    SubTotal,
    Total,
    IsActive
)
SELECT
    d.CompraDetalleID,
    d.CompraEncabezadoID,
    d.RefaccionID,
    d.EquipoID,
    d.EquipoVirtualID,
    d.Cantidad,
    COALESCE(d.PrecioUnitario, 0),
    COALESCE(d.SubTotal, 0),
    COALESCE(d.Total, 0),
    COALESCE(d.IsActive, 1)
FROM compras_detalle d
WHERE d.CompraEncabezadoID IN (SELECT PedidoID FROM pedidos_encabezado);

SET FOREIGN_KEY_CHECKS = 1;
COMMIT;

-- ── Verificación rápida ────────────────────────────────────────────────────
-- SELECT
--   (SELECT COUNT(*) FROM compras_encabezado) AS compras_enc,
--   (SELECT COUNT(*) FROM pedidos_encabezado) AS pedidos_enc,
--   (SELECT COUNT(*) FROM compras_detalle)    AS compras_det,
--   (SELECT COUNT(*) FROM pedidos_detalle)    AS pedidos_det;
