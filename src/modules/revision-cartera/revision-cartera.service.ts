import prisma from '../../config/database';

interface EquipoCartera {
  noSerie: string;
  nombreEquipo: string;
  activo: boolean;
}

interface ClienteCarteraGuardar {
  ClienteViejoID: number;
  NombreCliente: string;
  PagoMensual: number;
  ClienteActivo: boolean;
  Equipos: EquipoCartera[];
}

export class RevisionCarteraService {

  async getClientes() {
    // 1. Leer clientes + equipos del sistema anterior (cross-DB query)
    const rows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT
        c.idcliente            AS ClienteViejoID,
        c.nombreComercio       AS NombreComercio,
        c.razon_social         AS RazonSocial,
        ec.total               AS PagoMensual,
        ee.nombreEquipo        AS NombreEquipo,
        es.NoSerie             AS NoSerie
      FROM \`purifreze\`.\`clientes\` c
      INNER JOIN \`purifreze\`.\`equipos_cliente\` ec
        ON ec.idCliente = c.idcliente
      INNER JOIN \`purifreze\`.\`equipos_cliente_detalle\` ecd
        ON ecd.idEquipoCliente = ec.idEquipoCliente
      INNER JOIN \`purifreze\`.\`equipos_serie\` es
        ON es.idEquipoSerie = ecd.idEquipoSerie
      INNER JOIN \`purifreze\`.\`equipo_encabezado\` ee
        ON ee.idEquipoEncabezado = es.idEquipoEncabezado
      WHERE c.estado = '0'
        AND ec.estado = 0
        AND es.estado = 1
      ORDER BY c.idcliente, ec.idEquipoCliente, ee.nombreEquipo
    `);

    // 2. Agrupar por cliente
    const clientesMap = new Map<number, {
      ClienteViejoID: number;
      NombreCliente: string;
      PagoMensual: number;
      Equipos: EquipoCartera[];
    }>();

    for (const r of rows) {
      const id = Number(r.ClienteViejoID);
      if (!clientesMap.has(id)) {
        clientesMap.set(id, {
          ClienteViejoID: id,
          NombreCliente: r.NombreComercio || r.RazonSocial || `Cliente #${id}`,
          PagoMensual: Number(r.PagoMensual) || 0,
          Equipos: [],
        });
      }
      clientesMap.get(id)!.Equipos.push({
        noSerie: r.NoSerie || '—',
        nombreEquipo: r.NombreEquipo || '—',
        activo: true,
      });
    }

    // 3. Leer selecciones guardadas previamente
    const guardados = await prisma.revision_cartera.findMany();
    const guardadosMap = new Map(guardados.map(g => [g.ClienteViejoID, g]));

    // 4. Mezclar estado guardado con datos frescos del sistema anterior
    const resultado = Array.from(clientesMap.values()).map(cliente => {
      const guardado = guardadosMap.get(cliente.ClienteViejoID);
      if (!guardado) {
        return { ...cliente, ClienteActivo: true };
      }

      const equiposGuardados: EquipoCartera[] = guardado.Equipos as any;
      const equiposMap = new Map(equiposGuardados.map(e => [e.noSerie, e.activo]));

      return {
        ...cliente,
        ClienteActivo: guardado.ClienteActivo,
        Equipos: cliente.Equipos.map(eq => ({
          ...eq,
          activo: equiposMap.has(eq.noSerie) ? (equiposMap.get(eq.noSerie) ?? true) : true,
        })),
      };
    });

    return resultado;
  }

  async guardarSeleccion(clientes: ClienteCarteraGuardar[]) {
    const operaciones = clientes.map(cliente =>
      prisma.revision_cartera.upsert({
        where: { ClienteViejoID: cliente.ClienteViejoID },
        update: {
          NombreCliente: cliente.NombreCliente,
          ClienteActivo: cliente.ClienteActivo,
          Equipos: cliente.Equipos as any,
          PagoMensual: cliente.PagoMensual,
          FechaRevision: new Date(),
        },
        create: {
          ClienteViejoID: cliente.ClienteViejoID,
          NombreCliente: cliente.NombreCliente,
          ClienteActivo: cliente.ClienteActivo,
          Equipos: cliente.Equipos as any,
          PagoMensual: cliente.PagoMensual,
        },
      })
    );

    await prisma.$transaction(operaciones);
    return { total: clientes.length };
  }

  async getResumen() {
    const guardados = await prisma.revision_cartera.findMany();

    const totalRevisados = guardados.length;
    const clientesActivos = guardados.filter(g => g.ClienteActivo).length;
    const clientesInactivos = guardados.filter(g => !g.ClienteActivo).length;

    const equiposActivos = guardados.reduce((sum, g) => {
      const equipos = g.Equipos as EquipoCartera[];
      return sum + equipos.filter(e => e.activo).length;
    }, 0);

    const equiposInactivos = guardados.reduce((sum, g) => {
      const equipos = g.Equipos as EquipoCartera[];
      return sum + equipos.filter(e => !e.activo).length;
    }, 0);

    return {
      totalRevisados,
      clientesActivos,
      clientesInactivos,
      equiposActivos,
      equiposInactivos,
    };
  }
}

export const revisionCarteraService = new RevisionCarteraService();
