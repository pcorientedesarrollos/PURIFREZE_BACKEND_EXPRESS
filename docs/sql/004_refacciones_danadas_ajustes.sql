-- =============================================
-- Migración: Crear tablas de refacciones dañadas y ajustes
-- Fecha: 2024-12-02
-- Descripción: Tablas para control de calidad y ajustes de inventario
-- =============================================

-- Crear tabla refacciones_danadas
CREATE TABLE IF NOT EXISTS `refacciones_danadas` (
  `RefaccionDanadaID` INT NOT NULL AUTO_INCREMENT,
  `RefaccionID` INT NOT NULL,
  `TecnicoID` INT NULL,
  `ProveedorID` INT NULL,
  `CompraEncabezadoID` INT NULL,
  `Cantidad` INT NOT NULL,
  `MotivoDano` ENUM('Defecto_Fabrica', 'Mal_Uso', 'Desgaste_Normal', 'Accidente', 'Otro') NOT NULL,
  `Observaciones` VARCHAR(255) NULL,
  `FechaRegistro` DATE NOT NULL,
  `UsuarioID` INT NOT NULL,
  `IsActive` TINYINT(1) NULL DEFAULT 1,
  PRIMARY KEY (`RefaccionDanadaID`),
  INDEX `fk_danadas_refaccion_idx` (`RefaccionID` ASC),
  INDEX `fk_danadas_tecnico_idx` (`TecnicoID` ASC),
  INDEX `fk_danadas_proveedor_idx` (`ProveedorID` ASC),
  INDEX `idx_danadas_fecha` (`FechaRegistro` ASC),
  INDEX `idx_danadas_motivo` (`MotivoDano` ASC),
  CONSTRAINT `fk_danadas_refaccion`
    FOREIGN KEY (`RefaccionID`)
    REFERENCES `catalogo_refacciones` (`RefaccionID`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Crear tabla ajustes_inventario
CREATE TABLE IF NOT EXISTS `ajustes_inventario` (
  `AjusteID` INT NOT NULL AUTO_INCREMENT,
  `TecnicoID` INT NOT NULL,
  `RefaccionID` INT NOT NULL,
  `StockSistemaNuevo` INT NOT NULL,
  `StockSistemaUsado` INT NOT NULL,
  `StockRealNuevo` INT NOT NULL,
  `StockRealUsado` INT NOT NULL,
  `DiferenciaNuevo` INT NOT NULL,
  `DiferenciaUsado` INT NOT NULL,
  `MotivoAjuste` ENUM('Perdida', 'Error_Captura', 'Robo', 'Deterioro', 'Sobrante', 'Otro') NOT NULL,
  `Observaciones` VARCHAR(255) NULL,
  `UsuarioSolicitaID` INT NOT NULL,
  `UsuarioAutorizaID` INT NULL,
  `FechaSolicitud` DATE NOT NULL,
  `FechaAutorizacion` DATE NULL,
  `Estatus` ENUM('Pendiente', 'Autorizado', 'Rechazado') NOT NULL DEFAULT 'Pendiente',
  `IsActive` TINYINT(1) NULL DEFAULT 1,
  PRIMARY KEY (`AjusteID`),
  INDEX `fk_ajustes_refaccion_idx` (`RefaccionID` ASC),
  INDEX `fk_ajustes_tecnico_idx` (`TecnicoID` ASC),
  INDEX `idx_ajustes_estatus` (`Estatus` ASC),
  INDEX `idx_ajustes_fecha` (`FechaSolicitud` ASC),
  INDEX `idx_ajustes_motivo` (`MotivoAjuste` ASC),
  CONSTRAINT `fk_ajustes_refaccion`
    FOREIGN KEY (`RefaccionID`)
    REFERENCES `catalogo_refacciones` (`RefaccionID`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Índices adicionales para reportes
CREATE INDEX `idx_danadas_proveedor_fecha` ON `refacciones_danadas` (`ProveedorID`, `FechaRegistro`);
CREATE INDEX `idx_ajustes_tecnico_fecha` ON `ajustes_inventario` (`TecnicoID`, `FechaSolicitud`);
