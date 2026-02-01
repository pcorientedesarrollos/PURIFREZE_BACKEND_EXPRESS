-- ============================================================
-- MIGRACIÓN: Tareas Backend 2026-01-30
-- ============================================================
-- Ejecutar en orden. Cada sección es independiente.

-- ============================================================
-- 1. CLIENTES: Aumentar caracteres NombreComercio y Observaciones a 500
-- ============================================================
ALTER TABLE catalogo_clientes MODIFY COLUMN NombreComercio VARCHAR(500) NULL;
ALTER TABLE catalogo_clientes MODIFY COLUMN Observaciones VARCHAR(500) NULL;

-- ============================================================
-- 2. CLASIFICACIONES: Quitar UNIQUE de Codigo
-- ============================================================
-- Primero verificar el nombre del índice unique:
-- SHOW INDEX FROM catalogo_clasificacion_refacciones WHERE Column_name = 'Codigo';
ALTER TABLE catalogo_clasificacion_refacciones DROP INDEX catalogo_clasificacion_refacciones_Codigo_key;

-- ============================================================
-- 3. PROVEEDORES: Crear tabla de contactos
-- ============================================================
CREATE TABLE proveedores_contactos (
  ContactoID INT NOT NULL AUTO_INCREMENT,
  ProveedorID INT NOT NULL,
  NombreContacto VARCHAR(255) NOT NULL,
  Celular VARCHAR(50) NULL,
  Correo VARCHAR(255) NULL,
  Observaciones VARCHAR(500) NULL,
  IsActive TINYINT(1) NULL DEFAULT 1,
  PRIMARY KEY (ContactoID),
  INDEX idx_proveedores_contactos_ProveedorID (ProveedorID),
  CONSTRAINT fk_proveedores_contactos_proveedor
    FOREIGN KEY (ProveedorID)
    REFERENCES catalogo_proveedores (ProveedorID)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. COMPRAS: Agregar estatus 'Pagado' al enum
-- ============================================================
ALTER TABLE compras_encabezado MODIFY COLUMN Estatus ENUM('Pendiente', 'Pagado', 'Finalizado') NULL;
