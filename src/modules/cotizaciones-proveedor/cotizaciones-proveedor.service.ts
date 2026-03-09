import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { Prisma } from '@prisma/client';
import moment from 'moment';
import {
  AsignarProveedoresDto,
  RespuestaProveedorDto,
  SeleccionarMejorOpcionDto,
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
          },
        },
      },
      orderBy: { FechaCreacion: 'desc' },
    });

    const cotizacionesFormateadas = respuestas.map(resp => ({
      RespuestaID: resp.RespuestaID,
      EstadoRespuesta: resp.Estado,
      DescuentoGlobal: resp.DescuentoGlobal,
      FechaRespuesta: resp.FechaRespuesta ? moment(resp.FechaRespuesta).format('YYYY-MM-DD HH:mm:ss') : null,
      FechaAsignacion: moment(resp.FechaCreacion).format('YYYY-MM-DD HH:mm:ss'),
      Cotizacion: {
        CotizacionCompraID: resp.encabezado.CotizacionCompraID,
        Folio: resp.encabezado.Folio,
        FechaCotizacion: moment(resp.encabezado.FechaCotizacion).format('YYYY-MM-DD'),
        Observaciones: resp.encabezado.Observaciones,
        Estado: resp.encabezado.Estado,
        TotalRefacciones: resp.encabezado.detalles.length,
        detalles: resp.encabezado.detalles.map(d => ({
          CotizacionDetalleID: d.CotizacionDetalleID,
          RefaccionID: d.RefaccionID,
          Codigo: d.refaccion.Codigo,
          NombrePieza: d.refaccion.NombrePieza,
          Cantidad: d.Cantidad,
          Observaciones: d.Observaciones,
        })),
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
          },
        },
        proveedor: {
          select: {
            ProveedorID: true,
            NombreProveedor: true,
          },
        },
        detalles: true,
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

    return {
      message: 'Detalle de respuesta obtenido',
      data: {
        RespuestaID: respuesta.RespuestaID,
        Estado: respuesta.Estado,
        DescuentoGlobal: respuesta.DescuentoGlobal,
        Observaciones: respuesta.Observaciones,
        FechaRespuesta: respuesta.FechaRespuesta ? moment(respuesta.FechaRespuesta).format('YYYY-MM-DD HH:mm:ss') : null,
        Proveedor: respuesta.proveedor,
        Cotizacion: {
          CotizacionCompraID: respuesta.encabezado.CotizacionCompraID,
          Folio: respuesta.encabezado.Folio,
          FechaCotizacion: moment(respuesta.encabezado.FechaCotizacion).format('YYYY-MM-DD'),
          Observaciones: respuesta.encabezado.Observaciones,
        },
        detalles: detallesFormateados,
        Totales: {
          TotalSinDescuento: Math.round(totalSinDescuento * 100) / 100,
          TotalConDescuento: Math.round(totalConDescuento * 100) / 100,
          TotalConDescuentoGlobal: Math.round(totalConDescuento * (1 - Number(respuesta.DescuentoGlobal) / 100) * 100) / 100,
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

      // Validar que los detalles correspondan a la cotización
      const detalleIds = respuesta.encabezado.detalles.map(d => d.CotizacionDetalleID);
      const detallesEnviados = dto.Detalles.map(d => d.CotizacionDetalleID);
      const detallesInvalidos = detallesEnviados.filter(id => !detalleIds.includes(id));

      if (detallesInvalidos.length > 0) {
        throw new HttpError(`Detalles no válidos: ${detallesInvalidos.join(', ')}`, 400);
      }

      // Eliminar detalles anteriores si existen
      await tx.cotizaciones_compra_respuestas_detalle.deleteMany({
        where: { RespuestaID: respuestaId },
      });

      // Crear detalles de respuesta
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

      // Actualizar respuesta
      await tx.cotizaciones_compra_respuestas.update({
        where: { RespuestaID: respuestaId },
        data: {
          Estado: 'COMPLETADA',
          DescuentoGlobal: dto.DescuentoGlobal || 0,
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
        FechaRespuesta: resp.FechaRespuesta ? moment(resp.FechaRespuesta).format('YYYY-MM-DD HH:mm:ss') : null,
      };
    });

    // Encontrar mejor opción global
    const totalesCompletados = totalesPorProveedor.filter(t => t.Estado === 'COMPLETADA' && t.TotalConDescuentoGlobal > 0);
    const mejorOpcionGlobal = totalesCompletados.length > 0
      ? totalesCompletados.reduce((min, t) => t.TotalConDescuentoGlobal < min.TotalConDescuentoGlobal ? t : min)
      : null;

    return {
      message: 'Comparación de respuestas obtenida',
      data: {
        Cotizacion: {
          CotizacionCompraID: cotizacion.CotizacionCompraID,
          Folio: cotizacion.Folio,
          FechaCotizacion: moment(cotizacion.FechaCotizacion).format('YYYY-MM-DD'),
          Estado: cotizacion.Estado,
        },
        TotalProveedores: respuestas.length,
        RespuestasCompletadas: respuestas.filter(r => r.Estado === 'COMPLETADA').length,
        Comparacion: comparacion,
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
      FechaAsignacion: moment(resp.FechaCreacion).format('YYYY-MM-DD HH:mm:ss'),
      FechaRespuesta: resp.FechaRespuesta ? moment(resp.FechaRespuesta).format('YYYY-MM-DD HH:mm:ss') : null,
      DescuentoGlobal: resp.DescuentoGlobal,
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
}

export const cotizacionesProveedorService = new CotizacionesProveedorService();
