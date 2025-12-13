-- =============================================
-- Script: Crear tabla clientes_sucursales
-- Base de datos: MySQL
-- Fecha: 2025-12-11
-- Descripción: Tabla para gestionar sucursales de clientes
-- =============================================

-- Crear tabla clientes_sucursales
CREATE TABLE IF NOT EXISTS `clientes_sucursales` (
  `SucursalID` INT NOT NULL AUTO_INCREMENT,
  `ClienteID` INT NOT NULL,
  `NombreSucursal` VARCHAR(255) NOT NULL,
  `Direccion` VARCHAR(255) NULL,
  `Ubicacion` VARCHAR(255) NULL,
  `Telefono` VARCHAR(50) NULL,
  `Contacto` VARCHAR(255) NULL,
  `Observaciones` VARCHAR(255) NULL,
  `IsActive` TINYINT(1) NULL DEFAULT 1,
  PRIMARY KEY (`SucursalID`),
  INDEX `idx_clientes_sucursales_clienteid` (`ClienteID`),
  INDEX `idx_clientes_sucursales_isactive` (`IsActive`),
  CONSTRAINT `fk_clientes_sucursales_cliente`
    FOREIGN KEY (`ClienteID`)
    REFERENCES `catalogo_clientes` (`ClienteID`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Verificación
-- =============================================
-- Ejecutar después de crear la tabla para verificar:
-- DESCRIBE clientes_sucursales;
-- SHOW CREATE TABLE clientes_sucursales;

-- =============================================
-- Datos de prueba (opcional)
-- =============================================
-- INSERT INTO `clientes_sucursales` (`ClienteID`, `NombreSucursal`, `Direccion`, `Telefono`, `Contacto`) VALUES
-- (1, 'Sucursal Centro', 'Av. Principal #123, Col. Centro', '844-123-4567', 'Juan Pérez'),
-- (1, 'Sucursal Norte', 'Blvd. Norte #456, Col. Industrial', '844-987-6543', 'María García'),
-- (1, 'Sucursal Sur', 'Calle Sur #789, Col. Residencial', '844-555-1234', 'Carlos López');
