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

  async findAll() {
    const allClientes = await prisma.catalogo_clientes.findMany({
      orderBy: {
        ClienteID: 'desc',
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
          where: { IsActive: true },
          orderBy: { NombreSucursal: 'asc' },
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

    // Obtener empleados con sus teléfonos y correos
    const empleados = await prisma.clientes_empleados.findMany({
      where: { ClienteID, IsActive: true },
      orderBy: { NombreEmpleado: 'asc' },
    });

    // Obtener teléfonos, correos y puestos de cada empleado
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

        return {
          ...empleado,
          telefonos,
          correos,
          empleados_puestos,
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
