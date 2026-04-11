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
  // 1. Buscar RFC con espacios, tabs o saltos de línea entre label y valor
  // Maneja formato de tabla del SAT donde "RFC:" y el valor pueden estar separados
  const rfcRegex = /RFC[\s\n\r:]*([A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3})/i;
  const match = texto.match(rfcRegex);
  if (match) return match[1].toUpperCase();

  // 2. Buscar en estructura de tabla: "RFC:" en una línea, valor en otra
  const lineas = texto.split('\n');
  for (let i = 0; i < lineas.length - 1; i++) {
    if (/^\s*RFC\s*:?\s*$/i.test(lineas[i].trim())) {
      const siguienteLinea = lineas[i + 1].trim();
      const rfcMatch = siguienteLinea.match(/^([A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3})/i);
      if (rfcMatch) return rfcMatch[1].toUpperCase();
    }
  }

  // 3. Buscar cerca de "Registro Federal de Contribuyentes"
  const rfcAltRegex = /(?:Registro Federal|R\.?F\.?C\.?)[\s\n\r:]*([A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3})/i;
  const matchAlt = texto.match(rfcAltRegex);
  if (matchAlt) return matchAlt[1].toUpperCase();

  // 4. Buscar RFC suelto (patrón estándar mexicano)
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

// Catálogo de regímenes fiscales del SAT con sus códigos
const REGIMENES_FISCALES_SAT: { codigo: string; patron: RegExp }[] = [
  { codigo: '601', patron: /General\s+de\s+Ley\s+Personas\s+Morales/i },
  { codigo: '603', patron: /Personas\s+Morales\s+con\s+Fines\s+no\s+Lucrativos/i },
  { codigo: '605', patron: /Sueldos\s+y\s+Salarios/i },
  { codigo: '606', patron: /Arrendamiento/i },
  { codigo: '607', patron: /Enajenaci[oó]n\s+o\s+Adquisici[oó]n\s+de\s+Bienes/i },
  { codigo: '608', patron: /Dem[aá]s\s+ingresos/i },
  { codigo: '610', patron: /Residentes\s+en\s+el\s+Extranjero/i },
  { codigo: '611', patron: /Dividendos\s*\(?socios/i },
  { codigo: '612', patron: /Personas\s+F[ií]sicas\s+con\s+Actividades\s+Empresariales\s+y\s+Profesionales/i },
  { codigo: '614', patron: /ingresos\s+por\s+intereses/i },
  { codigo: '615', patron: /obtenci[oó]n\s+de\s+premios/i },
  { codigo: '616', patron: /Sin\s+obligaciones\s+fiscales/i },
  { codigo: '620', patron: /Sociedades\s+Cooperativas\s+de\s+Producci[oó]n/i },
  { codigo: '621', patron: /Incorporaci[oó]n\s+Fiscal/i },
  { codigo: '622', patron: /Actividades\s+Agr[ií]colas.*Ganaderas.*Silv[ií]colas.*Pesqueras/i },
  { codigo: '623', patron: /Opcional\s+para\s+Grupos\s+de\s+Sociedades/i },
  { codigo: '624', patron: /Coordinados/i },
  { codigo: '625', patron: /Plataformas\s+Tecnol[oó]gicas/i },
  { codigo: '626', patron: /Simplificado\s+de\s+Confianza/i },
];

function extraerRegimen(texto: string): string | null {
  // Primero extraer el texto del régimen del PDF
  let textoRegimen: string | null = null;

  // Buscar en la sección "Regímenes:" líneas que contengan un régimen fiscal
  const lineas = texto.split('\n');
  let enSeccionRegimenes = false;

  for (let i = 0; i < lineas.length; i++) {
    const lineaTrimmed = lineas[i].trim();

    // Detectar inicio de sección "Regímenes:"
    if (/^R[ée]g[ií]menes\s*:?\s*$/i.test(lineaTrimmed)) {
      enSeccionRegimenes = true;
      continue;
    }

    // Si estamos en la sección de regímenes, buscar el régimen
    if (enSeccionRegimenes) {
      // Saltar cabeceras de tabla
      if (/Fecha\s*Inicio/i.test(lineaTrimmed) || /Fecha\s*Fin/i.test(lineaTrimmed)) continue;
      if (/^R[ée]gimen\s+Fecha/i.test(lineaTrimmed)) continue;

      // Buscar línea que empiece con "Régimen" (pero no "Régimen Capital")
      if (/^R[ée]gimen\s+(?!Capital)/i.test(lineaTrimmed)) {
        textoRegimen = lineaTrimmed.replace(/\s+\d{2}\/\d{2}\/\d{4}\s*$/, '').trim();
        break;
      }

      // Si encontramos otra sección (ej: "Obligaciones:"), salir
      if (/^[A-Z][a-záéíóú]+\s*:$/i.test(lineaTrimmed) && !/^R[ée]gimen/i.test(lineaTrimmed)) {
        break;
      }
    }
  }

  // Fallback: buscar patrón "Régimen de..." o "Régimen General..." en todo el texto
  if (!textoRegimen) {
    const regimenMatch = texto.match(/R[ée]gimen\s+(?!Capital)(?:de\s+)?[A-Za-záéíóúñÁÉÍÓÚÑ\s]+/i);
    if (regimenMatch) {
      textoRegimen = regimenMatch[0].replace(/\s+\d{2}\/\d{2}\/\d{4}\s*$/, '').trim();
    }
  }

  // Si encontramos texto del régimen, buscar el código correspondiente
  if (textoRegimen) {
    for (const regimen of REGIMENES_FISCALES_SAT) {
      if (regimen.patron.test(textoRegimen)) {
        return regimen.codigo;
      }
    }
  }

  return null;
}

function extraerDireccionFiscal(texto: string): string | null {
  // Función auxiliar para limpiar valor capturado: cortar en el siguiente campo conocido
  const limpiarCampo = (valor: string): string | null => {
    if (!valor) return null;
    // Cortar si aparece otro campo de dirección en la misma captura
    const corte = valor.search(/(?:N[úu]mero\s*(?:Exterior|Interior)|Tipo\s*de\s*Vialidad|Nombre\s*(?:de\s*(?:la\s*)?(?:Colonia|Localidad|Vialidad)|del\s*Municipio)|Entidad\s*Federativa|Entre\s*Calle|Y\s*Calle|C[óo]digo\s*Postal)/i);
    const limpio = corte > 0 ? valor.substring(0, corte).trim() : valor.trim();
    return limpio.length > 0 ? limpio : null;
  };

  // Función para extraer solo el número de una calle (ej: "CALLE 25" -> "25")
  const extraerNumeroCalle = (valor: string | null): string | null => {
    if (!valor) return null;
    // Si viene como "CALLE 25" o "25", extraer solo el número/identificador
    const match = valor.match(/(?:CALLE\s+)?(.+)/i);
    return match ? match[1].trim() : valor.trim();
  };

  // Extraer campos individuales
  let vialidad: string | null = null;
  let numExterior: string | null = null;
  let colonia: string | null = null;
  let municipio: string | null = null;
  let estado: string | null = null;
  let entreCalle: string | null = null;
  let yCalle: string | null = null;

  // Nombre de Vialidad (calle principal)
  const calleRegex = /Nombre\s*(?:de\s*)?(?:la\s*)?Vialidad[:\s]*([^\n]+)/i;
  const matchCalle = texto.match(calleRegex);
  if (matchCalle) {
    vialidad = limpiarCampo(matchCalle[1]);
  }

  // Número exterior (puede ser complejo como "MANZANA 23 A LOTE 28")
  const numExtRegex = /N[úu]mero\s*Exterior[:\s]*([^\n]+)/i;
  const matchNumExt = texto.match(numExtRegex);
  if (matchNumExt) {
    numExterior = limpiarCampo(matchNumExt[1]);
  }

  // Colonia
  const coloniaRegex = /Nombre\s*(?:de\s*)?(?:la\s*)?Colonia[:\s]*([^\n]+)/i;
  const matchColonia = texto.match(coloniaRegex);
  if (matchColonia) {
    colonia = limpiarCampo(matchColonia[1]);
  }

  // Municipio/Demarcación Territorial
  const municipioRegex = /(?:Nombre\s*del\s*Municipio|Municipio)\s*(?:o\s*Demarcaci[oó]n\s*Territorial)?[:\s]*([^\n]+)/i;
  const matchMunicipio = texto.match(municipioRegex);
  if (matchMunicipio) {
    municipio = limpiarCampo(matchMunicipio[1]);
  }

  // Entidad Federativa
  const estadoRegex = /(?:Nombre\s*de\s*la\s*Entidad\s*Federativa|Entidad\s*Federativa)[:\s]*([^\n]+)/i;
  const matchEstado = texto.match(estadoRegex);
  if (matchEstado) {
    estado = limpiarCampo(matchEstado[1]);
  }

  // Entre Calle
  const entreCalleRegex = /Entre\s*Calle[:\s]*([^\n]+)/i;
  const matchEntreCalle = texto.match(entreCalleRegex);
  if (matchEntreCalle) {
    entreCalle = extraerNumeroCalle(limpiarCampo(matchEntreCalle[1]));
  }

  // Y Calle
  const yCalleRegex = /Y\s*Calle[:\s]*([^\n]+)/i;
  const matchYCalle = texto.match(yCalleRegex);
  if (matchYCalle) {
    yCalle = extraerNumeroCalle(limpiarCampo(matchYCalle[1]));
  }

  // Construir dirección con formato: "26 X 25 Y 27, MANZANA 23 A LOTE 28, Col. SAN PEDRO NOH PAT, KANASIN, YUCATAN"
  const componentesDireccion: string[] = [];

  // Primera parte: Vialidad con entre calles (ej: "26 X 25 Y 27")
  if (vialidad) {
    let primeraParte = vialidad;
    if (entreCalle) {
      primeraParte += ` X ${entreCalle}`;
    }
    if (yCalle) {
      primeraParte += ` Y ${yCalle}`;
    }
    componentesDireccion.push(primeraParte);
  }

  // Número exterior
  if (numExterior) {
    componentesDireccion.push(numExterior);
  }

  // Colonia
  if (colonia) {
    componentesDireccion.push(`Col. ${colonia}`);
  }

  // Municipio
  if (municipio) {
    componentesDireccion.push(municipio);
  }

  // Estado
  if (estado) {
    componentesDireccion.push(estado);
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
