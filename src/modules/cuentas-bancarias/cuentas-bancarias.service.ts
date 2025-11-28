import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { CreateCuentaBancariaDto, UpdateCuentaBancariaDto } from './cuentas-bancarias.schema';
import moment from 'moment';

class CuentasBancariasService {
  async create(data: CreateCuentaBancariaDto) {
    const { CuentaBancaria, Saldo } = data;

    const findCuenta = await prisma.catalogo_cuentasBancarias.findFirst({
      where: { CuentaBancaria },
    });

    if (findCuenta) {
      throw new HttpError('El número de cuenta bancaria ya existe', 300);
    }

    // Transacción para crear cuenta y movimiento inicial
    const result = await prisma.$transaction(async (tx) => {
      const cuenta = await tx.catalogo_cuentasBancarias.create({
        data: {
          ...data,
          IsActive: true,
        },
      });

      // Crear movimiento bancario inicial
      await tx.historial_movimientos_bancarios.create({
        data: {
          CuentaBancariaID: cuenta.CuentaBancariaID,
          CuentaContableID: '',
          DescripcionMovimiento: 'Saldo Inicial',
          PagosID: 0,
          CobrosID: 0,
          FechaMovimiento: new Date(moment().format('YYYY-MM-DD')),
          EoI: true, // Es un ingreso
          MontoMovimiento: Saldo,
        },
      });

      return cuenta;
    });

    return { message: 'Cuenta Bancaria Creada', data: result };
  }

  async findAll() {
    const allCuentas = await prisma.catalogo_cuentasBancarias.findMany({
      orderBy: {
        CuentaBancariaID: 'desc',
      },
    });

    return { message: 'Cuentas Bancarias obtenidas', data: allCuentas };
  }

  async findOne(CuentaBancariaID: number) {
    const cuenta = await prisma.catalogo_cuentasBancarias.findUnique({
      where: { CuentaBancariaID },
    });

    if (!cuenta) {
      throw new HttpError('Cuenta Bancaria no encontrada', 404);
    }

    return { message: 'Cuenta Bancaria obtenida', data: cuenta };
  }

  async update(CuentaBancariaID: number, data: UpdateCuentaBancariaDto) {
    const { CuentaBancaria } = data;

    const cuentaExist = await prisma.catalogo_cuentasBancarias.findUnique({
      where: { CuentaBancariaID },
    });

    if (!cuentaExist) {
      throw new HttpError('No existe la cuenta bancaria', 404);
    }

    if (CuentaBancaria) {
      const nameInUse = await prisma.catalogo_cuentasBancarias.findFirst({
        where: {
          CuentaBancaria,
          CuentaBancariaID: { not: CuentaBancariaID },
        },
      });

      if (nameInUse) {
        throw new HttpError('El número de cuenta bancaria ya existe', 300);
      }
    }

    const cuentaUpdate = await prisma.catalogo_cuentasBancarias.update({
      where: { CuentaBancariaID },
      data,
    });

    return { message: 'Cuenta Bancaria Actualizada', data: cuentaUpdate };
  }

  async baja(CuentaBancariaID: number) {
    const cuentaValid = await prisma.catalogo_cuentasBancarias.findUnique({
      where: { CuentaBancariaID },
    });

    if (!cuentaValid) {
      throw new HttpError('La cuenta bancaria no existe', 404);
    }

    if (!cuentaValid.IsActive) {
      throw new HttpError('La cuenta bancaria ya ha sido dada de baja', 300);
    }

    const cuentaUpdate = await prisma.catalogo_cuentasBancarias.update({
      where: { CuentaBancariaID },
      data: { IsActive: false },
    });

    return { message: 'Cuenta Bancaria dada de baja', data: cuentaUpdate };
  }

  async activar(CuentaBancariaID: number) {
    const cuentaValid = await prisma.catalogo_cuentasBancarias.findUnique({
      where: { CuentaBancariaID },
    });

    if (!cuentaValid) {
      throw new HttpError('La cuenta bancaria no existe', 404);
    }

    if (cuentaValid.IsActive) {
      throw new HttpError('La cuenta bancaria ya ha sido activada', 300);
    }

    const cuentaUpdate = await prisma.catalogo_cuentasBancarias.update({
      where: { CuentaBancariaID },
      data: { IsActive: true },
    });

    return { message: 'Cuenta Bancaria activada', data: cuentaUpdate };
  }
}

export const cuentasBancariasService = new CuentasBancariasService();
