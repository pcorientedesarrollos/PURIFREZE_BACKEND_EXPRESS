import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { CreateTraspasoDto, AutorizarTraspasoDto } from './traspasos.schema';

class TraspasosService {
  // Crear solicitud de traspaso
  async create(data: CreateTraspasoDto) {
    const { TipoTraspaso, OrigenTipo, OrigenID, DestinoTipo, DestinoID, UsuarioSolicitaID, Observaciones, Detalle } = data;

    // Validar que origen y destino sean coherentes con el tipo
    if (TipoTraspaso === 'Bodega_Tecnico') {
      if (OrigenTipo !== 'Bodega' || DestinoTipo !== 'Tecnico') {
        throw new HttpError('Para traspaso Bodega->Técnico, el origen debe ser Bodega y destino Técnico', 300);
      }
      if (!DestinoID) {
        throw new HttpError('Debe especificar el técnico destino', 300);
      }
    } else if (TipoTraspaso === 'Tecnico_Bodega') {
      if (OrigenTipo !== 'Tecnico' || DestinoTipo !== 'Bodega') {
        throw new HttpError('Para traspaso Técnico->Bodega, el origen debe ser Técnico y destino Bodega', 300);
      }
      if (!OrigenID) {
        throw new HttpError('Debe especificar el técnico origen', 300);
      }
    } else if (TipoTraspaso === 'Tecnico_Tecnico') {
      if (OrigenTipo !== 'Tecnico' || DestinoTipo !== 'Tecnico') {
        throw new HttpError('Para traspaso Técnico->Técnico, ambos deben ser Técnico', 300);
      }
      if (!OrigenID || !DestinoID) {
        throw new HttpError('Debe especificar técnico origen y destino', 300);
      }
      if (OrigenID === DestinoID) {
        throw new HttpError('El técnico origen y destino no pueden ser el mismo', 300);
      }
    }

    // Verificar que los técnicos existan y estén activos
    if (OrigenTipo === 'Tecnico' && OrigenID) {
      const tecnicoOrigen = await prisma.catalogo_tecnicos.findUnique({
        where: { TecnicoID: OrigenID },
      });
      if (!tecnicoOrigen) throw new HttpError('Técnico origen no encontrado', 404);
      if (!tecnicoOrigen.IsActive) throw new HttpError('Técnico origen está dado de baja', 300);
    }

    if (DestinoTipo === 'Tecnico' && DestinoID) {
      const tecnicoDestino = await prisma.catalogo_tecnicos.findUnique({
        where: { TecnicoID: DestinoID },
      });
      if (!tecnicoDestino) throw new HttpError('Técnico destino no encontrado', 404);
      if (!tecnicoDestino.IsActive) throw new HttpError('Técnico destino está dado de baja', 300);
    }

    // Verificar que el usuario solicitante exista
    const usuario = await prisma.usuarios.findUnique({
      where: { UsuarioID: UsuarioSolicitaID },
    });
    if (!usuario) throw new HttpError('Usuario solicitante no encontrado', 404);

    // Verificar que las refacciones existan y haya stock suficiente
    for (const item of Detalle) {
      const refaccion = await prisma.catalogo_refacciones.findUnique({
        where: { RefaccionID: item.RefaccionID },
      });
      if (!refaccion) throw new HttpError(`Refacción ${item.RefaccionID} no encontrada`, 404);

      // Si el origen es un técnico, verificar stock
      if (OrigenTipo === 'Tecnico' && OrigenID) {
        const inventario = await prisma.inventario_tecnico.findUnique({
          where: {
            TecnicoID_RefaccionID: { TecnicoID: OrigenID, RefaccionID: item.RefaccionID },
          },
        });

        if (!inventario) {
          throw new HttpError(`El técnico origen no tiene la refacción ${item.RefaccionID} en su inventario`, 300);
        }

        if (inventario.StockNuevo < item.CantidadNuevo) {
          throw new HttpError(`Stock insuficiente de piezas nuevas para refacción ${item.RefaccionID}. Disponible: ${inventario.StockNuevo}`, 300);
        }

        if (inventario.StockUsado < item.CantidadUsado) {
          throw new HttpError(`Stock insuficiente de piezas usadas para refacción ${item.RefaccionID}. Disponible: ${inventario.StockUsado}`, 300);
        }
      }

      // Si el origen es bodega, verificar stock en inventario general
      if (OrigenTipo === 'Bodega') {
        const inventarioBodega = await prisma.inventario.findFirst({
          where: {
            RefaccionID: item.RefaccionID,
            IsActive: 1,
          },
        });

        const stockDisponible = inventarioBodega?.StockActual || 0;
        const cantidadSolicitada = item.CantidadNuevo + item.CantidadUsado;

        if (stockDisponible < cantidadSolicitada) {
          throw new HttpError(`Stock insuficiente en bodega para refacción ${item.RefaccionID}. Disponible: ${stockDisponible}`, 300);
        }
      }
    }

    // Crear el traspaso con transacción
    const traspaso = await prisma.$transaction(async (tx) => {
      // Crear encabezado
      const encabezado = await tx.traspasos_encabezado.create({
        data: {
          TipoTraspaso,
          OrigenTipo,
          OrigenID,
          DestinoTipo,
          DestinoID,
          UsuarioSolicitaID,
          FechaSolicitud: new Date(),
          Estatus: 'Pendiente',
          Observaciones,
          IsActive: 1,
        },
      });

      // Crear detalle
      await tx.traspasos_detalle.createMany({
        data: Detalle.map((item) => ({
          TraspasoEncabezadoID: encabezado.TraspasoEncabezadoID,
          RefaccionID: item.RefaccionID,
          CantidadNuevo: item.CantidadNuevo,
          CantidadUsado: item.CantidadUsado,
          IsActive: 1,
        })),
      });

      return encabezado;
    });

    // Obtener el traspaso completo
    const traspasoCompleto = await this.findOne(traspaso.TraspasoEncabezadoID);

    return { message: 'Solicitud de traspaso creada', data: traspasoCompleto.data };
  }

  // Obtener todos los traspasos
  async findAll(estatus?: string, tipo?: string) {
    const where: any = { IsActive: 1 };

    if (estatus) where.Estatus = estatus;
    if (tipo) where.TipoTraspaso = tipo;

    const traspasos = await prisma.traspasos_encabezado.findMany({
      where,
      include: {
        traspasos_detalle: {
          where: { IsActive: 1 },
          include: {
            refaccion: {
              select: {
                NombrePieza: true,
                Codigo: true,
              },
            },
          },
        },
      },
      orderBy: {
        FechaSolicitud: 'desc',
      },
    });

    // Enriquecer con nombres de técnicos
    const traspasosEnriquecidos = await Promise.all(
      traspasos.map(async (t) => {
        let origenNombre = 'Bodega';
        let destinoNombre = 'Bodega';

        if (t.OrigenTipo === 'Tecnico' && t.OrigenID) {
          const tecnico = await prisma.catalogo_tecnicos.findUnique({
            where: { TecnicoID: t.OrigenID },
            include: { usuario: { select: { NombreCompleto: true } } },
          });
          origenNombre = tecnico?.usuario.NombreCompleto || `Técnico ${t.OrigenID}`;
        }

        if (t.DestinoTipo === 'Tecnico' && t.DestinoID) {
          const tecnico = await prisma.catalogo_tecnicos.findUnique({
            where: { TecnicoID: t.DestinoID },
            include: { usuario: { select: { NombreCompleto: true } } },
          });
          destinoNombre = tecnico?.usuario.NombreCompleto || `Técnico ${t.DestinoID}`;
        }

        return {
          ...t,
          OrigenNombre: origenNombre,
          DestinoNombre: destinoNombre,
        };
      })
    );

    return { message: 'Traspasos obtenidos', data: traspasosEnriquecidos };
  }

  // Obtener traspasos pendientes
  async findPendientes() {
    return this.findAll('Pendiente');
  }

  // Obtener un traspaso por ID
  async findOne(TraspasoEncabezadoID: number) {
    const traspaso = await prisma.traspasos_encabezado.findUnique({
      where: { TraspasoEncabezadoID },
      include: {
        traspasos_detalle: {
          where: { IsActive: 1 },
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
        },
      },
    });

    if (!traspaso) {
      throw new HttpError('Traspaso no encontrado', 404);
    }

    // Obtener nombres de técnicos y usuarios
    let origenNombre = 'Bodega';
    let destinoNombre = 'Bodega';

    if (traspaso.OrigenTipo === 'Tecnico' && traspaso.OrigenID) {
      const tecnico = await prisma.catalogo_tecnicos.findUnique({
        where: { TecnicoID: traspaso.OrigenID },
        include: { usuario: { select: { NombreCompleto: true } } },
      });
      origenNombre = tecnico?.usuario.NombreCompleto || `Técnico ${traspaso.OrigenID}`;
    }

    if (traspaso.DestinoTipo === 'Tecnico' && traspaso.DestinoID) {
      const tecnico = await prisma.catalogo_tecnicos.findUnique({
        where: { TecnicoID: traspaso.DestinoID },
        include: { usuario: { select: { NombreCompleto: true } } },
      });
      destinoNombre = tecnico?.usuario.NombreCompleto || `Técnico ${traspaso.DestinoID}`;
    }

    const usuarioSolicita = await prisma.usuarios.findUnique({
      where: { UsuarioID: traspaso.UsuarioSolicitaID },
      select: { NombreCompleto: true },
    });

    let usuarioAutoriza = null;
    if (traspaso.UsuarioAutorizaID) {
      usuarioAutoriza = await prisma.usuarios.findUnique({
        where: { UsuarioID: traspaso.UsuarioAutorizaID },
        select: { NombreCompleto: true },
      });
    }

    return {
      message: 'Traspaso obtenido',
      data: {
        ...traspaso,
        OrigenNombre: origenNombre,
        DestinoNombre: destinoNombre,
        UsuarioSolicitaNombre: usuarioSolicita?.NombreCompleto,
        UsuarioAutorizaNombre: usuarioAutoriza?.NombreCompleto,
      },
    };
  }

  // Autorizar o rechazar traspaso
  async autorizar(TraspasoEncabezadoID: number, data: AutorizarTraspasoDto) {
    const { UsuarioAutorizaID, Autorizado, Observaciones } = data;

    const traspaso = await prisma.traspasos_encabezado.findUnique({
      where: { TraspasoEncabezadoID },
      include: {
        traspasos_detalle: {
          where: { IsActive: 1 },
        },
      },
    });

    if (!traspaso) {
      throw new HttpError('Traspaso no encontrado', 404);
    }

    if (traspaso.Estatus !== 'Pendiente') {
      throw new HttpError(`El traspaso ya fue ${traspaso.Estatus.toLowerCase()}`, 300);
    }

    // Verificar usuario autorizante
    const usuario = await prisma.usuarios.findUnique({
      where: { UsuarioID: UsuarioAutorizaID },
    });
    if (!usuario) throw new HttpError('Usuario autorizante no encontrado', 404);

    if (Autorizado) {
      // Verificar stock nuevamente antes de autorizar
      for (const item of traspaso.traspasos_detalle) {
        if (traspaso.OrigenTipo === 'Tecnico' && traspaso.OrigenID) {
          const inventario = await prisma.inventario_tecnico.findUnique({
            where: {
              TecnicoID_RefaccionID: { TecnicoID: traspaso.OrigenID, RefaccionID: item.RefaccionID },
            },
          });

          if (!inventario || inventario.StockNuevo < item.CantidadNuevo || inventario.StockUsado < item.CantidadUsado) {
            throw new HttpError(`Stock insuficiente para refacción ${item.RefaccionID}. Verifique disponibilidad.`, 300);
          }
        }

        if (traspaso.OrigenTipo === 'Bodega') {
          const inventarioBodega = await prisma.inventario.findFirst({
            where: { RefaccionID: item.RefaccionID, IsActive: 1 },
          });

          const stockDisponible = inventarioBodega?.StockActual || 0;
          if (stockDisponible < item.CantidadNuevo + item.CantidadUsado) {
            throw new HttpError(`Stock insuficiente en bodega para refacción ${item.RefaccionID}`, 300);
          }
        }
      }

      // Ejecutar movimientos de inventario en transacción
      await prisma.$transaction(async (tx) => {
        for (const item of traspaso.traspasos_detalle) {
          // Restar del origen
          if (traspaso.OrigenTipo === 'Tecnico' && traspaso.OrigenID) {
            await tx.inventario_tecnico.update({
              where: {
                TecnicoID_RefaccionID: { TecnicoID: traspaso.OrigenID, RefaccionID: item.RefaccionID },
              },
              data: {
                StockNuevo: { decrement: item.CantidadNuevo },
                StockUsado: { decrement: item.CantidadUsado },
                FechaUltimoMov: new Date(),
              },
            });
          } else if (traspaso.OrigenTipo === 'Bodega') {
            await tx.inventario.updateMany({
              where: { RefaccionID: item.RefaccionID, IsActive: 1 },
              data: {
                StockActual: { decrement: item.CantidadNuevo + item.CantidadUsado },
                FechaUltimoMovimiento: new Date(),
              },
            });
          }

          // Sumar al destino
          if (traspaso.DestinoTipo === 'Tecnico' && traspaso.DestinoID) {
            await tx.inventario_tecnico.upsert({
              where: {
                TecnicoID_RefaccionID: { TecnicoID: traspaso.DestinoID, RefaccionID: item.RefaccionID },
              },
              update: {
                StockNuevo: { increment: item.CantidadNuevo },
                StockUsado: { increment: item.CantidadUsado },
                FechaUltimoMov: new Date(),
              },
              create: {
                TecnicoID: traspaso.DestinoID,
                RefaccionID: item.RefaccionID,
                StockNuevo: item.CantidadNuevo,
                StockUsado: item.CantidadUsado,
                FechaUltimoMov: new Date(),
                IsActive: 1,
              },
            });
          } else if (traspaso.DestinoTipo === 'Bodega') {
            const inventarioBodega = await tx.inventario.findFirst({
              where: { RefaccionID: item.RefaccionID, IsActive: 1 },
            });

            if (inventarioBodega) {
              await tx.inventario.update({
                where: { InventarioID: inventarioBodega.InventarioID },
                data: {
                  StockActual: { increment: item.CantidadNuevo + item.CantidadUsado },
                  FechaUltimoMovimiento: new Date(),
                },
              });
            }
          }

          const cantidadTotal = item.CantidadNuevo + item.CantidadUsado;

          // Registrar SALIDA en kardex (del origen)
          await tx.kardex_inventario.create({
            data: {
              RefaccionID: item.RefaccionID,
              FechaMovimiento: new Date(),
              TipoMovimiento: this.getTipoMovimientoSalida(traspaso.OrigenTipo),
              Cantidad: -cantidadTotal, // Negativo para salida
              UsuarioID: UsuarioAutorizaID,
              Observaciones: `Salida por traspaso #${TraspasoEncabezadoID} - ${traspaso.OrigenTipo === 'Bodega' ? 'Bodega' : `Técnico ${traspaso.OrigenID}`} → ${traspaso.DestinoTipo === 'Bodega' ? 'Bodega' : `Técnico ${traspaso.DestinoID}`}`,
            },
          });

          // Registrar ENTRADA en kardex (al destino)
          await tx.kardex_inventario.create({
            data: {
              RefaccionID: item.RefaccionID,
              FechaMovimiento: new Date(),
              TipoMovimiento: this.getTipoMovimientoEntrada(traspaso.DestinoTipo),
              Cantidad: cantidadTotal, // Positivo para entrada
              UsuarioID: UsuarioAutorizaID,
              Observaciones: `Entrada por traspaso #${TraspasoEncabezadoID} - ${traspaso.OrigenTipo === 'Bodega' ? 'Bodega' : `Técnico ${traspaso.OrigenID}`} → ${traspaso.DestinoTipo === 'Bodega' ? 'Bodega' : `Técnico ${traspaso.DestinoID}`}`,
            },
          });
        }

        // Actualizar estado del traspaso
        await tx.traspasos_encabezado.update({
          where: { TraspasoEncabezadoID },
          data: {
            Estatus: 'Autorizado',
            UsuarioAutorizaID,
            FechaAutorizacion: new Date(),
            Observaciones: Observaciones ? `${traspaso.Observaciones || ''} | Auth: ${Observaciones}` : traspaso.Observaciones,
          },
        });
      });

      return { message: 'Traspaso autorizado y ejecutado', data: await this.findOne(TraspasoEncabezadoID) };
    } else {
      // Rechazar
      await prisma.traspasos_encabezado.update({
        where: { TraspasoEncabezadoID },
        data: {
          Estatus: 'Rechazado',
          UsuarioAutorizaID,
          FechaAutorizacion: new Date(),
          Observaciones: Observaciones ? `${traspaso.Observaciones || ''} | Rechazo: ${Observaciones}` : traspaso.Observaciones,
        },
      });

      return { message: 'Traspaso rechazado', data: await this.findOne(TraspasoEncabezadoID) };
    }
  }

  // Cancelar solicitud pendiente
  async cancelar(TraspasoEncabezadoID: number) {
    const traspaso = await prisma.traspasos_encabezado.findUnique({
      where: { TraspasoEncabezadoID },
    });

    if (!traspaso) {
      throw new HttpError('Traspaso no encontrado', 404);
    }

    if (traspaso.Estatus !== 'Pendiente') {
      throw new HttpError('Solo se pueden cancelar traspasos pendientes', 300);
    }

    await prisma.traspasos_encabezado.update({
      where: { TraspasoEncabezadoID },
      data: { IsActive: 0 },
    });

    return { message: 'Traspaso cancelado', data: { TraspasoEncabezadoID } };
  }

  // Obtener traspasos de un técnico (como origen o destino)
  async findByTecnico(TecnicoID: number) {
    const traspasos = await prisma.traspasos_encabezado.findMany({
      where: {
        IsActive: 1,
        OR: [
          { OrigenTipo: 'Tecnico', OrigenID: TecnicoID },
          { DestinoTipo: 'Tecnico', DestinoID: TecnicoID },
        ],
      },
      include: {
        traspasos_detalle: {
          where: { IsActive: 1 },
          include: {
            refaccion: {
              select: {
                NombrePieza: true,
                Codigo: true,
              },
            },
          },
        },
      },
      orderBy: {
        FechaSolicitud: 'desc',
      },
    });

    return { message: 'Traspasos del técnico obtenidos', data: traspasos };
  }

  // Tipo de movimiento para SALIDA según origen
  private getTipoMovimientoSalida(origenTipo: string): any {
    // Salida siempre es Traspaso_Tecnico si sale de técnico
    // Si sale de bodega, es Traspaso_Bodega_Tecnico
    if (origenTipo === 'Bodega') {
      return 'Traspaso_Bodega_Tecnico';
    }
    return 'Traspaso_Tecnico';
  }

  // Tipo de movimiento para ENTRADA según destino
  private getTipoMovimientoEntrada(destinoTipo: string): any {
    // Entrada desde bodega a técnico
    if (destinoTipo === 'Tecnico') {
      return 'Traspaso_Bodega_Tecnico';
    }
    // Entrada a bodega desde técnico
    return 'Traspaso_Tecnico';
  }
}

export const traspasosService = new TraspasosService();
