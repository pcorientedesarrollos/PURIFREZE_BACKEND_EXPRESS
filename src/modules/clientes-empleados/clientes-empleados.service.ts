import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import {
  CreateClienteEmpleadoDto,
  UpdateClienteEmpleadoDto,
  AsignarAsignacionesDto,
  AsignarPuestosDto,
  AgregarPuestoDto,
  AsignarSucursalesDto,
  AgregarSucursalDto,
} from './clientes-empleados.schema';

const empleadoInclude = {
  empleados_asignaciones: {
    where: { IsActive: true },
    include: {
      sucursal: true,
      puesto: true,
    },
  },
  empleados_sucursales: {
    where: { IsActive: true },
    include: {
      sucursal: {
        include: {
          cliente: true,
        },
      },
    },
  },
  empleados_puestos: {
    where: { IsActive: true },
    include: {
      puesto: true,
    },
  },
};

class ClientesEmpleadosService {
  async create(data: CreateClienteEmpleadoDto) {
    const { ClienteID, NombreEmpleado, Asignaciones, Observaciones } = data;

    const empleado = await prisma.$transaction(async (tx) => {
      const cliente = await tx.catalogo_clientes.findUnique({
        where: { ClienteID },
      });

      if (!cliente) {
        throw new HttpError('El cliente no existe', 404);
      }

      const sucursalIDs = [...new Set(Asignaciones.map(a => a.SucursalID))];
      const puestoIDs = [...new Set(Asignaciones.map(a => a.PuestoTrabajoID))];

      const sucursalesExistentes = await tx.clientes_sucursales.findMany({
        where: { SucursalID: { in: sucursalIDs }, ClienteID },
      });

      if (sucursalesExistentes.length !== sucursalIDs.length) {
        throw new HttpError('Una o más sucursales no existen o no pertenecen al cliente', 300);
      }

      const puestosExistentes = await tx.catalogo_puestosTrabajo.findMany({
        where: { PuestoTrabajoID: { in: puestoIDs } },
      });

      if (puestosExistentes.length !== puestoIDs.length) {
        throw new HttpError('Uno o más puestos de trabajo no existen', 300);
      }

      const findEmpleado = await tx.clientes_empleados.findFirst({
        where: { NombreEmpleado, ClienteID, IsActive: true },
      });

      if (findEmpleado) {
        throw new HttpError('El nombre del empleado ya existe para este cliente', 300);
      }

      const nuevoEmpleado = await tx.clientes_empleados.create({
        data: {
          ClienteID,
          NombreEmpleado,
          Observaciones,
          IsActive: true,
        },
      });

      await tx.empleados_asignaciones.createMany({
        data: Asignaciones.map(a => ({
          EmpleadoID: nuevoEmpleado.EmpleadoID,
          SucursalID: a.SucursalID,
          PuestoTrabajoID: a.PuestoTrabajoID,
          IsActive: true,
        })),
      });

      return tx.clientes_empleados.findUnique({
        where: { EmpleadoID: nuevoEmpleado.EmpleadoID },
        include: empleadoInclude,
      });
    });

    return { message: 'Empleado Creado', data: empleado };
  }

  async findAll() {
    const allEmpleados = await prisma.clientes_empleados.findMany({
      orderBy: { EmpleadoID: 'desc' },
      include: empleadoInclude,
    });

    return { message: 'Empleados obtenidos', data: allEmpleados };
  }

  async findOne(EmpleadoID: number) {
    const empleado = await prisma.clientes_empleados.findUnique({
      where: { EmpleadoID },
      include: empleadoInclude,
    });

    if (!empleado) {
      throw new HttpError('Empleado no encontrado', 404);
    }

    return { message: 'Empleado obtenido', data: empleado };
  }

  async findBySucursal(SucursalID: number) {
    const sucursal = await prisma.clientes_sucursales.findUnique({
      where: { SucursalID },
      include: { cliente: true },
    });

    if (!sucursal) {
      throw new HttpError('La sucursal no existe', 404);
    }

    // Empleados via asignaciones (nuevo)
    const porAsignaciones = await prisma.empleados_asignaciones.findMany({
      where: { SucursalID, IsActive: true },
      include: {
        empleado: { include: empleadoInclude },
      },
    });

    // Empleados via legacy sucursales (compatibilidad)
    const porSucursales = await prisma.empleados_sucursales.findMany({
      where: { SucursalID, IsActive: true },
      include: {
        empleado: { include: empleadoInclude },
      },
    });

    const vistos = new Set<number>();
    const empleados: typeof porAsignaciones[0]['empleado'][] = [];

    for (const r of porAsignaciones) {
      if (!vistos.has(r.empleado.EmpleadoID)) {
        vistos.add(r.empleado.EmpleadoID);
        empleados.push(r.empleado);
      }
    }
    for (const r of porSucursales) {
      if (!vistos.has(r.empleado.EmpleadoID)) {
        vistos.add(r.empleado.EmpleadoID);
        empleados.push(r.empleado);
      }
    }

    return {
      message: 'Empleados de la sucursal obtenidos',
      data: { sucursal, empleados },
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
            ClienteID: empleadoExist.ClienteID,
            EmpleadoID: { not: EmpleadoID },
            IsActive: true,
          },
        });

        if (nameInUse) {
          throw new HttpError('El nombre del empleado ya existe para este cliente', 300);
        }
      }

      return tx.clientes_empleados.update({
        where: { EmpleadoID },
        data,
        include: empleadoInclude,
      });
    });

    return { message: 'Empleado Actualizado', data: empleadoUpdate };
  }

  // =============================================
  // ASIGNACIONES SUCURSAL-PUESTO (nuevo)
  // =============================================

  async asignarAsignaciones(EmpleadoID: number, data: AsignarAsignacionesDto) {
    const { Asignaciones } = data;

    const empleadoExist = await prisma.clientes_empleados.findUnique({
      where: { EmpleadoID },
    });

    if (!empleadoExist) {
      throw new HttpError('No existe el empleado', 404);
    }

    const sucursalIDs = [...new Set(Asignaciones.map(a => a.SucursalID))];
    const puestoIDs = [...new Set(Asignaciones.map(a => a.PuestoTrabajoID))];

    const sucursalesExistentes = await prisma.clientes_sucursales.findMany({
      where: { SucursalID: { in: sucursalIDs }, ClienteID: empleadoExist.ClienteID! },
    });

    if (sucursalesExistentes.length !== sucursalIDs.length) {
      throw new HttpError('Una o más sucursales no existen o no pertenecen al cliente', 300);
    }

    const puestosExistentes = await prisma.catalogo_puestosTrabajo.findMany({
      where: { PuestoTrabajoID: { in: puestoIDs } },
    });

    if (puestosExistentes.length !== puestoIDs.length) {
      throw new HttpError('Uno o más puestos de trabajo no existen', 300);
    }

    const empleado = await prisma.$transaction(async (tx) => {
      await tx.empleados_asignaciones.updateMany({
        where: { EmpleadoID },
        data: { IsActive: false },
      });

      for (const a of Asignaciones) {
        await tx.empleados_asignaciones.upsert({
          where: { EmpleadoID_SucursalID_PuestoTrabajoID: { EmpleadoID, SucursalID: a.SucursalID, PuestoTrabajoID: a.PuestoTrabajoID } },
          update: { IsActive: true },
          create: { EmpleadoID, SucursalID: a.SucursalID, PuestoTrabajoID: a.PuestoTrabajoID, IsActive: true },
        });
      }

      return tx.clientes_empleados.findUnique({
        where: { EmpleadoID },
        include: empleadoInclude,
      });
    });

    return { message: 'Asignaciones actualizadas correctamente', data: empleado };
  }

  // =============================================
  // GESTIÓN DE PUESTOS (legacy)
  // =============================================

  async asignarPuestos(EmpleadoID: number, data: AsignarPuestosDto) {
    const { PuestosTrabajoIDs } = data;

    const empleadoExist = await prisma.clientes_empleados.findUnique({
      where: { EmpleadoID },
    });

    if (!empleadoExist) {
      throw new HttpError('No existe el empleado', 404);
    }

    const puestosExistentes = await prisma.catalogo_puestosTrabajo.findMany({
      where: { PuestoTrabajoID: { in: PuestosTrabajoIDs } },
    });

    if (puestosExistentes.length !== PuestosTrabajoIDs.length) {
      throw new HttpError('Uno o más puestos de trabajo no existen', 300);
    }

    const empleado = await prisma.$transaction(async (tx) => {
      await tx.empleados_puestos.updateMany({
        where: { EmpleadoID },
        data: { IsActive: false },
      });

      for (const PuestoTrabajoID of PuestosTrabajoIDs) {
        await tx.empleados_puestos.upsert({
          where: { EmpleadoID_PuestoTrabajoID: { EmpleadoID, PuestoTrabajoID } },
          update: { IsActive: true },
          create: { EmpleadoID, PuestoTrabajoID, IsActive: true },
        });
      }

      return tx.clientes_empleados.findUnique({
        where: { EmpleadoID },
        include: empleadoInclude,
      });
    });

    return { message: 'Puestos asignados correctamente', data: empleado };
  }

  async agregarPuesto(EmpleadoID: number, data: AgregarPuestoDto) {
    const { PuestoTrabajoID } = data;

    const empleadoExist = await prisma.clientes_empleados.findUnique({ where: { EmpleadoID } });
    if (!empleadoExist) throw new HttpError('No existe el empleado', 404);

    const puestoExist = await prisma.catalogo_puestosTrabajo.findUnique({ where: { PuestoTrabajoID } });
    if (!puestoExist) throw new HttpError('El puesto de trabajo no existe', 300);

    const relacionExiste = await prisma.empleados_puestos.findUnique({
      where: { EmpleadoID_PuestoTrabajoID: { EmpleadoID, PuestoTrabajoID } },
    });

    if (relacionExiste && relacionExiste.IsActive) {
      throw new HttpError('El empleado ya tiene asignado este puesto', 300);
    }

    await prisma.empleados_puestos.upsert({
      where: { EmpleadoID_PuestoTrabajoID: { EmpleadoID, PuestoTrabajoID } },
      update: { IsActive: true },
      create: { EmpleadoID, PuestoTrabajoID, IsActive: true },
    });

    const empleado = await prisma.clientes_empleados.findUnique({
      where: { EmpleadoID },
      include: empleadoInclude,
    });

    return { message: 'Puesto agregado correctamente', data: empleado };
  }

  async quitarPuesto(EmpleadoID: number, PuestoTrabajoID: number) {
    const empleadoExist = await prisma.clientes_empleados.findUnique({ where: { EmpleadoID } });
    if (!empleadoExist) throw new HttpError('No existe el empleado', 404);

    const relacionExiste = await prisma.empleados_puestos.findUnique({
      where: { EmpleadoID_PuestoTrabajoID: { EmpleadoID, PuestoTrabajoID } },
    });

    if (!relacionExiste || !relacionExiste.IsActive) {
      throw new HttpError('El empleado no tiene asignado este puesto', 300);
    }

    const puestosActivos = await prisma.empleados_puestos.count({
      where: { EmpleadoID, IsActive: true },
    });

    if (puestosActivos <= 1) {
      throw new HttpError('El empleado debe tener al menos un puesto asignado', 300);
    }

    await prisma.empleados_puestos.update({
      where: { EmpleadoID_PuestoTrabajoID: { EmpleadoID, PuestoTrabajoID } },
      data: { IsActive: false },
    });

    const empleado = await prisma.clientes_empleados.findUnique({
      where: { EmpleadoID },
      include: empleadoInclude,
    });

    return { message: 'Puesto removido correctamente', data: empleado };
  }

  async getPuestos(EmpleadoID: number) {
    const empleadoExist = await prisma.clientes_empleados.findUnique({ where: { EmpleadoID } });
    if (!empleadoExist) throw new HttpError('No existe el empleado', 404);

    const puestos = await prisma.empleados_puestos.findMany({
      where: { EmpleadoID, IsActive: true },
      include: { puesto: true },
    });

    return { message: 'Puestos del empleado obtenidos', data: puestos };
  }

  // =============================================
  // GESTIÓN DE SUCURSALES (legacy)
  // =============================================

  async asignarSucursales(EmpleadoID: number, data: AsignarSucursalesDto) {
    const { SucursalesIDs } = data;

    const empleadoExist = await prisma.clientes_empleados.findUnique({ where: { EmpleadoID } });
    if (!empleadoExist) throw new HttpError('No existe el empleado', 404);

    const sucursalesExistentes = await prisma.clientes_sucursales.findMany({
      where: { SucursalID: { in: SucursalesIDs }, ClienteID: empleadoExist.ClienteID! },
    });

    if (sucursalesExistentes.length !== SucursalesIDs.length) {
      throw new HttpError('Una o más sucursales no existen o no pertenecen al cliente', 300);
    }

    const empleado = await prisma.$transaction(async (tx) => {
      await tx.empleados_sucursales.updateMany({
        where: { EmpleadoID },
        data: { IsActive: false },
      });

      for (const SucursalID of SucursalesIDs) {
        await tx.empleados_sucursales.upsert({
          where: { EmpleadoID_SucursalID: { EmpleadoID, SucursalID } },
          update: { IsActive: true },
          create: { EmpleadoID, SucursalID, IsActive: true },
        });
      }

      return tx.clientes_empleados.findUnique({
        where: { EmpleadoID },
        include: empleadoInclude,
      });
    });

    return { message: 'Sucursales asignadas correctamente', data: empleado };
  }

  async agregarSucursal(EmpleadoID: number, data: AgregarSucursalDto) {
    const { SucursalID } = data;

    const empleadoExist = await prisma.clientes_empleados.findUnique({ where: { EmpleadoID } });
    if (!empleadoExist) throw new HttpError('No existe el empleado', 404);

    const sucursalExist = await prisma.clientes_sucursales.findUnique({ where: { SucursalID } });
    if (!sucursalExist) throw new HttpError('La sucursal no existe', 404);

    if (sucursalExist.ClienteID !== empleadoExist.ClienteID) {
      throw new HttpError('La sucursal no pertenece al cliente del empleado', 300);
    }

    const relacionExiste = await prisma.empleados_sucursales.findUnique({
      where: { EmpleadoID_SucursalID: { EmpleadoID, SucursalID } },
    });

    if (relacionExiste && relacionExiste.IsActive) {
      throw new HttpError('El empleado ya tiene asignada esta sucursal', 300);
    }

    await prisma.empleados_sucursales.upsert({
      where: { EmpleadoID_SucursalID: { EmpleadoID, SucursalID } },
      update: { IsActive: true },
      create: { EmpleadoID, SucursalID, IsActive: true },
    });

    const empleado = await prisma.clientes_empleados.findUnique({
      where: { EmpleadoID },
      include: empleadoInclude,
    });

    return { message: 'Sucursal agregada correctamente', data: empleado };
  }

  async quitarSucursal(EmpleadoID: number, SucursalID: number) {
    const empleadoExist = await prisma.clientes_empleados.findUnique({ where: { EmpleadoID } });
    if (!empleadoExist) throw new HttpError('No existe el empleado', 404);

    const relacionExiste = await prisma.empleados_sucursales.findUnique({
      where: { EmpleadoID_SucursalID: { EmpleadoID, SucursalID } },
    });

    if (!relacionExiste || !relacionExiste.IsActive) {
      throw new HttpError('El empleado no tiene asignada esta sucursal', 300);
    }

    const sucursalesActivas = await prisma.empleados_sucursales.count({
      where: { EmpleadoID, IsActive: true },
    });

    if (sucursalesActivas <= 1) {
      throw new HttpError('El empleado debe tener al menos una sucursal asignada', 300);
    }

    await prisma.empleados_sucursales.update({
      where: { EmpleadoID_SucursalID: { EmpleadoID, SucursalID } },
      data: { IsActive: false },
    });

    const empleado = await prisma.clientes_empleados.findUnique({
      where: { EmpleadoID },
      include: empleadoInclude,
    });

    return { message: 'Sucursal removida correctamente', data: empleado };
  }

  async getSucursales(EmpleadoID: number) {
    const empleadoExist = await prisma.clientes_empleados.findUnique({ where: { EmpleadoID } });
    if (!empleadoExist) throw new HttpError('No existe el empleado', 404);

    const sucursales = await prisma.empleados_sucursales.findMany({
      where: { EmpleadoID, IsActive: true },
      include: { sucursal: true },
    });

    return { message: 'Sucursales del empleado obtenidas', data: sucursales };
  }

  // =============================================
  // BAJA Y ACTIVACIÓN
  // =============================================

  async baja(EmpleadoID: number) {
    const empleadoValid = await prisma.clientes_empleados.findUnique({ where: { EmpleadoID } });
    if (!empleadoValid) throw new HttpError('El empleado no existe', 404);
    if (!empleadoValid.IsActive) throw new HttpError('El empleado ya ha sido dado de baja', 300);

    const empleadoUpdate = await prisma.clientes_empleados.update({
      where: { EmpleadoID },
      data: { IsActive: false },
      include: empleadoInclude,
    });

    return { message: 'Empleado dado de baja', data: empleadoUpdate };
  }

  async activar(EmpleadoID: number) {
    const empleadoValid = await prisma.clientes_empleados.findUnique({ where: { EmpleadoID } });
    if (!empleadoValid) throw new HttpError('El empleado no existe', 404);
    if (empleadoValid.IsActive) throw new HttpError('El empleado ya ha sido activado', 300);

    const empleadoUpdate = await prisma.clientes_empleados.update({
      where: { EmpleadoID },
      data: { IsActive: true },
      include: empleadoInclude,
    });

    return { message: 'Empleado activado', data: empleadoUpdate };
  }
}

export const clientesEmpleadosService = new ClientesEmpleadosService();
