import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import moment from 'moment';

class PublicService {
  async getCotizacionPreview(id: number, proveedorId?: number) {
    const cotizacion = await prisma.cotizaciones_compra_encabezado.findUnique({
      where: { CotizacionCompraID: id },
      include: {
        detalles: { where: { IsActive: true } },
        usuario: { select: { NombreCompleto: true } },
      },
    });

    if (!cotizacion || !cotizacion.IsActive) {
      throw new HttpError('Cotización no encontrada', 404);
    }

    const refaccionIds = cotizacion.detalles.map((d) => d.RefaccionID);
    const refacciones = await prisma.catalogo_refacciones.findMany({
      where: { RefaccionID: { in: refaccionIds } },
    });
    const refaccionesMap = new Map(refacciones.map((r) => [r.RefaccionID, r]));

    const detalles = cotizacion.detalles.map((detalle) => {
      const refaccion = refaccionesMap.get(detalle.RefaccionID);
      return {
        Modelo: refaccion?.Modelo || '',
        NombrePieza: refaccion?.NombrePieza || 'Sin nombre',
        Cantidad: detalle.Cantidad,
        Observaciones: detalle.Observaciones || '',
      };
    });

    let proveedorData: { Nombre: string; NombreContacto?: string; Telefono?: string; Correo?: string } | undefined;
    if (proveedorId) {
      const proveedor = await prisma.catalogo_proveedores.findUnique({
        where: { ProveedorID: proveedorId },
      });
      if (proveedor) {
        const envio = await prisma.cotizaciones_compra_envios.findFirst({
          where: { CotizacionCompraID: id, ProveedorID: proveedorId },
          include: { contacto: { select: { NombreContacto: true, Celular: true, Correo: true } } },
          orderBy: { FechaEnvio: 'desc' },
        });
        proveedorData = {
          Nombre: proveedor.NombreProveedor || '',
          NombreContacto: envio?.contacto?.NombreContacto ?? undefined,
          Telefono: envio?.Telefono ?? envio?.contacto?.Celular ?? undefined,
          Correo: envio?.contacto?.Correo ?? undefined,
        };
      }
    }

    return {
      message: 'Vista previa de cotización',
      data: {
        Folio: cotizacion.Folio,
        FechaCotizacion: moment.utc(cotizacion.FechaCotizacion).format('DD/MM/YYYY'),
        Observaciones: cotizacion.Observaciones,
        Solicitante: { Nombre: cotizacion.usuario?.NombreCompleto || '' },
        Proveedor: proveedorData,
        Detalles: detalles,
      },
    };
  }

  async getCompraPreview(id: number) {
    const compra = await prisma.compras_encabezado.findUnique({
      where: { CompraEncabezadoID: id },
      include: {
        compras_detalle: {
          where: { IsActive: true },
          include: {
            refaccion: {
              select: { RefaccionID: true, NombrePieza: true, Modelo: true, Codigo: true },
            },
          },
        },
        catalogo_proveedores: {
          select: { ProveedorID: true, NombreProveedor: true },
        },
      },
    });

    if (!compra) {
      throw new HttpError('Compra no encontrada', 404);
    }

    const usuario = compra.UsuarioID
      ? await prisma.usuarios.findUnique({
          where: { UsuarioID: compra.UsuarioID },
          select: { NombreCompleto: true, Puesto: true },
        })
      : null;

    const detalles = compra.compras_detalle.map((d) => ({
      NombrePieza: d.refaccion?.NombrePieza || '',
      Modelo: d.refaccion?.Modelo || '',
      Codigo: d.refaccion?.Codigo || '',
      Cantidad: d.Cantidad,
      PrecioUnitario: d.PrecioUnitario,
      DescuentoPorcentaje: d.DescuentoPorcentaje,
      SubTotal: d.SubTotal,
      Total: d.Total,
    }));

    return {
      message: 'Vista previa de compra',
      data: {
        CompraEncabezadoID: compra.CompraEncabezadoID,
        NumeroPedido: compra.NumeroPedido,
        FechaCompra: compra.FechaCompra ? moment.utc(compra.FechaCompra).format('DD/MM/YYYY') : '',
        Observaciones: compra.Observaciones,
        FormaPago: compra.FormaPago,
        DiasCredito: compra.DiasCredito,
        Proveedor: { NombreProveedor: compra.catalogo_proveedores?.NombreProveedor || '' },
        Solicitante: { Nombre: usuario?.NombreCompleto || '', Puesto: usuario?.Puesto || '' },
        Detalles: detalles,
        Totales: {
          TotalBruto: compra.TotalBruto,
          TotalDescuentos: (compra.TotalDescuentosPorcentaje ?? 0) + (compra.TotalDescuentoEfectivo ?? 0),
          TotalGastos: (compra.TotalGastosOperativos ?? 0) + (compra.TotalGastosImportacion ?? 0),
          TotalIVA: compra.TotalIVA,
          TotalNeto: compra.TotalNeto,
        },
      },
    };
  }
}

export const publicService = new PublicService();
