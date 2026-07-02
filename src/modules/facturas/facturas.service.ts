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
  async uploadFacturas(
    files: Express.Multer.File[],
  ): Promise<UploadResult[]> {
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
   * Listar facturas activas agrupadas por emisor — misma búsqueda que findAll.
   */
  async findAllAgrupadas(texto?: string) {
    const where: any = { IsActive: true };

    if (texto) {
      where.OR = [
        { UUID: { contains: texto } },
        { Folio: { contains: texto } },
        { emisor: { RFC: { contains: texto } } },
        { emisor: { RazonSocial: { contains: texto } } },
        { conceptos: { some: { Descripcion: { contains: texto } } } },
        { conceptos: { some: { NoIdentificacion: { contains: texto } } } },
      ];
    }

    const facturas = await prisma.facturas.findMany({
      where,
      select: {
        FacturaID: true,
        Total: true,
        EmisorFacturaID: true,
        emisor: {
          select: {
            EmisorFacturaID: true,
            RFC: true,
            RazonSocial: true,
            Alias: true,
          },
        },
      },
    });

    const groups = new Map<number, {
      emisor: { idEmisor: number; rfc: string; razonSocial: string; alias: string | null };
      totalFacturas: number;
      sumaTotal: number;
    }>();

    for (const f of facturas) {
      const eid = f.EmisorFacturaID;
      if (!groups.has(eid)) {
        groups.set(eid, {
          emisor: {
            idEmisor: eid,
            rfc: f.emisor.RFC,
            razonSocial: f.emisor.RazonSocial || '',
            alias: f.emisor.Alias,
          },
          totalFacturas: 0,
          sumaTotal: 0,
        });
      }
      const g = groups.get(eid)!;
      g.totalFacturas++;
      g.sumaTotal += Number(f.Total);
    }

    return [...groups.values()]
      .map(g => ({ ...g.emisor, totalFacturas: g.totalFacturas, sumaTotal: g.sumaTotal }))
      .sort((a, b) => a.razonSocial.localeCompare(b.razonSocial));
  }

  /**
   * Listar los grupos de "Número de Pedido" registrados en facturas.
   * Agrupa por (NumeroPedido, EmisorFacturaID). Solo facturas activas con
   * NumeroPedido no vacío. Alimenta el selector al crear un pedido.
   */
  async findPedidosAgrupados() {
    const facturas = await prisma.facturas.findMany({
      where: {
        IsActive: true,
        NOT: { NumeroPedido: null },
      },
      select: {
        NumeroPedido: true,
        Total: true,
        EmisorFacturaID: true,
        emisor: {
          select: { RFC: true, RazonSocial: true },
        },
      },
    });

    const groups = new Map<string, {
      NumeroPedido: string;
      EmisorFacturaID: number;
      RFC: string;
      RazonSocial: string;
      totalFacturas: number;
      sumaTotal: number;
    }>();

    for (const f of facturas) {
      const numeroPedido = (f.NumeroPedido || '').trim();
      if (!numeroPedido) continue;

      const key = `${numeroPedido}__${f.EmisorFacturaID}`;
      if (!groups.has(key)) {
        groups.set(key, {
          NumeroPedido: numeroPedido,
          EmisorFacturaID: f.EmisorFacturaID,
          RFC: f.emisor.RFC,
          RazonSocial: f.emisor.RazonSocial || '',
          totalFacturas: 0,
          sumaTotal: 0,
        });
      }
      const g = groups.get(key)!;
      g.totalFacturas++;
      g.sumaTotal += Number(f.Total);
    }

    return [...groups.values()]
      .map((g) => ({ ...g, sumaTotal: Math.round(g.sumaTotal * 100) / 100 }))
      .sort((a, b) => a.NumeroPedido.localeCompare(b.NumeroPedido));
  }

  /**
   * Facturas activas de un Número de Pedido, filtradas por el RFC del emisor.
   * Devuelve encabezado + conceptos para previsualizar en el form de pedidos.
   */
  async findByNumeroPedido(numeroPedido: string, rfc: string) {
    const numero = numeroPedido?.trim();
    const rfcNorm = rfc?.trim().toUpperCase();
    if (!numero || !rfcNorm) {
      return [];
    }

    const facturas = await prisma.facturas.findMany({
      where: {
        IsActive: true,
        NumeroPedido: numero,
        emisor: { RFC: rfcNorm },
      },
      orderBy: { FechaEmision: 'desc' },
      include: {
        conceptos: true,
        emisor: { select: { RFC: true, RazonSocial: true, Alias: true } },
      },
    });

    return facturas.map((f) => ({
      FacturaID: f.FacturaID,
      UUID: f.UUID,
      Serie: f.Serie,
      Folio: f.Folio,
      FechaEmision: moment.utc(f.FechaEmision).format('YYYY-MM-DD'),
      Total: Number(f.Total),
      NumeroPedido: f.NumeroPedido,
      emisor: f.emisor,
      conceptos: f.conceptos.map((c) => ({
        FacturaConceptoID: c.FacturaConceptoID,
        ClaveProdServ: c.ClaveProdServ,
        NoIdentificacion: c.NoIdentificacion,
        Cantidad: Number(c.Cantidad),
        ClaveUnidad: c.ClaveUnidad,
        Unidad: c.Unidad,
        Descripcion: c.Descripcion,
        ValorUnitario: Number(c.ValorUnitario),
        Importe: Number(c.Importe),
      })),
    }));
  }

  async findAll(texto?: string, fechaDesde?: string, fechaHasta?: string) {
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

    if (fechaDesde || fechaHasta) {
      where.FechaEmision = {};
      if (fechaDesde) {
        where.FechaEmision.gte = new Date(`${fechaDesde}T00:00:00.000Z`);
      }
      if (fechaHasta) {
        where.FechaEmision.lte = new Date(`${fechaHasta}T23:59:59.999Z`);
      }
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
      NumeroPedido: f.NumeroPedido,
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
   * Asignar un Número de Pedido a un lote de facturas.
   * Reglas:
   *  - Todas las facturas deben existir y estar activas.
   *  - Ninguna puede tener ya un NumeroPedido (no se permite cambiar).
   *  - Todas deben compartir el mismo EmisorFacturaID.
   */
  async asignarNumeroPedido(numeroPedido: string, facturaIDs: number[]) {
    const numero = numeroPedido.trim();
    const ids = [...new Set(facturaIDs)];

    const facturas = await prisma.facturas.findMany({
      where: { FacturaID: { in: ids } },
      select: {
        FacturaID: true,
        IsActive: true,
        NumeroPedido: true,
        EmisorFacturaID: true,
      },
    });

    // Todas existen
    if (facturas.length !== ids.length) {
      const encontrados = new Set(facturas.map((f) => f.FacturaID));
      const faltantes = ids.filter((id) => !encontrados.has(id));
      throw new HttpError(`Facturas no encontradas: ${faltantes.join(', ')}`, 400);
    }

    // Todas activas
    const inactivas = facturas.filter((f) => !f.IsActive).map((f) => f.FacturaID);
    if (inactivas.length > 0) {
      throw new HttpError(`Facturas inactivas: ${inactivas.join(', ')}`, 400);
    }

    // Ninguna con NumeroPedido previo
    const conNumero = facturas
      .filter((f) => f.NumeroPedido != null && f.NumeroPedido.trim() !== '')
      .map((f) => f.FacturaID);
    if (conNumero.length > 0) {
      throw new HttpError(
        `Estas facturas ya tienen N° de pedido y no se puede cambiar: ${conNumero.join(', ')}`,
        400,
      );
    }

    // Todas el mismo emisor
    const emisores = new Set(facturas.map((f) => f.EmisorFacturaID));
    if (emisores.size > 1) {
      throw new HttpError(
        'Todas las facturas deben ser del mismo emisor para asignar un N° de pedido',
        400,
      );
    }

    await prisma.facturas.updateMany({
      where: { FacturaID: { in: ids } },
      data: { NumeroPedido: numero },
    });

    return {
      NumeroPedido: numero,
      EmisorFacturaID: facturas[0].EmisorFacturaID,
      actualizadas: ids.length,
      FacturaIDs: ids,
    };
  }

  /**
   * Quitar el Número de Pedido de una factura.
   * Reglas:
   *  - La factura debe existir, estar activa y tener NumeroPedido.
   *  - No debe estar asociada a un pedido (sin fila activa en pedidos_facturas).
   *    Si lo está, 409 y se debe desasociar primero desde el módulo de pedidos.
   */
  async quitarNumeroPedido(FacturaID: number) {
    const factura = await prisma.facturas.findUnique({
      where: { FacturaID },
      select: { FacturaID: true, IsActive: true, NumeroPedido: true },
    });

    if (!factura || !factura.IsActive) {
      throw new HttpError('Factura no encontrada', 404);
    }

    if (factura.NumeroPedido == null || factura.NumeroPedido.trim() === '') {
      throw new HttpError('La factura no tiene un N° de pedido asignado', 400);
    }

    const asociacion = await prisma.pedidos_facturas.findFirst({
      where: { FacturaID, IsActive: true },
      select: {
        PedidoID: true,
        pedidos_encabezado: { select: { NumeroPedido: true } },
      },
    });

    if (asociacion) {
      const numeroPedido =
        asociacion.pedidos_encabezado?.NumeroPedido ?? asociacion.PedidoID;
      throw new HttpError(
        `La factura está asociada al pedido ${numeroPedido}; desasóciela primero desde el módulo de pedidos`,
        409,
      );
    }

    await prisma.facturas.update({
      where: { FacturaID },
      data: { NumeroPedido: null },
    });

    return { FacturaID, NumeroPedido: null };
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
