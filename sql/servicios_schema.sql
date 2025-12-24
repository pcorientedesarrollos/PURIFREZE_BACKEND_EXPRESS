-- =============================================
-- MÓDULO DE SERVICIOS - PURIFREEZE 2.0
-- Fecha: 2025-01-XX
-- Descripción: Schema completo para gestión de servicios
-- =============================================

-- =============================================
-- 1. ELIMINAR TABLA ANTERIOR
-- =============================================

DROP TABLE IF EXISTS contratos_servicios;

-- =============================================
-- 2. MODIFICAR ENUM DE ESTATUS DE EQUIPOS
-- =============================================

ALTER TABLE equipos MODIFY COLUMN Estatus ENUM('Armado', 'Instalado', 'Reacondicionado', 'Desmontado') DEFAULT 'Armado';

-- =============================================
-- 3. AGREGAR NUEVOS TIPOS DE MOVIMIENTO AL KARDEX
-- =============================================

ALTER TABLE kardex_inventario MODIFY COLUMN TipoMovimiento ENUM(
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
    ''
);

-- =============================================
-- 4. CREAR TABLA PRINCIPAL DE SERVICIOS
-- =============================================

CREATE TABLE servicios (
    ServicioID INT AUTO_INCREMENT PRIMARY KEY,
    ContratoID INT NOT NULL,
    TipoServicio ENUM('INSTALACION', 'MANTENIMIENTO', 'REPARACION', 'DESINSTALACION') NOT NULL,

    -- Programación
    FechaProgramada DATE NOT NULL,
    HoraProgramada TIME NULL,
    FechaEjecucion DATE NULL,
    HoraInicio TIME NULL,
    HoraFin TIME NULL,

    -- Asignación
    TecnicoID INT NULL,

    -- Estados
    Estatus ENUM('POR_CONFIRMAR', 'PENDIENTE', 'CONFIRMADO', 'EN_PROCESO', 'REALIZADO', 'CANCELADO') DEFAULT 'POR_CONFIRMAR',

    -- Configuración de inventario
    OrigenInventario ENUM('TECNICO', 'BODEGA') DEFAULT 'TECNICO',

    -- Observaciones
    ObservacionesAntes VARCHAR(500) NULL,
    ObservacionesDespues VARCHAR(500) NULL,
    ObservacionesGenerales TEXT NULL,

    -- Reagendamiento / Próximo servicio
    ProximoServicioMeses INT NULL COMMENT 'Meses para agendar próximo servicio automáticamente',
    ServicioOrigenID INT NULL COMMENT 'Si fue reagendado, referencia al servicio original',
    MotivoReagendamiento VARCHAR(255) NULL,
    MotivoCancelacion VARCHAR(255) NULL,

    -- Costos
    CostoServicio FLOAT DEFAULT 0,
    CostoRefacciones FLOAT DEFAULT 0,
    CostoTotal FLOAT DEFAULT 0,

    -- Auditoría
    UsuarioCreadorID INT NULL,
    UsuarioFinalizaID INT NULL,
    FechaCreacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FechaModificacion DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    IsActive TINYINT DEFAULT 1,

    -- Foreign Keys
    CONSTRAINT fk_servicios_contrato FOREIGN KEY (ContratoID) REFERENCES contratos(ContratoID),
    CONSTRAINT fk_servicios_tecnico FOREIGN KEY (TecnicoID) REFERENCES catalogo_tecnicos(TecnicoID),
    CONSTRAINT fk_servicios_origen FOREIGN KEY (ServicioOrigenID) REFERENCES servicios(ServicioID),

    -- Índices
    INDEX idx_servicios_contrato (ContratoID),
    INDEX idx_servicios_tecnico (TecnicoID),
    INDEX idx_servicios_fecha (FechaProgramada),
    INDEX idx_servicios_estatus (Estatus)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 5. CREAR TABLA DE EQUIPOS POR SERVICIO
-- =============================================

CREATE TABLE servicios_equipos (
    ServicioEquipoID INT AUTO_INCREMENT PRIMARY KEY,
    ServicioID INT NOT NULL,
    ContratoEquipoID INT NOT NULL COMMENT 'Referencia al equipo en el contrato',
    EquipoID INT NULL COMMENT 'Referencia directa al equipo (puede ser null si es externo sin registro)',

    -- Para desinstalación: qué hacer con el equipo
    AccionDesinstalacion ENUM('PIEZAS_INDIVIDUALES', 'EQUIPO_COMPLETO') NULL,

    -- Observaciones específicas de este equipo en el servicio
    Observaciones VARCHAR(500) NULL,

    -- Auditoría
    IsActive TINYINT DEFAULT 1,

    -- Foreign Keys
    CONSTRAINT fk_servicios_equipos_servicio FOREIGN KEY (ServicioID) REFERENCES servicios(ServicioID),
    CONSTRAINT fk_servicios_equipos_contrato_equipo FOREIGN KEY (ContratoEquipoID) REFERENCES contratos_equipos(ContratoEquipoID),
    CONSTRAINT fk_servicios_equipos_equipo FOREIGN KEY (EquipoID) REFERENCES equipos(EquipoID),

    -- Índices
    INDEX idx_servicios_equipos_servicio (ServicioID),
    INDEX idx_servicios_equipos_equipo (EquipoID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 6. CREAR TABLA DE REFACCIONES POR EQUIPO EN SERVICIO
-- =============================================

CREATE TABLE servicios_equipos_refacciones (
    ServicioEquipoRefaccionID INT AUTO_INCREMENT PRIMARY KEY,
    ServicioEquipoID INT NOT NULL,
    RefaccionID INT NOT NULL,

    -- Cantidades
    CantidadEquipo INT DEFAULT 0 COMMENT 'Cantidad actual en el equipo',
    CantidadTecnico INT DEFAULT 0 COMMENT 'Cantidad que trae el técnico para cambio',

    -- Acciones realizadas
    Cambio TINYINT DEFAULT 0 COMMENT '1 si se cambió la pieza',
    Limpieza TINYINT DEFAULT 0 COMMENT '1 si se limpió',
    Verificacion TINYINT DEFAULT 0 COMMENT '1 si se verificó',

    -- Si hubo cambio, ¿por cuál refacción? (puede ser la misma u otra)
    RefaccionNuevaID INT NULL COMMENT 'Si se cambió por una refacción diferente',
    CantidadNueva INT DEFAULT 0 COMMENT 'Cantidad de la nueva refacción instalada',

    -- Para desinstalación: destino de la pieza
    DestinoRefaccion ENUM('INVENTARIO', 'DANADA', 'PERMANECE') NULL,
    MotivoDano ENUM('Defecto_Fabrica', 'Mal_Uso', 'Desgaste_Normal', 'Accidente', 'Otro') NULL,
    ObservacionesDano VARCHAR(255) NULL,

    -- Observaciones
    Observaciones VARCHAR(255) NULL,

    -- Auditoría
    IsActive TINYINT DEFAULT 1,

    -- Foreign Keys
    CONSTRAINT fk_ser_eq_ref_servicio_equipo FOREIGN KEY (ServicioEquipoID) REFERENCES servicios_equipos(ServicioEquipoID),
    CONSTRAINT fk_ser_eq_ref_refaccion FOREIGN KEY (RefaccionID) REFERENCES catalogo_refacciones(RefaccionID),
    CONSTRAINT fk_ser_eq_ref_refaccion_nueva FOREIGN KEY (RefaccionNuevaID) REFERENCES catalogo_refacciones(RefaccionID),

    -- Índices
    INDEX idx_ser_eq_ref_servicio_equipo (ServicioEquipoID),
    INDEX idx_ser_eq_ref_refaccion (RefaccionID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 7. CREAR TABLA DE INSUMOS ADICIONALES DEL SERVICIO
-- =============================================

CREATE TABLE servicios_insumos (
    ServicioInsumoID INT AUTO_INCREMENT PRIMARY KEY,
    ServicioID INT NOT NULL,
    RefaccionID INT NOT NULL,

    -- Cantidad consumida
    Cantidad INT NOT NULL DEFAULT 1,

    -- Origen del insumo
    OrigenInventario ENUM('TECNICO', 'BODEGA') DEFAULT 'TECNICO',

    -- Costo al momento del servicio
    CostoUnitario FLOAT DEFAULT 0,
    Subtotal FLOAT DEFAULT 0,

    -- Observaciones
    Observaciones VARCHAR(255) NULL,

    -- Auditoría
    IsActive TINYINT DEFAULT 1,

    -- Foreign Keys
    CONSTRAINT fk_servicios_insumos_servicio FOREIGN KEY (ServicioID) REFERENCES servicios(ServicioID),
    CONSTRAINT fk_servicios_insumos_refaccion FOREIGN KEY (RefaccionID) REFERENCES catalogo_refacciones(RefaccionID),

    -- Índices
    INDEX idx_servicios_insumos_servicio (ServicioID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 8. CREAR TABLA DE HISTORIAL/AUDITORÍA DE SERVICIOS
-- =============================================

CREATE TABLE servicios_historial (
    HistorialID INT AUTO_INCREMENT PRIMARY KEY,
    ServicioID INT NOT NULL,

    TipoAccion ENUM(
        'CREACION',
        'ASIGNACION_TECNICO',
        'CAMBIO_ESTATUS',
        'REAGENDAMIENTO',
        'CANCELACION',
        'AGREGAR_EQUIPO',
        'QUITAR_EQUIPO',
        'AGREGAR_INSUMO',
        'MODIFICACION_REFACCION',
        'FINALIZACION',
        'MODIFICACION'
    ) NOT NULL,

    Descripcion VARCHAR(500) NOT NULL,
    ValorAnterior TEXT NULL,
    ValorNuevo TEXT NULL,

    UsuarioID INT NOT NULL,
    FechaAccion DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Foreign Keys
    CONSTRAINT fk_servicios_historial_servicio FOREIGN KEY (ServicioID) REFERENCES servicios(ServicioID),

    -- Índices
    INDEX idx_servicios_historial_servicio (ServicioID),
    INDEX idx_servicios_historial_fecha (FechaAccion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 9. CREAR TABLA DE NOTIFICACIONES/RECORDATORIOS
-- =============================================

CREATE TABLE servicios_notificaciones (
    NotificacionID INT AUTO_INCREMENT PRIMARY KEY,
    ServicioID INT NULL COMMENT 'Servicio relacionado si aplica',
    ContratoID INT NULL COMMENT 'Contrato relacionado si aplica',

    Tipo ENUM(
        'RECORDATORIO_SERVICIO',
        'CONFIRMACION_PENDIENTE',
        'SERVICIO_PROXIMO',
        'MANTENIMIENTO_PROGRAMADO',
        'CONTRATO_POR_VENCER'
    ) NOT NULL,

    Titulo VARCHAR(255) NOT NULL,
    Mensaje TEXT NULL,

    FechaNotificacion DATE NOT NULL COMMENT 'Fecha en que debe mostrarse/enviarse',
    FechaVisto DATETIME NULL,

    -- A quién va dirigida
    UsuarioDestinoID INT NULL,
    TecnicoDestinoID INT NULL,

    -- Estado
    Estatus ENUM('PENDIENTE', 'VISTA', 'DESCARTADA') DEFAULT 'PENDIENTE',

    -- Auditoría
    IsActive TINYINT DEFAULT 1,
    FechaCreacion DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Foreign Keys
    CONSTRAINT fk_notif_servicio FOREIGN KEY (ServicioID) REFERENCES servicios(ServicioID),
    CONSTRAINT fk_notif_contrato FOREIGN KEY (ContratoID) REFERENCES contratos(ContratoID),
    CONSTRAINT fk_notif_tecnico FOREIGN KEY (TecnicoDestinoID) REFERENCES catalogo_tecnicos(TecnicoID),

    -- Índices
    INDEX idx_notif_fecha (FechaNotificacion),
    INDEX idx_notif_estatus (Estatus),
    INDEX idx_notif_usuario (UsuarioDestinoID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 10. CREAR TABLA DE FIRMAS DIGITALES (FUTURO)
-- =============================================

CREATE TABLE servicios_firmas (
    FirmaID INT AUTO_INCREMENT PRIMARY KEY,
    ServicioID INT NOT NULL,

    TipoFirma ENUM('CLIENTE', 'TECNICO') NOT NULL,
    NombreFirmante VARCHAR(255) NOT NULL,

    -- Firma como base64 o ruta a archivo
    FirmaData MEDIUMTEXT NULL COMMENT 'Firma en base64',
    FirmaArchivo VARCHAR(255) NULL COMMENT 'Ruta al archivo de firma si se guarda como imagen',

    FechaFirma DATETIME DEFAULT CURRENT_TIMESTAMP,
    IpAddress VARCHAR(45) NULL,

    -- Auditoría
    IsActive TINYINT DEFAULT 1,

    -- Foreign Keys
    CONSTRAINT fk_firmas_servicio FOREIGN KEY (ServicioID) REFERENCES servicios(ServicioID),

    -- Índices
    INDEX idx_firmas_servicio (ServicioID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 11. VISTA ÚTIL: AGENDA DE SERVICIOS
-- =============================================

CREATE OR REPLACE VIEW vw_agenda_servicios AS
SELECT
    s.ServicioID,
    s.TipoServicio,
    s.FechaProgramada,
    s.HoraProgramada,
    s.Estatus,
    c.ContratoID,
    c.NumeroContrato,
    cl.ClienteID,
    cl.NombreComercio AS NombreCliente,
    suc.SucursalID,
    suc.NombreSucursal,
    suc.Direccion,
    t.TecnicoID,
    u.NombreCompleto AS NombreTecnico,
    t.Telefono AS TelefonoTecnico,
    (SELECT COUNT(*) FROM servicios_equipos se WHERE se.ServicioID = s.ServicioID AND se.IsActive = 1) AS TotalEquipos,
    s.ObservacionesGenerales
FROM servicios s
INNER JOIN contratos c ON s.ContratoID = c.ContratoID
INNER JOIN catalogo_clientes cl ON c.ClienteID = cl.ClienteID
LEFT JOIN clientes_sucursales suc ON c.SucursalID = suc.SucursalID
LEFT JOIN catalogo_tecnicos t ON s.TecnicoID = t.TecnicoID
LEFT JOIN usuarios u ON t.UsuarioID = u.UsuarioID
WHERE s.IsActive = 1
ORDER BY s.FechaProgramada, s.HoraProgramada;

-- =============================================
-- 12. VISTA ÚTIL: SERVICIOS PENDIENTES POR TÉCNICO
-- =============================================

CREATE OR REPLACE VIEW vw_servicios_tecnico AS
SELECT
    t.TecnicoID,
    u.NombreCompleto AS NombreTecnico,
    s.ServicioID,
    s.TipoServicio,
    s.FechaProgramada,
    s.HoraProgramada,
    s.Estatus,
    cl.NombreComercio AS NombreCliente,
    suc.Direccion,
    c.NumeroContrato
FROM servicios s
INNER JOIN catalogo_tecnicos t ON s.TecnicoID = t.TecnicoID
INNER JOIN usuarios u ON t.UsuarioID = u.UsuarioID
INNER JOIN contratos c ON s.ContratoID = c.ContratoID
INNER JOIN catalogo_clientes cl ON c.ClienteID = cl.ClienteID
LEFT JOIN clientes_sucursales suc ON c.SucursalID = suc.SucursalID
WHERE s.IsActive = 1
AND s.Estatus IN ('CONFIRMADO', 'EN_PROCESO')
ORDER BY t.TecnicoID, s.FechaProgramada, s.HoraProgramada;

-- =============================================
-- 13. MIGRACIÓN: servicios_equipos usa clientes_equipos
-- Fecha: 2025-12-23
-- Descripción: Cambiar servicios_equipos de usar ContratoEquipoID a ClienteEquipoID
-- =============================================

-- 13.1 Agregar nueva columna ClienteEquipoID a servicios_equipos
ALTER TABLE servicios_equipos
ADD COLUMN ClienteEquipoID INT NULL AFTER ServicioID;

-- 13.2 Crear índice para la nueva columna
CREATE INDEX idx_servicios_equipos_cliente_equipo ON servicios_equipos(ClienteEquipoID);

-- 13.3 Agregar FK a clientes_equipos
ALTER TABLE servicios_equipos
ADD CONSTRAINT fk_servicios_equipos_cliente_equipo
FOREIGN KEY (ClienteEquipoID) REFERENCES clientes_equipos(ClienteEquipoID);

-- 13.4 Agregar nuevos campos a clientes_equipos si no existen
ALTER TABLE clientes_equipos
ADD COLUMN Modalidad ENUM('RENTA', 'VENTA', 'SERVICIO') NULL AFTER TipoPropiedad,
ADD COLUMN TipoItem VARCHAR(50) NULL AFTER Modalidad,
ADD COLUMN PrecioUnitario FLOAT NULL AFTER TipoItem,
ADD COLUMN PeriodoMeses INT NULL AFTER PrecioUnitario,
ADD COLUMN FechaInstalacion DATE NULL AFTER FechaAsignacion;

-- 13.5 Agregar nuevos valores al enum EstatusClienteEquipo
-- NOTA: En MySQL, para modificar un ENUM hay que redefinirlo completo
ALTER TABLE clientes_equipos
MODIFY COLUMN Estatus ENUM('ACTIVO', 'PENDIENTE_INSTALACION', 'INSTALADO', 'RETIRADO', 'DEVUELTO', 'VENDIDO') DEFAULT 'ACTIVO';

-- 13.6 Agregar campo ClienteEquipoID a la tabla servicios (para servicios directos)
ALTER TABLE servicios
ADD COLUMN ClienteEquipoID INT NULL AFTER ContratoID;

ALTER TABLE servicios
ADD CONSTRAINT fk_servicios_cliente_equipo
FOREIGN KEY (ClienteEquipoID) REFERENCES clientes_equipos(ClienteEquipoID);

CREATE INDEX idx_servicios_cliente_equipo ON servicios(ClienteEquipoID);

-- =============================================
-- NOTAS DE MIGRACIÓN:
-- =============================================
--
-- 1. La columna ContratoEquipoID en servicios_equipos se mantiene por compatibilidad
--    pero ya no se usará en el código nuevo.
--
-- 2. Los servicios ahora trabajan con clientes_equipos como fuente única de verdad.
--
-- 3. Flujo de estados para equipos en renta:
--    - PENDIENTE_INSTALACION: Equipo asignado al cliente pero no instalado
--    - INSTALADO: Equipo físicamente instalado y funcionando
--    - RETIRADO: Equipo desinstalado del cliente
--
-- 4. Para migrar datos existentes de contratos_equipos a clientes_equipos,
--    ejecutar un script de migración de datos por separado.
-- =============================================

-- =============================================
-- FIN DEL SCRIPT
-- =============================================
