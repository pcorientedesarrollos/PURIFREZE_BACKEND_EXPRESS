import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
    console.log('🚀 Poblando catalogo_gastos desde sat_cuentas_gastos...\n');

    // Verificar si ya hay datos
    const [{ cnt }] = await prisma.$queryRawUnsafe(`SELECT COUNT(*) AS cnt FROM catalogo_gastos WHERE IsActive = 1`);
    if (Number(cnt) > 0) {
        console.log(`⏭  catalogo_gastos ya tiene ${cnt} registros activos. No se insertan duplicados.`);
        await mostrarResumen();
        return;
    }

    // ─────────────────────────────────────────────
    // 1. Insertar nivel 1 (601, 602, 603, 604)
    // ─────────────────────────────────────────────
    console.log('1/2  Insertando cuentas nivel 1...');
    await prisma.$executeRawUnsafe(`
        INSERT INTO catalogo_gastos (ParentID, Nivel, Nombre, Descripcion, SATCuentaID, EsOpcional, IsActive)
        SELECT
            NULL,
            1,
            CONCAT(s.Clave, ' - ', s.Descripcion),
            s.Descripcion,
            s.SATCuentaID,
            FALSE,
            TRUE
        FROM sat_cuentas_gastos s
        WHERE s.Nivel = 1
        ORDER BY s.Clave
    `);

    const nivel1 = await prisma.$queryRawUnsafe(`
        SELECT c.CatalogoGastoID, s.Clave, s.SATCuentaID
        FROM catalogo_gastos c
        JOIN sat_cuentas_gastos s ON c.SATCuentaID = s.SATCuentaID
        WHERE c.Nivel = 1
        ORDER BY s.Clave
    `);
    console.log(`     ✅ ${nivel1.length} cuentas nivel 1 insertadas`);

    // ─────────────────────────────────────────────
    // 2. Insertar nivel 2 (subcuentas, enlazando al padre ya creado)
    // ─────────────────────────────────────────────
    console.log('2/2  Insertando subcuentas nivel 2...');

    // Construir mapa SATCuentaID(padre_sat) → CatalogoGastoID(padre_catalogo)
    const mapaPadres = new Map(nivel1.map(r => [r.SATCuentaID, r.CatalogoGastoID]));

    // Obtener todas las subcuentas SAT nivel 2
    const satNivel2 = await prisma.$queryRawUnsafe(`
        SELECT s.SATCuentaID, s.Clave, s.Descripcion, s.ParentID
        FROM sat_cuentas_gastos s
        WHERE s.Nivel = 2
        ORDER BY s.Clave
    `);

    let insertadas = 0;
    for (const sub of satNivel2) {
        const parentCatalogoID = mapaPadres.get(sub.ParentID);
        if (!parentCatalogoID) {
            console.warn(`     ⚠ No se encontró padre en catálogo para SAT ${sub.Clave}`);
            continue;
        }
        await prisma.$executeRawUnsafe(`
            INSERT INTO catalogo_gastos (ParentID, Nivel, Nombre, Descripcion, SATCuentaID, EsOpcional, IsActive)
            VALUES (?, 2, ?, ?, ?, FALSE, TRUE)
        `, parentCatalogoID, `${sub.Clave} - ${sub.Descripcion}`, sub.Descripcion, sub.SATCuentaID);
        insertadas++;
    }
    console.log(`     ✅ ${insertadas} subcuentas nivel 2 insertadas`);

    await mostrarResumen();
}

async function mostrarResumen() {
    console.log('\n📋 Catálogo resultante:\n');
    const arbol = await prisma.$queryRawUnsafe(`
        SELECT
            c1.CatalogoGastoID AS ID1,
            c1.Nombre          AS Cuenta,
            c2.CatalogoGastoID AS ID2,
            c2.Nombre          AS Subcuenta
        FROM catalogo_gastos c1
        LEFT JOIN catalogo_gastos c2 ON c2.ParentID = c1.CatalogoGastoID AND c2.IsActive = 1
        WHERE c1.Nivel = 1 AND c1.IsActive = 1
        ORDER BY c1.CatalogoGastoID, c2.CatalogoGastoID
    `);

    let cuentaActual = null;
    for (const row of arbol) {
        if (row.Cuenta !== cuentaActual) {
            console.log(`  ▼ [${row.ID1}] ${row.Cuenta}`);
            cuentaActual = row.Cuenta;
        }
        if (row.ID2) {
            console.log(`      • [${row.ID2}] ${row.Subcuenta}`);
        }
    }

    const [{ total }] = await prisma.$queryRawUnsafe(`SELECT COUNT(*) AS total FROM catalogo_gastos WHERE IsActive = 1`);
    console.log(`\n✅ Total en catalogo_gastos: ${total} registros activos`);
}

run()
    .catch(e => { console.error('❌ Error:', e.message); process.exit(1); })
    .finally(() => prisma.$disconnect());
