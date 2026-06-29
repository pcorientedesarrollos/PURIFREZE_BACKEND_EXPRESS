-- =============================================
-- MODULO PEDIDOS - RECEPCIONES (Fase 3B)
-- Fecha: 2026-06-24
-- Descripcion: Tablas de recepciones de pedidos (espejo de compras_recepciones,
--              independiente). Registra entradas parciales/totales de mercancia
--              de un pedido, alimentando inventario/kardex y el eje EstadoEntrega.
-- Tipos estandar de pedidos: DECIMAL(14,2) montos, INT cantidad, BOOLEAN IsActive.
-- Aplicar sobre BD que YA tiene las tablas base de pedidos.
-- =============================================

-- =============================================
-- 1. ENCABEZADO DE RECEPCIONES DE PEDIDOS
-- =============================================
CREATE TABLE pedidos_recepciones_encabezado (
    PedidoRecepcionID INT AUTO_INCREMENT PRIMARY KEY,
    PedidoID INT NOT NULL,

    FechaRecepcion DATE NULL,
    Observaciones VARCHAR(500) NULL,
    MontoRecepcion DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    NumeroFactura VARCHAR(100) NULL,

    UsuarioID INT NULL,
    FechaAlta DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    IsActive BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT fk_pedidos_recepciones_pedido
        FOREIGN KEY (PedidoID)
        REFERENCES pedidos_encabezado(PedidoID),

    INDEX idx_pedidos_recepciones_pedido (PedidoID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 2. DETALLE DE RECEPCIONES DE PEDIDOS
-- =============================================
CREATE TABLE pedidos_recepciones_detalle (
    PedidoRecepcionDetalleID INT AUTO_INCREMENT PRIMARY KEY,
    PedidoRecepcionID INT NOT NULL,
    PedidoDetalleID INT NULL,
    RefaccionID INT NULL,

    CantidadRecibida INT NOT NULL DEFAULT 0,

    IsActive BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT fk_pedidos_recepciones_detalle_encabezado
        FOREIGN KEY (PedidoRecepcionID)
        REFERENCES pedidos_recepciones_encabezado(PedidoRecepcionID),

    CONSTRAINT fk_pedidos_recepciones_detalle_pedido_detalle
        FOREIGN KEY (PedidoDetalleID)
        REFERENCES pedidos_detalle(PedidoDetalleID),

    CONSTRAINT fk_pedidos_recepciones_detalle_refaccion
        FOREIGN KEY (RefaccionID)
        REFERENCES catalogo_refacciones(RefaccionID),

    INDEX idx_pedidos_recepciones_detalle_encabezado (PedidoRecepcionID),
    INDEX idx_pedidos_recepciones_detalle_pedido_detalle (PedidoDetalleID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- FIN DEL SCRIPT
-- =============================================
