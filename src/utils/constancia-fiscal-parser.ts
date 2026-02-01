// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdf = require('pdf-parse');
import { HttpError } from './response';

export interface DatosFiscalesExtraidos {
  RFC: string | null;
  RazonSocial: string | null;
  Regimen: string | null;
  DireccionFiscal: string | null;
  CodigoPostal: string | null;
}

/**
 * Extrae datos fiscales de un PDF de Constancia de Situación Fiscal del SAT.
 * Funciona con PDFs que tienen texto seleccionable (no escaneados).
 */
export async function parsearConstanciaFiscal(buffer: Buffer): Promise<DatosFiscalesExtraidos> {
  let data;
  try {
    data = await pdf(buffer);
  } catch {
    throw new HttpError('No se pudo leer el archivo PDF. Asegúrate de que sea un PDF válido.', 400);
  }

  const texto = data.text;

  if (!texto || texto.trim().length < 50) {
    throw new HttpError('El PDF no contiene texto extraíble. Verifica que no sea una imagen escaneada.', 400);
  }

  const resultado: DatosFiscalesExtraidos = {
    RFC: extraerRFC(texto),
    RazonSocial: extraerRazonSocial(texto),
    Regimen: extraerRegimen(texto),
    DireccionFiscal: extraerDireccionFiscal(texto),
    CodigoPostal: extraerCodigoPostal(texto),
  };

  // Verificar que al menos se extrajo el RFC
  if (!resultado.RFC) {
    throw new HttpError('No se pudo extraer el RFC del documento. Verifica que sea una Constancia de Situación Fiscal del SAT.', 400);
  }

  return resultado;
}

function extraerRFC(texto: string): string | null {
  // Buscar patrón de RFC mexicano (13 caracteres para persona moral, 12 para física)
  // Patrón: 3-4 letras + 6 dígitos (fecha) + 3 caracteres alfanuméricos (homoclave)
  const rfcRegex = /RFC:\s*([A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3})/i;
  const match = texto.match(rfcRegex);
  if (match) return match[1].toUpperCase();

  // Alternativa: buscar cerca de "Registro Federal de Contribuyentes"
  const rfcAltRegex = /(?:Registro Federal|R\.?F\.?C\.?)[^A-Z]*([A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3})/i;
  const matchAlt = texto.match(rfcAltRegex);
  if (matchAlt) return matchAlt[1].toUpperCase();

  // Buscar RFC suelto (patrón estándar mexicano)
  const rfcSuelto = /\b([A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3})\b/;
  const matchSuelto = texto.match(rfcSuelto);
  if (matchSuelto) return matchSuelto[1].toUpperCase();

  return null;
}

function extraerRazonSocial(texto: string): string | null {
  // Buscar después de "Nombre, Denominación o Razón Social:" o "Nombre (s):"
  const razonRegex = /(?:Denominación[/\\s]*Razón Social|Razón Social|Nombre.*Denominación)[:\s]*([^\n]+)/i;
  const match = texto.match(razonRegex);
  if (match) return limpiarTexto(match[1]);

  // Buscar "Nombre (s):" para personas físicas
  const nombreRegex = /Nombre\s*\(s\)[:\s]*([^\n]+)/i;
  const matchNombre = texto.match(nombreRegex);
  if (matchNombre) return limpiarTexto(matchNombre[1]);

  return null;
}

function extraerRegimen(texto: string): string | null {
  // Buscar "Régimen" seguido del nombre del régimen
  const regimenRegex = /[Rr][ée]gimen[:\s]*([^\n]+)/i;
  const match = texto.match(regimenRegex);
  if (match) {
    const regimen = limpiarTexto(match[1]);
    // Filtrar si solo tiene "Fecha" o texto no relevante
    if (regimen && regimen.length > 5 && !regimen.toLowerCase().startsWith('fecha')) {
      return regimen;
    }
  }

  // Buscar línea que contiene "Régimen" como parte del texto
  const lineas = texto.split('\n');
  for (let i = 0; i < lineas.length; i++) {
    if (/r[ée]gimen/i.test(lineas[i])) {
      // El régimen puede estar en la siguiente línea
      const textoRegimen = lineas[i].replace(/.*[Rr][ée]gimen[:\s]*/i, '').trim();
      if (textoRegimen.length > 10) return limpiarTexto(textoRegimen);
      if (i + 1 < lineas.length && lineas[i + 1].trim().length > 10) {
        return limpiarTexto(lineas[i + 1]);
      }
    }
  }

  return null;
}

function extraerDireccionFiscal(texto: string): string | null {
  // Buscar componentes de dirección
  const componentesDireccion: string[] = [];

  // Calle
  const calleRegex = /(?:Nombre\s*(?:de\s*)?(?:la\s*)?Vialidad|Calle)[:\s]*([^\n]+)/i;
  const matchCalle = texto.match(calleRegex);
  if (matchCalle) componentesDireccion.push(limpiarTexto(matchCalle[1]) || '');

  // Número exterior
  const numExtRegex = /(?:N[úu]mero\s*Exterior|Num\.?\s*Ext\.?)[:\s]*([^\n]+)/i;
  const matchNumExt = texto.match(numExtRegex);
  if (matchNumExt && matchNumExt[1].trim()) componentesDireccion.push(`#${limpiarTexto(matchNumExt[1])}`);

  // Colonia
  const coloniaRegex = /(?:Nombre\s*(?:de\s*)?(?:la\s*)?Colonia|Colonia)[:\s]*([^\n]+)/i;
  const matchColonia = texto.match(coloniaRegex);
  if (matchColonia) componentesDireccion.push(`Col. ${limpiarTexto(matchColonia[1])}`);

  // Municipio/Alcaldía
  const municipioRegex = /(?:Nombre\s*del\s*Municipio|Municipio|Alcald[ií]a)[:\s]*([^\n]+)/i;
  const matchMunicipio = texto.match(municipioRegex);
  if (matchMunicipio) componentesDireccion.push(limpiarTexto(matchMunicipio[1]) || '');

  // Estado
  const estadoRegex = /(?:Nombre\s*de\s*la\s*Entidad|Entidad\s*Federativa|Estado)[:\s]*([^\n]+)/i;
  const matchEstado = texto.match(estadoRegex);
  if (matchEstado) componentesDireccion.push(limpiarTexto(matchEstado[1]) || '');

  const direccion = componentesDireccion.filter(c => c && c.length > 0).join(', ');
  return direccion.length > 5 ? direccion : null;
}

function extraerCodigoPostal(texto: string): string | null {
  // Buscar "Código Postal" seguido de 5 dígitos
  const cpRegex = /[Cc][óo]digo\s*[Pp]ostal[:\s]*(\d{5})/;
  const match = texto.match(cpRegex);
  if (match) return match[1];

  // Buscar CP suelto cerca de dirección
  const cpAltRegex = /C\.?\s*P\.?\s*[:\s]*(\d{5})/;
  const matchAlt = texto.match(cpAltRegex);
  if (matchAlt) return matchAlt[1];

  return null;
}

function limpiarTexto(texto: string): string | null {
  if (!texto) return null;
  const limpio = texto.replace(/\s+/g, ' ').trim();
  return limpio.length > 0 ? limpio : null;
}
