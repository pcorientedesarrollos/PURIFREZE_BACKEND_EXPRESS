-- =============================================
-- MÓDULO DE FACTURAS CFDI - PURIFREEZE 2.0
-- Fecha: 2026-06-23
-- Descripción: Schema para gestión de facturas CFDI 4.0
-- =============================================

-- =============================================
-- 1. TABLA DE EMISORES DE FACTURA
-- =============================================

CREATE TABLE emisores_factura (
    EmisorFacturaID INT AUTO_INCREMENT PRIMARY KEY,
    RFC VARCHAR(13) NOT NULL UNIQUE,
    RazonSocial VARCHAR(254) NULL,
    RegimenFiscal VARCHAR(10) NULL,
    Alias VARCHAR(100) NULL,
    FechaAlta DATETIME DEFAULT CURRENT_TIMESTAMP,
    IsActive BOOLEAN DEFAULT TRUE,

    INDEX idx_emisores_rfc (RFC),
    INDEX idx_emisores_active (IsActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 2. TABLA DE FACTURAS
-- =============================================

CREATE TABLE facturas (
    FacturaID INT AUTO_INCREMENT PRIMARY KEY,
    EmisorFacturaID INT NOT NULL,
    UUID CHAR(36) NOT NULL UNIQUE,
    Version VARCHAR(10) NULL,
    Serie VARCHAR(25) NULL,
    Folio VARCHAR(40) NULL,
    FechaEmision DATETIME NOT NULL,
    RFCReceptor VARCHAR(13) NOT NULL,
    NombreReceptor VARCHAR(254) NULL,
    UsoCFDI VARCHAR(10) NULL,
    SubTotal DECIMAL(18,2) NOT NULL,
    Descuento DECIMAL(18,2) DEFAULT 0,
    Total DECIMAL(18,2) NOT NULL,
    TotalImpuestosTrasladados DECIMAL(18,2) DEFAULT 0,
    Moneda VARCHAR(3) NOT NULL,
    TipoCambio DECIMAL(18,6) NULL,
    MetodoPago VARCHAR(10) NULL,
    FormaPago VARCHAR(10) NULL,
    LugarExpedicion VARCHAR(10) NOT NULL,
    XmlOriginal LONGBLOB NULL,
    FechaCarga DATETIME DEFAULT CURRENT_TIMESTAMP,
    IsActive BOOLEAN DEFAULT TRUE,

    -- Foreign Keys
    CONSTRAINT fk_facturas_emisor FOREIGN KEY (EmisorFacturaID) REFERENCES emisores_factura(EmisorFacturaID),

    -- Índices
    INDEX idx_facturas_emisor (EmisorFacturaID),
    INDEX idx_facturas_fecha (FechaEmision),
    INDEX idx_facturas_uuid (UUID),
    INDEX idx_facturas_active (IsActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 3. TABLA DE CONCEPTOS DE FACTURA
-- =============================================

CREATE TABLE factura_conceptos (
    FacturaConceptoID INT AUTO_INCREMENT PRIMARY KEY,
    FacturaID INT NOT NULL,
    ClaveProdServ VARCHAR(10) NOT NULL,
    NoIdentificacion VARCHAR(100) NULL,
    Cantidad DECIMAL(18,6) NOT NULL,
    ClaveUnidad VARCHAR(20) NOT NULL,
    Unidad VARCHAR(20) NULL,
    Descripcion VARCHAR(1000) NOT NULL,
    ValorUnitario DECIMAL(18,6) NOT NULL,
    Importe DECIMAL(18,2) NOT NULL,
    Descuento DECIMAL(18,2) DEFAULT 0,
    ObjetoImp VARCHAR(2) NULL,
    ImpuestoTrasladado DECIMAL(10,2) DEFAULT 0,

    -- Foreign Keys
    CONSTRAINT fk_conceptos_factura FOREIGN KEY (FacturaID) REFERENCES facturas(FacturaID),

    -- Índices
    INDEX idx_conceptos_factura (FacturaID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- FIN DEL SCRIPT
-- =============================================
