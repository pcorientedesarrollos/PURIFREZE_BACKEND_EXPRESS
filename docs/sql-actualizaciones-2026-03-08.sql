-- ============================================================
-- SQL COMPLETO - ACTUALIZACIONES PURIFREEZE
-- Fecha: 2026-03-08
-- Ejecutar en orden
-- ============================================================

-- ============================================================
-- 1. SISTEMA MULTI-PROVEEDOR PARA COTIZACIONES
-- ============================================================

-- Tabla de respuestas de proveedores a cotizaciones
CREATE TABLE IF NOT EXISTS cotizaciones_compra_respuestas (
    RespuestaID INT AUTO_INCREMENT PRIMARY KEY,
    CotizacionCompraID INT NOT NULL,
    ProveedorID INT NOT NULL,
    Estado ENUM('PENDIENTE', 'EN_PROCESO', 'COMPLETADA', 'RECHAZADA') DEFAULT 'PENDIENTE',
    DescuentoGlobal DECIMAL(5,2) DEFAULT 0,
    Observaciones VARCHAR(500),
    FechaRespuesta DATETIME NULL,
    FechaCreacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    IsActive BOOLEAN DEFAULT TRUE,

    CONSTRAINT fk_respuesta_cotizacion
        FOREIGN KEY (CotizacionCompraID)
        REFERENCES cotizaciones_compra_encabezado(CotizacionCompraID)
        ON DELETE RESTRICT ON UPDATE CASCADE,

    CONSTRAINT fk_respuesta_proveedor
        FOREIGN KEY (ProveedorID)
        REFERENCES catalogo_proveedores(ProveedorID)
        ON DELETE RESTRICT ON UPDATE CASCADE,

    INDEX idx_respuesta_cotizacion (CotizacionCompraID),
    INDEX idx_respuesta_proveedor (ProveedorID),
    INDEX idx_respuesta_estado (Estado),
    UNIQUE KEY unique_cotizacion_proveedor (CotizacionCompraID, ProveedorID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de detalle de precios por proveedor
CREATE TABLE IF NOT EXISTS cotizaciones_compra_respuestas_detalle (
    RespuestaDetalleID INT AUTO_INCREMENT PRIMARY KEY,
    RespuestaID INT NOT NULL,
    CotizacionDetalleID INT NOT NULL,
    PrecioUnitario DECIMAL(12,2) DEFAULT 0,
    Descuento DECIMAL(5,2) DEFAULT 0,
    TieneStock BOOLEAN DEFAULT TRUE,
    DiasEntrega INT DEFAULT 0,
    Observaciones VARCHAR(255),
    IsActive BOOLEAN DEFAULT TRUE,

    CONSTRAINT fk_respuesta_detalle_respuesta
        FOREIGN KEY (RespuestaID)
        REFERENCES cotizaciones_compra_respuestas(RespuestaID)
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT fk_respuesta_detalle_cotizacion
        FOREIGN KEY (CotizacionDetalleID)
        REFERENCES cotizaciones_compra_detalle(CotizacionDetalleID)
        ON DELETE RESTRICT ON UPDATE CASCADE,

    INDEX idx_respuesta_detalle (RespuestaID),
    INDEX idx_respuesta_cotizacion_detalle (CotizacionDetalleID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Agregar nuevo estado a cotizaciones (EN_ESPERA = esperando respuestas)
ALTER TABLE cotizaciones_compra_encabezado
MODIFY COLUMN Estado ENUM('PENDIENTE', 'ENVIADA', 'EN_ESPERA', 'FINALIZADA', 'CANCELADA') DEFAULT 'PENDIENTE';


-- ============================================================
-- 2. ROL DE PROVEEDORES - USUARIOS
-- ============================================================

-- Agregar campos a usuarios para vincular con proveedor
ALTER TABLE usuarios
ADD COLUMN ProveedorID INT NULL AFTER IsAdmin,
ADD COLUMN TipoUsuario ENUM('INTERNO', 'PROVEEDOR') DEFAULT 'INTERNO' AFTER ProveedorID;

-- Foreign key para proveedor
ALTER TABLE usuarios
ADD CONSTRAINT fk_usuario_proveedor
    FOREIGN KEY (ProveedorID)
    REFERENCES catalogo_proveedores(ProveedorID)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Índice para búsqueda
CREATE INDEX idx_usuario_proveedor ON usuarios(ProveedorID);
CREATE INDEX idx_usuario_tipo ON usuarios(TipoUsuario);


-- ============================================================
-- 3. EQUIPO VIRTUAL
-- ============================================================

-- Tabla principal de equipos virtuales
CREATE TABLE IF NOT EXISTS equipos_virtuales (
    EquipoVirtualID INT AUTO_INCREMENT PRIMARY KEY,
    Nombre VARCHAR(255) NOT NULL,
    Descripcion VARCHAR(500),
    TotalCosto DECIMAL(12,2) DEFAULT 0,
    TotalConIVA DECIMAL(12,2) DEFAULT 0,
    IsActive BOOLEAN DEFAULT TRUE,
    FechaCreacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FechaActualizacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UsuarioCreadorID INT NULL,

    INDEX idx_equipo_virtual_nombre (Nombre),
    INDEX idx_equipo_virtual_activo (IsActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Detalle de refacciones en equipo virtual
CREATE TABLE IF NOT EXISTS equipos_virtuales_detalle (
    DetalleID INT AUTO_INCREMENT PRIMARY KEY,
    EquipoVirtualID INT NOT NULL,
    RefaccionID INT NOT NULL,
    Cantidad INT DEFAULT 1,
    CostoUnitario DECIMAL(12,2) DEFAULT 0,
    Descuento DECIMAL(5,2) DEFAULT 0,
    TotalUnitario DECIMAL(12,2) DEFAULT 0,
    Otros DECIMAL(12,2) DEFAULT 0,
    TotalOtros DECIMAL(12,2) DEFAULT 0,
    CostoImportacion DECIMAL(12,2) DEFAULT 0,
    TotalUnidad DECIMAL(12,2) DEFAULT 0,
    TotalFinal DECIMAL(12,2) DEFAULT 0,
    IVA DECIMAL(5,2) DEFAULT 0,
    CantidadPiezasPorEquipo INT DEFAULT 1,
    NumeroEquipos INT DEFAULT 1,
    CostoAnterior DECIMAL(12,2) DEFAULT 0,
    CostoActual DECIMAL(12,2) DEFAULT 0,
    Diferencia DECIMAL(12,2) DEFAULT 0,
    IsActive BOOLEAN DEFAULT TRUE,

    CONSTRAINT fk_detalle_equipo_virtual
        FOREIGN KEY (EquipoVirtualID)
        REFERENCES equipos_virtuales(EquipoVirtualID)
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT fk_detalle_refaccion
        FOREIGN KEY (RefaccionID)
        REFERENCES catalogo_refacciones(RefaccionID)
        ON DELETE RESTRICT ON UPDATE CASCADE,

    INDEX idx_detalle_equipo (EquipoVirtualID),
    INDEX idx_detalle_refaccion (RefaccionID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 4. MÓDULO/SUBMÓDULO PARA SIDEBAR (Equipos Virtuales)
-- ============================================================

-- Insertar módulo (verificar que no exista)
INSERT INTO modulos (NombreModulo)
SELECT 'Equipos Virtuales'
WHERE NOT EXISTS (SELECT 1 FROM modulos WHERE NombreModulo = 'Equipos Virtuales');

-- Obtener el ID del módulo recién creado
SET @modulo_id = (SELECT ModuloID FROM modulos WHERE NombreModulo = 'Equipos Virtuales');

-- Insertar submódulos
INSERT INTO submodulos (ModuloID, NombreSubmodulo, Ruta)
SELECT @modulo_id, 'Listar Equipos Virtuales', '/equipos-virtuales'
WHERE NOT EXISTS (SELECT 1 FROM submodulos WHERE Ruta = '/equipos-virtuales');

INSERT INTO submodulos (ModuloID, NombreSubmodulo, Ruta)
SELECT @modulo_id, 'Crear Equipo Virtual', '/equipos-virtuales/crear'
WHERE NOT EXISTS (SELECT 1 FROM submodulos WHERE Ruta = '/equipos-virtuales/crear');


-- ============================================================
-- 5. MÓDULO PARA PORTAL PROVEEDOR (Sidebar)
-- ============================================================

-- Módulo para proveedores
INSERT INTO modulos (NombreModulo)
SELECT 'Portal Proveedor'
WHERE NOT EXISTS (SELECT 1 FROM modulos WHERE NombreModulo = 'Portal Proveedor');

SET @modulo_proveedor_id = (SELECT ModuloID FROM modulos WHERE NombreModulo = 'Portal Proveedor');

INSERT INTO submodulos (ModuloID, NombreSubmodulo, Ruta)
SELECT @modulo_proveedor_id, 'Mis Cotizaciones', '/portal-proveedor/cotizaciones'
WHERE NOT EXISTS (SELECT 1 FROM submodulos WHERE Ruta = '/portal-proveedor/cotizaciones');


-- ============================================================
-- 6. MÓDULO REPORTE DE ENTREGAS
-- ============================================================

-- Verificar si existe módulo Compras, sino crearlo
INSERT INTO modulos (NombreModulo)
SELECT 'Compras'
WHERE NOT EXISTS (SELECT 1 FROM modulos WHERE NombreModulo = 'Compras');

SET @modulo_compras_id = (SELECT ModuloID FROM modulos WHERE NombreModulo = 'Compras');

-- Submódulo para reporte de entregas
INSERT INTO submodulos (ModuloID, NombreSubmodulo, Ruta)
SELECT @modulo_compras_id, 'Reporte de Entregas', '/entregas-reporte'
WHERE NOT EXISTS (SELECT 1 FROM submodulos WHERE Ruta = '/entregas-reporte');


-- ============================================================
-- VERIFICACIÓN
-- ============================================================

-- Verificar tablas creadas
SELECT 'Tablas creadas:' as Info;
SHOW TABLES LIKE 'cotizaciones_compra_respuestas%';
SHOW TABLES LIKE 'equipos_virtuales%';

-- Verificar columnas agregadas a usuarios
SELECT 'Columnas en usuarios:' as Info;
DESCRIBE usuarios;

-- Verificar módulos
SELECT 'Módulos disponibles:' as Info;
SELECT * FROM modulos;

-- Verificar submódulos nuevos
SELECT 'Submódulos nuevos:' as Info;
SELECT s.*, m.NombreModulo
FROM submodulos s
JOIN modulos m ON s.ModuloID = m.ModuloID
WHERE s.Ruta IN ('/equipos-virtuales', '/equipos-virtuales/crear', '/portal-proveedor/cotizaciones', '/entregas-reporte');
