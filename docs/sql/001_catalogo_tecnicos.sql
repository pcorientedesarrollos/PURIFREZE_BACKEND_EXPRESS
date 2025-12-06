-- =============================================
-- Migración: Crear tabla catalogo_tecnicos
-- Fecha: 2024-12-02
-- Descripción: Tabla para registro de técnicos ligados a usuarios
-- =============================================

-- Crear tabla catalogo_tecnicos
CREATE TABLE IF NOT EXISTS `catalogo_tecnicos` (
  `TecnicoID` INT NOT NULL AUTO_INCREMENT,
  `UsuarioID` INT NOT NULL,
  `Codigo` VARCHAR(20) NULL,
  `Telefono` VARCHAR(20) NULL,
  `Observaciones` VARCHAR(255) NULL,
  `IsActive` TINYINT(1) NULL DEFAULT 1,
  `FechaAlta` DATE NULL,
  PRIMARY KEY (`TecnicoID`),
  UNIQUE INDEX `UsuarioID_UNIQUE` (`UsuarioID` ASC),
  CONSTRAINT `fk_tecnicos_usuarios`
    FOREIGN KEY (`UsuarioID`)
    REFERENCES `usuarios` (`UsuarioID`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Índice para búsqueda por código
CREATE INDEX `idx_tecnicos_codigo` ON `catalogo_tecnicos` (`Codigo`);

-- Índice para filtrar por estado
CREATE INDEX `idx_tecnicos_isactive` ON `catalogo_tecnicos` (`IsActive`);
