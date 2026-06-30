import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { parseCfdi40, CfdiParseResult } from '../../utils/cfdi-parser';
import pLimit from 'p-limit';
import moment from 'moment';

interface UploadResult {
  archivo: string;
  status: 'ok' | 'error' | 'duplicate';
  uuid?: string;
  FacturaID?: number;
  message?: string;
}

export class FacturasService {
  /**
   * Procesar upload de múltiples XML CFDI.
   */
  async uploadFacturas(files: Express.Multer.File[]): Promise<UploadResult[]> {
    const limit = pLimit(8);

    // 1. Parsear todos los XML en paralelo con límite de concurrencia
    const parsedResults = await Promise.all(
      files.map((file) =>
        limit(async () => {
          try {
            const parsed = parseCfdi40(file.buffer);
            return {
              archivo: file.originalname,
              status: 'ok' as const,
              uuid: parsed.encabezado.uuid,
              parsed,
              buffer: file.buffer,
            };
          } catch (err: any) {
            return {
              archivo: file.originalname,
              status: 'error' as const,
              message: err instanceof HttpError ? err.message : 'Error al parsear XML',
            };
          }
        }),
      ),
    );

    // 2. Separar éxitos de errores
    const exitosos = parsedResults.filter((r): r is Extract<typeof r, { status: 'ok' }> => r.status === 'ok');
    const resultados: UploadResult[] = parsedResults
      .filter((r) => r.status !== 'ok')
      .map((r) => ({ archivo: r.archivo, status: r.status, message: (r as any).message }));

    if (exitosos.length === 0) {
      return resultados;
    }

    // 3. Dedupe vs BD: query UUIDs existentes
    const uuidsLote = exitosos.map((e) => e.uuid);
    const existentesBD = await prisma.facturas.findMany({
      where: { UUID: { in: uuidsLote } },
      select: { UUID: true },
    });
    const setExistentesBD = new Set(existentesBD.map((f) => f.UUID));

    // 4. Dedupe interno del lote
    const setProcesados = new Set<string>();

    // 5. Crear facturas no duplicadas
    for (const item of exitosos) {
      if (setExistentesBD.has(item.uuid)) {
        resultados.push({
          archivo: item.archivo,
          status: 'duplicate',
          uuid: item.uuid,
          message: 'UUID ya existe en la base de datos',
        });
        continue;
      }

      if (setProcesados.has(item.uuid)) {
        resultados.push({
          archivo: item.archivo,
          status: 'duplicate',
          uuid: item.uuid,
          message: 'UUID duplicado dentro del lote',
        });
        continue;
      }

      setProcesados.add(item.uuid);

      try {
        const facturaCreada = await this.crearFacturaConConceptos(item.parsed, item.buffer);
        resultados.push({
          archivo: item.archivo,
          status: 'ok',
          uuid: item.uuid,
          FacturaID: facturaCreada.FacturaID,
        });
      } catch (err: any) {
        resultados.push({
          archivo: item.archivo,
          status: 'error',
          uuid: item.uuid,
          message: err instanceof HttpError ? err.message : 'Error al guardar en base de datos',
        });
      }
    }

    return resultados;
  }

  /**
   * Crear emisor (findOrCreate) y factura con conceptos anidados.
   */
  private async crearFacturaConConceptos(parsed: CfdiParseResult, xmlBuffer: Buffer) {
    const { encabezado, emisor, conceptos } = parsed;
    const xmlBytes = new Uint8Array(xmlBuffer);

    // findOrCreate emisor por RFC
    let emisorDB = await prisma.emisores_factura.findUnique({
      where: { RFC: emisor.rfc },
    });

    if (!emisorDB) {
      emisorDB = await prisma.emisores_factura.create({
        data: {
          RFC: emisor.rfc,
          RazonSocial: emisor.razonSocial || null,
          RegimenFiscal: emisor.regimenFiscal || null,
        },
      });
    }

    const factura = await prisma.facturas.create({
      data: {
        EmisorFacturaID: emisorDB.EmisorFacturaID,
        UUID: encabezado.uuid,
        Version: encabezado.version,
        Serie: encabezado.serie || null,
        Folio: encabezado.folio || null,
        FechaEmision: new Date(encabezado.fechaEmision),
        RFCReceptor: encabezado.rfcReceptor,
        NombreReceptor: encabezado.nombreReceptor || null,
        UsoCFDI: encabezado.usoCFDI || null,
        SubTotal: encabezado.subtotal,
        Descuento: encabezado.descuento ?? 0,
        Total: encabezado.total,
        TotalImpuestosTrasladados: encabezado.totalImpuestosTrasladados ?? 0,
        Moneda: encabezado.moneda,
        TipoCambio: encabezado.tipoCambio ?? null,
        MetodoPago: encabezado.metodoPago || null,
        FormaPago: encabezado.formaPago || null,
        LugarExpedicion: encabezado.lugarExpedicion,
        XmlOriginal: xmlBytes,
        FechaCarga: new Date(),
        IsActive: true,
        conceptos: {
          create: conceptos.map((c) => ({
            ClaveProdServ: c.claveProdServ,
            NoIdentificacion: c.noIdentificacion || null,
            Cantidad: c.cantidad,
            ClaveUnidad: c.claveUnidad,
            Unidad: c.unidad || null,
            Descripcion: c.descripcion,
            ValorUnitario: c.valorUnitario,
            Importe: c.importe,
            Descuento: c.descuento ?? 0,
            ObjetoImp: c.objetoImp || null,
            ImpuestoTrasladado: c.impuestoTrasladado,
          })),
        },
      },
    });

    return factura;
  }

  /**
   * Listar facturas activas (máximo 200).
   */
  async findAll(texto?: string) {
    const where: any = { IsActive: true };

    if (texto) {
      where.OR = [
        { Folio: { contains: texto } },
        { UUID: { contains: texto } },
        { emisor: { RFC: { contains: texto } } },
        { emisor: { RazonSocial: { contains: texto } } },
        { emisor: { Alias: { contains: texto } } },
        { Moneda: { contains: texto } },
        { conceptos: { some: { ClaveProdServ: { contains: texto } } } },
        { conceptos: { some: { Descripcion: { contains: texto } } } },
        { conceptos: { some: { NoIdentificacion: { contains: texto } } } },
      ];
    }

    const facturas = await prisma.facturas.findMany({
      where,
      take: 200,
      orderBy: { FechaEmision: 'desc' },
      include: {
        emisor: {
          select: {
            RFC: true,
            RazonSocial: true,
            Alias: true,
          },
        },
      },
    });

    return facturas.map((f) => ({
      FacturaID: f.FacturaID,
      EmisorFacturaID: f.EmisorFacturaID,
      UUID: f.UUID,
      Version: f.Version,
      Serie: f.Serie,
      Folio: f.Folio,
      FechaEmision: moment.utc(f.FechaEmision).format('YYYY-MM-DD'),
      RFCReceptor: f.RFCReceptor,
      NombreReceptor: f.NombreReceptor,
      UsoCFDI: f.UsoCFDI,
      SubTotal: Number(f.SubTotal),
      Descuento: Number(f.Descuento),
      Total: Number(f.Total),
      TotalImpuestosTrasladados: Number(f.TotalImpuestosTrasladados),
      Moneda: f.Moneda,
      TipoCambio: f.TipoCambio ? Number(f.TipoCambio) : null,
      MetodoPago: f.MetodoPago,
      FormaPago: f.FormaPago,
      LugarExpedicion: f.LugarExpedicion,
      FechaCarga: moment.utc(f.FechaCarga).format('YYYY-MM-DD'),
      IsActive: f.IsActive,
      emisor: f.emisor,
    }));
  }

  /**
   * Obtener una factura por ID con sus conceptos y emisor.
   */
  async findOne(FacturaID: number) {
    const factura = await prisma.facturas.findUnique({
      where: { FacturaID, IsActive: true },
      include: {
        conceptos: true,
        emisor: true,
      },
    });

    if (!factura) {
      throw new HttpError('Factura no encontrada', 404);
    }

    return {
      encabezado: {
        FacturaID: factura.FacturaID,
        EmisorFacturaID: factura.EmisorFacturaID,
        UUID: factura.UUID,
        Version: factura.Version,
        Serie: factura.Serie,
        Folio: factura.Folio,
        FechaEmision: moment.utc(factura.FechaEmision).format('YYYY-MM-DD'),
        RFCReceptor: factura.RFCReceptor,
        NombreReceptor: factura.NombreReceptor,
        UsoCFDI: factura.UsoCFDI,
        SubTotal: Number(factura.SubTotal),
        Descuento: Number(factura.Descuento),
        Total: Number(factura.Total),
        TotalImpuestosTrasladados: Number(factura.TotalImpuestosTrasladados),
        Moneda: factura.Moneda,
        TipoCambio: factura.TipoCambio ? Number(factura.TipoCambio) : null,
        MetodoPago: factura.MetodoPago,
        FormaPago: factura.FormaPago,
        LugarExpedicion: factura.LugarExpedicion,
        FechaCarga: moment.utc(factura.FechaCarga).format('YYYY-MM-DD'),
        IsActive: factura.IsActive,
      },
      conceptos: factura.conceptos.map((c) => ({
        FacturaConceptoID: c.FacturaConceptoID,
        FacturaID: c.FacturaID,
        ClaveProdServ: c.ClaveProdServ,
        NoIdentificacion: c.NoIdentificacion,
        Cantidad: Number(c.Cantidad),
        ClaveUnidad: c.ClaveUnidad,
        Unidad: c.Unidad,
        Descripcion: c.Descripcion,
        ValorUnitario: Number(c.ValorUnitario),
        Importe: Number(c.Importe),
        Descuento: Number(c.Descuento),
        ObjetoImp: c.ObjetoImp,
        ImpuestoTrasladado: Number(c.ImpuestoTrasladado),
      })),
      emisor: factura.emisor,
    };
  }

  /**
   * Obtener el XML original de una factura.
   */
  async getXml(FacturaID: number) {
    const factura = await prisma.facturas.findUnique({
      where: { FacturaID, IsActive: true },
      select: {
        XmlOriginal: true,
        UUID: true,
      },
    });

    if (!factura || !factura.XmlOriginal) {
      throw new HttpError('XML no encontrado', 404);
    }

    return {
      buffer: factura.XmlOriginal,
      uuid: factura.UUID,
    };
  }
}

// Exportar singleton
export const facturasService = new FacturasService();
