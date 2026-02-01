import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { CreateClienteEmpleadoDto, UpdateClienteEmpleadoDto, AsignarPuestosDto, AgregarPuestoDto } from './clientes-empleados.schema';

class ClientesEmpleadosService {
  async create(data: CreateClienteEmpleadoDto) {
    const { NombreEmpleado, PuestosTrabajoIDs, SucursalID, Observaciones } = data;

    // Crear empleado con sus puestos en una transacción (validaciones dentro para evitar race conditions)
    const empleado = await prisma.$transaction(async (tx) => {
      // Validar que la sucursal exista
      const sucursal = await tx.clientes_sucursales.findUnique({
        where: { SucursalID },
      });

      if (!sucursal) {
        throw new HttpError('La sucursal no existe', 404);
      }

      // Validar que el nombre no exista en la misma sucursal (solo activos)
      const findEmpleado = await tx.clientes_empleados.findFirst({
        where: { NombreEmpleado, SucursalID, IsActive: true },
      });

      if (findEmpleado) {
        throw new HttpError('El nombre del empleado ya existe en esta sucursal', 300);
      }

      // Validar que todos los puestos existan
      const puestosExistentes = await tx.catalogo_puestosTrabajo.findMany({
        where: { PuestoTrabajoID: { in: PuestosTrabajoIDs } },
      });

      if (puestosExistentes.length !== PuestosTrabajoIDs.length) {
        throw new HttpError('Uno o más puestos de trabajo no existen', 300);
      }

      const nuevoEmpleado = await tx.clientes_empleados.create({
        data: {
          ClienteID: sucursal.ClienteID,
          SucursalID,
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

      // Retornar empleado con sus puestos y sucursal
      return tx.clientes_empleados.findUnique({
        where: { EmpleadoID: nuevoEmpleado.EmpleadoID },
        include: {
          sucursal: true,
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
        sucursal: {
          include: {
            cliente: true,
          },
        },
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
        sucursal: {
          include: {
            cliente: true,
          },
        },
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

  async findBySucursal(SucursalID: number) {
    // Validar que la sucursal exista
    const sucursal = await prisma.clientes_sucursales.findUnique({
      where: { SucursalID },
      include: {
        cliente: true,
      },
    });

    if (!sucursal) {
      throw new HttpError('La sucursal no existe', 404);
    }

    const empleados = await prisma.clientes_empleados.findMany({
      where: { SucursalID },
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

    return {
      message: 'Empleados de la sucursal obtenidos',
      data: {
        sucursal,
        empleados,
      },
    };
  }

  async update(EmpleadoID: number, data: UpdateClienteEmpleadoDto) {
    const { NombreEmpleado } = data;

    const empleadoUpdate = await prisma.$transaction(async (tx) => {
      const empleadoExist = await tx.clientes_empleados.findUnique({
        where: { EmpleadoID },
      });

      if (!empleadoExist) {
        throw new HttpError('No existe el empleado', 404);
      }

      if (NombreEmpleado) {
        const nameInUse = await tx.clientes_empleados.findFirst({
          where: {
            NombreEmpleado,
            SucursalID: empleadoExist.SucursalID,
            EmpleadoID: { not: EmpleadoID },
            IsActive: true,
          },
        });

        if (nameInUse) {
          throw new HttpError('El nombre del empleado ya existe en esta sucursal', 300);
        }
      }

      return tx.clientes_empleados.update({
        where: { EmpleadoID },
        data,
        include: {
          sucursal: {
            include: {
              cliente: true,
            },
          },
          empleados_puestos: {
            where: { IsActive: true },
            include: {
              puesto: true,
            },
          },
        },
      });
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
          sucursal: {
            include: {
              cliente: true,
            },
          },
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
        sucursal: {
          include: {
            cliente: true,
          },
        },
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
        sucursal: {
          include: {
            cliente: true,
          },
        },
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
        sucursal: {
          include: {
            cliente: true,
          },
        },
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
        sucursal: {
          include: {
            cliente: true,
          },
        },
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
