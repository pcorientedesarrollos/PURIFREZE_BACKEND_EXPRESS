import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
    console.log('🚀 Iniciando migración de gastos...\n');

    // ─────────────────────────────────────────────
    // 1. sat_cuentas_gastos
    // ─────────────────────────────────────────────
    console.log('1/5  Creando tabla sat_cuentas_gastos...');
    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS sat_cuentas_gastos (
            SATCuentaID  INT AUTO_INCREMENT PRIMARY KEY,
            Clave        VARCHAR(20)  NOT NULL,
            Descripcion  VARCHAR(255) NOT NULL,
            Nivel        TINYINT      NOT NULL,
            ParentID     INT          NULL,
            IsActive     BOOLEAN      NOT NULL DEFAULT TRUE,
            INDEX idx_sat_clave (Clave),
            CONSTRAINT fk_sat_parent FOREIGN KEY (ParentID)
                REFERENCES sat_cuentas_gastos(SATCuentaID)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    const [{ cnt }] = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*) AS cnt FROM sat_cuentas_gastos`
    );
    if (Number(cnt) === 0) {
        console.log('     Insertando catálogo SAT Anexo 24...');

        // Nivel 1
        await prisma.$executeRawUnsafe(`
            INSERT INTO sat_cuentas_gastos (Clave, Descripcion, Nivel, ParentID) VALUES
              ('601', 'Gastos de Venta',          1, NULL),
              ('602', 'Gastos de Administración', 1, NULL),
              ('603', 'Gastos Financieros',        1, NULL),
              ('604', 'Otros Gastos',              1, NULL)
        `);

        // Nivel 2 bajo 601
        await prisma.$executeRawUnsafe(`
            INSERT INTO sat_cuentas_gastos (Clave, Descripcion, Nivel, ParentID)
            SELECT sub.Clave, sub.Descripcion, 2, s.SATCuentaID
            FROM sat_cuentas_gastos s
            JOIN (
                SELECT '60101' AS Clave, 'Sueldos y Salarios (Venta)'       AS Descripcion UNION ALL
                SELECT '60102',          'Comisiones a Vendedores'                          UNION ALL
                SELECT '60103',          'Publicidad y Propaganda'                          UNION ALL
                SELECT '60104',          'Transporte y Distribución'                        UNION ALL
                SELECT '60105',          'Gastos de Representación (Venta)'                 UNION ALL
                SELECT '60106',          'Arrendamiento (Venta)'
            ) sub
            WHERE s.Clave = '601'
        `);

        // Nivel 2 bajo 602
        await prisma.$executeRawUnsafe(`
            INSERT INTO sat_cuentas_gastos (Clave, Descripcion, Nivel, ParentID)
            SELECT sub.Clave, sub.Descripcion, 2, s.SATCuentaID
            FROM sat_cuentas_gastos s
            JOIN (
                SELECT '60201' AS Clave, 'Sueldos y Salarios (Administración)' AS Descripcion UNION ALL
                SELECT '60202',          'Honorarios'                                          UNION ALL
                SELECT '60203',          'Arrendamiento (Administración)'                      UNION ALL
                SELECT '60204',          'Energía Eléctrica'                                   UNION ALL
                SELECT '60205',          'Teléfonos y Comunicaciones'                          UNION ALL
                SELECT '60206',          'Papelería y Útiles de Escritorio'                    UNION ALL
                SELECT '60207',          'Reparaciones y Mantenimiento'                        UNION ALL
                SELECT '60208',          'Seguros y Fianzas'                                   UNION ALL
                SELECT '60209',          'Combustibles y Lubricantes'                          UNION ALL
                SELECT '60210',          'Gastos de Viaje y Representación'                    UNION ALL
                SELECT '60211',          'Depreciaciones y Amortizaciones'                     UNION ALL
                SELECT '60212',          'Servicios Externos (TI, Contabilidad)'               UNION ALL
                SELECT '60213',          'Gastos Diversos'
            ) sub
            WHERE s.Clave = '602'
        `);

        // Nivel 2 bajo 603
        await prisma.$executeRawUnsafe(`
            INSERT INTO sat_cuentas_gastos (Clave, Descripcion, Nivel, ParentID)
            SELECT sub.Clave, sub.Descripcion, 2, s.SATCuentaID
            FROM sat_cuentas_gastos s
            JOIN (
                SELECT '60301' AS Clave, 'Intereses Pagados'            AS Descripcion UNION ALL
                SELECT '60302',          'Comisiones Bancarias'                         UNION ALL
                SELECT '60303',          'Pérdida en Cambio de Divisas'
            ) sub
            WHERE s.Clave = '603'
        `);

        // Nivel 2 bajo 604
        await prisma.$executeRawUnsafe(`
            INSERT INTO sat_cuentas_gastos (Clave, Descripcion, Nivel, ParentID)
            SELECT sub.Clave, sub.Descripcion, 2, s.SATCuentaID
            FROM sat_cuentas_gastos s
            JOIN (
                SELECT '60401' AS Clave, 'Donativos'                   AS Descripcion UNION ALL
                SELECT '60402',          'Multas y Recargos'                           UNION ALL
                SELECT '60403',          'Otros Gastos No Deducibles'
            ) sub
            WHERE s.Clave = '604'
        `);

        const [{ total }] = await prisma.$queryRawUnsafe(`SELECT COUNT(*) AS total FROM sat_cuentas_gastos`);
        console.log(`     ✅ ${total} registros SAT insertados`);
    } else {
        console.log(`     ⏭  Tabla ya tenía datos (${cnt} registros), se omite inserción`);
    }

    // ─────────────────────────────────────────────
    // 2. catalogo_gastos
    // ─────────────────────────────────────────────
    console.log('2/5  Creando tabla catalogo_gastos...');
    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS catalogo_gastos (
            CatalogoGastoID INT          AUTO_INCREMENT PRIMARY KEY,
            ParentID        INT          NULL,
            Nivel           TINYINT      NOT NULL,
            Nombre          VARCHAR(150) NOT NULL,
            Descripcion     VARCHAR(255) NULL,
            Periodicidad    VARCHAR(20)  NULL,
            EsOpcional      BOOLEAN      NOT NULL DEFAULT FALSE,
            SATCuentaID     INT          NULL,
            IsActive        BOOLEAN      NOT NULL DEFAULT TRUE,
            FechaCreacion   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_catalogo_parent FOREIGN KEY (ParentID)
                REFERENCES catalogo_gastos(CatalogoGastoID),
            CONSTRAINT fk_catalogo_sat    FOREIGN KEY (SATCuentaID)
                REFERENCES sat_cuentas_gastos(SATCuentaID)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('     ✅ catalogo_gastos lista');

    // ─────────────────────────────────────────────
    // 3. gastos_encabezado — quitar CategoriaGastoID y Monto
    // ─────────────────────────────────────────────
    console.log('3/5  Modificando gastos_encabezado...');

    // ¿Existe columna CategoriaGastoID?
    const [catCol] = await prisma.$queryRawUnsafe(`
        SELECT COLUMN_NAME FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME   = 'gastos_encabezado'
          AND COLUMN_NAME  = 'CategoriaGastoID'
    `);

    if (catCol) {
        // Buscar FK que apunta a gastos_categorias
        const fks = await prisma.$queryRawUnsafe(`
            SELECT CONSTRAINT_NAME
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME   = 'gastos_encabezado'
              AND COLUMN_NAME  = 'CategoriaGastoID'
              AND REFERENCED_TABLE_NAME IS NOT NULL
        `);
        for (const fk of fks) {
            console.log(`     Eliminando FK ${fk.CONSTRAINT_NAME}...`);
            await prisma.$executeRawUnsafe(
                `ALTER TABLE gastos_encabezado DROP FOREIGN KEY \`${fk.CONSTRAINT_NAME}\``
            );
        }
        await prisma.$executeRawUnsafe(`ALTER TABLE gastos_encabezado DROP COLUMN CategoriaGastoID`);
        console.log('     ✅ CategoriaGastoID eliminado');
    } else {
        console.log('     ⏭  CategoriaGastoID ya no existe');
    }

    const [montoCol] = await prisma.$queryRawUnsafe(`
        SELECT COLUMN_NAME FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME   = 'gastos_encabezado'
          AND COLUMN_NAME  = 'Monto'
    `);
    if (montoCol) {
        await prisma.$executeRawUnsafe(`ALTER TABLE gastos_encabezado DROP COLUMN Monto`);
        console.log('     ✅ Monto eliminado');
    } else {
        console.log('     ⏭  Monto ya no existe');
    }

    // ─────────────────────────────────────────────
    // 4. gastos_detalle — agregar CatalogoGastoID
    // ─────────────────────────────────────────────
    console.log('4/5  Modificando gastos_detalle...');

    const [detCol] = await prisma.$queryRawUnsafe(`
        SELECT COLUMN_NAME FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME   = 'gastos_detalle'
          AND COLUMN_NAME  = 'CatalogoGastoID'
    `);
    if (!detCol) {
        await prisma.$executeRawUnsafe(`
            ALTER TABLE gastos_detalle
              ADD COLUMN CatalogoGastoID INT NULL AFTER GastoID,
              ADD CONSTRAINT fk_detalle_catalogo
                FOREIGN KEY (CatalogoGastoID) REFERENCES catalogo_gastos(CatalogoGastoID)
        `);
        console.log('     ✅ CatalogoGastoID agregado a gastos_detalle');
    } else {
        console.log('     ⏭  CatalogoGastoID ya existe');
    }

    // ─────────────────────────────────────────────
    // 5. Verificación final
    // ─────────────────────────────────────────────
    console.log('5/5  Verificando estructura...');

    const tablas = await prisma.$queryRawUnsafe(`
        SELECT TABLE_NAME FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME IN ('sat_cuentas_gastos','catalogo_gastos','gastos_encabezado','gastos_detalle')
        ORDER BY TABLE_NAME
    `);
    for (const t of tablas) {
        const cols = await prisma.$queryRawUnsafe(`
            SELECT COLUMN_NAME FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${t.TABLE_NAME}'
            ORDER BY ORDINAL_POSITION
        `);
        console.log(`     ${t.TABLE_NAME}: ${cols.map(c => c.COLUMN_NAME).join(', ')}`);
    }

    console.log('\n✅ Migración completada correctamente');
}

run()
    .catch(e => { console.error('\n❌ Error:', e.message); process.exit(1); })
    .finally(() => prisma.$disconnect());
