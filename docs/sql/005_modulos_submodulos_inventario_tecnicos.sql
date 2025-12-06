-- =============================================
-- SQL: Módulos y Submódulos para Inventario de Técnicos
-- Fecha: 2024-12-02
-- Descripción: Inserta los módulos y submódulos necesarios para el frontend
-- =============================================

-- IMPORTANTE: Verificar el último ModuloID antes de ejecutar
-- SELECT MAX(ModuloID) FROM modulos;
-- Ajustar los IDs según sea necesario

-- =============================================
-- 1. MÓDULO: Técnicos (Catálogo)
-- =============================================
-- Si ya existe un módulo de Catálogos, agregar el submódulo ahí
-- Si no, crear módulo independiente

INSERT INTO `modulos` (`NombreModulo`) VALUES ('Técnicos');
SET @ModuloTecnicosID = LAST_INSERT_ID();

INSERT INTO `submodulos` (`NombreSubmodulo`, `ModuloID`, `Ruta`) VALUES
('Catálogo de Técnicos', @ModuloTecnicosID, 'home/tecnicos');

-- =============================================
-- 2. MÓDULO: Inventario de Técnicos
-- =============================================
INSERT INTO `modulos` (`NombreModulo`) VALUES ('Inventario de Técnicos');
SET @ModuloInventarioTecnicoID = LAST_INSERT_ID();

INSERT INTO `submodulos` (`NombreSubmodulo`, `ModuloID`, `Ruta`) VALUES
('Stock por Técnico', @ModuloInventarioTecnicoID, 'home/inventario-tecnico');

-- =============================================
-- 3. MÓDULO: Traspasos
-- =============================================
INSERT INTO `modulos` (`NombreModulo`) VALUES ('Traspasos');
SET @ModuloTraspasosID = LAST_INSERT_ID();

INSERT INTO `submodulos` (`NombreSubmodulo`, `ModuloID`, `Ruta`) VALUES
('Gestión de Traspasos', @ModuloTraspasosID, 'home/traspasos');

-- =============================================
-- 4. MÓDULO: Refacciones Dañadas
-- =============================================
INSERT INTO `modulos` (`NombreModulo`) VALUES ('Refacciones Dañadas');
SET @ModuloRefaccionesDanadasID = LAST_INSERT_ID();

INSERT INTO `submodulos` (`NombreSubmodulo`, `ModuloID`, `Ruta`) VALUES
('Registro de Dañadas', @ModuloRefaccionesDanadasID, 'home/refacciones-danadas');

-- =============================================
-- 5. MÓDULO: Ajustes de Inventario
-- =============================================
INSERT INTO `modulos` (`NombreModulo`) VALUES ('Ajustes de Inventario');
SET @ModuloAjustesID = LAST_INSERT_ID();

INSERT INTO `submodulos` (`NombreSubmodulo`, `ModuloID`, `Ruta`) VALUES
('Ajustes de Stock', @ModuloAjustesID, 'home/ajustes-inventario');

-- =============================================
-- VERIFICACIÓN
-- =============================================
-- SELECT m.ModuloID, m.NombreModulo, s.SubmoduloID, s.NombreSubmodulo, s.Ruta
-- FROM modulos m
-- INNER JOIN submodulos s ON m.ModuloID = s.ModuloID
-- WHERE m.NombreModulo IN ('Técnicos', 'Inventario de Técnicos', 'Traspasos', 'Refacciones Dañadas', 'Ajustes de Inventario')
-- ORDER BY m.ModuloID;

-- =============================================
-- NOTA: Después de insertar, asignar permisos a los usuarios
-- =============================================
-- INSERT INTO permisos (UsuarioID, SubmoduloID) VALUES (?, ?);

