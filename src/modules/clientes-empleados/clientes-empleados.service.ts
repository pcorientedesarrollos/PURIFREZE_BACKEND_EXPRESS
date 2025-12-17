import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { CreateClienteEmpleadoDto, UpdateClienteEmpleadoDto, AsignarPuestosDto, AgregarPuestoDto } from './clientes-empleados.schema';

class ClientesEmpleadosService {
  async create(data: CreateClienteEmpleadoDto) {
    const { NombreEmpleado, PuestosTrabajoIDs, ClienteID, Observaciones } = data;

    // Validar que el nombre no exista
    const findEmpleado = await prisma.clientes_empleados.findFirst({
      where: { NombreEmpleado },
    });

    if (findEmpleado) {
      throw new HttpError('El nombre del empleado ya existe', 300);
    }

    // Validar que todos los puestos existan
    const puestosExistentes = await prisma.catalogo_puestosTrabajo.findMany({
      where: { PuestoTrabajoID: { in: PuestosTrabajoIDs } },
    });

    if (puestosExistentes.length !== PuestosTrabajoIDs.length) {
      throw new HttpError('Uno o más puestos de trabajo no existen', 300);
    }

    // Crear empleado con sus puestos en una transacción
    const empleado = await prisma.$transaction(async (tx) => {
      const nuevoEmpleado = await tx.clientes_empleados.create({
        data: {
          ClienteID,
          NombreEmpleado,
          Observaciones,
          IsActive: true,
        },
      });

      // Crear relaciones con los puestos
      await tx.empleados_puestos.createMany({
        data: PuestosTrabajoIDs.map((PuestoTrabajoID) => ({
          EmpleadoID: nuevoEmpleado.EmpleadoID,
          PuestoTrabajoID,
          IsActive: true,
        })),
      });

      // Retornar empleado con sus puestos
      return tx.clientes_empleados.findUnique({
        where: { EmpleadoID: nuevoEmpleado.EmpleadoID },
        include: {
          empleados_puestos: {
            include: {
              puesto: true,
            },
          },
        },
      });
    });

    return { message: 'Empleado Creado', data: empleado };
  }

  async findAll() {
    const allEmpleados = await prisma.clientes_empleados.findMany({
      orderBy: {
        EmpleadoID: 'desc',
      },
      include: {
        empleados_puestos: {
          where: { IsActive: true },
          include: {
            puesto: true,
          },
        },
      },
    });

    return { message: 'Empleados obtenidos', data: allEmpleados };
  }

  async findOne(EmpleadoID: number) {
    const empleado = await prisma.clientes_empleados.findUnique({
      where: { EmpleadoID },
      include: {
        empleados_puestos: {
          include: {
            puesto: true,
          },
        },
      },
    });

    if (!empleado) {
      throw new HttpError('Empleado no encontrado', 404);
    }

    return { message: 'Empleado obtenido', data: empleado };
  }

  async update(EmpleadoID: number, data: UpdateClienteEmpleadoDto) {
    const { NombreEmpleado } = data;

    const empleadoExist = await prisma.clientes_empleados.findUnique({
      where: { EmpleadoID },
    });

    if (!empleadoExist) {
      throw new HttpError('No existe el empleado', 404);
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
      include: {
        empleados_puestos: {
          where: { IsActive: true },
          include: {
            puesto: true,
          },
        },
      },
    });

    return { message: 'Empleado Actualizado', data: empleadoUpdate };
  }

  // Asignar múltiples puestos (reemplaza los existentes)
  async asignarPuestos(EmpleadoID: number, data: AsignarPuestosDto) {
    const { PuestosTrabajoIDs } = data;

    const empleadoExist = await prisma.clientes_empleados.findUnique({
      where: { EmpleadoID },
    });

    if (!empleadoExist) {
      throw new HttpError('No existe el empleado', 404);
    }

    // Validar que todos los puestos existan
    const puestosExistentes = await prisma.catalogo_puestosTrabajo.findMany({
      where: { PuestoTrabajoID: { in: PuestosTrabajoIDs } },
    });

    if (puestosExistentes.length !== PuestosTrabajoIDs.length) {
      throw new HttpError('Uno o más puestos de trabajo no existen', 300);
    }

    // Actualizar puestos en una transacción
    const empleado = await prisma.$transaction(async (tx) => {
      // Dar de baja todos los puestos actuales
      await tx.empleados_puestos.updateMany({
        where: { EmpleadoID },
        data: { IsActive: false },
      });

      // Crear o reactivar los nuevos puestos
      for (const PuestoTrabajoID of PuestosTrabajoIDs) {
        await tx.empleados_puestos.upsert({
          where: {
            EmpleadoID_PuestoTrabajoID: {
              EmpleadoID,
              PuestoTrabajoID,
            },
          },
          update: { IsActive: true },
          create: {
            EmpleadoID,
            PuestoTrabajoID,
            IsActive: true,
          },
        });
      }

      return tx.clientes_empleados.findUnique({
        where: { EmpleadoID },
        include: {
          empleados_puestos: {
            where: { IsActive: true },
            include: {
              puesto: true,
            },
          },
        },
      });
    });

    return { message: 'Puestos asignados correctamente', data: empleado };
  }

  // Agregar un puesto adicional
  async agregarPuesto(EmpleadoID: number, data: AgregarPuestoDto) {
    const { PuestoTrabajoID } = data;

    const empleadoExist = await prisma.clientes_empleados.findUnique({
      where: { EmpleadoID },
    });

    if (!empleadoExist) {
      throw new HttpError('No existe el empleado', 404);
    }

    const puestoExist = await prisma.catalogo_puestosTrabajo.findUnique({
      where: { PuestoTrabajoID },
    });

    if (!puestoExist) {
      throw new HttpError('El puesto de trabajo no existe', 300);
    }

    // Verificar si ya existe la relación
    const relacionExiste = await prisma.empleados_puestos.findUnique({
      where: {
        EmpleadoID_PuestoTrabajoID: {
          EmpleadoID,
          PuestoTrabajoID,
        },
      },
    });

    if (relacionExiste && relacionExiste.IsActive) {
      throw new HttpError('El empleado ya tiene asignado este puesto', 300);
    }

    // Crear o reactivar la relación
    await prisma.empleados_puestos.upsert({
      where: {
        EmpleadoID_PuestoTrabajoID: {
          EmpleadoID,
          PuestoTrabajoID,
        },
      },
      update: { IsActive: true },
      create: {
        EmpleadoID,
        PuestoTrabajoID,
        IsActive: true,
      },
    });

    const empleado = await prisma.clientes_empleados.findUnique({
      where: { EmpleadoID },
      include: {
        empleados_puestos: {
          where: { IsActive: true },
          include: {
            puesto: true,
          },
        },
      },
    });

    return { message: 'Puesto agregado correctamente', data: empleado };
  }

  // Quitar un puesto del empleado
  async quitarPuesto(EmpleadoID: number, PuestoTrabajoID: number) {
    const empleadoExist = await prisma.clientes_empleados.findUnique({
      where: { EmpleadoID },
    });

    if (!empleadoExist) {
      throw new HttpError('No existe el empleado', 404);
    }

    const relacionExiste = await prisma.empleados_puestos.findUnique({
      where: {
        EmpleadoID_PuestoTrabajoID: {
          EmpleadoID,
          PuestoTrabajoID,
        },
      },
    });

    if (!relacionExiste || !relacionExiste.IsActive) {
      throw new HttpError('El empleado no tiene asignado este puesto', 300);
    }

    // Verificar que no se quede sin puestos
    const puestosActivos = await prisma.empleados_puestos.count({
      where: {
        EmpleadoID,
        IsActive: true,
      },
    });

    if (puestosActivos <= 1) {
      throw new HttpError('El empleado debe tener al menos un puesto asignado', 300);
    }

    await prisma.empleados_puestos.update({
      where: {
        EmpleadoID_PuestoTrabajoID: {
          EmpleadoID,
          PuestoTrabajoID,
        },
      },
      data: { IsActive: false },
    });

    const empleado = await prisma.clientes_empleados.findUnique({
      where: { EmpleadoID },
      include: {
        empleados_puestos: {
          where: { IsActive: true },
          include: {
            puesto: true,
          },
        },
      },
    });

    return { message: 'Puesto removido correctamente', data: empleado };
  }

  // Obtener puestos de un empleado
  async getPuestos(EmpleadoID: number) {
    const empleadoExist = await prisma.clientes_empleados.findUnique({
      where: { EmpleadoID },
    });

    if (!empleadoExist) {
      throw new HttpError('No existe el empleado', 404);
    }

    const puestos = await prisma.empleados_puestos.findMany({
      where: {
        EmpleadoID,
        IsActive: true,
      },
      include: {
        puesto: true,
      },
    });

    return { message: 'Puestos del empleado obtenidos', data: puestos };
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
      include: {
        empleados_puestos: {
          include: {
            puesto: true,
          },
        },
      },
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
      include: {
        empleados_puestos: {
          include: {
            puesto: true,
          },
        },
      },
    });

    return { message: 'Empleado activado', data: empleadoUpdate };
  }
}

export const clientesEmpleadosService = new ClientesEmpleadosService();
