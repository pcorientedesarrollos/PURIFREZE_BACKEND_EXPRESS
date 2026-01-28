/**
 * Script de migración de refacciones desde CSV
 * Ejecutar con: npx ts-node scripts/migrar-refacciones.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Mapeo de unidades del CSV a UnidadID
const unidadMap: Record<string, number | null> = {
  'pieza': 1,
  '1': 1,
  'metro': 3,
  '3': 3,
  'servicio': 10,
  '10': 10,
  '2': 2,  // KILOGRAMO
  '7': 7,  // GRAMO
  '9': 9,  // MILILITRO
  '': null,
  '""': null,
};

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result;
}

function cleanString(str: string): string | null {
  if (!str || str === '""' || str === '') return null;
  // Remover comillas al inicio y final
  let cleaned = str.replace(/^"|"$/g, '');
  // Limpiar saltos de línea y espacios extras
  cleaned = cleaned.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
  // Limitar a 255 caracteres
  if (cleaned.length > 255) {
    cleaned = cleaned.substring(0, 252) + '...';
  }
  return cleaned || null;
}

function getUnidadID(unidad: string): number | null {
  const cleaned = unidad.toLowerCase().replace(/"/g, '').trim();
  return unidadMap[cleaned] ?? 1; // Default a PIEZA si no se reconoce
}

function getClasificacionID(id: string): number | null {
  const num = parseInt(id, 10);
  if (isNaN(num) || num === 0) return null;
  return num;
}

function getIsActive(estado: string): boolean {
  return estado !== '1'; // estado=0 es activo, estado=1 es inactivo
}

async function main() {
  const csvPath = path.join(__dirname, '../docs/refacciones_202601261801.csv');
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n');

  console.log('='.repeat(60));
  console.log('MIGRACIÓN DE REFACCIONES');
  console.log('='.repeat(60));
  console.log(`Total de líneas en CSV: ${lines.length}`);

  // Saltar header
  const dataLines = lines.slice(1).filter(line => line.trim());

  let inserted = 0;
  let errors = 0;
  let skipped = 0;

  // Procesar en lotes de 50 para mejor rendimiento
  const batchSize = 50;

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i];

    try {
      // Manejar líneas multilínea (unir con la siguiente si está incompleta)
      let fullLine = line;
      const fields = parseCSVLine(fullLine);

      // Si no tiene suficientes campos, puede ser multilínea
      if (fields.length < 17) {
        // Buscar más líneas para completar
        let j = i + 1;
        while (j < dataLines.length && parseCSVLine(fullLine).length < 17) {
          fullLine += ' ' + dataLines[j];
          j++;
        }
        i = j - 1; // Actualizar índice
      }

      const [
        idRefaccion,
        idClasificacion,
        pieza,
        modelo,
        unidad,
        costo,
        _ultimo_costo,
        _inventario_inicial,
        _inventario_actual,
        _equipo_armado,
        _inventario_fisico,
        _faltante,
        _rutaImagen,
        notas,
        estado,
        codigo,
        nombreCorto
      ] = parseCSVLine(fullLine);

      const refaccionID = parseInt(idRefaccion, 10);
      if (isNaN(refaccionID)) {
        skipped++;
        continue;
      }

      // Verificar si ya existe
      const exists = await prisma.catalogo_refacciones.findUnique({
        where: { RefaccionID: refaccionID }
      });

      if (exists) {
        console.log(`⚠️  RefaccionID ${refaccionID} ya existe, saltando...`);
        skipped++;
        continue;
      }

      const data = {
        RefaccionID: refaccionID,
        ClasificacionID: getClasificacionID(idClasificacion),
        UnidadID: getUnidadID(unidad),
        NombrePieza: cleanString(pieza),
        NombreCorto: cleanString(nombreCorto),
        Modelo: cleanString(modelo),
        Codigo: cleanString(codigo),
        Observaciones: cleanString(notas),
        IsActive: getIsActive(estado),
        CostoPromedio: costo ? parseFloat(costo) || null : null,
        PrecioVenta: null,
        PorcentajeUtilidad: null,
      };

      await prisma.catalogo_refacciones.create({ data });
      inserted++;

      if (inserted % 50 === 0) {
        console.log(`✅ Insertados: ${inserted} registros...`);
      }

    } catch (error: any) {
      errors++;
      console.error(`❌ Error en línea ${i + 2}: ${error.message}`);
      if (errors > 10) {
        console.log('Demasiados errores, verificar formato del CSV');
        break;
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('RESUMEN DE MIGRACIÓN');
  console.log('='.repeat(60));
  console.log(`✅ Insertados: ${inserted}`);
  console.log(`⚠️  Saltados: ${skipped}`);
  console.log(`❌ Errores: ${errors}`);
  console.log('='.repeat(60));
}

main()
  .catch((e) => {
    console.error('Error fatal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
