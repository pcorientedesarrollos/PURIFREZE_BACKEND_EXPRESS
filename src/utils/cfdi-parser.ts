import { XMLParser } from 'fast-xml-parser';
import { HttpError } from './response';
import { env } from '../config/env';

export interface CfdiEncabezado {
  uuid: string;
  version: string;
  serie?: string;
  folio?: string;
  fechaEmision: string;
  rfcReceptor: string;
  nombreReceptor?: string;
  usoCFDI?: string;
  subtotal: number;
  descuento?: number;
  total: number;
  totalImpuestosTrasladados?: number;
  moneda: string;
  tipoCambio?: number;
  metodoPago?: string;
  formaPago?: string;
  lugarExpedicion: string;
}

export interface CfdiEmisor {
  rfc: string;
  razonSocial: string;
  regimenFiscal?: string;
}

export interface CfdiConcepto {
  claveProdServ: string;
  noIdentificacion?: string;
  cantidad: number;
  claveUnidad: string;
  unidad?: string;
  descripcion: string;
  valorUnitario: number;
  importe: number;
  descuento?: number;
  objetoImp?: string;
  impuestoTrasladado: number;
}

export interface CfdiParseResult {
  encabezado: CfdiEncabezado;
  emisor: CfdiEmisor;
  conceptos: CfdiConcepto[];
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
});

export function parseCfdi40(xmlBuffer: Buffer): CfdiParseResult {
  const parsed = parser.parse(xmlBuffer);
  const comp = parsed['Comprobante'];

  if (!comp) {
    throw new HttpError('XML inválido: no se encontró el nodo Comprobante', 400);
  }

  if (comp['@_TipoDeComprobante'] !== 'I') {
    throw new HttpError('Solo se aceptan CFDI tipo I (Ingreso)', 400);
  }

  const version = comp['@_Version'];
  if (version !== '4.0') {
    throw new HttpError(`Versión CFDI no soportada: ${version}. Se requiere 4.0`, 400);
  }

  const uuid = comp?.['Complemento']?.['TimbreFiscalDigital']?.['@_UUID'];
  if (!uuid) {
    throw new HttpError('CFDI inválido: falta UUID en el Timbre Fiscal Digital', 400);
  }

  const emisorNode = comp['Emisor'];
  const rfcEmisor = emisorNode?.['@_Rfc']?.trim();
  if (!rfcEmisor) {
    throw new HttpError('CFDI inválido: falta RFC del emisor', 400);
  }

  const receptorNode = comp['Receptor'];
  const rfcReceptor = receptorNode?.['@_Rfc']?.trim();
  if (!rfcReceptor) {
    throw new HttpError('CFDI inválido: falta RFC del receptor', 400);
  }

  const rfcReceptorEsperado = env.RFC_RECEPTOR;
  if (!rfcReceptorEsperado) {
    throw new HttpError(
      'Configuración incompleta: falta la variable de entorno RFC_RECEPTOR',
      400,
    );
  }

  if (rfcReceptor !== rfcReceptorEsperado) {
    throw new HttpError(
      'CFDI inválido: RFC del receptor no corresponde a la empresa',
      400,
    );
  }

  const total = comp['@_Total'];
  if (total === undefined || total === null || total === '') {
    throw new HttpError('CFDI inválido: falta el Total', 400);
  }

  const emisor: CfdiEmisor = {
    rfc: rfcEmisor,
    razonSocial: emisorNode['@_Nombre']?.trim() ?? '',
    regimenFiscal: emisorNode['@_RegimenFiscal']?.trim() ?? undefined,
  };

  const totalImpuestosTrasladados =
    comp['Impuestos']?.['@_TotalImpuestosTrasladados'] !== undefined
      ? parseFloat(comp['Impuestos']['@_TotalImpuestosTrasladados'])
      : undefined;

  const encabezado: CfdiEncabezado = {
    uuid,
    version,
    serie: comp['@_Serie'] ?? undefined,
    folio: comp['@_Folio'] ?? undefined,
    fechaEmision: comp['@_Fecha'],
    rfcReceptor,
    nombreReceptor: receptorNode['@_Nombre'] ?? '',
    usoCFDI: receptorNode['@_UsoCFDI'] ?? undefined,
    subtotal: parseFloat(comp['@_SubTotal']),
    descuento: comp['@_Descuento'] !== undefined ? parseFloat(comp['@_Descuento']) : undefined,
    total: parseFloat(total),
    totalImpuestosTrasladados,
    moneda: comp['@_Moneda'],
    tipoCambio: comp['@_TipoCambio'] !== undefined ? parseFloat(comp['@_TipoCambio']) : undefined,
    metodoPago: comp['@_MetodoPago'] ?? undefined,
    formaPago: comp['@_FormaPago'] ?? undefined,
    lugarExpedicion: comp['@_LugarExpedicion'],
  };

  const conceptosNode = comp['Conceptos']?.['Concepto'];
  const conceptosRaw: unknown[] = Array.isArray(conceptosNode)
    ? conceptosNode
    : conceptosNode
      ? [conceptosNode]
      : [];

  const conceptos: CfdiConcepto[] = conceptosRaw.map((c: any) => ({
    claveProdServ: c['@_ClaveProdServ'],
    noIdentificacion: c['@_NoIdentificacion'] ?? undefined,
    cantidad: parseFloat(c['@_Cantidad']),
    claveUnidad: c['@_ClaveUnidad'],
    unidad: c['@_Unidad'] ?? undefined,
    descripcion: c['@_Descripcion'],
    valorUnitario: parseFloat(c['@_ValorUnitario']),
    importe: parseFloat(c['@_Importe']),
    descuento: c['@_Descuento'] !== undefined ? parseFloat(c['@_Descuento']) : undefined,
    objetoImp: c['@_ObjetoImp'] ?? undefined,
    impuestoTrasladado: sumarTrasladosConcepto(c),
  }));

  return { encabezado, emisor, conceptos };
}

function sumarTrasladosConcepto(concepto: any): number {
  const traslado = concepto?.['Impuestos']?.['Traslados']?.['Traslado'];
  if (!traslado) return 0;
  const arr = Array.isArray(traslado) ? traslado : [traslado];
  return arr.reduce(
    (acc, t) => acc + (t?.['@_Importe'] !== undefined ? parseFloat(t['@_Importe']) : 0),
    0,
  );
}
