import prisma from '../../config/database';
import { Prisma } from '@prisma/client';
import { HttpError } from '../../utils/response';
import { parseCfdi40, CfdiParseResult } from '../../utils/cfdi-parser';
import pLimit from 'p-limit';
import moment from 'moment';
import { localDate } from '../../utils/date-utils';

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
        FechaCarga: localDate(),
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
   * Listar emisores con conteo y suma de facturas activas.
   * SQL puro con GROUP BY: incluye emisores sin facturas (LEFT JOIN),
   * suma real por SQL sin límite de filas.
   */
  async findAllAgrupadas(texto?: string) {
    const t = texto?.trim() ?? '';
    const like = `%${t}%`;

    const rows = await prisma.$queryRaw<Array<{
      idEmisor: number;
      rfc: string;
      razonSocial: string | null;
      alias: string | null;
      totalFacturas: bigint;
      sumaTotal: any;
    }>>`
      SELECT
        e.EmisorFacturaID AS idEmisor,
        e.RFC             AS rfc,
        e.RazonSocial     AS razonSocial,
        e.Alias           AS alias,
        COUNT(DISTINCT f.FacturaID)          AS totalFacturas,
        COALESCE(SUM(f.Total), 0)            AS sumaTotal
      FROM emisores_factura e
      LEFT JOIN facturas f
        ON f.EmisorFacturaID = e.EmisorFacturaID
       AND f.IsActive = 1
      WHERE (
        ${t} = ''
        OR LOWER(e.RFC)         LIKE LOWER(${like})
        OR LOWER(e.RazonSocial) LIKE LOWER(${like})
        OR LOWER(e.Alias)       LIKE LOWER(${like})
        OR EXISTS (
          SELECT 1
          FROM facturas f2
          LEFT JOIN factura_conceptos fc ON fc.FacturaID = f2.FacturaID
          WHERE f2.EmisorFacturaID = e.EmisorFacturaID
            AND f2.IsActive = 1
            AND (
              LOWER(COALESCE(f2.UUID, ''))               LIKE LOWER(${like})
              OR LOWER(COALESCE(f2.Folio, ''))           LIKE LOWER(${like})
              OR LOWER(COALESCE(f2.NumeroPedido, ''))    LIKE LOWER(${like})
              OR LOWER(COALESCE(fc.ClaveProdServ, ''))   LIKE LOWER(${like})
              OR LOWER(COALESCE(fc.Descripcion, ''))     LIKE LOWER(${like})
              OR LOWER(COALESCE(fc.NoIdentificacion,'')) LIKE LOWER(${like})
            )
        )
      )
      GROUP BY e.EmisorFacturaID, e.RFC, e.RazonSocial, e.Alias
      ORDER BY e.RazonSocial ASC
    `;

    return rows.map((r) => ({
      idEmisor: r.idEmisor,
      rfc: r.rfc,
      razonSocial: r.razonSocial ?? '',
      alias: r.alias,
      totalFacturas: Number(r.totalFacturas),
      sumaTotal: Number(r.sumaTotal),
    }));
  }

  /**
   * Todas las facturas activas de un emisor (drill-down desde agrupadas).
   * Sin límite: la agrupación por emisor ya restringe el volumen.
   */
  async findByEmisor(EmisorFacturaID: number) {
    const emisor = await prisma.emisores_factura.findUnique({
      where: { EmisorFacturaID },
      select: {
        EmisorFacturaID: true,
        RFC: true,
        RazonSocial: true,
        Alias: true,
        RegimenFiscal: true,
      },
    });

    if (!emisor) {
      throw new HttpError('Emisor no encontrado', 404);
    }

    const facturas = await prisma.facturas.findMany({
      where: { EmisorFacturaID, IsActive: true },
      orderBy: { FechaEmision: 'desc' },
      include: {
        emisor: {
          select: { RFC: true, RazonSocial: true, Alias: true },
        },
        conceptos: true,
      },
    });

    const sumaTotal = facturas.reduce((acc, f) => acc + Number(f.Total), 0);

    return {
      emisor,
      meta: {
        total: facturas.length,
        sumaTotal,
      },
      data: facturas.map((f) => ({
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
          Descuento: Number(c.Descuento),
          ObjetoImp: c.ObjetoImp,
          ImpuestoTrasladado: Number(c.ImpuestoTrasladado),
        })),
      })),
    };
  }

  /**
   * Listar los grupos de "Número de Pedido" registrados en facturas.
   * Agrupa por (NumeroPedido, EmisorFacturaID). Solo facturas activas con
   * NumeroPedido no vacío. Alimenta el selector al crear un pedido.
   */
  async findPedidosAgrupados() {
    // Facturas ya asociadas a un pedido activo: su N° de pedido ya se usó,
    // por lo que se excluyen del selector (no deben poder reutilizarse).
    const asociaciones = await prisma.pedidos_facturas.findMany({
      where: { IsActive: true },
      select: { FacturaID: true },
    });
    const idsAsociadas = new Set(asociaciones.map((a) => a.FacturaID));

    // Números de pedido que YA tienen un pedido creado (aunque sus facturas no
    // se hayan asociado). Se desambigua por el RFC del proveedor del pedido,
    // que corresponde al RFC del emisor de las facturas. Clave: "Numero__RFC".
    const pedidosExistentes = await prisma.pedidos_encabezado.findMany({
      where: { IsActive: true, NOT: { NumeroPedido: null } },
      select: { NumeroPedido: true, ProveedorID: true },
    });
    const provIds = [
      ...new Set(pedidosExistentes.map((p) => p.ProveedorID).filter((x): x is number => x != null)),
    ];
    const proveedores = provIds.length
      ? await prisma.catalogo_proveedores.findMany({
          where: { ProveedorID: { in: provIds } },
          select: { ProveedorID: true, RFC: true },
        })
      : [];
    const rfcPorProveedor = new Map(
      proveedores.map((p) => [p.ProveedorID, (p.RFC || '').trim().toUpperCase()]),
    );
    const pedidosUsados = new Set<string>();
    for (const p of pedidosExistentes) {
      const num = (p.NumeroPedido || '').trim();
      if (!num) continue;
      const rfc = p.ProveedorID != null ? rfcPorProveedor.get(p.ProveedorID) || '' : '';
      pedidosUsados.add(`${num}__${rfc}`);
    }

    const facturas = await prisma.facturas.findMany({
      where: {
        IsActive: true,
        NOT: { NumeroPedido: null },
      },
      select: {
        FacturaID: true,
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
      // Saltar facturas ya asociadas a un pedido (no quedan "libres" para ese N°).
      if (idsAsociadas.has(f.FacturaID)) continue;

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
      // Excluir grupos cuyo N° de pedido ya tiene un pedido creado para ese emisor/proveedor.
      .filter((g) => !pedidosUsados.has(`${g.NumeroPedido}__${(g.RFC || '').trim().toUpperCase()}`))
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

  async findAll(
    texto?: string,
    fechaDesde?: string,
    fechaHasta?: string,
    page?: number,
    pageSize?: number,
    emisorRFC?: string,
  ) {
    const where: any = { IsActive: true };

    if (emisorRFC) {
      where.emisor = { RFC: emisorRFC.trim().toUpperCase() };
    }

    if (texto) {
      where.OR = [
        { Folio: { contains: texto } },
        { UUID: { contains: texto } },
        { NumeroPedido: { contains: texto } },
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

    const currentPage = Math.max(1, Math.floor(page ?? 1));
    const size = Math.min(200, Math.max(1, Math.floor(pageSize ?? 50)));
    const skip = (currentPage - 1) * size;

    const [facturas, agregado] = await Promise.all([
      prisma.facturas.findMany({
        where,
        skip,
        take: size,
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
      }),
      prisma.facturas.aggregate({
        where,
        _count: { FacturaID: true },
        _sum: { Total: true },
      }),
    ]);

    const total = agregado._count.FacturaID;
    const totalPages = Math.max(1, Math.ceil(total / size));

    const data = facturas.map((f) => ({
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

    return {
      data,
      meta: {
        total,
        page: currentPage,
        pageSize: size,
        totalPages,
        sumaTotal: Number(agregado._sum.Total ?? 0),
      },
    };
  }

  /**
   * Lista aplanada de conceptos (una fila por concepto) con datos denormalizados
   * de la factura y del emisor. Patron replicado desde pcoriente/server-pco-new
   * (facturaConcepto.model.getAllConceptos), adaptado a Prisma.
   */
  async findAllConceptos(
    texto?: string,
    fechaDesde?: string,
    fechaHasta?: string,
    page?: number,
    pageSize?: number,
  ) {
    const where: any = {
      factura: { IsActive: true },
    };

    if (texto) {
      where.OR = [
        { Descripcion: { contains: texto } },
        { NoIdentificacion: { contains: texto } },
        { ClaveProdServ: { contains: texto } },
        { factura: { UUID: { contains: texto } } },
        { factura: { Folio: { contains: texto } } },
        { factura: { NumeroPedido: { contains: texto } } },
        { factura: { emisor: { RFC: { contains: texto } } } },
        { factura: { emisor: { RazonSocial: { contains: texto } } } },
        { factura: { emisor: { Alias: { contains: texto } } } },
      ];
    }

    if (fechaDesde || fechaHasta) {
      where.factura = where.factura ?? {};
      where.factura.FechaEmision = {};
      if (fechaDesde) {
        where.factura.FechaEmision.gte = new Date(`${fechaDesde}T00:00:00.000Z`);
      }
      if (fechaHasta) {
        where.factura.FechaEmision.lte = new Date(`${fechaHasta}T23:59:59.999Z`);
      }
    }

    const currentPage = Math.max(1, Math.floor(page ?? 1));
    const size = Math.min(200, Math.max(1, Math.floor(pageSize ?? 50)));
    const skip = (currentPage - 1) * size;

    const [conceptos, agregado] = await Promise.all([
      prisma.factura_conceptos.findMany({
        where,
        skip,
        take: size,
        orderBy: [
          { factura: { FechaEmision: 'desc' } },
          { factura: { Folio: 'desc' } },
          { FacturaConceptoID: 'asc' },
        ],
        include: {
          factura: {
            select: {
              FacturaID: true,
              UUID: true,
              Serie: true,
              Folio: true,
              FechaEmision: true,
              FechaCarga: true,
              Total: true,
              SubTotal: true,
              NumeroPedido: true,
              emisor: {
                select: { EmisorFacturaID: true, RFC: true, RazonSocial: true, Alias: true },
              },
            },
          },
        },
      }),
      prisma.factura_conceptos.aggregate({
        where,
        _count: { FacturaConceptoID: true },
        _sum: { Importe: true },
      }),
    ]);

    const total = agregado._count.FacturaConceptoID;
    const totalPages = Math.max(1, Math.ceil(total / size));

    const data = conceptos.map((c) => ({
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
      factura: {
        FacturaID: c.factura.FacturaID,
        UUID: c.factura.UUID,
        Serie: c.factura.Serie,
        Folio: c.factura.Folio,
        FechaEmision: moment.utc(c.factura.FechaEmision).format('YYYY-MM-DD'),
        FechaCarga: moment.utc(c.factura.FechaCarga).format('YYYY-MM-DD'),
        Total: Number(c.factura.Total),
        SubTotal: Number(c.factura.SubTotal),
        NumeroPedido: c.factura.NumeroPedido,
        emisor: c.factura.emisor,
      },
    }));

    return {
      data,
      meta: {
        total,
        page: currentPage,
        pageSize: size,
        totalPages,
        sumaImporte: Number(agregado._sum.Importe ?? 0),
      },
    };
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
   * Sincroniza la columna NumeroPedido de un batch de facturas SIN validaciones
   * de negocio. Uso interno para propagacion desde pedidos:
   *  - cambio de NumeroPedido en pedidos_encabezado -> propagar a facturas asociadas
   *  - asociar factura al pedido -> asignar NumeroPedido
   *  - desasociar factura -> limpiar NumeroPedido
   *
   * No valida existencia, IsActive ni emisor. Confia en el caller. Idempotente.
   *
   * @param facturaIDs IDs a actualizar. Array vacio => noop.
   * @param numeroPedido Nuevo valor. `null` limpia la columna.
   * @param tx TransactionClient opcional para participar en una tx externa.
   */
  async syncNumeroPedidoBatch(
    facturaIDs: number[],
    numeroPedido: string | null,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const ids = [...new Set(facturaIDs)].filter((id) => Number.isFinite(id));
    if (ids.length === 0) return 0;

    const client = tx ?? prisma;
    const result = await client.facturas.updateMany({
      where: { FacturaID: { in: ids } },
      data: { NumeroPedido: numeroPedido && numeroPedido.trim() ? numeroPedido.trim() : null },
    });
    return result.count;
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
