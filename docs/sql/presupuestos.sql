-- =============================================
-- Script: Crear tablas de presupuestos
-- Base de datos: MySQL
-- Fecha: 2025-12-11
-- Descripción: Tablas para gestión de presupuestos
-- =============================================

-- Crear tabla presupuestos_encabezado
CREATE TABLE IF NOT EXISTS `presupuestos_encabezado` (
  `PresupuestoID` INT NOT NULL AUTO_INCREMENT,
  `ClienteID` INT NOT NULL,
  `SucursalID` INT NULL,
  `FechaCreacion` DATE NOT NULL DEFAULT (CURRENT_DATE),
  `FechaVigencia` DATE NOT NULL,
  `Estatus` ENUM('Pendiente', 'Enviado', 'Aprobado', 'Rechazado', 'Vencido') NOT NULL DEFAULT 'Pendiente',
  `Observaciones` VARCHAR(500) NULL,
  `UsuarioID` INT NOT NULL,
  `Subtotal` FLOAT NOT NULL DEFAULT 0,
  `DescuentoPorcentaje` FLOAT NULL,
  `DescuentoEfectivo` FLOAT NULL,
  `GastosAdicionales` FLOAT NULL,
  `IVA` FLOAT NOT NULL DEFAULT 0,
  `Total` FLOAT NOT NULL DEFAULT 0,
  `IsActive` TINYINT(1) NULL DEFAULT 1,
  PRIMARY KEY (`PresupuestoID`),
  INDEX `idx_presupuestos_cliente` (`ClienteID`),
  INDEX `idx_presupuestos_sucursal` (`SucursalID`),
  INDEX `idx_presupuestos_estatus` (`Estatus`),
  INDEX `idx_presupuestos_fecha` (`FechaCreacion`),
  INDEX `idx_presupuestos_vigencia` (`FechaVigencia`),
  INDEX `idx_presupuestos_isactive` (`IsActive`),
  CONSTRAINT `fk_presupuestos_cliente`
    FOREIGN KEY (`ClienteID`)
    REFERENCES `catalogo_clientes` (`ClienteID`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_presupuestos_sucursal`
    FOREIGN KEY (`SucursalID`)
    REFERENCES `clientes_sucursales` (`SucursalID`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Crear tabla presupuestos_detalle
CREATE TABLE IF NOT EXISTS `presupuestos_detalle` (
  `DetalleID` INT NOT NULL AUTO_INCREMENT,
  `PresupuestoID` INT NOT NULL,
  `TipoItem` ENUM('EQUIPO_PURIFREEZE', 'EQUIPO_EXTERNO', 'REFACCION', 'SERVICIO') NOT NULL,
  `Modalidad` ENUM('VENTA', 'RENTA', 'MANTENIMIENTO') NULL,
  `PlantillaEquipoID` INT NULL,
  `RefaccionID` INT NULL,
  `Descripcion` VARCHAR(500) NULL,
  `Cantidad` INT NOT NULL DEFAULT 1,
  `PeriodoRenta` INT NULL COMMENT 'Meses de renta (solo para modalidad RENTA)',
  `PrecioUnitario` FLOAT NOT NULL DEFAULT 0,
  `DescuentoPorcentaje` FLOAT NULL,
  `DescuentoEfectivo` FLOAT NULL,
  `Subtotal` FLOAT NOT NULL DEFAULT 0,
  `IsActive` TINYINT(1) NULL DEFAULT 1,
  PRIMARY KEY (`DetalleID`),
  INDEX `idx_presupuestos_detalle_presupuesto` (`PresupuestoID`),
  INDEX `idx_presupuestos_detalle_plantilla` (`PlantillaEquipoID`),
  INDEX `idx_presupuestos_detalle_refaccion` (`RefaccionID`),
  INDEX `idx_presupuestos_detalle_tipo` (`TipoItem`),
  INDEX `idx_presupuestos_detalle_isactive` (`IsActive`),
  CONSTRAINT `fk_presupuestos_detalle_presupuesto`
    FOREIGN KEY (`PresupuestoID`)
    REFERENCES `presupuestos_encabezado` (`PresupuestoID`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_presupuestos_detalle_plantilla`
    FOREIGN KEY (`PlantillaEquipoID`)
    REFERENCES `plantillas_equipo` (`PlantillaEquipoID`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT `fk_presupuestos_detalle_refaccion`
    FOREIGN KEY (`RefaccionID`)
    REFERENCES `catalogo_refacciones` (`RefaccionID`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Verificación
-- =============================================
-- Ejecutar después de crear las tablas para verificar:
-- DESCRIBE presupuestos_encabezado;
-- DESCRIBE presupuestos_detalle;
-- SHOW CREATE TABLE presupuestos_encabezado;
-- SHOW CREATE TABLE presupuestos_detalle;

-- =============================================
-- Datos de prueba (opcional)
-- =============================================
/*
-- Insertar presupuesto de ejemplo
INSERT INTO `presupuestos_encabezado`
(`ClienteID`, `FechaVigencia`, `UsuarioID`, `Subtotal`, `IVA`, `Total`)
VALUES
(1, DATE_ADD(CURRENT_DATE, INTERVAL 30 DAY), 1, 10000.00, 1600.00, 11600.00);

-- Insertar detalles de ejemplo
INSERT INTO `presupuestos_detalle`
(`PresupuestoID`, `TipoItem`, `Modalidad`, `PlantillaEquipoID`, `Cantidad`, `PrecioUnitario`, `Subtotal`)
VALUES
(1, 'EQUIPO_PURIFREEZE', 'RENTA', 1, 2, 500.00, 1000.00);

INSERT INTO `presupuestos_detalle`
(`PresupuestoID`, `TipoItem`, `Modalidad`, `RefaccionID`, `Cantidad`, `PrecioUnitario`, `Subtotal`)
VALUES
(1, 'REFACCION', 'VENTA', 1, 10, 150.00, 1500.00);

INSERT INTO `presupuestos_detalle`
(`PresupuestoID`, `TipoItem`, `Descripcion`, `Cantidad`, `PrecioUnitario`, `Subtotal`)
VALUES
(1, 'SERVICIO', 'Instalación y configuración inicial', 1, 2500.00, 2500.00);
*/
