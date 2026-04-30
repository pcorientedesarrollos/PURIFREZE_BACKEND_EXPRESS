import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
    console.log('🚀 Insertando módulo Gastos en BD...\n');

    // 1. Módulo Gastos
    await prisma.$executeRawUnsafe(`
        INSERT INTO modulos (NombreModulo)
        SELECT 'Gastos'
        WHERE NOT EXISTS (SELECT 1 FROM modulos WHERE NombreModulo = 'Gastos')
    `);

    const [modulo] = await prisma.$queryRawUnsafe(
        `SELECT ModuloID FROM modulos WHERE NombreModulo = 'Gastos'`
    );
    const moduloID = modulo.ModuloID;
    console.log(`✅ Módulo "Gastos" → ModuloID: ${moduloID}`);

    // 2. Submódulo: Lista de Gastos
    await prisma.$executeRawUnsafe(`
        INSERT INTO submodulos (ModuloID, NombreSubmodulo, Ruta)
        SELECT ${moduloID}, 'Lista de Gastos', 'home/gastos'
        WHERE NOT EXISTS (SELECT 1 FROM submodulos WHERE Ruta = 'home/gastos')
    `);

    const [sub1] = await prisma.$queryRawUnsafe(
        `SELECT SubmoduloID, NombreSubmodulo, Ruta FROM submodulos WHERE Ruta = 'home/gastos'`
    );
    console.log(`✅ Submódulo "${sub1.NombreSubmodulo}" → SubmoduloID: ${sub1.SubmoduloID} | Ruta: ${sub1.Ruta}`);

    // 3. Submódulo: Catálogo de Gastos
    await prisma.$executeRawUnsafe(`
        INSERT INTO submodulos (ModuloID, NombreSubmodulo, Ruta)
        SELECT ${moduloID}, 'Catálogo de Gastos', 'home/gastos/catalogo'
        WHERE NOT EXISTS (SELECT 1 FROM submodulos WHERE Ruta = 'home/gastos/catalogo')
    `);

    const [sub2] = await prisma.$queryRawUnsafe(
        `SELECT SubmoduloID, NombreSubmodulo, Ruta FROM submodulos WHERE Ruta = 'home/gastos/catalogo'`
    );
    console.log(`✅ Submódulo "${sub2.NombreSubmodulo}" → SubmoduloID: ${sub2.SubmoduloID} | Ruta: ${sub2.Ruta}`);

    // 4. Verificación final
    console.log('\n📋 Estado final en BD:');
    const rows = await prisma.$queryRawUnsafe(`
        SELECT m.ModuloID, m.NombreModulo, s.SubmoduloID, s.NombreSubmodulo, s.Ruta
        FROM modulos m
        JOIN submodulos s ON m.ModuloID = s.ModuloID
        WHERE m.NombreModulo = 'Gastos'
        ORDER BY s.SubmoduloID
    `);
    console.table(rows);
}

run()
    .catch(e => { console.error('❌ Error:', e.message); process.exit(1); })
    .finally(() => prisma.$disconnect());
