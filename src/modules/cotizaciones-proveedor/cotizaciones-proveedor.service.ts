import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { Prisma } from '@prisma/client';
import moment from 'moment';
import {
  AsignarProveedoresDto,
  RespuestaProveedorDto,
  SeleccionarMejorOpcionDto,
  GenerarComprasDto,
} from './cotizaciones-proveedor.schema';

class CotizacionesProveedorService {
  /**
   * Asigna proveedores a una cotización (crea registros de respuesta pendientes)
   */
  async asignarProveedores(cotizacionId: number, dto: AsignarProveedoresDto) {
    const result = await prisma.$transaction(async (tx) => {
      // Verificar que la cotización existe y está activa
      const cotizacion = await tx.cotizaciones_compra_encabezado.findUnique({
        where: { CotizacionCompraID: cotizacionId },
      });

      if (!cotizacion) {
        throw new HttpError('Cotización no encontrada', 404);
      }

      if (!cotizacion.IsActive) {
        throw new HttpError('La cotización no está activa', 400);
      }

      if (cotizacion.Estado === 'FINALIZADA' || cotizacion.Estado === 'CANCELADA') {
        throw new HttpError('No se pueden asignar proveedores a una cotización finalizada o cancelada', 400);
      }

      // Verificar que los proveedores existen
      const proveedores = await tx.catalogo_proveedores.findMany({
        where: { ProveedorID: { in: dto.ProveedorIDs }, IsActive: true },
      });

      if (proveedores.length !== dto.ProveedorIDs.length) {
        const encontrados = proveedores.map(p => p.ProveedorID);
        const noEncontrados = dto.ProveedorIDs.filter(id => !encontrados.includes(id));
        throw new HttpError(`Proveedores no encontrados: ${noEncontrados.join(', ')}`, 404);
      }

      // Verificar si ya existen asignaciones para estos proveedores
      const asignacionesExistentes = await tx.cotizaciones_compra_respuestas.findMany({
        where: {
          CotizacionCompraID: cotizacionId,
          ProveedorID: { in: dto.ProveedorIDs },
          IsActive: true,
        },
      });

      const proveedoresYaAsignados = asignacionesExistentes.map(a => a.ProveedorID);
      const nuevosProveedores = dto.ProveedorIDs.filter(id => !proveedoresYaAsignados.includes(id));

      // Crear asignaciones para nuevos proveedores
      const nuevasAsignaciones = [];
      for (const proveedorId of nuevosProveedores) {
        const respuesta = await tx.cotizaciones_compra_respuestas.create({
          data: {
            CotizacionCompraID: cotizacionId,
            ProveedorID: proveedorId,
            Estado: 'PENDIENTE',
            DescuentoGlobal: 0,
            Observaciones: dto.Observaciones || null,
            IsActive: true,
          },
        });
        nuevasAsignaciones.push(respuesta);
      }

      // Actualizar estado de cotización a EN_ESPERA si estaba en ENVIADA
      if (cotizacion.Estado === 'PENDIENTE' || cotizacion.Estado === 'ENVIADA') {
        await tx.cotizaciones_compra_encabezado.update({
          where: { CotizacionCompraID: cotizacionId },
          data: { Estado: 'EN_ESPERA' },
        });
      }

      return {
        nuevasAsignaciones: nuevasAsignaciones.length,
        yaAsignados: proveedoresYaAsignados.length,
        totalProveedores: dto.ProveedorIDs.length,
      };
    });

    return { message: 'Proveedores asignados correctamente', data: result };
  }

  /**
   * Obtiene las cotizaciones asignadas a un proveedor
   * (Usado por proveedores en su portal)
   */
  async getCotizacionesPorProveedor(proveedorId: number) {
    // Verificar que el proveedor existe
    const proveedor = await prisma.catalogo_proveedores.findFirst({
      where: { ProveedorID: proveedorId, IsActive: true },
    });

    if (!proveedor) {
      throw new HttpError('Proveedor no encontrado', 404);
    }

    const respuestas = await prisma.cotizaciones_compra_respuestas.findMany({
      where: {
        ProveedorID: proveedorId,
        IsActive: true,
      },
      include: {
        encabezado: {
          select: {
            CotizacionCompraID: true,
            Folio: true,
            FechaCotizacion: true,
            Observaciones: true,
            Estado: true,
            detalles: {
              where: { IsActive: true },
              include: {
                refaccion: {
                  select: {
                    RefaccionID: true,
                    Codigo: true,
                    NombrePieza: true,
                  },
                },
              },
            },
            equiposVirtuales: {
              include: {
                equipoVirtual: {
                  select: {
                    EquipoVirtualID: true,
                    Codigo: true,
                    Nombre: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { FechaCreacion: 'desc' },
    });

    const cotizacionesFormateadas = respuestas.map(resp => ({
      RespuestaID: resp.RespuestaID,
      EstadoRespuesta: resp.Estado,
      DescuentoGlobal: resp.DescuentoGlobal,
      FechaRespuesta: resp.FechaRespuesta ? moment.utc(resp.FechaRespuesta).format('YYYY-MM-DD HH:mm:ss') : null,
      FechaAsignacion: moment.utc(resp.FechaCreacion).format('YYYY-MM-DD HH:mm:ss'),
      Cotizacion: {
        CotizacionCompraID: resp.encabezado.CotizacionCompraID,
        Folio: resp.encabezado.Folio,
        FechaCotizacion: moment.utc(resp.encabezado.FechaCotizacion).format('YYYY-MM-DD'),
        Observaciones: resp.encabezado.Observaciones,
        Estado: resp.encabezado.Estado,
        TotalRefacciones: resp.encabezado.detalles.length,
        TotalEquiposVirtuales: resp.encabezado.equiposVirtuales?.length || 0,
        detalles: resp.encabezado.detalles.map(d => ({
          CotizacionDetalleID: d.CotizacionDetalleID,
          RefaccionID: d.RefaccionID,
          Codigo: d.refaccion.Codigo,
          NombrePieza: d.refaccion.NombrePieza,
          Cantidad: d.Cantidad,
          Observaciones: d.Observaciones,
        })),
        equiposVirtuales: resp.encabezado.equiposVirtuales?.map(ev => ({
          ID: ev.ID,
          EquipoVirtualID: ev.EquipoVirtualID,
          Codigo: ev.equipoVirtual?.Codigo || '',
          Nombre: ev.equipoVirtual?.Nombre || '',
          PrecioOriginal: Number(ev.PrecioOriginal),
          PrecioFinal: Number(ev.PrecioFinal),
        })) || [],
      },
    }));

    return { message: 'Cotizaciones del proveedor obtenidas', data: cotizacionesFormateadas };
  }

  /**
   * Obtiene detalle de una respuesta específica
   */
  async getRespuestaDetalle(respuestaId: number) {
    const respuesta = await prisma.cotizaciones_compra_respuestas.findFirst({
      where: { RespuestaID: respuestaId, IsActive: true },
      include: {
        encabezado: {
          select: {
            CotizacionCompraID: true,
            Folio: true,
            FechaCotizacion: true,
            Observaciones: true,
            Estado: true,
            detalles: {
              where: { IsActive: true },
              include: {
                refaccion: {
                  select: {
                    RefaccionID: true,
                    Codigo: true,
                    NombrePieza: true,
                    NombreCorto: true,
                  },
                },
              },
            },
            equiposVirtuales: {
              include: {
                equipoVirtual: {
                  select: {
                    EquipoVirtualID: true,
                    Codigo: true,
                    Nombre: true,
                    TotalCosto: true,
                  },
                },
              },
            },
          },
        },
        proveedor: {
          select: {
            ProveedorID: true,
            NombreProveedor: true,
          },
        },
        detalles: true,
        equipos: true,
      },
    });

    if (!respuesta) {
      throw new HttpError('Respuesta no encontrada', 404);
    }

    // Mapear detalles de respuesta con detalles de cotización
    const detallesMap = new Map(respuesta.detalles.map(d => [d.CotizacionDetalleID, d]));

    const detallesFormateados = respuesta.encabezado.detalles.map(detCot => {
      const detResp = detallesMap.get(detCot.CotizacionDetalleID);
      return {
        CotizacionDetalleID: detCot.CotizacionDetalleID,
        RefaccionID: detCot.RefaccionID,
        Codigo: detCot.refaccion.Codigo,
        NombrePieza: detCot.refaccion.NombrePieza,
        NombreCorto: detCot.refaccion.NombreCorto,
        CantidadSolicitada: detCot.Cantidad,
        ObservacionesSolicitud: detCot.Observaciones,
        // Respuesta del proveedor
        PrecioUnitario: detResp?.PrecioUnitario || 0,
        Descuento: detResp?.Descuento || 0,
        TieneStock: detResp?.TieneStock ?? true,
        DiasEntrega: detResp?.DiasEntrega || 0,
        ObservacionesProveedor: detResp?.Observaciones || null,
        // Calculados
        PrecioConDescuento: detResp ? Number(detResp.PrecioUnitario) * (1 - Number(detResp.Descuento) / 100) : 0,
        Subtotal: detResp ? Number(detResp.PrecioUnitario) * (1 - Number(detResp.Descuento) / 100) * detCot.Cantidad : 0,
      };
    });

    const totalSinDescuento = detallesFormateados.reduce((sum, d) => sum + (Number(d.PrecioUnitario) * d.CantidadSolicitada), 0);
    const totalConDescuento = detallesFormateados.reduce((sum, d) => sum + d.Subtotal, 0);

    // Mapear respuestas de equipos virtuales del proveedor
    const equiposRespMap = new Map((respuesta as any).equipos?.map((e: any) => [e.CotizacionEquipoVirtualID, e]) || []);

    // Formatear equipos virtuales con respuestas del proveedor
    const equiposVirtualesFormateados = respuesta.encabezado.equiposVirtuales?.map(ev => {
      const equipoResp = equiposRespMap.get(ev.ID) as any;
      return {
        ID: ev.ID,
        EquipoVirtualID: ev.EquipoVirtualID,
        Codigo: ev.equipoVirtual?.Codigo || '',
        Nombre: ev.equipoVirtual?.Nombre || '',
        PrecioOriginal: Number(ev.PrecioOriginal),
        PrecioFinal: Number(ev.PrecioFinal),
        // Respuesta del proveedor
        PrecioCotizado: equipoResp ? Number(equipoResp.PrecioCotizado) : 0,
        DisponibleProveedor: equipoResp?.Disponible ?? true,
        TiempoEntregaProveedor: equipoResp?.TiempoEntrega || '',
        ObservacionesProveedor: equipoResp?.Observaciones || '',
      };
    }) || [];

    const totalEquiposVirtuales = equiposVirtualesFormateados.reduce((sum, ev) => sum + ev.PrecioFinal, 0);
    const totalEquiposCotizados = equiposVirtualesFormateados.reduce((sum, ev) => {
      if (ev.DisponibleProveedor && ev.PrecioCotizado > 0) {
        return sum + ev.PrecioCotizado;
      }
      return sum;
    }, 0);

    return {
      message: 'Detalle de respuesta obtenido',
      data: {
        RespuestaID: respuesta.RespuestaID,
        Estado: respuesta.Estado,
        DescuentoGlobal: respuesta.DescuentoGlobal,
        NumeroPedido: respuesta.NumeroPedido,
        Observaciones: respuesta.Observaciones,
        FechaRespuesta: respuesta.FechaRespuesta ? moment.utc(respuesta.FechaRespuesta).format('YYYY-MM-DD HH:mm:ss') : null,
        Proveedor: respuesta.proveedor,
        Cotizacion: {
          CotizacionCompraID: respuesta.encabezado.CotizacionCompraID,
          Folio: respuesta.encabezado.Folio,
          FechaCotizacion: moment.utc(respuesta.encabezado.FechaCotizacion).format('YYYY-MM-DD'),
          Observaciones: respuesta.encabezado.Observaciones,
        },
        detalles: detallesFormateados,
        equiposVirtuales: equiposVirtualesFormateados,
        Totales: {
          TotalSinDescuento: Math.round(totalSinDescuento * 100) / 100,
          TotalConDescuento: Math.round(totalConDescuento * 100) / 100,
          TotalConDescuentoGlobal: Math.round(totalConDescuento * (1 - Number(respuesta.DescuentoGlobal) / 100) * 100) / 100,
          TotalEquiposVirtuales: Math.round(totalEquiposVirtuales * 100) / 100,
          TotalEquiposCotizados: Math.round(totalEquiposCotizados * 100) / 100,
        },
      },
    };
  }

  /**
   * Proveedor responde con precios a una cotización
   */
  async responderCotizacion(respuestaId: number, dto: RespuestaProveedorDto) {
    const result = await prisma.$transaction(async (tx) => {
      // Verificar que la respuesta existe y está pendiente
      const respuesta = await tx.cotizaciones_compra_respuestas.findFirst({
        where: { RespuestaID: respuestaId, IsActive: true },
        include: {
          encabezado: {
            include: {
              detalles: {
                where: { IsActive: true },
              },
              equiposVirtuales: true,
            },
          },
        },
      });

      if (!respuesta) {
        throw new HttpError('Respuesta no encontrada', 404);
      }

      if (respuesta.Estado === 'COMPLETADA') {
        throw new HttpError('Esta respuesta ya fue completada', 400);
      }

      if (respuesta.Estado === 'RECHAZADA') {
        throw new HttpError('Esta respuesta fue rechazada', 400);
      }

      // Validar que los detalles de refacciones correspondan a la cotización
      if (dto.Detalles && dto.Detalles.length > 0) {
        const detalleIds = respuesta.encabezado.detalles.map(d => d.CotizacionDetalleID);
        const detallesEnviados = dto.Detalles.map(d => d.CotizacionDetalleID);
        const detallesInvalidos = detallesEnviados.filter(id => !detalleIds.includes(id));

        if (detallesInvalidos.length > 0) {
          throw new HttpError(`Detalles no válidos: ${detallesInvalidos.join(', ')}`, 400);
        }
      }

      // Validar que los equipos virtuales correspondan a la cotización
      if (dto.EquiposVirtuales && dto.EquiposVirtuales.length > 0) {
        const equipoIds = respuesta.encabezado.equiposVirtuales.map(e => e.ID);
        const equiposEnviados = dto.EquiposVirtuales.map(e => e.CotizacionEquipoVirtualID);
        const equiposInvalidos = equiposEnviados.filter(id => !equipoIds.includes(id));

        if (equiposInvalidos.length > 0) {
          throw new HttpError(`Equipos virtuales no válidos: ${equiposInvalidos.join(', ')}`, 400);
        }
      }

      // Eliminar detalles de refacciones anteriores si existen
      await tx.cotizaciones_compra_respuestas_detalle.deleteMany({
        where: { RespuestaID: respuestaId },
      });

      // Eliminar detalles de equipos virtuales anteriores si existen
      await tx.cotizaciones_compra_respuestas_equipos.deleteMany({
        where: { RespuestaID: respuestaId },
      });

      // Crear detalles de respuesta para refacciones
      if (dto.Detalles && dto.Detalles.length > 0) {
        for (const detalle of dto.Detalles) {
          await tx.cotizaciones_compra_respuestas_detalle.create({
            data: {
              RespuestaID: respuestaId,
              CotizacionDetalleID: detalle.CotizacionDetalleID,
              PrecioUnitario: detalle.PrecioUnitario,
              Descuento: detalle.Descuento,
              TieneStock: detalle.TieneStock,
              DiasEntrega: detalle.DiasEntrega,
              Observaciones: detalle.Observaciones || null,
            },
          });
        }
      }

      // Crear detalles de respuesta para equipos virtuales
      if (dto.EquiposVirtuales && dto.EquiposVirtuales.length > 0) {
        for (const equipo of dto.EquiposVirtuales) {
          await tx.cotizaciones_compra_respuestas_equipos.create({
            data: {
              RespuestaID: respuestaId,
              CotizacionEquipoVirtualID: equipo.CotizacionEquipoVirtualID,
              PrecioCotizado: equipo.PrecioCotizado,
              Disponible: equipo.Disponible ?? true,
              TiempoEntrega: equipo.TiempoEntrega || null,
              Observaciones: equipo.Observaciones || null,
            },
          });
        }
      }

      // Actualizar respuesta
      await tx.cotizaciones_compra_respuestas.update({
        where: { RespuestaID: respuestaId },
        data: {
          Estado: 'COMPLETADA',
          DescuentoGlobal: dto.DescuentoGlobal || 0,
          NumeroPedido: dto.NumeroPedido || null,
          Observaciones: dto.Observaciones || null,
          FechaRespuesta: new Date(),
        },
      });

      return { RespuestaID: respuestaId };
    });

    return { message: 'Respuesta registrada correctamente', data: result };
  }

  /**
   * Obtiene todas las respuestas de una cotización para comparar
   */
  async compararRespuestas(cotizacionId: number) {
    const cotizacion = await prisma.cotizaciones_compra_encabezado.findUnique({
      where: { CotizacionCompraID: cotizacionId },
      include: {
        detalles: {
          where: { IsActive: true, EquipoVirtualID: null },
          include: {
            refaccion: {
              select: {
                RefaccionID: true,
                Codigo: true,
                NombrePieza: true,
              },
            },
          },
        },
        equiposVirtuales: {
          include: {
            equipoVirtual: {
              select: {
                EquipoVirtualID: true,
                Nombre: true,
                Codigo: true,
                TotalCosto: true,
              },
            },
          },
        },
      },
    });

    if (!cotizacion) {
      throw new HttpError('Cotización no encontrada', 404);
    }

    const respuestas = await prisma.cotizaciones_compra_respuestas.findMany({
      where: {
        CotizacionCompraID: cotizacionId,
        IsActive: true,
      },
      include: {
        proveedor: {
          select: {
            ProveedorID: true,
            NombreProveedor: true,
          },
        },
        detalles: true,
        equipos: true,
      },
      orderBy: { FechaRespuesta: 'desc' },
    });

    // Crear matriz de comparación
    const comparacion = cotizacion.detalles.map(detCot => {
      const precios = respuestas.map(resp => {
        const detResp = resp.detalles.find(d => d.CotizacionDetalleID === detCot.CotizacionDetalleID);
        const precioUnitario = Number(detResp?.PrecioUnitario || 0);
        const descuento = Number(detResp?.Descuento || 0);
        const precioConDescuento = precioUnitario * (1 - descuento / 100);

        return {
          ProveedorID: resp.ProveedorID,
          NombreProveedor: resp.proveedor.NombreProveedor,
          Estado: resp.Estado,
          PrecioUnitario: precioUnitario,
          Descuento: descuento,
          PrecioConDescuento: Math.round(precioConDescuento * 100) / 100,
          TieneStock: detResp?.TieneStock ?? null,
          DiasEntrega: detResp?.DiasEntrega || 0,
          Subtotal: Math.round(precioConDescuento * detCot.Cantidad * 100) / 100,
        };
      });

      // Encontrar el mejor precio
      const preciosValidos = precios.filter(p => p.Estado === 'COMPLETADA' && p.PrecioUnitario > 0);
      const mejorPrecio = preciosValidos.length > 0
        ? preciosValidos.reduce((min, p) => p.PrecioConDescuento < min.PrecioConDescuento ? p : min)
        : null;

      return {
        CotizacionDetalleID: detCot.CotizacionDetalleID,
        RefaccionID: detCot.RefaccionID,
        Codigo: detCot.refaccion.Codigo,
        NombrePieza: detCot.refaccion.NombrePieza,
        CantidadSolicitada: detCot.Cantidad,
        Precios: precios,
        MejorOpcion: mejorPrecio ? mejorPrecio.ProveedorID : null,
      };
    });

    // Calcular totales por proveedor
    const totalesPorProveedor = respuestas.map(resp => {
      const subtotales = comparacion.map(c => {
        const precio = c.Precios.find(p => p.ProveedorID === resp.ProveedorID);
        return precio?.Subtotal || 0;
      });
      const total = subtotales.reduce((sum, s) => sum + s, 0);
      const totalConDescuentoGlobal = total * (1 - Number(resp.DescuentoGlobal) / 100);

      return {
        ProveedorID: resp.ProveedorID,
        NombreProveedor: resp.proveedor.NombreProveedor,
        Estado: resp.Estado,
        DescuentoGlobal: resp.DescuentoGlobal,
        Total: Math.round(total * 100) / 100,
        TotalConDescuentoGlobal: Math.round(totalConDescuentoGlobal * 100) / 100,
        FechaRespuesta: resp.FechaRespuesta ? moment.utc(resp.FechaRespuesta).format('YYYY-MM-DD HH:mm:ss') : null,
        NumeroPedido: resp.NumeroPedido || null,
      };
    });

    // Encontrar mejor opción global
    const totalesCompletados = totalesPorProveedor.filter(t => t.Estado === 'COMPLETADA' && t.TotalConDescuentoGlobal > 0);
    const mejorOpcionGlobal = totalesCompletados.length > 0
      ? totalesCompletados.reduce((min, t) => t.TotalConDescuentoGlobal < min.TotalConDescuentoGlobal ? t : min)
      : null;

    // Comparación de equipos virtuales por proveedor
    const comparacionEquipos = cotizacion.equiposVirtuales.map(evCot => {
      const preciosEquipos = respuestas.map(resp => {
        const equipoResp = (resp as any).equipos?.find(
          (e: any) => e.CotizacionEquipoVirtualID === evCot.ID
        );
        const precioCotizado = Number(equipoResp?.PrecioCotizado || 0);

        return {
          ProveedorID: resp.ProveedorID,
          NombreProveedor: resp.proveedor.NombreProveedor,
          Estado: resp.Estado,
          PrecioCotizado: precioCotizado,
          Disponible: equipoResp?.Disponible ?? null,
          TiempoEntrega: equipoResp?.TiempoEntrega || null,
        };
      });

      // Encontrar mejor precio para equipo virtual
      const preciosValidos = preciosEquipos.filter(p => p.Estado === 'COMPLETADA' && p.PrecioCotizado > 0);
      const mejorPrecio = preciosValidos.length > 0
        ? preciosValidos.reduce((min, p) => p.PrecioCotizado < min.PrecioCotizado ? p : min)
        : null;

      return {
        ID: evCot.ID,
        EquipoVirtualID: evCot.EquipoVirtualID,
        Codigo: evCot.equipoVirtual.Codigo,
        Nombre: evCot.equipoVirtual.Nombre,
        PrecioOriginal: Number(evCot.PrecioOriginal),
        PrecioFinal: Number(evCot.PrecioFinal),
        Precios: preciosEquipos,
        MejorOpcion: mejorPrecio ? mejorPrecio.ProveedorID : null,
      };
    });

    // Total de equipos virtuales (precio de referencia)
    const totalEquiposVirtuales = comparacionEquipos.reduce((sum, ev) => sum + ev.PrecioFinal, 0);

    return {
      message: 'Comparación de respuestas obtenida',
      data: {
        Cotizacion: {
          CotizacionCompraID: cotizacion.CotizacionCompraID,
          Folio: cotizacion.Folio,
          FechaCotizacion: moment.utc(cotizacion.FechaCotizacion).format('YYYY-MM-DD'),
          Estado: cotizacion.Estado,
        },
        TotalProveedores: respuestas.length,
        RespuestasCompletadas: respuestas.filter(r => r.Estado === 'COMPLETADA').length,
        Comparacion: comparacion,
        ComparacionEquipos: comparacionEquipos,
        TotalEquiposVirtuales: Math.round(totalEquiposVirtuales * 100) / 100,
        TotalesPorProveedor: totalesPorProveedor,
        MejorOpcionGlobal: mejorOpcionGlobal ? mejorOpcionGlobal.ProveedorID : null,
      },
    };
  }

  /**
   * Obtiene lista de proveedores asignados a una cotización
   */
  async getProveedoresAsignados(cotizacionId: number) {
    const cotizacion = await prisma.cotizaciones_compra_encabezado.findUnique({
      where: { CotizacionCompraID: cotizacionId },
    });

    if (!cotizacion) {
      throw new HttpError('Cotización no encontrada', 404);
    }

    const respuestas = await prisma.cotizaciones_compra_respuestas.findMany({
      where: {
        CotizacionCompraID: cotizacionId,
        IsActive: true,
      },
      include: {
        proveedor: {
          select: {
            ProveedorID: true,
            NombreProveedor: true,
            Telefono: true,
            Correo: true,
          },
        },
      },
      orderBy: { FechaCreacion: 'desc' },
    });

    const proveedores = respuestas.map(resp => ({
      RespuestaID: resp.RespuestaID,
      Estado: resp.Estado,
      FechaAsignacion: moment.utc(resp.FechaCreacion).format('YYYY-MM-DD HH:mm:ss'),
      FechaRespuesta: resp.FechaRespuesta ? moment.utc(resp.FechaRespuesta).format('YYYY-MM-DD HH:mm:ss') : null,
      DescuentoGlobal: resp.DescuentoGlobal,
      NumeroPedido: resp.NumeroPedido,
      Proveedor: resp.proveedor,
    }));

    return { message: 'Proveedores asignados obtenidos', data: proveedores };
  }

  /**
   * Marca una respuesta como rechazada (el proveedor no puede/quiere cotizar)
   */
  async rechazarCotizacion(respuestaId: number, observaciones?: string) {
    const result = await prisma.$transaction(async (tx) => {
      const respuesta = await tx.cotizaciones_compra_respuestas.findFirst({
        where: { RespuestaID: respuestaId, IsActive: true },
      });

      if (!respuesta) {
        throw new HttpError('Respuesta no encontrada', 404);
      }

      if (respuesta.Estado === 'COMPLETADA') {
        throw new HttpError('No se puede rechazar una respuesta ya completada', 400);
      }

      await tx.cotizaciones_compra_respuestas.update({
        where: { RespuestaID: respuestaId },
        data: {
          Estado: 'RECHAZADA',
          Observaciones: observaciones || 'Rechazado por el proveedor',
          FechaRespuesta: new Date(),
        },
      });

      return { RespuestaID: respuestaId };
    });

    return { message: 'Cotización rechazada', data: result };
  }

  /**
   * Elimina la asignación de un proveedor a una cotización
   */
  async eliminarAsignacion(respuestaId: number) {
    const result = await prisma.$transaction(async (tx) => {
      const respuesta = await tx.cotizaciones_compra_respuestas.findFirst({
        where: { RespuestaID: respuestaId, IsActive: true },
      });

      if (!respuesta) {
        throw new HttpError('Asignación no encontrada', 404);
      }

      if (respuesta.Estado === 'COMPLETADA') {
        throw new HttpError('No se puede eliminar una asignación con respuesta completada', 400);
      }

      // Soft delete de la asignación
      await tx.cotizaciones_compra_respuestas.update({
        where: { RespuestaID: respuestaId },
        data: { IsActive: false },
      });

      // Eliminar detalles de respuesta si existen
      await tx.cotizaciones_compra_respuestas_detalle.deleteMany({
        where: { RespuestaID: respuestaId },
      });

      return { RespuestaID: respuestaId };
    });

    return { message: 'Asignación eliminada correctamente', data: result };
  }

  /**
   * Genera múltiples compras basado en las selecciones de proveedores por item
   * También procesa equipos virtuales y sincroniza precios proporcionalmente
   */
  async generarComprasMultiples(cotizacionId: number, dto: GenerarComprasDto) {
    const result = await prisma.$transaction(async (tx) => {
      // Verificar cotización
      const cotizacion = await tx.cotizaciones_compra_encabezado.findUnique({
        where: { CotizacionCompraID: cotizacionId },
        include: {
          detalles: { where: { IsActive: true } },
          equiposVirtuales: {
            include: {
              equipoVirtual: {
                include: { detalles: { where: { IsActive: true } } },
              },
            },
          },
        },
      });

      if (!cotizacion) {
        throw new HttpError('Cotización no encontrada', 404);
      }

      if (!cotizacion.IsActive) {
        throw new HttpError('La cotización no está activa', 400);
      }

      if (cotizacion.Estado === 'FINALIZADA') {
        throw new HttpError('La cotización ya fue convertida a compra(s)', 400);
      }

      if (cotizacion.Estado === 'CANCELADA') {
        throw new HttpError('No se puede procesar una cotización cancelada', 400);
      }

      // Agrupar selecciones de refacciones por proveedor
      const porProveedor = new Map<number, number[]>();
      for (const sel of dto.Selecciones || []) {
        if (!porProveedor.has(sel.ProveedorID)) {
          porProveedor.set(sel.ProveedorID, []);
        }
        porProveedor.get(sel.ProveedorID)!.push(sel.CotizacionDetalleID);
      }

      // Obtener todos los proveedores involucrados (refacciones + equipos)
      const proveedorIdsEquipos = (dto.SeleccionesEquipos || []).map(s => s.ProveedorID);
      const todosProveedorIds = [...new Set([...Array.from(porProveedor.keys()), ...proveedorIdsEquipos])];

      // Obtener respuestas de proveedores con precios
      const respuestas = await tx.cotizaciones_compra_respuestas.findMany({
        where: {
          CotizacionCompraID: cotizacionId,
          ProveedorID: { in: todosProveedorIds },
          Estado: 'COMPLETADA',
          IsActive: true,
        },
        include: {
          proveedor: true,
          detalles: true,
          equipos: true,
        },
      });

      const respuestasMap = new Map(respuestas.map(r => [r.ProveedorID, r]));

      // Crear compras por proveedor (solo refacciones)
      const comprasCreadas = [];

      for (const [proveedorId, detalleIds] of porProveedor) {
        const respuesta = respuestasMap.get(proveedorId);
        if (!respuesta) {
          throw new HttpError(`No hay respuesta del proveedor ${proveedorId}`, 400);
        }

        // Mapear detalles de respuesta
        const detallesRespuestaMap = new Map(
          respuesta.detalles.map(d => [d.CotizacionDetalleID, d])
        );

        // Filtrar detalles de cotización seleccionados
        const detallesSeleccionados = cotizacion.detalles.filter(d =>
          detalleIds.includes(d.CotizacionDetalleID)
        );

        if (detallesSeleccionados.length === 0) continue;

        // Calcular totales
        let totalBruto = 0;
        const detallesCompra = [];

        for (const detCot of detallesSeleccionados) {
          const detResp = detallesRespuestaMap.get(detCot.CotizacionDetalleID);
          const precioUnitario = Number(detResp?.PrecioUnitario || 0);
          const descuento = Number(detResp?.Descuento || 0);
          const cantidad = detCot.Cantidad;
          const subtotal = precioUnitario * cantidad;
          const descuentoEfectivo = subtotal * (descuento / 100);
          const total = subtotal - descuentoEfectivo;

          totalBruto += total;

          detallesCompra.push({
            RefaccionID: detCot.RefaccionID,
            Cantidad: cantidad,
            PrecioUnitario: precioUnitario,
            DescuentoPorcentaje: descuento,
            DescuentoEfectivo: descuentoEfectivo,
            GastosOperativos: 0,
            GastosImportacion: 0,
            SubTotal: subtotal,
            Total: total,
            IsActive: true,
          });
        }

        // Aplicar descuento global
        const descuentoGlobal = Number(respuesta.DescuentoGlobal || 0);
        const totalConDescuento = totalBruto * (1 - descuentoGlobal / 100);

        // Crear encabezado de compra
        const compra = await tx.compras_encabezado.create({
          data: {
            ProveedorID: proveedorId,
            FechaCompra: new Date(),
            Estatus: 'Pendiente',
            EstadoPago: 'PENDIENTE',
            EstadoEntrega: 'PEDIDO',
            FormaPago: 'CREDITO',
            TotalBruto: totalBruto,
            TotalDescuentosPorcentaje: descuentoGlobal,
            TotalDescuentoEfectivo: totalBruto - totalConDescuento,
            TotalGastosOperativos: 0,
            TotalGastosImportacion: 0,
            TotalIVA: 0,
            TotalNeto: totalConDescuento,
            TotalPagado: 0,
            TotalRecibido: 0,
            TotalNotasCredito: 0,
            UsuarioID: cotizacion.UsuarioID,
            IsActive: true,
            CotizacionCompraID: cotizacionId,
            NumeroPedido: respuesta.NumeroPedido || null,
          },
        });

        // Crear detalles de compra
        for (const det of detallesCompra) {
          await tx.compras_detalle.create({
            data: {
              CompraEncabezadoID: compra.CompraEncabezadoID,
              ...det,
            },
          });
        }

        comprasCreadas.push({
          CompraEncabezadoID: compra.CompraEncabezadoID,
          ProveedorID: proveedorId,
          NombreProveedor: respuesta.proveedor.NombreProveedor,
          TotalItems: detallesSeleccionados.length,
          TotalNeto: Math.round(totalConDescuento * 100) / 100,
        });
      }

      // ============================================================
      // PROCESAR EQUIPOS VIRTUALES: CREAR LÍNEAS DE COMPRA + SINCRONIZAR PRECIOS
      // ============================================================
      const equiposProcesados = [];

      // Agrupar equipos por proveedor
      const equiposPorProveedor = new Map<number, typeof dto.SeleccionesEquipos>();
      for (const selEquipo of dto.SeleccionesEquipos || []) {
        if (!equiposPorProveedor.has(selEquipo.ProveedorID)) {
          equiposPorProveedor.set(selEquipo.ProveedorID, []);
        }
        equiposPorProveedor.get(selEquipo.ProveedorID)!.push(selEquipo);
      }

      // Mapa de compras creadas por proveedor (para reutilizar si ya existe)
      const comprasPorProveedor = new Map<number, number>();
      for (const compra of comprasCreadas) {
        comprasPorProveedor.set(compra.ProveedorID, compra.CompraEncabezadoID);
      }

      for (const [proveedorId, equiposSeleccionados] of equiposPorProveedor) {
        const respuesta = respuestasMap.get(proveedorId);
        if (!respuesta) continue;

        let compraEncabezadoId = comprasPorProveedor.get(proveedorId);
        let totalEquiposProveedor = 0;

        // Si no existe compra para este proveedor, crear una nueva
        if (!compraEncabezadoId) {
          const nuevaCompra = await tx.compras_encabezado.create({
            data: {
              ProveedorID: proveedorId,
              FechaCompra: new Date(),
              Estatus: 'Pendiente',
              EstadoPago: 'PENDIENTE',
              EstadoEntrega: 'PEDIDO',
              FormaPago: 'CREDITO',
              TotalBruto: 0,
              TotalDescuentosPorcentaje: 0,
              TotalDescuentoEfectivo: 0,
              TotalGastosOperativos: 0,
              TotalGastosImportacion: 0,
              TotalIVA: 0,
              TotalNeto: 0,
              TotalPagado: 0,
              TotalRecibido: 0,
              TotalNotasCredito: 0,
              UsuarioID: cotizacion.UsuarioID,
              IsActive: true,
              CotizacionCompraID: cotizacionId,
              NumeroPedido: respuesta.NumeroPedido || null,
            },
          });
          compraEncabezadoId = nuevaCompra.CompraEncabezadoID;
          comprasPorProveedor.set(proveedorId, compraEncabezadoId);

          // Agregar a compras creadas
          comprasCreadas.push({
            CompraEncabezadoID: compraEncabezadoId,
            ProveedorID: proveedorId,
            NombreProveedor: respuesta.proveedor.NombreProveedor,
            TotalItems: 0,
            TotalNeto: 0,
          });
        }

        // Procesar cada equipo seleccionado de este proveedor
        for (const selEquipo of equiposSeleccionados) {
          // Buscar el equipo en la cotización
          const equipoCot = cotizacion.equiposVirtuales.find(
            e => e.ID === selEquipo.CotizacionEquipoVirtualID
          );
          if (!equipoCot) continue;

          // Buscar el precio cotizado por el proveedor
          const equipoResp = (respuesta as any).equipos?.find(
            (e: any) => e.CotizacionEquipoVirtualID === selEquipo.CotizacionEquipoVirtualID
          );

          if (!equipoResp || Number(equipoResp.PrecioCotizado) <= 0) continue;

          const precioOriginal = Number(equipoCot.PrecioOriginal);
          const precioNuevo = Number(equipoResp.PrecioCotizado);
          const diferencia = precioNuevo - precioOriginal;

          // ============================================================
          // 1. CREAR LÍNEA DE COMPRA PARA EL EQUIPO VIRTUAL
          // ============================================================
          await tx.compras_detalle.create({
            data: {
              CompraEncabezadoID: compraEncabezadoId,
              EquipoVirtualID: equipoCot.EquipoVirtualID,
              RefaccionID: null,
              EquipoID: null,
              Cantidad: 1,
              PrecioUnitario: precioNuevo,
              DescuentoPorcentaje: 0,
              DescuentoEfectivo: 0,
              GastosOperativos: 0,
              GastosImportacion: 0,
              SubTotal: precioNuevo,
              Total: precioNuevo,
              IsActive: true,
            },
          });

          totalEquiposProveedor += precioNuevo;

          // ============================================================
          // 2. ACTUALIZAR PrecioFinal EN LA COTIZACIÓN
          // ============================================================
          await tx.cotizaciones_compra_equipos_virtuales.update({
            where: { ID: equipoCot.ID },
            data: { PrecioFinal: precioNuevo },
          });

          // ============================================================
          // 3. SINCRONIZAR PRECIOS (distribución proporcional)
          // ============================================================
          if (Math.abs(diferencia) >= 0.01) {
            const equipoVirtual = equipoCot.equipoVirtual;

            // Calcular ajuste proporcional para cada refacción
            const detallesCambio = equipoVirtual.detalles.map((d) => {
              const totalFinal = Number(d.TotalFinal || 0);
              const porcentaje = precioOriginal > 0 ? totalFinal / precioOriginal : 0;
              const ajuste = diferencia * porcentaje;
              const nuevoTotal = totalFinal + ajuste;

              return {
                DetalleID: d.DetalleID,
                RefaccionID: d.RefaccionID,
                PrecioAnterior: Math.round(totalFinal * 100) / 100,
                Porcentaje: Math.round(porcentaje * 10000) / 100,
                Ajuste: Math.round(ajuste * 100) / 100,
                PrecioNuevo: Math.round(nuevoTotal * 100) / 100,
              };
            });

            // Guardar historial
            await tx.equipos_virtuales_historial.create({
              data: {
                EquipoVirtualID: equipoVirtual.EquipoVirtualID,
                CotizacionCompraID: cotizacionId,
                PrecioAnterior: precioOriginal,
                PrecioNuevo: precioNuevo,
                Diferencia: diferencia,
                DetallesCambio: detallesCambio,
                UsuarioID: cotizacion.UsuarioID,
                Observaciones: `Ajuste por cotización multi-proveedor #${cotizacionId}`,
              },
            });

            // Actualizar precios de cada detalle del equipo virtual
            for (const cambio of detallesCambio) {
              await tx.equipos_virtuales_detalle.update({
                where: { DetalleID: cambio.DetalleID },
                data: {
                  CostoAnterior: cambio.PrecioAnterior,
                  TotalFinal: cambio.PrecioNuevo,
                  CostoActual: cambio.PrecioNuevo,
                },
              });
            }

            // Actualizar total del equipo virtual
            await tx.equipos_virtuales.update({
              where: { EquipoVirtualID: equipoVirtual.EquipoVirtualID },
              data: {
                TotalCosto: precioNuevo,
                FechaActualizacion: new Date(),
              },
            });

            equiposProcesados.push({
              EquipoVirtualID: equipoVirtual.EquipoVirtualID,
              Nombre: equipoVirtual.Nombre,
              PrecioAnterior: precioOriginal,
              PrecioNuevo: precioNuevo,
              Diferencia: diferencia,
              RefaccionesActualizadas: detallesCambio.length,
            });
          }
        }

        // Actualizar totales de la compra si se agregaron equipos
        if (totalEquiposProveedor > 0) {
          const compraActual = await tx.compras_encabezado.findUnique({
            where: { CompraEncabezadoID: compraEncabezadoId },
          });

          const nuevoTotalBruto = Number(compraActual?.TotalBruto || 0) + totalEquiposProveedor;
          const nuevoTotalNeto = Number(compraActual?.TotalNeto || 0) + totalEquiposProveedor;

          await tx.compras_encabezado.update({
            where: { CompraEncabezadoID: compraEncabezadoId },
            data: {
              TotalBruto: nuevoTotalBruto,
              TotalNeto: nuevoTotalNeto,
            },
          });

          // Actualizar en el array de compras creadas
          const compraEnArray = comprasCreadas.find(c => c.CompraEncabezadoID === compraEncabezadoId);
          if (compraEnArray) {
            compraEnArray.TotalItems += equiposSeleccionados.length;
            compraEnArray.TotalNeto = Math.round(nuevoTotalNeto * 100) / 100;
          }
        }
      }

      // Actualizar cotización a FINALIZADA
      await tx.cotizaciones_compra_encabezado.update({
        where: { CotizacionCompraID: cotizacionId },
        data: { Estado: 'FINALIZADA' },
      });

      return {
        comprasCreadas,
        totalCompras: comprasCreadas.length,
        equiposProcesados,
        totalEquiposSincronizados: equiposProcesados.length,
        cotizacionID: cotizacionId,
      };
    }, {
      timeout: 30000,
      maxWait: 10000,
    });

    return {
      message: `Se crearon ${result.totalCompras} compra(s) y se sincronizaron ${result.totalEquiposSincronizados} equipo(s) virtual(es)`,
      data: result,
    };
  }
}

export const cotizacionesProveedorService = new CotizacionesProveedorService();
