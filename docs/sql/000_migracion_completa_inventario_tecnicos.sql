-- =============================================
-- MIGRACIÓN COMPLETA: Sistema de Inventario de Técnicos
-- Fecha: 2024-12-02
-- Descripción: Todas las tablas necesarias para el sistema de inventario
-- =============================================

-- IMPORTANTE: Ejecutar en orden, respetando las dependencias

-- =============================================
-- 1. TABLA: catalogo_tecnicos
-- =============================================
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

CREATE INDEX `idx_tecnicos_codigo` ON `catalogo_tecnicos` (`Codigo`);
CREATE INDEX `idx_tecnicos_isactive` ON `catalogo_tecnicos` (`IsActive`);

-- =============================================
-- 2. TABLA: inventario_tecnico
-- =============================================
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

CREATE INDEX `idx_inventario_tecnico_isactive` ON `inventario_tecnico` (`IsActive`);
CREATE INDEX `idx_inventario_tecnico_fecha` ON `inventario_tecnico` (`FechaUltimoMov`);

-- =============================================
-- 3. TABLA: traspasos_encabezado
-- =============================================
CREATE TABLE IF NOT EXISTS `traspasos_encabezado` (
  `TraspasoEncabezadoID` INT NOT NULL AUTO_INCREMENT,
  `TipoTraspaso` ENUM('Bodega_Tecnico', 'Tecnico_Bodega', 'Tecnico_Tecnico') NOT NULL,
  `OrigenTipo` ENUM('Bodega', 'Tecnico') NOT NULL,
  `OrigenID` INT NULL,
  `DestinoTipo` ENUM('Bodega', 'Tecnico') NOT NULL,
  `DestinoID` INT NULL,
  `UsuarioSolicitaID` INT NOT NULL,
  `UsuarioAutorizaID` INT NULL,
  `FechaSolicitud` DATE NOT NULL,
  `FechaAutorizacion` DATE NULL,
  `Estatus` ENUM('Pendiente', 'Autorizado', 'Rechazado') NOT NULL DEFAULT 'Pendiente',
  `Observaciones` VARCHAR(255) NULL,
  `IsActive` TINYINT(1) NULL DEFAULT 1,
  PRIMARY KEY (`TraspasoEncabezadoID`),
  INDEX `idx_traspasos_estatus` (`Estatus` ASC),
  INDEX `idx_traspasos_tipo` (`TipoTraspaso` ASC),
  INDEX `idx_traspasos_fecha` (`FechaSolicitud` ASC),
  INDEX `idx_traspasos_origen` (`OrigenTipo` ASC, `OrigenID` ASC),
  INDEX `idx_traspasos_destino` (`DestinoTipo` ASC, `DestinoID` ASC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 4. TABLA: traspasos_detalle
-- =============================================
CREATE TABLE IF NOT EXISTS `traspasos_detalle` (
  `TraspasoDetalleID` INT NOT NULL AUTO_INCREMENT,
  `TraspasoEncabezadoID` INT NOT NULL,
  `RefaccionID` INT NOT NULL,
  `CantidadNuevo` INT NOT NULL DEFAULT 0,
  `CantidadUsado` INT NOT NULL DEFAULT 0,
  `IsActive` TINYINT(1) NULL DEFAULT 1,
  PRIMARY KEY (`TraspasoDetalleID`),
  INDEX `fk_traspaso_detalle_encabezado_idx` (`TraspasoEncabezadoID` ASC),
  INDEX `fk_traspaso_detalle_refaccion_idx` (`RefaccionID` ASC),
  CONSTRAINT `fk_traspaso_detalle_encabezado`
    FOREIGN KEY (`TraspasoEncabezadoID`)
    REFERENCES `traspasos_encabezado` (`TraspasoEncabezadoID`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_traspaso_detalle_refaccion`
    FOREIGN KEY (`RefaccionID`)
    REFERENCES `catalogo_refacciones` (`RefaccionID`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 5. TABLA: refacciones_danadas
-- =============================================
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

CREATE INDEX `idx_danadas_proveedor_fecha` ON `refacciones_danadas` (`ProveedorID`, `FechaRegistro`);

-- =============================================
-- 6. TABLA: ajustes_inventario
-- =============================================
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

CREATE INDEX `idx_ajustes_tecnico_fecha` ON `ajustes_inventario` (`TecnicoID`, `FechaSolicitud`);

-- =============================================
-- FIN DE LA MIGRACIÓN
-- =============================================
