-- =============================================
-- Migración: Crear tabla inventario_tecnico
-- Fecha: 2024-12-02
-- Descripción: Tabla para stock de refacciones por técnico
-- =============================================

-- Crear tabla inventario_tecnico
CREATE TABLE IF NOT EXISTS `inventario_tecnico` (
  `InventarioTecnicoID` INT NOT NULL AUTO_INCREMENT,
  `TecnicoID` INT NOT NULL,
  `RefaccionID` INT NOT NULL,
  `StockNuevo` INT NOT NULL DEFAULT 0,
  `StockUsado` INT NOT NULL DEFAULT 0,
  `FechaUltimoMov` DATE NULL,
  `IsActive` TINYINT(1) NULL DEFAULT 1,
  PRIMARY KEY (`InventarioTecnicoID`),
  UNIQUE INDEX `TecnicoID_RefaccionID_UNIQUE` (`TecnicoID` ASC, `RefaccionID` ASC),
  INDEX `fk_inventario_tecnico_refaccion_idx` (`RefaccionID` ASC),
  CONSTRAINT `fk_inventario_tecnico_tecnico`
    FOREIGN KEY (`TecnicoID`)
    REFERENCES `catalogo_tecnicos` (`TecnicoID`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_inventario_tecnico_refaccion`
    FOREIGN KEY (`RefaccionID`)
    REFERENCES `catalogo_refacciones` (`RefaccionID`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Índice para filtrar por estado
CREATE INDEX `idx_inventario_tecnico_isactive` ON `inventario_tecnico` (`IsActive`);

-- Índice para búsqueda por fecha
CREATE INDEX `idx_inventario_tecnico_fecha` ON `inventario_tecnico` (`FechaUltimoMov`);
