-- =============================================
-- MÓDULO EQUIPOS - ACTUALIZACIONES DE SCHEMA
-- Ejecutar en orden en Navicat
-- Fecha: 2024-12-23
-- =============================================

-- =============================================
-- 1. AGREGAR NUEVOS TIPOS DE MOVIMIENTO EN KARDEX
-- =============================================

-- Modificar el enum de kardex_inventario para agregar nuevos tipos de movimiento
ALTER TABLE kardex_inventario
MODIFY COLUMN TipoMovimiento ENUM(
    'Entrada_Compra',
    'Traspaso_Tecnico',
    'Traspaso_Bodega_Tecnico',
    'Traspaso_Bodega_Equipo',
    'Traspaso_Tecnico_Equipo',
    'Traspaso_Equipo',
    'Servicio_Consumo_Tecnico',
    'Servicio_Consumo_Bodega',
    'Servicio_Devolucion_Bodega',
    'Servicio_Danada',
    'Reacondicionamiento_Entrada',
    'Reacondicionamiento_Salida',
    ''
) NULL;

-- =============================================
-- 2. AGREGAR NUEVOS CAMPOS A TABLA EQUIPOS
-- =============================================

-- Agregar campo FechaReacondicionamiento (última fecha de reacondicionamiento)
ALTER TABLE equipos
ADD COLUMN FechaReacondicionamiento DATE NULL AFTER FechaDesmontaje;

-- Agregar campo VecesReacondicionado (contador de veces reacondicionado)
ALTER TABLE equipos
ADD COLUMN VecesReacondicionado INT NOT NULL DEFAULT 0 AFTER FechaReacondicionamiento;

-- =============================================
-- 3. CREAR TABLA DE HISTORIAL DE EQUIPOS
-- =============================================

-- Crear enum para TipoAccionEquipo
-- NOTA: MySQL no tiene enums como tipos separados, se define en la tabla

CREATE TABLE IF NOT EXISTS equipos_historial (
    EquipoHistorialID INT NOT NULL AUTO_INCREMENT,
    EquipoID INT NOT NULL,
    TipoAccion ENUM(
        'CREACION',
        'INSTALACION',
        'DESINSTALACION',
        'INICIO_REACONDICIONAMIENTO',
        'FIN_REACONDICIONAMIENTO',
        'AGREGAR_REFACCION',
        'MODIFICAR_REFACCION',
        'ELIMINAR_REFACCION',
        'MODIFICACION',
        'BAJA',
        'ACTIVACION'
    ) NOT NULL,
    EstatusAnterior ENUM('Armado', 'Instalado', 'Reacondicionado', 'Desmontado') NULL,
    EstatusNuevo ENUM('Armado', 'Instalado', 'Reacondicionado', 'Desmontado') NULL,
    Descripcion VARCHAR(500) NOT NULL,
    DetalleJSON TEXT NULL,
    UsuarioID INT NULL,
    FechaAccion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (EquipoHistorialID),
    INDEX idx_equipos_historial_equipo (EquipoID),
    INDEX idx_equipos_historial_fecha (FechaAccion),
    CONSTRAINT fk_equipos_historial_equipo
        FOREIGN KEY (EquipoID)
        REFERENCES equipos(EquipoID)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 4. VERIFICACIÓN DE CAMBIOS
-- =============================================

-- Verificar que el enum de kardex fue actualizado
SHOW COLUMNS FROM kardex_inventario LIKE 'TipoMovimiento';

-- Verificar nuevos campos en equipos
DESCRIBE equipos;

-- Verificar tabla historial creada
DESCRIBE equipos_historial;

-- =============================================
-- FIN DEL SCRIPT
-- =============================================
