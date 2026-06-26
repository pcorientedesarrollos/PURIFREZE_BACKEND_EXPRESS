import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { CreateClienteDto, UpdateClienteDto } from './clientes.schema';

class ClientesService {
  async create(data: CreateClienteDto) {
    const { NombreComercio, Observaciones, Direccion, Ubicacion } = data;

    const findCliente = await prisma.catalogo_clientes.findFirst({
      where: { NombreComercio },
    });

    if (findCliente) {
      throw new HttpError('El nombre del comercio ya existe', 300);
    }

    // Usar transacción para crear cliente y dirección
    const result = await prisma.$transaction(async (tx) => {
      const cliente = await tx.catalogo_clientes.create({
        data: {
          NombreComercio,
          Observaciones,
          IsActive: true,
        },
      });

      if (Direccion || Ubicacion) {
        await tx.clientes_direcciones.create({
          data: {
            ClienteID: cliente.ClienteID,
            Direccion,
            Ubicacion,
            IsActive: true,
          },
        });
      }

      return cliente;
    });

    return { message: 'Cliente Creado', data: result };
  }

  async findAll(search?: string, isActive?: boolean) {
    const where: any = {};

    if (search && search.trim()) {
      where.OR = [
        { NombreComercio: { contains: search.trim() } },
        { Observaciones: { contains: search.trim() } },
        { sucursales: { some: { NombreSucursal: { contains: search.trim() } } } },
      ];
    }

    if (isActive !== undefined) {
      where.IsActive = isActive;
    }

    const allClientes = await prisma.catalogo_clientes.findMany({
      where,
      orderBy: { ClienteID: 'desc' },
      include: {
        sucursales: {
          select: { SucursalID: true, NombreSucursal: true, EsMatriz: true },
          where: { IsActive: true },
          orderBy: [{ EsMatriz: 'desc' }, { NombreSucursal: 'asc' }],
        },
      },
    });

    return { message: 'Clientes obtenidos', data: allClientes };
  }

  async findOne(ClienteID: number) {
    const cliente = await prisma.catalogo_clientes.findUnique({
      where: { ClienteID },
    });

    if (!cliente) {
      throw new HttpError('Cliente no encontrado', 404);
    }

    return { message: 'Cliente obtenido', data: cliente };
  }

  async update(ClienteID: number, data: UpdateClienteDto) {
    const { NombreComercio } = data;

    const clienteExist = await prisma.catalogo_clientes.findUnique({
      where: { ClienteID },
    });

    if (!clienteExist) {
      throw new HttpError('No existe el cliente', 404);
    }

    if (NombreComercio) {
      const nameInUse = await prisma.catalogo_clientes.findFirst({
        where: {
          NombreComercio,
          ClienteID: { not: ClienteID },
        },
      });

      if (nameInUse) {
        throw new HttpError('El nombre del comercio ya existe', 300);
      }
    }

    const clienteUpdate = await prisma.catalogo_clientes.update({
      where: { ClienteID },
      data,
    });

    return { message: 'Cliente Actualizado', data: clienteUpdate };
  }

  async baja(ClienteID: number) {
    const clienteValid = await prisma.catalogo_clientes.findUnique({
      where: { ClienteID },
    });

    if (!clienteValid) {
      throw new HttpError('El cliente no existe', 404);
    }

    if (!clienteValid.IsActive) {
      throw new HttpError('El cliente ya ha sido dado de baja', 300);
    }

    const clienteUpdate = await prisma.catalogo_clientes.update({
      where: { ClienteID },
      data: { IsActive: false },
    });

    return { message: 'Cliente dado de baja', data: clienteUpdate };
  }

  async activar(ClienteID: number) {
    const clienteValid = await prisma.catalogo_clientes.findUnique({
      where: { ClienteID },
    });

    if (!clienteValid) {
      throw new HttpError('El cliente no existe', 404);
    }

    if (clienteValid.IsActive) {
      throw new HttpError('El cliente ya ha sido activado', 300);
    }

    const clienteUpdate = await prisma.catalogo_clientes.update({
      where: { ClienteID },
      data: { IsActive: true },
    });

    return { message: 'Cliente activado', data: clienteUpdate };
  }

  async findDetalle(ClienteID: number) {
    const cliente = await prisma.catalogo_clientes.findUnique({
      where: { ClienteID },
      include: {
        sucursales: {
          orderBy: [{ EsMatriz: 'desc' }, { NombreSucursal: 'asc' }],
          include: {
            datosFiscales: {
              select: {
                DatosFiscalesID: true,
                RFC: true,
                RazonSocial: true,
                Regimen: true,
              },
            },
          },
        },
      },
    });

    if (!cliente) {
      throw new HttpError('Cliente no encontrado', 404);
    }

    // Obtener direcciones del cliente
    const direcciones = await prisma.clientes_direcciones.findMany({
      where: { ClienteID, IsActive: true },
      orderBy: { DireccionID: 'desc' },
    });

    // Obtener empleados con sus teléfonos y correos (activos e inactivos)
    const empleados = await prisma.clientes_empleados.findMany({
      where: { ClienteID },
      orderBy: [{ IsActive: 'desc' }, { NombreEmpleado: 'asc' }],
    });

    // Obtener teléfonos, correos, puestos y sucursales de cada empleado
    const empleadosConDetalle = await Promise.all(
      empleados.map(async (empleado) => {
        const telefonos = await prisma.clientes_telefonos.findMany({
          where: { EmpleadoID: empleado.EmpleadoID, IsActive: true },
        });

        const correos = await prisma.clientes_correos.findMany({
          where: { EmpleadoID: empleado.EmpleadoID, IsActive: true },
        });

        const empleados_puestos = await prisma.empleados_puestos.findMany({
          where: { EmpleadoID: empleado.EmpleadoID, IsActive: true },
          include: {
            puesto: true,
          },
        });

        const empleados_sucursales = await prisma.empleados_sucursales.findMany({
          where: { EmpleadoID: empleado.EmpleadoID, IsActive: true },
          include: { sucursal: true },
        });

        const empleados_asignaciones = await prisma.empleados_asignaciones.findMany({
          where: { EmpleadoID: empleado.EmpleadoID, IsActive: true },
          include: { sucursal: true },
        });

        // Combinar ambas fuentes, deduplicando por SucursalID
        const sucursalesViaAsignaciones = empleados_asignaciones.map(a => ({
          EmpleadoSucursalID: a.AsignacionID,
          EmpleadoID: a.EmpleadoID,
          SucursalID: a.SucursalID,
          IsActive: a.IsActive,
          sucursal: a.sucursal,
        }));

        const sucursalesIds = new Set(empleados_sucursales.map(es => es.SucursalID));
        const sucursalesExtra = sucursalesViaAsignaciones.filter(a => !sucursalesIds.has(a.SucursalID));
        const empleados_sucursales_merged = [...empleados_sucursales, ...sucursalesExtra];

        return {
          ...empleado,
          telefonos,
          correos,
          empleados_puestos,
          empleados_sucursales: empleados_sucursales_merged,
        };
      })
    );

    // Obtener correos directos del cliente (sin EmpleadoID)
    const correosCliente = await prisma.clientes_correos.findMany({
      where: {
        ClienteID,
        EmpleadoID: null,
        IsActive: true
      },
      orderBy: { CorreoID: 'desc' },
    });

    // Obtener datos fiscales
    const datosFiscales = await prisma.clientes_datosFiscales.findFirst({
      where: { ClienteID, IsActive: true },
    });

    return {
      message: 'Detalle del cliente obtenido',
      data: {
        ...cliente,
        direcciones,
        empleados: empleadosConDetalle,
        correos: correosCliente,
        datosFiscales,
      },
    };
  }
}

export const clientesService = new ClientesService();
