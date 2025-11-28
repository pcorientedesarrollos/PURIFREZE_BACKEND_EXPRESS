import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { CreateClienteEmpleadoDto, UpdateClienteEmpleadoDto } from './clientes-empleados.schema';

class ClientesEmpleadosService {
  async create(data: CreateClienteEmpleadoDto) {
    const { NombreEmpleado, PuestoTrabajoID } = data;

    const findEmpleado = await prisma.clientes_empleados.findFirst({
      where: { NombreEmpleado },
    });

    if (findEmpleado) {
      throw new HttpError('El nombre del empleado ya existe', 300);
    }

    const findPuestoTrabajo = await prisma.catalogo_puestosTrabajo.findUnique({
      where: { PuestoTrabajoID },
    });

    if (!findPuestoTrabajo) {
      throw new HttpError('El puesto de trabajo no existe', 300);
    }

    const empleado = await prisma.clientes_empleados.create({
      data: {
        ...data,
        IsActive: true,
      },
    });

    return { message: 'Empleado Creado', data: empleado };
  }

  async findAll() {
    const allEmpleados = await prisma.clientes_empleados.findMany({
      orderBy: {
        EmpleadoID: 'desc',
      },
    });

    return { message: 'Empleados obtenidos', data: allEmpleados };
  }

  async findOne(EmpleadoID: number) {
    const empleado = await prisma.clientes_empleados.findUnique({
      where: { EmpleadoID },
    });

    if (!empleado) {
      throw new HttpError('Empleado no encontrado', 404);
    }

    return { message: 'Empleado obtenido', data: empleado };
  }

  async update(EmpleadoID: number, data: UpdateClienteEmpleadoDto) {
    const { NombreEmpleado, PuestoTrabajoID } = data;

    const empleadoExist = await prisma.clientes_empleados.findUnique({
      where: { EmpleadoID },
    });

    if (!empleadoExist) {
      throw new HttpError('No existe el empleado', 404);
    }

    if (PuestoTrabajoID) {
      const findPuestoTrabajo = await prisma.catalogo_puestosTrabajo.findUnique({
        where: { PuestoTrabajoID },
      });

      if (!findPuestoTrabajo) {
        throw new HttpError('El puesto de trabajo no existe', 300);
      }
    }

    if (NombreEmpleado) {
      const nameInUse = await prisma.clientes_empleados.findFirst({
        where: {
          NombreEmpleado,
          EmpleadoID: { not: EmpleadoID },
        },
      });

      if (nameInUse) {
        throw new HttpError('El nombre del empleado ya existe', 300);
      }
    }

    const empleadoUpdate = await prisma.clientes_empleados.update({
      where: { EmpleadoID },
      data,
    });

    return { message: 'Empleado Actualizado', data: empleadoUpdate };
  }

  async baja(EmpleadoID: number) {
    const empleadoValid = await prisma.clientes_empleados.findUnique({
      where: { EmpleadoID },
    });

    if (!empleadoValid) {
      throw new HttpError('El empleado no existe', 404);
    }

    if (!empleadoValid.IsActive) {
      throw new HttpError('El empleado ya ha sido dado de baja', 300);
    }

    const empleadoUpdate = await prisma.clientes_empleados.update({
      where: { EmpleadoID },
      data: { IsActive: false },
    });

    return { message: 'Empleado dado de baja', data: empleadoUpdate };
  }

  async activar(EmpleadoID: number) {
    const empleadoValid = await prisma.clientes_empleados.findUnique({
      where: { EmpleadoID },
    });

    if (!empleadoValid) {
      throw new HttpError('El empleado no existe', 404);
    }

    if (empleadoValid.IsActive) {
      throw new HttpError('El empleado ya ha sido activado', 300);
    }

    const empleadoUpdate = await prisma.clientes_empleados.update({
      where: { EmpleadoID },
      data: { IsActive: true },
    });

    return { message: 'Empleado activado', data: empleadoUpdate };
  }
}

export const clientesEmpleadosService = new ClientesEmpleadosService();
