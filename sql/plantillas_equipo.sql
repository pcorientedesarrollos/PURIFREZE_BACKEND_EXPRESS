-- ============================================
-- MIGRACIÓN: Plantillas de Equipo
-- Fecha: 2024-12-05
-- Descripción: Tablas para gestionar plantillas de equipos con sus refacciones
-- ============================================

-- Crear tabla plantillas_equipo (encabezado)
CREATE TABLE IF NOT EXISTS `plantillas_equipo` (
  `PlantillaEquipoID` INT NOT NULL AUTO_INCREMENT,
  `Codigo` VARCHAR(50) NULL,
  `NombreEquipo` VARCHAR(255) NOT NULL,
  `Observaciones` VARCHAR(500) NULL,
  `EsExterno` TINYINT NOT NULL DEFAULT 0 COMMENT '0 = Interno (armado en planta), 1 = Externo (equipo de otra empresa)',
  `PorcentajeVenta` FLOAT NOT NULL DEFAULT 35.00,
  `PorcentajeRenta` FLOAT NOT NULL DEFAULT 15.00,
  `IsActive` TINYINT NULL DEFAULT 1,
  `FechaCreacion` DATE NOT NULL DEFAULT (CURRENT_DATE),
  `FechaModificacion` DATE NULL,
  PRIMARY KEY (`PlantillaEquipoID`),
  UNIQUE INDEX `plantillas_equipo_Codigo_key` (`Codigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Crear tabla plantillas_equipo_detalle (detalle de refacciones)
CREATE TABLE IF NOT EXISTS `plantillas_equipo_detalle` (
  `PlantillaDetalleID` INT NOT NULL AUTO_INCREMENT,
  `PlantillaEquipoID` INT NOT NULL,
  `RefaccionID` INT NOT NULL,
  `Cantidad` INT NOT NULL DEFAULT 1,
  `IsActive` TINYINT NULL DEFAULT 1,
  PRIMARY KEY (`PlantillaDetalleID`),
  UNIQUE INDEX `plantillas_equipo_detalle_PlantillaEquipoID_RefaccionID_key` (`PlantillaEquipoID`, `RefaccionID`),
  INDEX `plantillas_equipo_detalle_PlantillaEquipoID_idx` (`PlantillaEquipoID`),
  INDEX `plantillas_equipo_detalle_RefaccionID_idx` (`RefaccionID`),
  CONSTRAINT `plantillas_equipo_detalle_PlantillaEquipoID_fkey`
    FOREIGN KEY (`PlantillaEquipoID`)
    REFERENCES `plantillas_equipo` (`PlantillaEquipoID`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `plantillas_equipo_detalle_RefaccionID_fkey`
    FOREIGN KEY (`RefaccionID`)
    REFERENCES `catalogo_refacciones` (`RefaccionID`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- FIN DE MIGRACIÓN
-- ============================================

-- ============================================
-- MIGRACIÓN ADICIONAL (si la tabla ya existe)
-- Ejecutar solo si la tabla plantillas_equipo ya fue creada
-- ============================================

-- ALTER TABLE `plantillas_equipo`
-- ADD COLUMN `EsExterno` TINYINT NOT NULL DEFAULT 0
-- COMMENT '0 = Interno (armado en planta), 1 = Externo (equipo de otra empresa)'
-- AFTER `Observaciones`;
