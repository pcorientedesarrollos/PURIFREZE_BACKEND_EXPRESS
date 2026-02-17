-- ============================================
-- MIGRACIÓN: Servicios Adicionales Aplicados
-- Fecha: 2024
-- Descripción: Agregar tabla para servicios adicionales en servicios técnicos
--              y campo ServicioID en cobros
-- ============================================

-- 1. Agregar campo ServicioID a la tabla cobros
ALTER TABLE `cobros`
ADD COLUMN `ServicioID` INT NULL AFTER `VentaID`,
ADD INDEX `cobros_ServicioID_idx` (`ServicioID`);

-- 2. Agregar FK de cobros a servicios
ALTER TABLE `cobros`
ADD CONSTRAINT `cobros_ServicioID_fkey`
FOREIGN KEY (`ServicioID`) REFERENCES `servicios`(`ServicioID`)
ON DELETE SET NULL ON UPDATE CASCADE;

-- 3. Crear tabla servicios_adicionales_aplicados
CREATE TABLE `servicios_adicionales_aplicados` (
  `ServicioAdicionalAplicadoID` INT NOT NULL AUTO_INCREMENT,
  `ServicioID` INT NOT NULL,
  `ServicioAdicionalID` INT NOT NULL,

  -- Datos del servicio adicional al momento de aplicarlo
  `NombreServicio` VARCHAR(255) NOT NULL,
  `CostoOriginal` FLOAT NOT NULL,
  `CostoAplicado` FLOAT NOT NULL,

  -- Autorización del cliente
  `Autorizado` TINYINT NOT NULL DEFAULT 0,
  `FechaAutorizacion` DATETIME NULL,
  `NombreAutorizante` VARCHAR(255) NULL,

  -- Cobro generado
  `CobroGenerado` TINYINT NOT NULL DEFAULT 0,
  `CobroID` INT NULL,

  -- Observaciones
  `Observaciones` VARCHAR(500) NULL,

  -- Auditoría
  `UsuarioAgregaID` INT NULL,
  `UsuarioAutorizaID` INT NULL,
  `FechaCreacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `IsActive` TINYINT DEFAULT 1,

  PRIMARY KEY (`ServicioAdicionalAplicadoID`),
  UNIQUE KEY `servicios_adicionales_aplicados_ServicioID_ServicioAdicionalID_key` (`ServicioID`, `ServicioAdicionalID`),
  INDEX `servicios_adicionales_aplicados_ServicioID_idx` (`ServicioID`),
  INDEX `servicios_adicionales_aplicados_ServicioAdicionalID_idx` (`ServicioAdicionalID`),

  CONSTRAINT `servicios_adicionales_aplicados_ServicioID_fkey`
    FOREIGN KEY (`ServicioID`) REFERENCES `servicios`(`ServicioID`)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT `servicios_adicionales_aplicados_ServicioAdicionalID_fkey`
    FOREIGN KEY (`ServicioAdicionalID`) REFERENCES `catalogo_servicios_adicionales`(`ServicioAdicionalID`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- INSTRUCCIONES:
-- 1. Ejecuta este SQL en tu base de datos MySQL
-- 2. Después ejecuta: npx prisma db pull (opcional)
-- 3. O simplemente: npx prisma generate
-- ============================================
