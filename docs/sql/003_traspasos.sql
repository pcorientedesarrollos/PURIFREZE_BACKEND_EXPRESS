-- =============================================
-- Migración: Crear tablas de traspasos
-- Fecha: 2024-12-02
-- Descripción: Tablas para solicitudes de traspaso con autorización
-- =============================================

-- Crear enums (en MySQL se definen en la columna)

-- Crear tabla traspasos_encabezado
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

-- Crear tabla traspasos_detalle
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

-- Agregar nuevos tipos de movimiento al kardex si no existen
-- Nota: En MySQL, para modificar un ENUM existente:
-- ALTER TABLE `kardex_inventario`
-- MODIFY COLUMN `TipoMovimiento` ENUM(
--   'Entrada_Compra',
--   'Traspaso_Tecnico',
--   'Traspaso_Bodega_Tecnico',
--   'Traspaso_Tecnico_Bodega',
--   'Traspaso_Bodega_Equipo',
--   'Traspaso_Tecnico_Equipo',
--   'Traspaso_Equipo',
--   'Ajuste_Inventario',
--   ''
-- );
