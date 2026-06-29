-- =============================================
-- MÓDULO DE PEDIDOS - PURIFREEZE 2.0
-- Fecha: 2026-06-23
-- Descripción: Schema para gestión de pedidos (espejo independiente de compras)
-- =============================================







--guardar: 

-- =============================================
-- 1. CREAR TABLA DE ENCABEZADO DE PEDIDOS
-- =============================================
-- NOTA: Todos los campos Total* son ACUMULADOS (cache calculado por el backend
-- a partir de las tablas hijas: pedidos_detalle, pedidos_pagos, pedidos_descuentos).
-- NUNCA se editan a mano. Son la fuente de lectura rapida; la fuente de verdad
-- son los movimientos en las tablas hijas.
CREATE TABLE pedidos_encabezado (
    PedidoID INT AUTO_INCREMENT PRIMARY KEY,
    ProveedorID INT NULL,
    NumeroPedido VARCHAR(100) NULL,
    FechaPedido DATE NULL,

    -- Totales del pedido (rectores, calculados desde pedidos_detalle)
    TotalBruto DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    TotalIVA DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    TotalNeto DECIMAL(14,2) NOT NULL DEFAULT 0.00,

    -- IVA: precios SIN IVA, IVA se suma. Flag + tasa persistidos (patron cotizaciones).
    -- TotalIVA = AplicaIVA ? ROUND(TotalBruto * TasaIVA, 2) : 0
    AplicaIVA TINYINT(1) NOT NULL DEFAULT 1,
    TasaIVA DECIMAL(6,4) NOT NULL DEFAULT 0.1600,

    -- Acumulados de movimientos (cache, recalculado por backend)
    TotalPagado DECIMAL(14,2) NOT NULL DEFAULT 0.00,        -- SUM(pedidos_pagos.Monto activos)
    TotalRecibido DECIMAL(14,2) NOT NULL DEFAULT 0.00,      -- recepciones (inventario/kardex)
    TotalNotasCredito DECIMAL(14,2) NOT NULL DEFAULT 0.00,  -- NC del proveedor (modulo existente) aplicadas via pedidos_descuentos
    TotalDescuentos DECIMAL(14,2) NOT NULL DEFAULT 0.00,    -- SUM(pedidos_descuentos.MontoDescuento activos)

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

-- =============================================
-- 2. CREAR TABLA DE DETALLE DE PEDIDOS
-- =============================================

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
-- =============================================
-- 3. CREAR TABLA INTERMEDIA DE FACTURAS DE PEDIDOS
-- =============================================

CREATE TABLE pedidos_facturas (
    PedidoFacturaID INT AUTO_INCREMENT PRIMARY KEY,
    PedidoID INT NOT NULL,
    FacturaID INT NOT NULL,
    FechaAsociacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UsuarioID INT NULL,
    IsActive BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT fk_pedidos_facturas_pedido
        FOREIGN KEY (PedidoID)
        REFERENCES pedidos_encabezado(PedidoID),

    CONSTRAINT fk_pedidos_facturas_factura
        FOREIGN KEY (FacturaID)
        REFERENCES facturas(FacturaID),

    UNIQUE uk_pedidos_facturas_factura (FacturaID),

    INDEX idx_pedidos_facturas_pedido (PedidoID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 4. CREAR TABLA DE PAGOS DE PEDIDOS
-- =============================================
CREATE TABLE pedidos_pagos (
    PedidoPagoID INT AUTO_INCREMENT PRIMARY KEY,
    PedidoID INT NOT NULL,

    FechaPago DATE NOT NULL,
    Monto DECIMAL(14,2) NOT NULL,

    MetodoPagoID INT NULL,
    CuentaBancariaID INT NULL,
    Referencia VARCHAR(150) NULL,
    Observaciones VARCHAR(500) NULL,

    UsuarioID INT NULL,
    FechaAlta DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    IsActive BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT fk_pedidos_pagos_pedido
        FOREIGN KEY (PedidoID)
        REFERENCES pedidos_encabezado(PedidoID),

    -- FK a catalogos ajenos (PK real: catalogo_metodos_pago.MetodosDePagoID)
    CONSTRAINT fk_pedidos_pagos_metodo
        FOREIGN KEY (MetodoPagoID)
        REFERENCES catalogo_metodos_pago(MetodosDePagoID),

    CONSTRAINT fk_pedidos_pagos_cuenta
        FOREIGN KEY (CuentaBancariaID)
        REFERENCES catalogo_cuentasBancarias(CuentaBancariaID),

    INDEX idx_pedidos_pagos_pedido (PedidoID),
    INDEX idx_pedidos_pagos_fecha (FechaPago)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 5. CREAR TABLA DE DESCUENTOS DE PEDIDOS
-- =============================================
-- Registra TODOS los movimientos que reducen el monto a pagar al proveedor:
--   - PRONTO_PAGO: descuento por pagar dentro del plazo (se aplica en el pago)
--   - AJUSTE / BONIFICACION: descuentos comerciales
--   - NOTA_CREDITO: aplicacion de una nota de credito del proveedor.
--     La NC se crea/gestiona en el MODULO EXISTENTE (notas_credito); aqui solo se
--     registra su aplicacion al pedido, referenciando NotaCreditoID (escalar, sin
--     FK dura para no acoplar a tabla ajena via @relation en Prisma).
-- La suma de MontoDescuento activos alimenta pedidos_encabezado.TotalDescuentos
-- (y TotalNotasCredito cuando TipoDescuento = 'NOTA_CREDITO').
CREATE TABLE pedidos_descuentos (
    PedidoDescuentoID INT AUTO_INCREMENT PRIMARY KEY,
    PedidoID INT NOT NULL,
    PedidoFacturaID INT NULL COMMENT 'Opcional: si el descuento viene de una factura específica',
    PedidoPagoID INT NULL COMMENT 'Opcional: pago que origina el descuento (ej. pronto pago)',
    NotaCreditoID INT NULL COMMENT 'Ref. a notas_credito del modulo existente (sin FK dura, escalar)',

    TipoDescuento ENUM('PRONTO_PAGO', 'AJUSTE', 'BONIFICACION', 'NOTA_CREDITO') NOT NULL,
    MontoBase DECIMAL(14,2) NOT NULL,
    PorcentajeDescuento DECIMAL(5,2) NULL,
    MontoDescuento DECIMAL(14,2) NOT NULL,

    FechaBase DATE NULL,
    FechaLimite DATE NULL,
    FechaAplicacion DATE NOT NULL,

    Observaciones VARCHAR(500) NULL,
    UsuarioID INT NULL,
    FechaAlta DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    IsActive BOOLEAN NOT NULL DEFAULT TRUE,

    CONSTRAINT fk_pedidos_descuentos_pedido
        FOREIGN KEY (PedidoID)
        REFERENCES pedidos_encabezado(PedidoID),

    CONSTRAINT fk_pedidos_descuentos_factura
        FOREIGN KEY (PedidoFacturaID)
        REFERENCES pedidos_facturas(PedidoFacturaID),

    CONSTRAINT fk_pedidos_descuentos_pago
        FOREIGN KEY (PedidoPagoID)
        REFERENCES pedidos_pagos(PedidoPagoID),

    INDEX idx_pedidos_descuentos_pedido (PedidoID),
    INDEX idx_pedidos_descuentos_tipo (TipoDescuento),
    INDEX idx_pedidos_descuentos_nota (NotaCreditoID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- =============================================
-- FIN DEL SCRIPT
-- =============================================
