-- =============================================
-- SCRIPT SQL PARA NAVICAT
-- Módulos: clientes_equipos, ventas, modificación servicios
-- Fecha: 2025-12-23
-- =============================================

-- =============================================
-- 1. ENUMS (Nuevos tipos)
-- =============================================

-- Nota: En MySQL los ENUMs se definen inline en la tabla
-- Los valores se muestran aquí como referencia:

-- TipoPropiedad: 'RENTA', 'COMPRA', 'EXTERNO'
-- EstatusClienteEquipo: 'ACTIVO', 'RETIRADO', 'DEVUELTO', 'VENDIDO'
-- TipoItemVenta: 'EQUIPO_PURIFREEZE', 'EQUIPO_EXTERNO', 'REFACCION', 'SERVICIO'
-- EstatusVenta: 'PENDIENTE', 'PAGADA', 'PARCIAL', 'CANCELADA'

-- =============================================
-- 2. TABLA: clientes_equipos
-- Equipos asignados a clientes (renta, compra, externos)
-- =============================================

CREATE TABLE IF NOT EXISTS `clientes_equipos` (
  `ClienteEquipoID` INT NOT NULL AUTO_INCREMENT,
  `ClienteID` INT NOT NULL,
  `SucursalID` INT NULL,

  -- Equipo físico (Purifreeze) o plantilla (externos)
  `EquipoID` INT NULL COMMENT 'FK equipos - para equipos Purifreeze vendidos/rentados',
  `PlantillaEquipoID` INT NULL COMMENT 'FK plantillas - para externos o referencia',

  -- Clasificación
  `TipoPropiedad` ENUM('RENTA', 'COMPRA', 'EXTERNO') NOT NULL,

  -- Vínculos opcionales
  `ContratoID` INT NULL COMMENT 'Solo si es RENTA',
  `PresupuestoDetalleID` INT NULL COMMENT 'Origen del presupuesto',
  `VentaDetalleID` INT NULL COMMENT 'Si viene de una venta',

  -- Datos del equipo externo (si aplica)
  `DescripcionEquipo` VARCHAR(255) NULL COMMENT 'Descripción para equipos externos',
  `NumeroSerieExterno` VARCHAR(100) NULL COMMENT 'Número de serie del equipo del cliente',
  `MarcaEquipo` VARCHAR(100) NULL,
  `ModeloEquipo` VARCHAR(100) NULL,

  -- Control
  `FechaAsignacion` DATE NOT NULL DEFAULT (CURRENT_DATE),
  `FechaRetiro` DATE NULL,
  `MotivoRetiro` VARCHAR(255) NULL,
  `Estatus` ENUM('ACTIVO', 'RETIRADO', 'DEVUELTO', 'VENDIDO') NOT NULL DEFAULT 'ACTIVO',
  `Observaciones` VARCHAR(500) NULL,

  -- Auditoría
  `UsuarioAsignaID` INT NULL,
  `IsActive` TINYINT(1) DEFAULT 1,

  PRIMARY KEY (`ClienteEquipoID`),

  -- Índices
  INDEX `idx_clientes_equipos_cliente` (`ClienteID`),
  INDEX `idx_clientes_equipos_equipo` (`EquipoID`),
  INDEX `idx_clientes_equipos_estatus` (`Estatus`),
  INDEX `idx_clientes_equipos_tipo` (`TipoPropiedad`),

  -- Foreign Keys
  CONSTRAINT `fk_clientes_equipos_cliente`
    FOREIGN KEY (`ClienteID`) REFERENCES `catalogo_clientes` (`ClienteID`),
  CONSTRAINT `fk_clientes_equipos_sucursal`
    FOREIGN KEY (`SucursalID`) REFERENCES `clientes_sucursales` (`SucursalID`),
  CONSTRAINT `fk_clientes_equipos_equipo`
    FOREIGN KEY (`EquipoID`) REFERENCES `equipos` (`EquipoID`),
  CONSTRAINT `fk_clientes_equipos_plantilla`
    FOREIGN KEY (`PlantillaEquipoID`) REFERENCES `plantillas_equipo` (`PlantillaEquipoID`),
  CONSTRAINT `fk_clientes_equipos_contrato`
    FOREIGN KEY (`ContratoID`) REFERENCES `contratos` (`ContratoID`),
  CONSTRAINT `fk_clientes_equipos_presupuesto_detalle`
    FOREIGN KEY (`PresupuestoDetalleID`) REFERENCES `presupuestos_detalle` (`DetalleID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 3. TABLA: ventas_encabezado
-- Registro de ventas de equipos y refacciones
-- =============================================

CREATE TABLE IF NOT EXISTS `ventas_encabezado` (
  `VentaID` INT NOT NULL AUTO_INCREMENT,
  `NumeroVenta` VARCHAR(20) NOT NULL UNIQUE,
  `ClienteID` INT NOT NULL,
  `SucursalID` INT NULL,
  `PresupuestoID` INT NULL COMMENT 'Origen del presupuesto si aplica',

  -- Fechas
  `FechaVenta` DATE NOT NULL DEFAULT (CURRENT_DATE),

  -- Totales
  `Subtotal` FLOAT NOT NULL DEFAULT 0,
  `DescuentoPorcentaje` FLOAT NULL,
  `DescuentoEfectivo` FLOAT NULL,
  `IVA` FLOAT NOT NULL DEFAULT 0,
  `Total` FLOAT NOT NULL DEFAULT 0,

  -- Estado
  `Estatus` ENUM('PENDIENTE', 'PAGADA', 'PARCIAL', 'CANCELADA') NOT NULL DEFAULT 'PENDIENTE',

  -- Observaciones
  `Observaciones` VARCHAR(500) NULL,

  -- Auditoría
  `UsuarioID` INT NOT NULL,
  `FechaCreacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `IsActive` TINYINT(1) DEFAULT 1,

  PRIMARY KEY (`VentaID`),

  -- Índices
  INDEX `idx_ventas_cliente` (`ClienteID`),
  INDEX `idx_ventas_fecha` (`FechaVenta`),
  INDEX `idx_ventas_estatus` (`Estatus`),
  INDEX `idx_ventas_presupuesto` (`PresupuestoID`),

  -- Foreign Keys
  CONSTRAINT `fk_ventas_cliente`
    FOREIGN KEY (`ClienteID`) REFERENCES `catalogo_clientes` (`ClienteID`),
  CONSTRAINT `fk_ventas_sucursal`
    FOREIGN KEY (`SucursalID`) REFERENCES `clientes_sucursales` (`SucursalID`),
  CONSTRAINT `fk_ventas_presupuesto`
    FOREIGN KEY (`PresupuestoID`) REFERENCES `presupuestos_encabezado` (`PresupuestoID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 4. TABLA: ventas_detalle
-- Detalle de items vendidos
-- =============================================

CREATE TABLE IF NOT EXISTS `ventas_detalle` (
  `VentaDetalleID` INT NOT NULL AUTO_INCREMENT,
  `VentaID` INT NOT NULL,

  -- Tipo de item vendido
  `TipoItem` ENUM('EQUIPO_PURIFREEZE', 'EQUIPO_EXTERNO', 'REFACCION', 'SERVICIO') NOT NULL,

  -- Referencias (según el tipo)
  `EquipoID` INT NULL COMMENT 'Si es EQUIPO_PURIFREEZE',
  `PlantillaEquipoID` INT NULL COMMENT 'Si es EQUIPO_EXTERNO (referencia)',
  `RefaccionID` INT NULL COMMENT 'Si es REFACCION',
  `PresupuestoDetalleID` INT NULL COMMENT 'Origen del presupuesto',

  -- Descripción
  `Descripcion` VARCHAR(500) NULL,

  -- Cantidades y precios
  `Cantidad` INT NOT NULL DEFAULT 1,
  `PrecioUnitario` FLOAT NOT NULL DEFAULT 0,
  `DescuentoPorcentaje` FLOAT NULL,
  `DescuentoEfectivo` FLOAT NULL,
  `Subtotal` FLOAT NOT NULL DEFAULT 0,

  -- Para equipos: número de serie
  `NumeroSerie` VARCHAR(50) NULL,

  -- Garantía
  `MesesGarantia` INT NULL DEFAULT 12,
  `FechaFinGarantia` DATE NULL,

  -- Auditoría
  `IsActive` TINYINT(1) DEFAULT 1,

  PRIMARY KEY (`VentaDetalleID`),

  -- Índices
  INDEX `idx_ventas_detalle_venta` (`VentaID`),
  INDEX `idx_ventas_detalle_equipo` (`EquipoID`),
  INDEX `idx_ventas_detalle_refaccion` (`RefaccionID`),

  -- Foreign Keys
  CONSTRAINT `fk_ventas_detalle_venta`
    FOREIGN KEY (`VentaID`) REFERENCES `ventas_encabezado` (`VentaID`),
  CONSTRAINT `fk_ventas_detalle_equipo`
    FOREIGN KEY (`EquipoID`) REFERENCES `equipos` (`EquipoID`),
  CONSTRAINT `fk_ventas_detalle_plantilla`
    FOREIGN KEY (`PlantillaEquipoID`) REFERENCES `plantillas_equipo` (`PlantillaEquipoID`),
  CONSTRAINT `fk_ventas_detalle_refaccion`
    FOREIGN KEY (`RefaccionID`) REFERENCES `catalogo_refacciones` (`RefaccionID`),
  CONSTRAINT `fk_ventas_detalle_presupuesto`
    FOREIGN KEY (`PresupuestoDetalleID`) REFERENCES `presupuestos_detalle` (`DetalleID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 5. TABLA: ventas_pagos
-- Registro de pagos de ventas
-- =============================================

CREATE TABLE IF NOT EXISTS `ventas_pagos` (
  `VentaPagoID` INT NOT NULL AUTO_INCREMENT,
  `VentaID` INT NOT NULL,

  -- Pago
  `MetodoPagoID` INT NOT NULL,
  `Monto` FLOAT NOT NULL,
  `FechaPago` DATE NOT NULL,
  `Referencia` VARCHAR(100) NULL,

  -- Observaciones
  `Observaciones` VARCHAR(255) NULL,

  -- Auditoría
  `UsuarioID` INT NOT NULL,
  `FechaRegistro` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `IsActive` TINYINT(1) DEFAULT 1,

  PRIMARY KEY (`VentaPagoID`),

  -- Índices
  INDEX `idx_ventas_pagos_venta` (`VentaID`),
  INDEX `idx_ventas_pagos_fecha` (`FechaPago`),

  -- Foreign Keys
  CONSTRAINT `fk_ventas_pagos_venta`
    FOREIGN KEY (`VentaID`) REFERENCES `ventas_encabezado` (`VentaID`),
  CONSTRAINT `fk_ventas_pagos_metodo`
    FOREIGN KEY (`MetodoPagoID`) REFERENCES `catalogo_metodos_pago` (`MetodosDePagoID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 6. MODIFICACIÓN: tabla servicios
-- Agregar ClienteEquipoID y hacer ContratoID opcional
-- =============================================

-- Agregar columna ClienteEquipoID
ALTER TABLE `servicios`
ADD COLUMN `ClienteEquipoID` INT NULL AFTER `ContratoID`,
ADD INDEX `idx_servicios_cliente_equipo` (`ClienteEquipoID`);

-- Hacer ContratoID nullable (si no lo es ya)
ALTER TABLE `servicios`
MODIFY COLUMN `ContratoID` INT NULL;

-- Agregar FK para ClienteEquipoID (ejecutar después de crear clientes_equipos)
ALTER TABLE `servicios`
ADD CONSTRAINT `fk_servicios_cliente_equipo`
  FOREIGN KEY (`ClienteEquipoID`) REFERENCES `clientes_equipos` (`ClienteEquipoID`);

-- =============================================
-- 7. FK adicional para clientes_equipos -> ventas_detalle
-- (ejecutar después de crear ventas_detalle)
-- =============================================

ALTER TABLE `clientes_equipos`
ADD CONSTRAINT `fk_clientes_equipos_venta_detalle`
  FOREIGN KEY (`VentaDetalleID`) REFERENCES `ventas_detalle` (`VentaDetalleID`);

-- =============================================
-- FIN DEL SCRIPT
-- =============================================
