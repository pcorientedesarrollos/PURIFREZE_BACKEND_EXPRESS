// pdf-parse v2.x tiene API diferente a v1.x - se usa require por compatibilidad de tipos
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse, VerbosityLevel } = require('pdf-parse');
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
  let texto: string;
  try {
    const parser = new PDFParse({ verbosity: VerbosityLevel.ERRORS, data: new Uint8Array(buffer) });
    await parser.load();
    const result = await parser.getText();
    texto = result.text;
  } catch {
    throw new HttpError('No se pudo leer el archivo PDF. Asegúrate de que sea un PDF válido.', 400);
  }

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
  // Para personas físicas: combinar Nombre (s) + Primer Apellido + Segundo Apellido
  const nombreRegex = /Nombre\s*\(s\)[:\s]*([^\n]+)/i;
  const matchNombre = texto.match(nombreRegex);
  if (matchNombre) {
    const partes: string[] = [];
    const nombre = limpiarTexto(matchNombre[1]);
    if (nombre) partes.push(nombre);

    const primerApellidoRegex = /Primer\s*Apellido[:\s]*([^\n]+)/i;
    const matchPrimerApellido = texto.match(primerApellidoRegex);
    if (matchPrimerApellido) {
      const apellido = limpiarTexto(matchPrimerApellido[1]);
      if (apellido) partes.push(apellido);
    }

    const segundoApellidoRegex = /Segundo\s*Apellido[:\s]*([^\n]+)/i;
    const matchSegundoApellido = texto.match(segundoApellidoRegex);
    if (matchSegundoApellido) {
      const apellido = limpiarTexto(matchSegundoApellido[1]);
      if (apellido) partes.push(apellido);
    }

    if (partes.length > 0) return partes.join(' ');
  }

  // Para personas morales: buscar "Denominación/Razón Social:" en la misma línea
  const razonRegex = /(?:Denominaci[oó]n[^\n]*Raz[oó]n[^\n]*Social|Raz[oó]n[^\S\n]*Social)[:\s]*([^\n]+)/i;
  const match = texto.match(razonRegex);
  if (match) {
    const valor = limpiarTexto(match[1]);
    if (valor && valor.length > 2) return valor;
  }

  return null;
}

function extraerRegimen(texto: string): string | null {
  // Buscar líneas que contienen "Régimen de..." (el valor real del régimen)
  const regimenDirecto = /[Rr][ée]gimen\s+de\s+[^\n]+/i;
  const matchDirecto = texto.match(regimenDirecto);
  if (matchDirecto) {
    const regimen = limpiarTexto(matchDirecto[0]);
    // Limpiar la fecha al final si existe (ej: "01/01/2022")
    if (regimen) {
      const sinFecha = regimen.replace(/\s+\d{2}\/\d{2}\/\d{4}\s*$/, '').trim();
      return sinFecha;
    }
  }

  // Fallback: buscar líneas con "Régimen" que no sean cabeceras de tabla
  const lineas = texto.split('\n');
  for (let i = 0; i < lineas.length; i++) {
    if (/r[ée]gimen/i.test(lineas[i])) {
      const lineaTrimmed = lineas[i].trim();
      // Saltar cabeceras de tabla y la sección "Regímenes:"
      if (/fecha\s*inicio/i.test(lineaTrimmed)) continue;
      if (/^r[ée]g[ií]menes\s*:?\s*$/i.test(lineaTrimmed)) continue;

      const textoRegimen = lineaTrimmed.replace(/.*[Rr][ée]gimen[:\s]*/i, '').trim();
      if (textoRegimen.length > 10) return limpiarTexto(textoRegimen);
      if (i + 1 < lineas.length) {
        const siguiente = lineas[i + 1].trim();
        if (siguiente.length > 10 && !/fecha\s*inicio/i.test(siguiente)) {
          return limpiarTexto(siguiente);
        }
      }
    }
  }

  return null;
}

function extraerDireccionFiscal(texto: string): string | null {
  const componentesDireccion: string[] = [];

  // Función auxiliar para limpiar valor capturado: cortar en el siguiente campo conocido
  const limpiarCampo = (valor: string): string | null => {
    if (!valor) return null;
    // Cortar si aparece otro campo de dirección en la misma captura
    const corte = valor.search(/(?:N[úu]mero\s*(?:Exterior|Interior)|Tipo\s*de\s*Vialidad|Nombre\s*(?:de\s*(?:la\s*)?(?:Colonia|Localidad|Vialidad)|del\s*Municipio)|Entidad\s*Federativa|Entre\s*Calle|C[óo]digo\s*Postal)/i);
    const limpio = corte > 0 ? valor.substring(0, corte).trim() : valor.trim();
    return limpio.length > 0 ? limpio : null;
  };

  // Calle
  const calleRegex = /Nombre\s*(?:de\s*)?(?:la\s*)?Vialidad[:\s]*([^\n]+)/i;
  const matchCalle = texto.match(calleRegex);
  if (matchCalle) {
    const calle = limpiarCampo(matchCalle[1]);
    if (calle) componentesDireccion.push(calle);
  }

  // Número exterior
  const numExtRegex = /N[úu]mero\s*Exterior[:\s]*(\S+)/i;
  const matchNumExt = texto.match(numExtRegex);
  if (matchNumExt && matchNumExt[1].trim()) componentesDireccion.push(`#${matchNumExt[1].trim()}`);

  // Colonia
  const coloniaRegex = /Nombre\s*(?:de\s*)?(?:la\s*)?Colonia[:\s]*([^\n]+)/i;
  const matchColonia = texto.match(coloniaRegex);
  if (matchColonia) {
    const colonia = limpiarCampo(matchColonia[1]);
    if (colonia) componentesDireccion.push(`Col. ${colonia}`);
  }

  // Municipio/Demarcación Territorial
  const municipioRegex = /(?:Nombre\s*del\s*Municipio|Municipio)\s*(?:o\s*Demarcaci[oó]n\s*Territorial)?[:\s]*([^\n]+)/i;
  const matchMunicipio = texto.match(municipioRegex);
  if (matchMunicipio) {
    const municipio = limpiarCampo(matchMunicipio[1]);
    if (municipio) componentesDireccion.push(municipio);
  }

  // Entidad Federativa
  const estadoRegex = /(?:Nombre\s*de\s*la\s*Entidad\s*Federativa|Entidad\s*Federativa)[:\s]*([^\n]+)/i;
  const matchEstado = texto.match(estadoRegex);
  if (matchEstado) {
    const estado = limpiarCampo(matchEstado[1]);
    if (estado) componentesDireccion.push(estado);
  }

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
