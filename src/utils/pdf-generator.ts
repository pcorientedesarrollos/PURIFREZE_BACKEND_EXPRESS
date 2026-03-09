import * as fs from 'fs';
import * as path from 'path';

// Directorio para PDFs temporales
const TEMP_PDF_DIR = path.join(process.cwd(), 'public', 'temp');

// Asegurar que el directorio existe
export function ensureTempDir(): void {
  if (!fs.existsSync(TEMP_PDF_DIR)) {
    fs.mkdirSync(TEMP_PDF_DIR, { recursive: true });
  }
}

// Obtener ruta para un PDF
export function getPdfPath(filename: string): string {
  ensureTempDir();
  return path.join(TEMP_PDF_DIR, filename);
}

// Obtener URL pública del PDF
export function getPdfUrl(filename: string, baseUrl: string): string {
  return `${baseUrl}/temp/${filename}`;
}

// Limpiar PDFs antiguos (más de 24 horas)
export function cleanOldPdfs(): void {
  ensureTempDir();
  const files = fs.readdirSync(TEMP_PDF_DIR);
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 horas

  for (const file of files) {
    if (file.endsWith('.pdf')) {
      const filePath = path.join(TEMP_PDF_DIR, file);
      const stats = fs.statSync(filePath);
      if (now - stats.mtimeMs > maxAge) {
        fs.unlinkSync(filePath);
      }
    }
  }
}

// Interfaz para los datos de la cotización
export interface CotizacionPdfData {
  Folio: string;
  FechaCotizacion: string;
  Observaciones: string | null;
  Detalles: Array<{
    Codigo: string;
    NombrePieza: string;
    Cantidad: number;
    Observaciones: string;
  }>;
}

/**
 * Genera un PDF simple de cotización usando solo fs y streams
 * Nota: Esta es una implementación básica. Para PDFs más elaborados,
 * considerar usar pdfkit o similar.
 */
export async function generateCotizacionPdf(data: CotizacionPdfData): Promise<string> {
  const filename = `cotizacion-${data.Folio.replace(/\//g, '-')}.pdf`;
  const filePath = getPdfPath(filename);

  // Crear contenido del PDF manualmente (formato PDF básico)
  const content = createPdfContent(data);

  fs.writeFileSync(filePath, content);

  return filename;
}

/**
 * Crea el contenido del PDF en formato PDF 1.4
 */
function createPdfContent(data: CotizacionPdfData): Buffer {
  // Construir el texto del documento
  let text = `COTIZACION DE COMPRA\n`;
  text += `==========================================\n\n`;
  text += `Folio: ${data.Folio}\n`;
  text += `Fecha: ${data.FechaCotizacion}\n\n`;

  if (data.Observaciones) {
    text += `Observaciones: ${data.Observaciones}\n\n`;
  }

  text += `REFACCIONES SOLICITADAS:\n`;
  text += `------------------------------------------\n`;

  for (let i = 0; i < data.Detalles.length; i++) {
    const det = data.Detalles[i];
    text += `${i + 1}. ${det.NombrePieza}\n`;
    text += `   Codigo: ${det.Codigo || 'N/A'}\n`;
    text += `   Cantidad: ${det.Cantidad}\n`;
    if (det.Observaciones) {
      text += `   Obs: ${det.Observaciones}\n`;
    }
    text += `\n`;
  }

  text += `------------------------------------------\n`;
  text += `Total de refacciones: ${data.Detalles.length}\n\n`;
  text += `Documento generado automaticamente por Sistema Purifreeze\n`;

  // Crear PDF básico (formato PDF 1.4)
  const pdfContent = createBasicPdf(text);

  return Buffer.from(pdfContent);
}

/**
 * Crea un documento PDF básico válido
 */
function createBasicPdf(text: string): string {
  // Escapar caracteres especiales para PDF
  const escapedText = text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/\n/g, ') Tj T* (');

  const stream = `BT
/F1 10 Tf
50 750 Td
12 TL
(${escapedText}) Tj
ET`;

  const streamLength = Buffer.byteLength(stream, 'latin1');

  let pdf = '%PDF-1.4\n';

  // Objeto 1: Catálogo
  const obj1Start = pdf.length;
  pdf += '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';

  // Objeto 2: Páginas
  const obj2Start = pdf.length;
  pdf += '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';

  // Objeto 3: Página
  const obj3Start = pdf.length;
  pdf += '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n';

  // Objeto 4: Contenido
  const obj4Start = pdf.length;
  pdf += `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${stream}\nendstream\nendobj\n`;

  // Objeto 5: Fuente
  const obj5Start = pdf.length;
  pdf += '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n';

  // xref table
  const xrefStart = pdf.length;
  pdf += 'xref\n0 6\n';
  pdf += '0000000000 65535 f \n';
  pdf += `${obj1Start.toString().padStart(10, '0')} 00000 n \n`;
  pdf += `${obj2Start.toString().padStart(10, '0')} 00000 n \n`;
  pdf += `${obj3Start.toString().padStart(10, '0')} 00000 n \n`;
  pdf += `${obj4Start.toString().padStart(10, '0')} 00000 n \n`;
  pdf += `${obj5Start.toString().padStart(10, '0')} 00000 n \n`;

  // Trailer
  pdf += 'trailer\n<< /Size 6 /Root 1 0 R >>\n';
  pdf += 'startxref\n';
  pdf += `${xrefStart}\n`;
  pdf += '%%EOF';

  return pdf;
}
