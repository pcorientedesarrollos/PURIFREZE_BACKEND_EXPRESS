-- ============================================
-- MIGRACIÓN: Módulo de Equipos
-- Fecha: 2024-12-06
-- Descripción: Tablas para gestionar equipos físicos creados desde plantillas
-- ============================================

-- Crear enum EstatusEquipo (MySQL no soporta enums de Prisma, se usa directamente en el campo)
-- Los valores permitidos son: 'Armado', 'Instalado', 'Desmontado'

-- Crear tabla equipos (encabezado)
CREATE TABLE IF NOT EXISTS `equipos` (
  `EquipoID` INT NOT NULL AUTO_INCREMENT,
  `PlantillaEquipoID` INT NOT NULL,
  `NumeroSerie` VARCHAR(50) NOT NULL,
  `EsExterno` TINYINT NOT NULL DEFAULT 0 COMMENT '0 = Interno (Purifreeze), 1 = Externo (otra empresa)',
  `Estatus` ENUM('Armado', 'Instalado', 'Desmontado') NOT NULL DEFAULT 'Armado',
  `Observaciones` VARCHAR(500) NULL,
  `FechaCreacion` DATE NOT NULL DEFAULT (CURRENT_DATE),
  `FechaInstalacion` DATE NULL,
  `FechaDesmontaje` DATE NULL,
  `UsuarioCreadorID` INT NULL,
  `IsActive` TINYINT NULL DEFAULT 1,
  PRIMARY KEY (`EquipoID`),
  UNIQUE INDEX `equipos_NumeroSerie_key` (`NumeroSerie`),
  INDEX `equipos_PlantillaEquipoID_idx` (`PlantillaEquipoID`),
  INDEX `equipos_Estatus_idx` (`Estatus`),
  INDEX `equipos_EsExterno_idx` (`EsExterno`),
  CONSTRAINT `equipos_PlantillaEquipoID_fkey`
    FOREIGN KEY (`PlantillaEquipoID`)
    REFERENCES `plantillas_equipo` (`PlantillaEquipoID`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Crear tabla equipos_detalle (refacciones del equipo)
CREATE TABLE IF NOT EXISTS `equipos_detalle` (
  `EquipoDetalleID` INT NOT NULL AUTO_INCREMENT,
  `EquipoID` INT NOT NULL,
  `RefaccionID` INT NOT NULL,
  `Cantidad` INT NOT NULL DEFAULT 1,
  `IsActive` TINYINT NULL DEFAULT 1,
  PRIMARY KEY (`EquipoDetalleID`),
  UNIQUE INDEX `equipos_detalle_EquipoID_RefaccionID_key` (`EquipoID`, `RefaccionID`),
  INDEX `equipos_detalle_EquipoID_idx` (`EquipoID`),
  INDEX `equipos_detalle_RefaccionID_idx` (`RefaccionID`),
  CONSTRAINT `equipos_detalle_EquipoID_fkey`
    FOREIGN KEY (`EquipoID`)
    REFERENCES `equipos` (`EquipoID`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `equipos_detalle_RefaccionID_fkey`
    FOREIGN KEY (`RefaccionID`)
    REFERENCES `catalogo_refacciones` (`RefaccionID`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- MIGRACIÓN ADICIONAL: Agregar campo EquipoID a refacciones_danadas
-- (Para rastrear piezas dañadas provenientes de equipos)
-- ============================================

ALTER TABLE `refacciones_danadas`
ADD COLUMN `EquipoID` INT NULL
AFTER `CompraEncabezadoID`,
ADD INDEX `refacciones_danadas_EquipoID_idx` (`EquipoID`),
ADD CONSTRAINT `refacciones_danadas_EquipoID_fkey`
  FOREIGN KEY (`EquipoID`)
  REFERENCES `equipos` (`EquipoID`)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- ============================================
-- NOTAS DE IMPLEMENTACIÓN
-- ============================================

-- ESTADOS DEL EQUIPO:
-- * Armado: Estado inicial. El equipo puede ser modificado (agregar/quitar refacciones)
-- * Instalado: El equipo está instalado con un cliente. No se puede modificar.
-- * Desmontado: El equipo fue retirado. Se mantiene para historial.

-- REGLAS DE INVENTARIO:
-- * Equipos internos (EsExterno = 0):
--   - Al crear: descuenta del inventario general
--   - Al agregar refacción: descuenta del inventario
--   - Al quitar refacción: regresa al inventario o va a dañadas
--   - Al desmontar: las refacciones van a inventario o dañadas
-- * Equipos externos (EsExterno = 1):
--   - No afectan el inventario
--   - No pueden desmontarse

-- NÚMERO DE SERIE:
-- * Formato: PREFIJO-AÑO-CONSECUTIVO
-- * Ejemplo: PUR-24-0001, FRI-24-0015
-- * El prefijo se genera automáticamente desde el nombre de la plantilla

-- ============================================
-- FIN DE MIGRACIÓN
-- ============================================
