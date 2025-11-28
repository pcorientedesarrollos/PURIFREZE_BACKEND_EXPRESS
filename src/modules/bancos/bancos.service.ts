import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { CreateBancoDto, UpdateBancoDto } from './bancos.schema';

export class BancosService {
  /**
   * Crear un nuevo banco
   */
  async create(data: CreateBancoDto) {
    const { NombreBanco } = data;

    // Verificar si ya existe un banco con el mismo nombre
    const existingBanco = await prisma.catalogo_bancos.findFirst({
      where: { NombreBanco },
    });

    if (existingBanco) {
      throw new HttpError('El nombre del banco ya existe', 300);
    }

    const banco = await prisma.catalogo_bancos.create({
      data: {
        ...data,
        IsActive: true,
      },
    });

    return banco;
  }

  /**
   * Obtener todos los bancos
   */
  async findAll() {
    const bancos = await prisma.catalogo_bancos.findMany({
      orderBy: { BancoID: 'desc' },
    });

    return bancos;
  }

  /**
   * Obtener un banco por ID
   */
  async findOne(BancoID: number) {
    const banco = await prisma.catalogo_bancos.findUnique({
      where: { BancoID },
    });

    if (!banco) {
      throw new HttpError('Banco no encontrado', 404);
    }

    return banco;
  }

  /**
   * Actualizar un banco
   */
  async update(BancoID: number, data: UpdateBancoDto) {
    // Verificar que el banco existe
    const bancoExist = await prisma.catalogo_bancos.findUnique({
      where: { BancoID },
    });

    if (!bancoExist) {
      throw new HttpError('No existe el banco', 404);
    }

    // Verificar que el nombre no esté en uso por otro banco
    if (data.NombreBanco) {
      const nameInUse = await prisma.catalogo_bancos.findFirst({
        where: {
          NombreBanco: data.NombreBanco,
          BancoID: { not: BancoID },
        },
      });

      if (nameInUse) {
        throw new HttpError('El nombre del banco ya existe', 300);
      }
    }

    const banco = await prisma.catalogo_bancos.update({
      where: { BancoID },
      data,
    });

    return banco;
  }

  /**
   * Dar de baja un banco (soft delete)
   */
  async bajaBanco(BancoID: number) {
    const banco = await prisma.catalogo_bancos.findUnique({
      where: { BancoID },
    });

    if (!banco) {
      throw new HttpError('El banco no existe', 404);
    }

    if (!banco.IsActive) {
      throw new HttpError('El banco ya ha sido dado de baja', 300);
    }

    const bancoUpdated = await prisma.catalogo_bancos.update({
      where: { BancoID },
      data: { IsActive: false },
    });

    return bancoUpdated;
  }

  /**
   * Activar un banco
   */
  async activarBanco(BancoID: number) {
    const banco = await prisma.catalogo_bancos.findUnique({
      where: { BancoID },
    });

    if (!banco) {
      throw new HttpError('El banco no existe', 404);
    }

    if (banco.IsActive) {
      throw new HttpError('El banco ya ha sido activado', 300);
    }

    const bancoUpdated = await prisma.catalogo_bancos.update({
      where: { BancoID },
      data: { IsActive: true },
    });

    return bancoUpdated;
  }
}

// Exportar instancia singleton
export const bancosService = new BancosService();
