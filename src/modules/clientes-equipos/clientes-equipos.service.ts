import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import {
  CreateClienteEquipoDto,
  UpdateClienteEquipoDto,
  RetirarEquipoDto,
  ClientesEquiposQueryDto,
} from './clientes-equipos.schema';

class ClientesEquiposService {
  // Crear asignación de equipo a cliente
  async create(data: CreateClienteEquipoDto) {
    // Validar cliente
    const cliente = await prisma.catalogo_clientes.findUnique({
      where: { ClienteID: data.ClienteID },
    });

    if (!cliente) {
      throw new HttpError('El cliente no existe', 404);
    }

    if (!cliente.IsActive) {
      throw new HttpError('El cliente no está activo', 300);
    }

    // Validar sucursal si se proporciona
    if (data.SucursalID) {
      const sucursal = await prisma.clientes_sucursales.findUnique({
        where: { SucursalID: data.SucursalID },
      });

      if (!sucursal) {
        throw new HttpError('La sucursal no existe', 404);
      }

      if (sucursal.ClienteID !== data.ClienteID) {
        throw new HttpError('La sucursal no pertenece al cliente', 300);
      }
    }

    // Validar equipo si se proporciona (para Purifreeze)
    if (data.EquipoID) {
      const equipo = await prisma.equipos.findUnique({
        where: { EquipoID: data.EquipoID },
      });

      if (!equipo) {
        throw new HttpError('El equipo no existe', 404);
      }

      if (equipo.IsActive !== 1) {
        throw new HttpError('El equipo no está activo', 300);
      }

      // Verificar que no esté ya asignado a otro cliente activo
      const asignacionExistente = await prisma.clientes_equipos.findFirst({
        where: {
          EquipoID: data.EquipoID,
          Estatus: 'ACTIVO',
          IsActive: 1,
        },
      });

      if (asignacionExistente) {
        throw new HttpError('El equipo ya está asignado a un cliente', 300);
      }
    }

    // Validar plantilla si se proporciona
    if (data.PlantillaEquipoID) {
      const plantilla = await prisma.plantillas_equipo.findUnique({
        where: { PlantillaEquipoID: data.PlantillaEquipoID },
      });

      if (!plantilla || plantilla.IsActive !== 1) {
        throw new HttpError('La plantilla no existe o no está activa', 404);
      }
    }

    // Crear asignación
    const clienteEquipo = await prisma.clientes_equipos.create({
      data: {
        ClienteID: data.ClienteID,
        SucursalID: data.SucursalID || null,
        EquipoID: data.EquipoID || null,
        PlantillaEquipoID: data.PlantillaEquipoID || null,
        TipoPropiedad: data.TipoPropiedad,
        ContratoID: data.ContratoID || null,
        PresupuestoDetalleID: data.PresupuestoDetalleID || null,
        VentaDetalleID: data.VentaDetalleID || null,
        DescripcionEquipo: data.DescripcionEquipo || null,
        NumeroSerieExterno: data.NumeroSerieExterno || null,
        MarcaEquipo: data.MarcaEquipo || null,
        ModeloEquipo: data.ModeloEquipo || null,
        FechaAsignacion: data.FechaAsignacion ? new Date(data.FechaAsignacion) : new Date(),
        Observaciones: data.Observaciones || null,
        UsuarioAsignaID: data.UsuarioAsignaID || null,
        Estatus: 'ACTIVO',
        IsActive: 1,
      },
    });

    return this.findOne(clienteEquipo.ClienteEquipoID);
  }

  // Obtener todos los equipos de clientes
  async findAll(query?: ClientesEquiposQueryDto) {
    const where: any = { IsActive: 1 };

    if (query?.tipoPropiedad) {
      where.TipoPropiedad = query.tipoPropiedad;
    }

    if (query?.estatus) {
      where.Estatus = query.estatus;
    }

    if (query?.sucursalId) {
      where.SucursalID = query.sucursalId;
    }

    const equipos = await prisma.clientes_equipos.findMany({
      where,
      orderBy: { ClienteEquipoID: 'desc' },
      include: {
        cliente: {
          select: { ClienteID: true, NombreComercio: true },
        },
        sucursal: {
          select: { SucursalID: true, NombreSucursal: true },
        },
        equipo: {
          select: {
            EquipoID: true,
            NumeroSerie: true,
            Estatus: true,
            plantilla: {
              select: { NombreEquipo: true, Codigo: true },
            },
          },
        },
        plantilla: {
          select: { PlantillaEquipoID: true, NombreEquipo: true, Codigo: true, EsExterno: true },
        },
        contrato: {
          select: { ContratoID: true, NumeroContrato: true, Estatus: true },
        },
        _count: {
          select: { servicios: true },
        },
      },
    });

    return { message: 'Equipos de clientes obtenidos', data: equipos };
  }

  // Obtener equipos por cliente
  async findByCliente(ClienteID: number, query?: ClientesEquiposQueryDto) {
    const where: any = { ClienteID, IsActive: 1 };

    if (query?.tipoPropiedad) {
      where.TipoPropiedad = query.tipoPropiedad;
    }

    if (query?.estatus) {
      where.Estatus = query.estatus;
    }

    if (query?.sucursalId) {
      where.SucursalID = query.sucursalId;
    }

    const equipos = await prisma.clientes_equipos.findMany({
      where,
      orderBy: { ClienteEquipoID: 'desc' },
      include: {
        cliente: {
          select: { ClienteID: true, NombreComercio: true },
        },
        sucursal: {
          select: { SucursalID: true, NombreSucursal: true },
        },
        equipo: {
          select: {
            EquipoID: true,
            NumeroSerie: true,
            Estatus: true,
            plantilla: {
              select: { NombreEquipo: true, Codigo: true },
            },
          },
        },
        plantilla: {
          select: { PlantillaEquipoID: true, NombreEquipo: true, Codigo: true, EsExterno: true },
        },
        contrato: {
          select: { ContratoID: true, NumeroContrato: true, Estatus: true },
        },
        _count: {
          select: { servicios: true },
        },
      },
    });

    return { message: 'Equipos del cliente obtenidos', data: equipos };
  }

  // Obtener un equipo de cliente por ID
  async findOne(ClienteEquipoID: number) {
    const clienteEquipo = await prisma.clientes_equipos.findUnique({
      where: { ClienteEquipoID },
      include: {
        cliente: {
          select: { ClienteID: true, NombreComercio: true, Observaciones: true },
        },
        sucursal: {
          select: { SucursalID: true, NombreSucursal: true, Direccion: true, Telefono: true, Contacto: true },
        },
        equipo: {
          select: {
            EquipoID: true,
            NumeroSerie: true,
            Estatus: true,
            FechaCreacion: true,
            FechaInstalacion: true,
            VecesReacondicionado: true,
            plantilla: {
              select: { PlantillaEquipoID: true, NombreEquipo: true, Codigo: true },
            },
            detalles: {
              where: { IsActive: 1 },
              include: {
                refaccion: {
                  select: { RefaccionID: true, NombrePieza: true, NombreCorto: true },
                },
              },
            },
          },
        },
        plantilla: {
          select: {
            PlantillaEquipoID: true,
            NombreEquipo: true,
            Codigo: true,
            EsExterno: true,
            PorcentajeVenta: true,
            PorcentajeRenta: true,
          },
        },
        contrato: {
          select: {
            ContratoID: true,
            NumeroContrato: true,
            Estatus: true,
            FechaInicio: true,
            FechaFin: true,
            MontoTotal: true,
          },
        },
        presupuesto_detalle: {
          select: {
            DetalleID: true,
            TipoItem: true,
            Modalidad: true,
            Cantidad: true,
            PrecioUnitario: true,
            Subtotal: true,
          },
        },
        venta_detalle: {
          select: {
            VentaDetalleID: true,
            TipoItem: true,
            Cantidad: true,
            PrecioUnitario: true,
            Subtotal: true,
            MesesGarantia: true,
            FechaFinGarantia: true,
          },
        },
        servicios: {
          where: { IsActive: 1 },
          orderBy: { FechaProgramada: 'desc' },
          take: 10,
          select: {
            ServicioID: true,
            TipoServicio: true,
            FechaProgramada: true,
            FechaEjecucion: true,
            Estatus: true,
            CostoTotal: true,
          },
        },
      },
    });

    if (!clienteEquipo) {
      throw new HttpError('Equipo de cliente no encontrado', 404);
    }

    return { message: 'Equipo de cliente obtenido', data: clienteEquipo };
  }

  // Actualizar equipo de cliente
  async update(ClienteEquipoID: number, data: UpdateClienteEquipoDto) {
    const clienteEquipo = await prisma.clientes_equipos.findUnique({
      where: { ClienteEquipoID },
    });

    if (!clienteEquipo) {
      throw new HttpError('Equipo de cliente no encontrado', 404);
    }

    if (clienteEquipo.Estatus !== 'ACTIVO') {
      throw new HttpError('Solo se pueden editar equipos con estatus ACTIVO', 300);
    }

    // Validar sucursal si se actualiza
    if (data.SucursalID) {
      const sucursal = await prisma.clientes_sucursales.findUnique({
        where: { SucursalID: data.SucursalID },
      });

      if (!sucursal) {
        throw new HttpError('La sucursal no existe', 404);
      }

      if (sucursal.ClienteID !== clienteEquipo.ClienteID) {
        throw new HttpError('La sucursal no pertenece al cliente', 300);
      }
    }

    await prisma.clientes_equipos.update({
      where: { ClienteEquipoID },
      data: {
        SucursalID: data.SucursalID !== undefined ? data.SucursalID : undefined,
        DescripcionEquipo: data.DescripcionEquipo !== undefined ? data.DescripcionEquipo : undefined,
        NumeroSerieExterno: data.NumeroSerieExterno !== undefined ? data.NumeroSerieExterno : undefined,
        MarcaEquipo: data.MarcaEquipo !== undefined ? data.MarcaEquipo : undefined,
        ModeloEquipo: data.ModeloEquipo !== undefined ? data.ModeloEquipo : undefined,
        Observaciones: data.Observaciones !== undefined ? data.Observaciones : undefined,
      },
    });

    return this.findOne(ClienteEquipoID);
  }

  // Retirar equipo de cliente
  async retirar(ClienteEquipoID: number, data: RetirarEquipoDto) {
    const clienteEquipo = await prisma.clientes_equipos.findUnique({
      where: { ClienteEquipoID },
    });

    if (!clienteEquipo) {
      throw new HttpError('Equipo de cliente no encontrado', 404);
    }

    if (clienteEquipo.Estatus !== 'ACTIVO') {
      throw new HttpError('El equipo ya no está activo', 300);
    }

    const updated = await prisma.clientes_equipos.update({
      where: { ClienteEquipoID },
      data: {
        Estatus: data.Estatus,
        FechaRetiro: new Date(),
        MotivoRetiro: data.MotivoRetiro,
      },
    });

    return { message: `Equipo ${data.Estatus.toLowerCase()}`, data: updated };
  }

  // Reactivar equipo
  async activar(ClienteEquipoID: number) {
    const clienteEquipo = await prisma.clientes_equipos.findUnique({
      where: { ClienteEquipoID },
    });

    if (!clienteEquipo) {
      throw new HttpError('Equipo de cliente no encontrado', 404);
    }

    if (clienteEquipo.Estatus === 'ACTIVO') {
      throw new HttpError('El equipo ya está activo', 300);
    }

    const updated = await prisma.clientes_equipos.update({
      where: { ClienteEquipoID },
      data: {
        Estatus: 'ACTIVO',
        FechaRetiro: null,
        MotivoRetiro: null,
      },
    });

    return { message: 'Equipo reactivado', data: updated };
  }

  // Dar de baja (soft delete)
  async baja(ClienteEquipoID: number) {
    const clienteEquipo = await prisma.clientes_equipos.findUnique({
      where: { ClienteEquipoID },
    });

    if (!clienteEquipo) {
      throw new HttpError('Equipo de cliente no encontrado', 404);
    }

    if (clienteEquipo.IsActive === 0) {
      throw new HttpError('El registro ya está dado de baja', 300);
    }

    const updated = await prisma.clientes_equipos.update({
      where: { ClienteEquipoID },
      data: { IsActive: 0 },
    });

    return { message: 'Registro dado de baja', data: updated };
  }
}

export const clientesEquiposService = new ClientesEquiposService();
