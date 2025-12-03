import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { CreateAjusteDto, AutorizarAjusteDto } from './ajustes-inventario.schema';

class AjustesInventarioService {
  async create(data: CreateAjusteDto) {
    const { TecnicoID, RefaccionID, StockRealNuevo, StockRealUsado, UsuarioSolicitaID } = data;

    // Verificar técnico
    const tecnico = await prisma.catalogo_tecnicos.findUnique({
      where: { TecnicoID },
    });
    if (!tecnico) throw new HttpError('Técnico no encontrado', 404);

    // Verificar refacción
    const refaccion = await prisma.catalogo_refacciones.findUnique({
      where: { RefaccionID },
    });
    if (!refaccion) throw new HttpError('Refacción no encontrada', 404);

    // Verificar usuario
    const usuario = await prisma.usuarios.findUnique({
      where: { UsuarioID: UsuarioSolicitaID },
    });
    if (!usuario) throw new HttpError('Usuario no encontrado', 404);

    // Obtener stock actual del sistema
    const inventario = await prisma.inventario_tecnico.findUnique({
      where: {
        TecnicoID_RefaccionID: { TecnicoID, RefaccionID },
      },
    });

    const stockSistemaNuevo = inventario?.StockNuevo || 0;
    const stockSistemaUsado = inventario?.StockUsado || 0;

    // Calcular diferencias
    const diferenciaNuevo = StockRealNuevo - stockSistemaNuevo;
    const diferenciaUsado = StockRealUsado - stockSistemaUsado;

    // Si no hay diferencia, no crear ajuste
    if (diferenciaNuevo === 0 && diferenciaUsado === 0) {
      throw new HttpError('No hay diferencia entre el stock del sistema y el stock real', 300);
    }

    // Determinar si requiere autorización (diferencias negativas siempre)
    const requiereAutorizacion = diferenciaNuevo < 0 || diferenciaUsado < 0;

    // Crear solicitud de ajuste
    const ajuste = await prisma.ajustes_inventario.create({
      data: {
        TecnicoID,
        RefaccionID,
        StockSistemaNuevo: stockSistemaNuevo,
        StockSistemaUsado: stockSistemaUsado,
        StockRealNuevo,
        StockRealUsado,
        DiferenciaNuevo: diferenciaNuevo,
        DiferenciaUsado: diferenciaUsado,
        MotivoAjuste: data.MotivoAjuste,
        Observaciones: data.Observaciones,
        UsuarioSolicitaID,
        FechaSolicitud: new Date(),
        Estatus: 'Pendiente',
        IsActive: 1,
      },
    });

    const ajusteCompleto = await this.findOne(ajuste.AjusteID);

    return {
      message: requiereAutorizacion
        ? 'Solicitud de ajuste creada (requiere autorización por diferencia negativa)'
        : 'Solicitud de ajuste creada',
      data: ajusteCompleto.data,
    };
  }

  async findAll(estatus?: string) {
    const where: any = { IsActive: 1 };
    if (estatus) where.Estatus = estatus;

    const ajustes = await prisma.ajustes_inventario.findMany({
      where,
      include: {
        refaccion: {
          select: {
            RefaccionID: true,
            NombrePieza: true,
            Codigo: true,
          },
        },
      },
      orderBy: {
        FechaSolicitud: 'desc',
      },
    });

    // Enriquecer con nombres
    const ajustesEnriquecidos = await Promise.all(
      ajustes.map(async (a) => {
        const tecnico = await prisma.catalogo_tecnicos.findUnique({
          where: { TecnicoID: a.TecnicoID },
          include: { usuario: { select: { NombreCompleto: true } } },
        });

        const usuarioSolicita = await prisma.usuarios.findUnique({
          where: { UsuarioID: a.UsuarioSolicitaID },
        });

        let usuarioAutoriza = null;
        if (a.UsuarioAutorizaID) {
          usuarioAutoriza = await prisma.usuarios.findUnique({
            where: { UsuarioID: a.UsuarioAutorizaID },
          });
        }

        return {
          ...a,
          TecnicoNombre: tecnico?.usuario.NombreCompleto,
          UsuarioSolicitaNombre: usuarioSolicita?.NombreCompleto,
          UsuarioAutorizaNombre: usuarioAutoriza?.NombreCompleto,
        };
      })
    );

    return { message: 'Ajustes obtenidos', data: ajustesEnriquecidos };
  }

  async findPendientes() {
    return this.findAll('Pendiente');
  }

  async findOne(AjusteID: number) {
    const ajuste = await prisma.ajustes_inventario.findUnique({
      where: { AjusteID },
      include: {
        refaccion: {
          select: {
            RefaccionID: true,
            NombrePieza: true,
            NombreCorto: true,
            Codigo: true,
            CostoPromedio: true,
          },
        },
      },
    });

    if (!ajuste) {
      throw new HttpError('Ajuste no encontrado', 404);
    }

    // Enriquecer
    const tecnico = await prisma.catalogo_tecnicos.findUnique({
      where: { TecnicoID: ajuste.TecnicoID },
      include: { usuario: { select: { NombreCompleto: true } } },
    });

    const usuarioSolicita = await prisma.usuarios.findUnique({
      where: { UsuarioID: ajuste.UsuarioSolicitaID },
    });

    let usuarioAutoriza = null;
    if (ajuste.UsuarioAutorizaID) {
      usuarioAutoriza = await prisma.usuarios.findUnique({
        where: { UsuarioID: ajuste.UsuarioAutorizaID },
      });
    }

    return {
      message: 'Ajuste obtenido',
      data: {
        ...ajuste,
        TecnicoNombre: tecnico?.usuario.NombreCompleto,
        UsuarioSolicitaNombre: usuarioSolicita?.NombreCompleto,
        UsuarioAutorizaNombre: usuarioAutoriza?.NombreCompleto,
      },
    };
  }

  async autorizar(AjusteID: number, data: AutorizarAjusteDto) {
    const { UsuarioAutorizaID, Autorizado, Observaciones } = data;

    const ajuste = await prisma.ajustes_inventario.findUnique({
      where: { AjusteID },
    });

    if (!ajuste) {
      throw new HttpError('Ajuste no encontrado', 404);
    }

    if (ajuste.Estatus !== 'Pendiente') {
      throw new HttpError(`El ajuste ya fue ${ajuste.Estatus.toLowerCase()}`, 300);
    }

    // Verificar usuario autorizante
    const usuario = await prisma.usuarios.findUnique({
      where: { UsuarioID: UsuarioAutorizaID },
    });
    if (!usuario) throw new HttpError('Usuario autorizante no encontrado', 404);

    if (Autorizado) {
      // Ejecutar ajuste en transacción
      await prisma.$transaction(async (tx) => {
        // Actualizar o crear inventario del técnico
        await tx.inventario_tecnico.upsert({
          where: {
            TecnicoID_RefaccionID: { TecnicoID: ajuste.TecnicoID, RefaccionID: ajuste.RefaccionID },
          },
          update: {
            StockNuevo: ajuste.StockRealNuevo,
            StockUsado: ajuste.StockRealUsado,
            FechaUltimoMov: new Date(),
          },
          create: {
            TecnicoID: ajuste.TecnicoID,
            RefaccionID: ajuste.RefaccionID,
            StockNuevo: ajuste.StockRealNuevo,
            StockUsado: ajuste.StockRealUsado,
            FechaUltimoMov: new Date(),
            IsActive: 1,
          },
        });

        // Registrar en kardex
        const cantidadTotal = ajuste.DiferenciaNuevo + ajuste.DiferenciaUsado;
        if (cantidadTotal !== 0) {
          await tx.kardex_inventario.create({
            data: {
              RefaccionID: ajuste.RefaccionID,
              FechaMovimiento: new Date(),
              TipoMovimiento: 'Traspaso_Tecnico', // Usamos este como ajuste
              Cantidad: Math.abs(cantidadTotal),
              UsuarioID: UsuarioAutorizaID,
              Observaciones: `Ajuste #${AjusteID}: ${ajuste.MotivoAjuste}. Dif Nuevo: ${ajuste.DiferenciaNuevo}, Dif Usado: ${ajuste.DiferenciaUsado}`,
            },
          });
        }

        // Actualizar estado del ajuste
        await tx.ajustes_inventario.update({
          where: { AjusteID },
          data: {
            Estatus: 'Autorizado',
            UsuarioAutorizaID,
            FechaAutorizacion: new Date(),
            Observaciones: Observaciones
              ? `${ajuste.Observaciones || ''} | Auth: ${Observaciones}`
              : ajuste.Observaciones,
          },
        });
      });

      return { message: 'Ajuste autorizado y aplicado', data: await this.findOne(AjusteID) };
    } else {
      // Rechazar
      await prisma.ajustes_inventario.update({
        where: { AjusteID },
        data: {
          Estatus: 'Rechazado',
          UsuarioAutorizaID,
          FechaAutorizacion: new Date(),
          Observaciones: Observaciones
            ? `${ajuste.Observaciones || ''} | Rechazo: ${Observaciones}`
            : ajuste.Observaciones,
        },
      });

      return { message: 'Ajuste rechazado', data: await this.findOne(AjusteID) };
    }
  }

  async findByTecnico(TecnicoID: number) {
    const tecnico = await prisma.catalogo_tecnicos.findUnique({
      where: { TecnicoID },
    });
    if (!tecnico) throw new HttpError('Técnico no encontrado', 404);

    const ajustes = await prisma.ajustes_inventario.findMany({
      where: { TecnicoID, IsActive: 1 },
      include: {
        refaccion: {
          select: {
            NombrePieza: true,
            Codigo: true,
          },
        },
      },
      orderBy: {
        FechaSolicitud: 'desc',
      },
    });

    return { message: 'Ajustes del técnico obtenidos', data: ajustes };
  }

  async cancelar(AjusteID: number) {
    const ajuste = await prisma.ajustes_inventario.findUnique({
      where: { AjusteID },
    });

    if (!ajuste) {
      throw new HttpError('Ajuste no encontrado', 404);
    }

    if (ajuste.Estatus !== 'Pendiente') {
      throw new HttpError('Solo se pueden cancelar ajustes pendientes', 300);
    }

    await prisma.ajustes_inventario.update({
      where: { AjusteID },
      data: { IsActive: 0 },
    });

    return { message: 'Ajuste cancelado', data: { AjusteID } };
  }

  // Reporte de ajustes (para análisis de pérdidas)
  async reporteAjustes(filtros: any) {
    const { fechaInicio, fechaFin, tecnicoId, motivo } = filtros;

    const where: any = { IsActive: 1, Estatus: 'Autorizado' };

    if (fechaInicio && fechaFin) {
      where.FechaAutorizacion = {
        gte: new Date(fechaInicio),
        lte: new Date(fechaFin),
      };
    }

    if (tecnicoId) {
      where.TecnicoID = parseInt(tecnicoId);
    }

    if (motivo) {
      where.MotivoAjuste = motivo;
    }

    const ajustes = await prisma.ajustes_inventario.findMany({
      where,
      include: {
        refaccion: {
          select: {
            NombrePieza: true,
            Codigo: true,
            CostoPromedio: true,
          },
        },
      },
    });

    // Calcular totales
    let totalDiferenciaNuevo = 0;
    let totalDiferenciaUsado = 0;
    let perdidaEstimada = 0;

    const ajustesConPerdida = ajustes.map((a) => {
      const perdida =
        (a.DiferenciaNuevo < 0 ? Math.abs(a.DiferenciaNuevo) : 0) * (a.refaccion.CostoPromedio || 0) +
        (a.DiferenciaUsado < 0 ? Math.abs(a.DiferenciaUsado) : 0) * (a.refaccion.CostoPromedio || 0) * 0.5; // Usadas al 50%

      totalDiferenciaNuevo += a.DiferenciaNuevo;
      totalDiferenciaUsado += a.DiferenciaUsado;
      perdidaEstimada += perdida;

      return {
        ...a,
        PerdidaEstimada: perdida,
      };
    });

    return {
      message: 'Reporte de ajustes obtenido',
      data: {
        resumen: {
          totalAjustes: ajustes.length,
          totalDiferenciaNuevo,
          totalDiferenciaUsado,
          perdidaEstimada,
        },
        ajustes: ajustesConPerdida,
      },
    };
  }
}

export const ajustesInventarioService = new AjustesInventarioService();
