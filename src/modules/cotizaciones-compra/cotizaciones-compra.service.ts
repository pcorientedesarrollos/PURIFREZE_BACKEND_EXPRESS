import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { Prisma } from '@prisma/client';
import moment from 'moment';
import {
  CreateCotizacionCompraDto,
  UpdateCotizacionCompraDto,
  EnviarCotizacionDto,
  ConvertirACompraDto,
} from './cotizaciones-compra.schema';

class CotizacionesCompraService {
  /**
   * Crea una nueva cotización de compra con sus detalles
   */
  async create(dto: CreateCotizacionCompraDto) {
    const result = await prisma.$transaction(async (tx) => {
      // Validar que todas las refacciones existan
      await this.validarRefaccionesExisten(tx, dto.Detalles.map((d) => d.RefaccionID));

      // Generar folio automático
      const folio = await this.generarFolio(tx);

      // Crear encabezado
      const encabezado = await tx.cotizaciones_compra_encabezado.create({
        data: {
          Folio: folio,
          FechaCotizacion: dto.FechaCotizacion,
          Observaciones: dto.Observaciones || null,
          Estado: 'PENDIENTE',
          UsuarioID: dto.UsuarioID || null,
          IsActive: true,
        },
      });

      // Crear detalles
      const detalles = await Promise.all(
        dto.Detalles.map((detalle) =>
          tx.cotizaciones_compra_detalle.create({
            data: {
              CotizacionCompraID: encabezado.CotizacionCompraID,
              RefaccionID: detalle.RefaccionID,
              Cantidad: detalle.Cantidad,
              Observaciones: detalle.Observaciones || null,
              IsActive: true,
            },
          })
        )
      );

      return { encabezado, detalles };
    });

    return { message: 'Cotización creada correctamente', data: result };
  }

  /**
   * Obtiene todas las cotizaciones activas
   */
  async findAll() {
    const cotizaciones = await prisma.cotizaciones_compra_encabezado.findMany({
      where: { IsActive: true },
      include: {
        detalles: {
          where: { IsActive: true },
        },
        envios: true,
      },
      orderBy: { FechaCreacion: 'desc' },
    });

    const formateadas = cotizaciones.map((cot) => ({
      ...cot,
      FechaCotizacion: moment(cot.FechaCotizacion).format('YYYY-MM-DD'),
      FechaCreacion: moment(cot.FechaCreacion).format('YYYY-MM-DD HH:mm:ss'),
      TotalRefacciones: cot.detalles.length,
      TotalEnvios: cot.envios.length,
    }));

    return { message: 'Cotizaciones obtenidas', data: formateadas };
  }

  /**
   * Obtiene una cotización por ID con todos sus detalles
   */
  async findOne(id: number) {
    const cotizacion = await prisma.cotizaciones_compra_encabezado.findUnique({
      where: { CotizacionCompraID: id },
      include: {
        detalles: {
          where: { IsActive: true },
        },
        envios: {
          orderBy: { FechaEnvio: 'desc' },
        },
      },
    });

    if (!cotizacion) {
      throw new HttpError('Cotización no encontrada', 404);
    }

    if (!cotizacion.IsActive) {
      throw new HttpError('La cotización no está activa', 400);
    }

    // Obtener información de refacciones
    const refaccionIds = cotizacion.detalles.map((d) => d.RefaccionID);
    const refacciones = await prisma.catalogo_refacciones.findMany({
      where: { RefaccionID: { in: refaccionIds } },
    });

    const refaccionesMap = new Map(refacciones.map((r) => [r.RefaccionID, r]));

    const detallesConRefaccion = cotizacion.detalles.map((detalle) => {
      const refaccion = refaccionesMap.get(detalle.RefaccionID);
      return {
        ...detalle,
        Refaccion: refaccion
          ? {
              RefaccionID: refaccion.RefaccionID,
              Codigo: refaccion.Codigo,
              NombreRefaccion: refaccion.NombreRefaccion,
              Descripcion: refaccion.Descripcion,
              Unidad: refaccion.Unidad,
            }
          : null,
      };
    });

    // Obtener información de proveedores para los envíos
    const proveedorIds = cotizacion.envios.map((e) => e.ProveedorID);
    const proveedores = await prisma.catalogo_proveedores.findMany({
      where: { ProveedorID: { in: proveedorIds } },
    });

    const proveedoresMap = new Map(proveedores.map((p) => [p.ProveedorID, p]));

    const enviosConProveedor = cotizacion.envios.map((envio) => {
      const proveedor = proveedoresMap.get(envio.ProveedorID);
      return {
        ...envio,
        FechaEnvio: moment(envio.FechaEnvio).format('YYYY-MM-DD HH:mm:ss'),
        Proveedor: proveedor
          ? {
              ProveedorID: proveedor.ProveedorID,
              NombreProveedor: proveedor.NombreProveedor,
            }
          : null,
      };
    });

    const formateada = {
      ...cotizacion,
      FechaCotizacion: moment(cotizacion.FechaCotizacion).format('YYYY-MM-DD'),
      FechaCreacion: moment(cotizacion.FechaCreacion).format('YYYY-MM-DD HH:mm:ss'),
      detalles: detallesConRefaccion,
      envios: enviosConProveedor,
    };

    return { message: 'Cotización obtenida', data: formateada };
  }

  /**
   * Actualiza una cotización (solo si está en PENDIENTE)
   */
  async update(id: number, dto: UpdateCotizacionCompraDto) {
    const result = await prisma.$transaction(async (tx) => {
      const cotizacion = await tx.cotizaciones_compra_encabezado.findUnique({
        where: { CotizacionCompraID: id },
      });

      if (!cotizacion) {
        throw new HttpError('Cotización no encontrada', 404);
      }

      if (!cotizacion.IsActive) {
        throw new HttpError('La cotización no está activa', 400);
      }

      if (cotizacion.Estado !== 'PENDIENTE') {
        throw new HttpError('Solo se pueden editar cotizaciones en estado PENDIENTE', 400);
      }

      // Actualizar encabezado
      const datosActualizar: Prisma.cotizaciones_compra_encabezadoUpdateInput = {};
      if (dto.FechaCotizacion) datosActualizar.FechaCotizacion = dto.FechaCotizacion;
      if (dto.Observaciones !== undefined) datosActualizar.Observaciones = dto.Observaciones;

      await tx.cotizaciones_compra_encabezado.update({
        where: { CotizacionCompraID: id },
        data: datosActualizar,
      });

      // Eliminar detalles marcados
      if (dto.DetallesEliminar && dto.DetallesEliminar.length > 0) {
        await tx.cotizaciones_compra_detalle.updateMany({
          where: {
            CotizacionDetalleID: { in: dto.DetallesEliminar },
            CotizacionCompraID: id,
          },
          data: { IsActive: false },
        });
      }

      // Agregar nuevos detalles
      if (dto.Detalles && dto.Detalles.length > 0) {
        // Validar que las refacciones existan
        await this.validarRefaccionesExisten(tx, dto.Detalles.map((d) => d.RefaccionID));

        await Promise.all(
          dto.Detalles.map((detalle) =>
            tx.cotizaciones_compra_detalle.create({
              data: {
                CotizacionCompraID: id,
                RefaccionID: detalle.RefaccionID,
                Cantidad: detalle.Cantidad,
                Observaciones: detalle.Observaciones || null,
                IsActive: true,
              },
            })
          )
        );
      }

      return { CotizacionCompraID: id };
    });

    return { message: 'Cotización actualizada correctamente', data: result };
  }

  /**
   * Elimina una cotización (soft delete)
   */
  async remove(id: number) {
    const result = await prisma.$transaction(async (tx) => {
      const cotizacion = await tx.cotizaciones_compra_encabezado.findUnique({
        where: { CotizacionCompraID: id },
      });

      if (!cotizacion) {
        throw new HttpError('Cotización no encontrada', 404);
      }

      if (!cotizacion.IsActive) {
        throw new HttpError('La cotización ya fue eliminada', 400);
      }

      if (cotizacion.Estado === 'FINALIZADA') {
        throw new HttpError('No se puede eliminar una cotización finalizada', 400);
      }

      // Soft delete encabezado
      await tx.cotizaciones_compra_encabezado.update({
        where: { CotizacionCompraID: id },
        data: { IsActive: false, Estado: 'CANCELADA' },
      });

      // Soft delete detalles
      await tx.cotizaciones_compra_detalle.updateMany({
        where: { CotizacionCompraID: id },
        data: { IsActive: false },
      });

      return { CotizacionCompraID: id };
    });

    return { message: 'Cotización eliminada correctamente', data: result };
  }

  /**
   * Registra el envío de una cotización a un proveedor
   */
  async registrarEnvio(id: number, dto: EnviarCotizacionDto) {
    const result = await prisma.$transaction(async (tx) => {
      const cotizacion = await tx.cotizaciones_compra_encabezado.findUnique({
        where: { CotizacionCompraID: id },
      });

      if (!cotizacion) {
        throw new HttpError('Cotización no encontrada', 404);
      }

      if (!cotizacion.IsActive) {
        throw new HttpError('La cotización no está activa', 400);
      }

      if (cotizacion.Estado === 'FINALIZADA' || cotizacion.Estado === 'CANCELADA') {
        throw new HttpError('No se puede enviar una cotización finalizada o cancelada', 400);
      }

      // Verificar que el proveedor existe
      const proveedor = await tx.catalogo_proveedores.findUnique({
        where: { ProveedorID: dto.ProveedorID },
      });

      if (!proveedor) {
        throw new HttpError('Proveedor no encontrado', 404);
      }

      // Crear registro de envío
      const envio = await tx.cotizaciones_compra_envios.create({
        data: {
          CotizacionCompraID: id,
          ProveedorID: dto.ProveedorID,
          ContactoID: dto.ContactoID || null,
          MedioEnvio: dto.MedioEnvio,
          Telefono: dto.Telefono || null,
        },
      });

      // Actualizar estado a ENVIADA si era PENDIENTE
      if (cotizacion.Estado === 'PENDIENTE') {
        await tx.cotizaciones_compra_encabezado.update({
          where: { CotizacionCompraID: id },
          data: { Estado: 'ENVIADA' },
        });
      }

      return {
        envio,
        proveedor: {
          ProveedorID: proveedor.ProveedorID,
          NombreProveedor: proveedor.NombreProveedor,
        },
      };
    });

    return { message: 'Envío registrado correctamente', data: result };
  }

  /**
   * Convierte una cotización en una compra
   */
  async convertirACompra(id: number, dto: ConvertirACompraDto) {
    const result = await prisma.$transaction(async (tx) => {
      // Obtener cotización con detalles
      const cotizacion = await tx.cotizaciones_compra_encabezado.findUnique({
        where: { CotizacionCompraID: id },
        include: {
          detalles: {
            where: { IsActive: true },
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
        throw new HttpError('La cotización ya fue convertida a compra', 400);
      }

      if (cotizacion.Estado === 'CANCELADA') {
        throw new HttpError('No se puede convertir una cotización cancelada', 400);
      }

      // Verificar que el proveedor existe
      const proveedor = await tx.catalogo_proveedores.findUnique({
        where: { ProveedorID: dto.ProveedorID },
      });

      if (!proveedor) {
        throw new HttpError('Proveedor no encontrado', 404);
      }

      // Filtrar detalles seleccionados
      const detallesSeleccionados = cotizacion.detalles.filter((d) =>
        dto.DetallesSeleccionados.includes(d.CotizacionDetalleID)
      );

      if (detallesSeleccionados.length === 0) {
        throw new HttpError('Ningún detalle válido seleccionado', 400);
      }

      // Crear compra (sin precios, el usuario los llenará después)
      const compra = await tx.compras_encabezado.create({
        data: {
          ProveedorID: dto.ProveedorID,
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
          CotizacionCompraID: id, // Referencia a la cotización origen
        },
      });

      // Crear detalles de compra (sin precios)
      const detallesCompra = await Promise.all(
        detallesSeleccionados.map((detalle) =>
          tx.compras_detalle.create({
            data: {
              CompraEncabezadoID: compra.CompraEncabezadoID,
              RefaccionID: detalle.RefaccionID,
              Cantidad: detalle.Cantidad,
              PrecioUnitario: 0,
              DescuentoPorcentaje: 0,
              DescuentoEfectivo: 0,
              GastosOperativos: 0,
              GastosImportacion: 0,
              SubTotal: 0,
              Total: 0,
              IsActive: true,
            },
          })
        )
      );

      // Actualizar estado de cotización
      await tx.cotizaciones_compra_encabezado.update({
        where: { CotizacionCompraID: id },
        data: { Estado: 'FINALIZADA' },
      });

      return {
        compra,
        detallesCompra,
        cotizacionID: id,
        mensaje: 'Compra creada. Ahora debe agregar los precios editando la compra.',
      };
    });

    return { message: 'Cotización convertida a compra correctamente', data: result };
  }

  /**
   * Obtiene datos para generar el PDF
   */
  async getDatosParaPdf(id: number) {
    const cotizacion = await prisma.cotizaciones_compra_encabezado.findUnique({
      where: { CotizacionCompraID: id },
      include: {
        detalles: {
          where: { IsActive: true },
        },
      },
    });

    if (!cotizacion) {
      throw new HttpError('Cotización no encontrada', 404);
    }

    if (!cotizacion.IsActive) {
      throw new HttpError('La cotización no está activa', 400);
    }

    // Obtener información de refacciones
    const refaccionIds = cotizacion.detalles.map((d) => d.RefaccionID);
    const refacciones = await prisma.catalogo_refacciones.findMany({
      where: { RefaccionID: { in: refaccionIds } },
    });

    const refaccionesMap = new Map(refacciones.map((r) => [r.RefaccionID, r]));

    const detallesConRefaccion = cotizacion.detalles.map((detalle) => {
      const refaccion = refaccionesMap.get(detalle.RefaccionID);
      return {
        Codigo: refaccion?.Codigo || '',
        NombreRefaccion: refaccion?.NombreRefaccion || 'Sin nombre',
        Descripcion: refaccion?.Descripcion || '',
        Unidad: refaccion?.Unidad || 'PZA',
        Cantidad: detalle.Cantidad,
        Observaciones: detalle.Observaciones || '',
      };
    });

    return {
      Folio: cotizacion.Folio,
      FechaCotizacion: moment(cotizacion.FechaCotizacion).format('DD/MM/YYYY'),
      Observaciones: cotizacion.Observaciones,
      Detalles: detallesConRefaccion,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MÉTODOS PRIVADOS
  // ═══════════════════════════════════════════════════════════════════════════

  private async generarFolio(tx: Prisma.TransactionClient): Promise<string> {
    const año = new Date().getFullYear();
    const ultimaCotizacion = await tx.cotizaciones_compra_encabezado.findFirst({
      where: {
        Folio: { startsWith: `COT-${año}-` },
      },
      orderBy: { CotizacionCompraID: 'desc' },
    });

    let numero = 1;
    if (ultimaCotizacion?.Folio) {
      const partes = ultimaCotizacion.Folio.split('-');
      numero = parseInt(partes[2] || '0', 10) + 1;
    }

    return `COT-${año}-${numero.toString().padStart(4, '0')}`;
  }

  private async validarRefaccionesExisten(
    tx: Prisma.TransactionClient,
    refaccionIds: number[]
  ): Promise<void> {
    const idsUnicos = [...new Set(refaccionIds)];
    const refacciones = await tx.catalogo_refacciones.findMany({
      where: { RefaccionID: { in: idsUnicos } },
      select: { RefaccionID: true },
    });

    const idsEncontrados = new Set(refacciones.map((r) => r.RefaccionID));
    const idsNoEncontrados = idsUnicos.filter((id) => !idsEncontrados.has(id));

    if (idsNoEncontrados.length > 0) {
      throw new HttpError(
        `Refacciones no encontradas: ${idsNoEncontrados.join(', ')}`,
        404
      );
    }
  }
}

export const cotizacionesCompraService = new CotizacionesCompraService();
