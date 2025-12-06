import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { Prisma } from '@prisma/client';
import moment from 'moment';
import {
  CreatePlantillaEquipoDto,
  UpdatePlantillaEquipoDto,
} from './plantillas-equipo.schema';

class PlantillasEquipoService {
  /**
   * Crea una nueva plantilla de equipo
   */
  async create(dto: CreatePlantillaEquipoDto) {
    // Validar que no haya refacciones duplicadas en la lista
    this.validarRefaccionesDuplicadas(dto.Detalles);

    const result = await prisma.$transaction(async (tx) => {
      // Validar código único si se proporciona
      if (dto.Codigo) {
        await this.validarCodigoUnico(tx, dto.Codigo);
      }

      // Validar que las refacciones existan y estén activas
      await this.validarRefaccionesExisten(tx, dto.Detalles.map(d => d.RefaccionID));

      // Crear la plantilla
      const plantilla = await tx.plantillas_equipo.create({
        data: {
          Codigo: dto.Codigo || null,
          NombreEquipo: dto.NombreEquipo,
          Observaciones: dto.Observaciones || null,
          EsExterno: dto.EsExterno ? 1 : 0,
          PorcentajeVenta: dto.PorcentajeVenta,
          PorcentajeRenta: dto.PorcentajeRenta,
          IsActive: 1,
          FechaCreacion: new Date(),
        },
      });

      // Crear los detalles
      for (const detalle of dto.Detalles) {
        await tx.plantillas_equipo_detalle.create({
          data: {
            PlantillaEquipoID: plantilla.PlantillaEquipoID,
            RefaccionID: detalle.RefaccionID,
            Cantidad: detalle.Cantidad,
            IsActive: 1,
          },
        });
      }

      return plantilla;
    });

    // Obtener la plantilla completa con precios calculados
    const plantillaCompleta = await this.findOne(result.PlantillaEquipoID);
    return { message: 'Plantilla creada correctamente', data: plantillaCompleta.data };
  }

  /**
   * Obtiene todas las plantillas con resumen
   */
  async findAll(search?: string, tipo?: 'todos' | 'interno' | 'externo') {
    const where: Prisma.plantillas_equipoWhereInput = {
      IsActive: 1,
    };

    if (search) {
      where.OR = [
        { NombreEquipo: { contains: search } },
        { Codigo: { contains: search } },
      ];
    }

    // Filtrar por tipo de plantilla
    if (tipo === 'interno') {
      where.EsExterno = 0;
    } else if (tipo === 'externo') {
      where.EsExterno = 1;
    }

    const plantillas = await prisma.plantillas_equipo.findMany({
      where,
      include: {
        detalles: {
          where: { IsActive: 1 },
          include: {
            refaccion: {
              select: {
                RefaccionID: true,
                NombrePieza: true,
                Codigo: true,
                CostoPromedio: true,
              },
            },
          },
        },
      },
      orderBy: { PlantillaEquipoID: 'desc' },
    });

    // Calcular precios para cada plantilla
    const plantillasConPrecios = plantillas.map(plantilla => {
      const costoTotal = this.calcularCostoTotal(plantilla.detalles);
      return {
        PlantillaEquipoID: plantilla.PlantillaEquipoID,
        Codigo: plantilla.Codigo,
        NombreEquipo: plantilla.NombreEquipo,
        Observaciones: plantilla.Observaciones,
        EsExterno: plantilla.EsExterno === 1,
        PorcentajeVenta: plantilla.PorcentajeVenta,
        PorcentajeRenta: plantilla.PorcentajeRenta,
        TotalRefacciones: plantilla.detalles.length,
        CostoTotal: this.redondear(costoTotal),
        PrecioVenta: this.redondear(costoTotal * (1 + (plantilla.PorcentajeVenta || 35) / 100)),
        PrecioRenta: this.redondear(costoTotal * ((plantilla.PorcentajeRenta || 15) / 100)),
        FechaCreacion: plantilla.FechaCreacion ? moment(plantilla.FechaCreacion).format('YYYY-MM-DD') : null,
        FechaModificacion: plantilla.FechaModificacion ? moment(plantilla.FechaModificacion).format('YYYY-MM-DD') : null,
      };
    });

    return { message: 'Plantillas obtenidas', data: plantillasConPrecios };
  }

  /**
   * Obtiene una plantilla por ID con todos sus detalles
   */
  async findOne(id: number) {
    const plantilla = await prisma.plantillas_equipo.findFirst({
      where: { PlantillaEquipoID: id, IsActive: 1 },
      include: {
        detalles: {
          where: { IsActive: 1 },
          include: {
            refaccion: {
              select: {
                RefaccionID: true,
                NombrePieza: true,
                NombreCorto: true,
                Codigo: true,
                CostoPromedio: true,
                catalogo_unidades: {
                  select: { DesUnidad: true },
                },
              },
            },
          },
        },
      },
    });

    if (!plantilla) {
      throw new HttpError('Plantilla no encontrada', 404);
    }

    const costoTotal = this.calcularCostoTotal(plantilla.detalles);

    const plantillaFormateada = {
      PlantillaEquipoID: plantilla.PlantillaEquipoID,
      Codigo: plantilla.Codigo,
      NombreEquipo: plantilla.NombreEquipo,
      Observaciones: plantilla.Observaciones,
      EsExterno: plantilla.EsExterno === 1,
      PorcentajeVenta: plantilla.PorcentajeVenta,
      PorcentajeRenta: plantilla.PorcentajeRenta,
      IsActive: plantilla.IsActive,
      FechaCreacion: plantilla.FechaCreacion ? moment(plantilla.FechaCreacion).format('YYYY-MM-DD') : null,
      FechaModificacion: plantilla.FechaModificacion ? moment(plantilla.FechaModificacion).format('YYYY-MM-DD') : null,
      CostoTotal: this.redondear(costoTotal),
      PrecioVenta: this.redondear(costoTotal * (1 + (plantilla.PorcentajeVenta || 35) / 100)),
      PrecioRenta: this.redondear(costoTotal * ((plantilla.PorcentajeRenta || 15) / 100)),
      detalles: plantilla.detalles.map(detalle => ({
        PlantillaDetalleID: detalle.PlantillaDetalleID,
        RefaccionID: detalle.RefaccionID,
        Cantidad: detalle.Cantidad,
        Refaccion: {
          NombrePieza: detalle.refaccion.NombrePieza,
          NombreCorto: detalle.refaccion.NombreCorto,
          Codigo: detalle.refaccion.Codigo,
          CostoPromedio: detalle.refaccion.CostoPromedio || 0,
          Unidad: detalle.refaccion.catalogo_unidades?.DesUnidad || null,
        },
        Subtotal: this.redondear((detalle.refaccion.CostoPromedio || 0) * detalle.Cantidad),
      })),
    };

    return { message: 'Plantilla obtenida', data: plantillaFormateada };
  }

  /**
   * Actualiza una plantilla existente
   */
  async update(id: number, dto: UpdatePlantillaEquipoDto) {
    // Validar refacciones duplicadas si se envían detalles
    if (dto.Detalles) {
      this.validarRefaccionesDuplicadas(dto.Detalles);
    }

    const result = await prisma.$transaction(async (tx) => {
      // Verificar que la plantilla existe
      const plantillaExistente = await tx.plantillas_equipo.findFirst({
        where: { PlantillaEquipoID: id, IsActive: 1 },
      });

      if (!plantillaExistente) {
        throw new HttpError('Plantilla no encontrada', 404);
      }

      // Validar código único si se proporciona y es diferente al actual
      if (dto.Codigo && dto.Codigo !== plantillaExistente.Codigo) {
        await this.validarCodigoUnico(tx, dto.Codigo, id);
      }

      // Validar que las refacciones existan si se envían detalles
      if (dto.Detalles) {
        await this.validarRefaccionesExisten(tx, dto.Detalles.map(d => d.RefaccionID));
      }

      // Actualizar encabezado
      await tx.plantillas_equipo.update({
        where: { PlantillaEquipoID: id },
        data: {
          Codigo: dto.Codigo !== undefined ? dto.Codigo : plantillaExistente.Codigo,
          NombreEquipo: dto.NombreEquipo || plantillaExistente.NombreEquipo,
          Observaciones: dto.Observaciones !== undefined ? dto.Observaciones : plantillaExistente.Observaciones,
          EsExterno: dto.EsExterno !== undefined ? (dto.EsExterno ? 1 : 0) : plantillaExistente.EsExterno,
          PorcentajeVenta: dto.PorcentajeVenta ?? plantillaExistente.PorcentajeVenta,
          PorcentajeRenta: dto.PorcentajeRenta ?? plantillaExistente.PorcentajeRenta,
          FechaModificacion: new Date(),
        },
      });

      // Eliminar detalles (soft delete)
      if (dto.DetallesEliminar?.length) {
        for (const detalleID of dto.DetallesEliminar) {
          await tx.plantillas_equipo_detalle.updateMany({
            where: { PlantillaDetalleID: detalleID, PlantillaEquipoID: id },
            data: { IsActive: 0 },
          });
        }
      }

      // Actualizar o crear detalles
      if (dto.Detalles?.length) {
        for (const detalle of dto.Detalles) {
          if (detalle.PlantillaDetalleID) {
            // Actualizar existente
            await tx.plantillas_equipo_detalle.updateMany({
              where: { PlantillaDetalleID: detalle.PlantillaDetalleID, PlantillaEquipoID: id },
              data: { Cantidad: detalle.Cantidad },
            });
          } else {
            // Verificar si ya existe la refacción (activa o inactiva)
            const existente = await tx.plantillas_equipo_detalle.findFirst({
              where: { PlantillaEquipoID: id, RefaccionID: detalle.RefaccionID },
            });

            if (existente) {
              // Reactivar y actualizar cantidad
              await tx.plantillas_equipo_detalle.update({
                where: { PlantillaDetalleID: existente.PlantillaDetalleID },
                data: { Cantidad: detalle.Cantidad, IsActive: 1 },
              });
            } else {
              // Crear nuevo
              await tx.plantillas_equipo_detalle.create({
                data: {
                  PlantillaEquipoID: id,
                  RefaccionID: detalle.RefaccionID,
                  Cantidad: detalle.Cantidad,
                  IsActive: 1,
                },
              });
            }
          }
        }
      }

      return id;
    });

    // Retornar plantilla actualizada con precios
    const plantillaActualizada = await this.findOne(result);
    return { message: 'Plantilla actualizada correctamente', data: plantillaActualizada.data };
  }

  /**
   * Duplica una plantilla existente
   */
  async duplicate(id: number) {
    const plantillaOriginal = await prisma.plantillas_equipo.findFirst({
      where: { PlantillaEquipoID: id, IsActive: 1 },
      include: {
        detalles: {
          where: { IsActive: 1 },
        },
      },
    });

    if (!plantillaOriginal) {
      throw new HttpError('Plantilla no encontrada', 404);
    }

    const result = await prisma.$transaction(async (tx) => {
      // Crear nueva plantilla
      const nuevaPlantilla = await tx.plantillas_equipo.create({
        data: {
          Codigo: null, // El código debe ser único, así que no se copia
          NombreEquipo: `${plantillaOriginal.NombreEquipo} (Copia)`,
          Observaciones: plantillaOriginal.Observaciones,
          EsExterno: plantillaOriginal.EsExterno,
          PorcentajeVenta: plantillaOriginal.PorcentajeVenta,
          PorcentajeRenta: plantillaOriginal.PorcentajeRenta,
          IsActive: 1,
          FechaCreacion: new Date(),
        },
      });

      // Copiar detalles
      for (const detalle of plantillaOriginal.detalles) {
        await tx.plantillas_equipo_detalle.create({
          data: {
            PlantillaEquipoID: nuevaPlantilla.PlantillaEquipoID,
            RefaccionID: detalle.RefaccionID,
            Cantidad: detalle.Cantidad,
            IsActive: 1,
          },
        });
      }

      return nuevaPlantilla.PlantillaEquipoID;
    });

    const plantillaDuplicada = await this.findOne(result);
    return { message: 'Plantilla duplicada correctamente', data: plantillaDuplicada.data };
  }

  /**
   * Da de baja una plantilla (soft delete)
   */
  async deactivate(id: number) {
    const plantilla = await prisma.plantillas_equipo.findFirst({
      where: { PlantillaEquipoID: id, IsActive: 1 },
    });

    if (!plantilla) {
      throw new HttpError('Plantilla no encontrada', 404);
    }

    await prisma.plantillas_equipo.update({
      where: { PlantillaEquipoID: id },
      data: { IsActive: 0, FechaModificacion: new Date() },
    });

    return { message: 'Plantilla dada de baja correctamente', data: { PlantillaEquipoID: id } };
  }

  /**
   * Activa una plantilla
   */
  async activate(id: number) {
    const plantilla = await prisma.plantillas_equipo.findFirst({
      where: { PlantillaEquipoID: id, IsActive: 0 },
    });

    if (!plantilla) {
      throw new HttpError('Plantilla no encontrada o ya está activa', 404);
    }

    await prisma.plantillas_equipo.update({
      where: { PlantillaEquipoID: id },
      data: { IsActive: 1, FechaModificacion: new Date() },
    });

    return { message: 'Plantilla activada correctamente', data: { PlantillaEquipoID: id } };
  }

  /**
   * Busca refacciones disponibles para agregar a una plantilla
   */
  async searchRefacciones(search?: string) {
    const where: Prisma.catalogo_refaccionesWhereInput = {
      IsActive: true,
    };

    if (search) {
      where.OR = [
        { NombrePieza: { contains: search } },
        { NombreCorto: { contains: search } },
        { Codigo: { contains: search } },
      ];
    }

    const refacciones = await prisma.catalogo_refacciones.findMany({
      where,
      select: {
        RefaccionID: true,
        NombrePieza: true,
        NombreCorto: true,
        Codigo: true,
        CostoPromedio: true,
        catalogo_unidades: {
          select: { DesUnidad: true },
        },
      },
      take: 20,
      orderBy: { NombrePieza: 'asc' },
    });

    const refaccionesFormateadas = refacciones.map(ref => ({
      RefaccionID: ref.RefaccionID,
      NombrePieza: ref.NombrePieza,
      NombreCorto: ref.NombreCorto,
      Codigo: ref.Codigo,
      CostoPromedio: ref.CostoPromedio || 0,
      Unidad: ref.catalogo_unidades?.DesUnidad || null,
    }));

    return { message: 'Refacciones encontradas', data: refaccionesFormateadas };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VALIDACIONES
  // ═══════════════════════════════════════════════════════════════════════════

  private validarRefaccionesDuplicadas(detalles: { RefaccionID: number }[]): void {
    const refaccionIds = detalles.map(d => d.RefaccionID);
    const duplicados = refaccionIds.filter((id, index) => refaccionIds.indexOf(id) !== index);

    if (duplicados.length > 0) {
      throw new HttpError(`No se pueden agregar refacciones duplicadas: ${[...new Set(duplicados)].join(', ')}`, 400);
    }
  }

  private async validarCodigoUnico(
    tx: Prisma.TransactionClient,
    codigo: string,
    excludeId?: number
  ): Promise<void> {
    const where: Prisma.plantillas_equipoWhereInput = {
      Codigo: codigo,
      IsActive: 1,
    };

    if (excludeId) {
      where.PlantillaEquipoID = { not: excludeId };
    }

    const existente = await tx.plantillas_equipo.findFirst({ where });

    if (existente) {
      throw new HttpError('Ya existe una plantilla con este código', 400);
    }
  }

  private async validarRefaccionesExisten(
    tx: Prisma.TransactionClient,
    refaccionIds: number[]
  ): Promise<void> {
    const refacciones = await tx.catalogo_refacciones.findMany({
      where: { RefaccionID: { in: refaccionIds }, IsActive: true },
      select: { RefaccionID: true },
    });

    const encontradas = refacciones.map(r => r.RefaccionID);
    const noEncontradas = refaccionIds.filter(id => !encontradas.includes(id));

    if (noEncontradas.length > 0) {
      throw new HttpError(`Refacciones no encontradas o inactivas: ${noEncontradas.join(', ')}`, 404);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILIDADES
  // ═══════════════════════════════════════════════════════════════════════════

  private calcularCostoTotal(detalles: { Cantidad: number; refaccion: { CostoPromedio: number | null } }[]): number {
    return detalles.reduce((total, detalle) => {
      return total + (detalle.refaccion.CostoPromedio || 0) * detalle.Cantidad;
    }, 0);
  }

  private redondear(valor: number): number {
    return Math.round(valor * 100) / 100;
  }
}

export const plantillasEquipoService = new PlantillasEquipoService();
