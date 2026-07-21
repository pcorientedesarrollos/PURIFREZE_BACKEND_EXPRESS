import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { Prisma } from '@prisma/client';
import moment from 'moment';
import {
  CreateCotizacionCompraDto,
  UpdateCotizacionCompraDto,
  EnviarCotizacionDto,
  ConvertirACompraDto,
  AgregarEquipoVirtualDto,
} from './cotizaciones-compra.schema';
import { generateCotizacionPdf, getPdfUrl, cleanOldPdfs, CotizacionPdfData } from '../../utils/pdf-generator';
import { localDate } from '../../utils/date-utils';

class CotizacionesCompraService {
  /**
   * Crea una nueva cotización de compra con sus detalles y equipos virtuales
   */
  async create(dto: CreateCotizacionCompraDto) {
    const result = await prisma.$transaction(async (tx) => {
      // Validar que las refacciones individuales existan
      if (dto.Detalles && dto.Detalles.length > 0) {
        await this.validarRefaccionesExisten(tx, dto.Detalles.map((d) => d.RefaccionID));
      }

      // Generar folio automático
      const folio = await this.generarFolio(tx);

      // Crear encabezado
      const encabezado = await tx.cotizaciones_compra_encabezado.create({
        data: {
          Folio: folio,
          FechaCotizacion: dto.FechaCotizacion,
          Observaciones: dto.Observaciones || null,
          NumeroPedido: dto.NumeroPedido || null,
          Estado: 'PENDIENTE',
          UsuarioID: dto.UsuarioID || null,
          IsActive: true,
        },
      });

      // Crear detalles de refacciones individuales
      const detalles = dto.Detalles && dto.Detalles.length > 0
        ? await Promise.all(
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
          )
        : [];

      // Crear equipos virtuales
      const equiposVirtuales = [];
      if (dto.EquiposVirtuales && dto.EquiposVirtuales.length > 0) {
        for (const equipoDto of dto.EquiposVirtuales) {
          // Obtener el equipo virtual
          const equipoVirtual = await tx.equipos_virtuales.findUnique({
            where: { EquipoVirtualID: equipoDto.EquipoVirtualID },
          });

          if (!equipoVirtual) {
            throw new HttpError(`Equipo virtual ${equipoDto.EquipoVirtualID} no encontrado`, 404);
          }

          if (!equipoVirtual.IsActive) {
            throw new HttpError(`Equipo virtual ${equipoVirtual.Nombre} no está activo`, 400);
          }

          // Crear registro de linking
          const registro = await tx.cotizaciones_compra_equipos_virtuales.create({
            data: {
              CotizacionCompraID: encabezado.CotizacionCompraID,
              EquipoVirtualID: equipoDto.EquipoVirtualID,
              Cantidad: equipoDto.Cantidad || 1,
              PrecioOriginal: equipoVirtual.TotalCosto || 0,
              PrecioFinal: equipoDto.PrecioFinal,
            },
          });

          equiposVirtuales.push({
            ...registro,
            Nombre: equipoVirtual.Nombre,
            Codigo: equipoVirtual.Codigo,
          });
        }
      }

      return { encabezado, detalles, equiposVirtuales };
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
        usuario: {
          select: {
            UsuarioID: true,
            Usuario: true,
            NombreCompleto: true,
          },
        },
        detalles: {
          where: { IsActive: true, EquipoVirtualID: null }, // Solo refacciones individuales
        },
        equiposVirtuales: true,
        envios: true,
        respuestas: {
          where: { IsActive: true },
          select: {
            RespuestaID: true,
            Estado: true,
          },
        },
      },
      orderBy: { FechaCreacion: 'desc' },
    });

    const formateadas = cotizaciones.map((cot) => ({
      ...cot,
      FechaCotizacion: moment.utc(cot.FechaCotizacion).format('YYYY-MM-DD'),
      FechaCreacion: moment.utc(cot.FechaCreacion).format('YYYY-MM-DD HH:mm:ss'),
      TotalRefacciones: cot.detalles.length,
      TotalEquiposVirtuales: cot.equiposVirtuales.length,
      TotalEnvios: cot.envios.length,
      TotalProveedoresAsignados: cot.respuestas.length,
      TotalProveedoresRespondidos: cot.respuestas.filter((r) => r.Estado === 'COMPLETADA').length,
    }));

    return { message: 'Cotizaciones obtenidas', data: formateadas };
  }

  /**
   * Obtiene una cotización por ID con todos sus detalles y equipos virtuales
   */
  async findOne(id: number) {
    const cotizacion = await prisma.cotizaciones_compra_encabezado.findUnique({
      where: { CotizacionCompraID: id },
      include: {
        usuario: {
          select: {
            UsuarioID: true,
            Usuario: true,
            NombreCompleto: true,
          },
        },
        detalles: {
          where: { IsActive: true, EquipoVirtualID: null }, // Solo refacciones individuales
        },
        equiposVirtuales: {
          include: {
            equipoVirtual: {
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
            },
          },
        },
        envios: {
          orderBy: { FechaEnvio: 'desc' },
          include: {
            contacto: true,
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

    // Obtener información de refacciones para detalles individuales
    const refaccionIds = cotizacion.detalles.map((d) => d.RefaccionID);
    const refacciones = refaccionIds.length > 0
      ? await prisma.catalogo_refacciones.findMany({
          where: { RefaccionID: { in: refaccionIds } },
        })
      : [];

    const refaccionesMap = new Map(refacciones.map((r) => [r.RefaccionID, r]));

    const detallesConRefaccion = cotizacion.detalles.map((detalle) => {
      const refaccion = refaccionesMap.get(detalle.RefaccionID);
      return {
        ...detalle,
        Refaccion: refaccion
          ? {
              RefaccionID: refaccion.RefaccionID,
              Codigo: refaccion.Codigo,
              Modelo: refaccion.Modelo,
              NombrePieza: refaccion.NombrePieza,
              Observaciones: refaccion.Observaciones,
            }
          : null,
      };
    });

    // Formatear equipos virtuales
    const equiposVirtualesFormateados = cotizacion.equiposVirtuales.map((ev) => ({
      ID: ev.ID,
      EquipoVirtualID: ev.EquipoVirtualID,
      Cantidad: ev.Cantidad || 1,
      PrecioOriginal: Number(ev.PrecioOriginal),
      PrecioFinal: Number(ev.PrecioFinal),
      FechaCreacion: moment.utc(ev.FechaCreacion).format('YYYY-MM-DD HH:mm:ss'),
      equipoVirtual: {
        EquipoVirtualID: ev.equipoVirtual.EquipoVirtualID,
        Nombre: ev.equipoVirtual.Nombre,
        Codigo: ev.equipoVirtual.Codigo,
        Descripcion: ev.equipoVirtual.Descripcion,
        TotalRefacciones: ev.equipoVirtual.detalles.length,
        detalles: ev.equipoVirtual.detalles.map((d) => ({
          DetalleID: d.DetalleID,
          RefaccionID: d.RefaccionID,
          Cantidad: d.Cantidad,
          CostoUnitario: Number(d.CostoUnitario),
          TotalFinal: Number(d.TotalFinal),
          Refaccion: d.refaccion,
        })),
      },
    }));

    // Obtener información de proveedores para los envíos
    const proveedorIds = cotizacion.envios.map((e) => e.ProveedorID);
    const proveedores = proveedorIds.length > 0
      ? await prisma.catalogo_proveedores.findMany({
          where: { ProveedorID: { in: proveedorIds } },
        })
      : [];

    const proveedoresMap = new Map(proveedores.map((p) => [p.ProveedorID, p]));

    const enviosConProveedor = cotizacion.envios.map((envio: any) => {
      const proveedor = proveedoresMap.get(envio.ProveedorID);
      return {
        ...envio,
        FechaEnvio: moment.utc(envio.FechaEnvio).format('YYYY-MM-DD HH:mm:ss'),
        Proveedor: proveedor
          ? {
              ProveedorID: proveedor.ProveedorID,
              NombreProveedor: proveedor.NombreProveedor,
            }
          : null,
        Contacto: envio.contacto
          ? {
              ContactoID: envio.contacto.ContactoID,
              NombreContacto: envio.contacto.NombreContacto,
              Puesto: envio.contacto.Puesto,
              Celular: envio.contacto.Celular,
              Correo: envio.contacto.Correo,
            }
          : null,
      };
    });

    const formateada = {
      ...cotizacion,
      FechaCotizacion: moment.utc(cotizacion.FechaCotizacion).format('YYYY-MM-DD'),
      FechaCreacion: moment.utc(cotizacion.FechaCreacion).format('YYYY-MM-DD HH:mm:ss'),
      detalles: detallesConRefaccion,
      equiposVirtuales: equiposVirtualesFormateados,
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
      if (dto.NumeroPedido !== undefined) datosActualizar.NumeroPedido = dto.NumeroPedido;

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

      // Crear registro de envío con include del contacto
      const envio = await tx.cotizaciones_compra_envios.create({
        data: {
          CotizacionCompraID: id,
          ProveedorID: dto.ProveedorID,
          ContactoID: dto.ContactoID || null,
          MedioEnvio: dto.MedioEnvio,
          Telefono: dto.Telefono || null,
        },
        include: {
          contacto: true,
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
        envio: {
          ...envio,
          Contacto: envio.contacto ? {
            ContactoID: envio.contacto.ContactoID,
            NombreContacto: envio.contacto.NombreContacto,
            Puesto: envio.contacto.Puesto,
            Celular: envio.contacto.Celular,
            Correo: envio.contacto.Correo,
          } : null,
        },
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
      // Obtener cotización con detalles y equipos virtuales
      const cotizacion = await tx.cotizaciones_compra_encabezado.findUnique({
        where: { CotizacionCompraID: id },
        include: {
          detalles: {
            where: { IsActive: true },
          },
          equiposVirtuales: {
            include: {
              equipoVirtual: true,
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
      const detallesSeleccionados = cotizacion.detalles.filter((d: any) =>
        dto.DetallesSeleccionados.includes(d.CotizacionDetalleID)
      );

      // Filtrar equipos virtuales seleccionados
      const equiposSeleccionados = cotizacion.equiposVirtuales?.filter((e: any) =>
        dto.EquiposVirtualesSeleccionados?.includes(e.EquipoVirtualID)
      ) || [];

      // Debe haber al menos un detalle o equipo seleccionado
      if (detallesSeleccionados.length === 0 && equiposSeleccionados.length === 0) {
        throw new HttpError('Debe seleccionar al menos una refacción o equipo virtual', 400);
      }

      // Crear PEDIDO (nuevo módulo de pedidos), no compra.
      // Encabezado sin precios en refacciones; el usuario los llenará después.
      const pedido = await tx.pedidos_encabezado.create({
        data: {
          ProveedorID: dto.ProveedorID,
          NumeroPedido: cotizacion.NumeroPedido || null,
          FechaPedido: localDate(),
          TotalBruto: 0,
          TotalIVA: 0,
          TotalNeto: 0,
          AplicaIVA: 1,
          TasaIVA: 0.16,
          TotalPagado: 0,
          TotalRecibido: 0,
          TotalNotasCredito: 0,
          TotalDescuentos: 0,
          FormaPago: 'CREDITO',
          EstadoPago: 'PENDIENTE',
          EstadoEntrega: 'PEDIDO',
          UsuarioID: cotizacion.UsuarioID,
          FechaAlta: localDate(),
          IsActive: true,
        },
      });

      // Detalles del pedido para refacciones individuales (sin precios)
      const detallesPedido = await Promise.all(
        detallesSeleccionados.map((detalle: any) =>
          tx.pedidos_detalle.create({
            data: {
              PedidoID: pedido.PedidoID,
              RefaccionID: detalle.RefaccionID,
              Cantidad: detalle.Cantidad,
              PrecioUnitario: 0,
              SubTotal: 0,
              Total: 0,
              IsActive: true,
            },
          })
        )
      );

      // Detalles del pedido para equipos virtuales (con sus precios ya establecidos)
      const detallesEquipos = await Promise.all(
        equiposSeleccionados.map((equipo: any) => {
          const precioTotal = Number(equipo.PrecioFinal) * equipo.Cantidad;
          return tx.pedidos_detalle.create({
            data: {
              PedidoID: pedido.PedidoID,
              RefaccionID: null, // Es un equipo virtual, no una refacción
              EquipoVirtualID: equipo.EquipoVirtualID,
              Cantidad: equipo.Cantidad,
              PrecioUnitario: Number(equipo.PrecioFinal),
              SubTotal: precioTotal,
              Total: precioTotal,
              IsActive: true,
            },
          });
        })
      );

      // Recalcular totales del pedido desde los detalles (Bruto/IVA/Neto)
      const detallesPedidoActivos = await tx.pedidos_detalle.findMany({
        where: { PedidoID: pedido.PedidoID, IsActive: true },
      });
      const totalBruto = Math.round(
        detallesPedidoActivos.reduce((sum, d) => sum + Number(d.SubTotal || 0), 0) * 100
      ) / 100;
      const totalIVA = Math.round(totalBruto * Number(pedido.TasaIVA || 0) * 100) / 100;
      const totalNeto = Math.round((totalBruto + totalIVA) * 100) / 100;
      await tx.pedidos_encabezado.update({
        where: { PedidoID: pedido.PedidoID },
        data: { TotalBruto: totalBruto, TotalIVA: totalIVA, TotalNeto: totalNeto },
      });

      // Actualizar estado de cotización
      await tx.cotizaciones_compra_encabezado.update({
        where: { CotizacionCompraID: id },
        data: { Estado: 'FINALIZADA' },
      });

      // Procesar equipos virtuales y ajustar precios proporcionalmente
      await this.procesarEquiposVirtuales(tx, id, cotizacion.UsuarioID);

      return {
        pedido,
        detallesPedido,
        detallesEquipos,
        cotizacionID: id,
        mensaje: 'Pedido creado exitosamente.',
      };
    });

    return { message: 'Cotización convertida a pedido correctamente', data: result };
  }

  /**
   * Obtiene datos para generar el PDF
   */
  async getDatosParaPdf(id: number, proveedorId?: number) {
    const cotizacion = await prisma.cotizaciones_compra_encabezado.findUnique({
      where: { CotizacionCompraID: id },
      include: {
        detalles: { where: { IsActive: true } },
        usuario: { select: { NombreCompleto: true } },
      },
    });

    if (!cotizacion) {
      throw new HttpError('Cotización no encontrada', 404);
    }

    if (!cotizacion.IsActive) {
      throw new HttpError('La cotización no está activa', 400);
    }

    // Refacciones con Modelo
    const refaccionIds = cotizacion.detalles.map((d) => d.RefaccionID);
    const refacciones = await prisma.catalogo_refacciones.findMany({
      where: { RefaccionID: { in: refaccionIds } },
    });

    const refaccionesMap = new Map(refacciones.map((r) => [r.RefaccionID, r]));

    const detallesConRefaccion = cotizacion.detalles.map((detalle) => {
      const refaccion = refaccionesMap.get(detalle.RefaccionID);
      return {
        Modelo: refaccion?.Modelo || '',
        NombrePieza: refaccion?.NombrePieza || 'Sin nombre',
        Cantidad: detalle.Cantidad,
        Observaciones: detalle.Observaciones || '',
      };
    });

    // Datos del proveedor (si se especifica)
    let proveedorData: { Nombre: string; NombreContacto?: string; Telefono?: string; Correo?: string } | undefined;
    if (proveedorId) {
      const proveedor = await prisma.catalogo_proveedores.findUnique({
        where: { ProveedorID: proveedorId },
      });

      if (proveedor) {
        const envio = await prisma.cotizaciones_compra_envios.findFirst({
          where: { CotizacionCompraID: id, ProveedorID: proveedorId },
          include: {
            contacto: { select: { NombreContacto: true, Celular: true, Correo: true } },
          },
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
      Folio: cotizacion.Folio,
      FechaCotizacion: moment.utc(cotizacion.FechaCotizacion).format('DD/MM/YYYY'),
      Observaciones: cotizacion.Observaciones,
      Solicitante: { Nombre: cotizacion.usuario?.NombreCompleto || '' },
      Proveedor: proveedorData,
      Detalles: detallesConRefaccion,
    };
  }

  /**
   * Genera un PDF de la cotización y retorna la URL para compartir
   */
  async generarPdfUrl(id: number, baseUrl: string) {
    // Limpiar PDFs antiguos
    cleanOldPdfs();

    // Obtener datos de la cotización
    const datosParaPdf = await this.getDatosParaPdf(id);

    // Generar el PDF
    const filename = await generateCotizacionPdf(datosParaPdf as CotizacionPdfData);

    // Obtener URL pública
    const url = getPdfUrl(filename, baseUrl);

    // Generar link de WhatsApp
    const mensaje = encodeURIComponent(
      `Cotización ${datosParaPdf.Folio}\n` +
      `Fecha: ${datosParaPdf.FechaCotizacion}\n` +
      `Total refacciones: ${datosParaPdf.Detalles.length}\n\n` +
      `Ver documento: ${url}`
    );

    return {
      message: 'PDF generado correctamente',
      data: {
        url,
        folio: datosParaPdf.Folio,
        whatsappLink: `https://wa.me/?text=${mensaje}`,
        expira: moment().add(24, 'hours').format('YYYY-MM-DD HH:mm:ss'),
      },
    };
  }

  /**
   * Genera link de WhatsApp con link directo a la cotización en el sistema
   */
  async generarWhatsappLink(id: number, telefono: string, frontendUrl: string) {
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

    // Limpiar número de teléfono
    const telefonoLimpio = telefono.replace(/\D/g, '');

    // Construir mensaje
    const mensaje = encodeURIComponent(
      `*Cotización de Compra*\n\n` +
      `Folio: ${cotizacion.Folio}\n` +
      `Fecha: ${moment.utc(cotizacion.FechaCotizacion).format('DD/MM/YYYY')}\n` +
      `Refacciones: ${cotizacion.detalles.length}\n\n` +
      `${cotizacion.Observaciones ? `Observaciones: ${cotizacion.Observaciones}\n\n` : ''}` +
      `Ver cotización: ${frontendUrl}/cotizaciones-compra/${id}`
    );

    const whatsappUrl = `https://wa.me/${telefonoLimpio}?text=${mensaje}`;

    return {
      message: 'Link de WhatsApp generado',
      data: {
        whatsappUrl,
        telefono: telefonoLimpio,
        folio: cotizacion.Folio,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EQUIPOS VIRTUALES
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Agrega un equipo virtual a la cotización con todas sus refacciones
   */
  async agregarEquipoVirtual(cotizacionId: number, dto: AgregarEquipoVirtualDto) {
    return await prisma.$transaction(async (tx) => {
      // 1. Verificar que la cotización existe y está en estado editable
      const cotizacion = await tx.cotizaciones_compra_encabezado.findUnique({
        where: { CotizacionCompraID: cotizacionId },
      });

      if (!cotizacion) throw new HttpError('Cotización no encontrada', 404);
      if (!cotizacion.IsActive) throw new HttpError('La cotización no está activa', 400);
      if (cotizacion.Estado !== 'PENDIENTE') {
        throw new HttpError('Solo se pueden agregar equipos a cotizaciones pendientes', 400);
      }

      // 2. Obtener el equipo virtual con sus detalles
      const equipoVirtual = await tx.equipos_virtuales.findUnique({
        where: { EquipoVirtualID: dto.EquipoVirtualID },
        include: { detalles: { where: { IsActive: true } } },
      });

      if (!equipoVirtual) throw new HttpError('Equipo virtual no encontrado', 404);
      if (!equipoVirtual.IsActive) throw new HttpError('El equipo virtual no está activo', 400);

      // 3. Verificar que no esté ya agregado
      const existente = await tx.cotizaciones_compra_equipos_virtuales.findFirst({
        where: {
          CotizacionCompraID: cotizacionId,
          EquipoVirtualID: dto.EquipoVirtualID,
        },
      });

      if (existente) throw new HttpError('Este equipo virtual ya está en la cotización', 400);

      // 4. Crear registro en tabla de linking
      await tx.cotizaciones_compra_equipos_virtuales.create({
        data: {
          CotizacionCompraID: cotizacionId,
          EquipoVirtualID: dto.EquipoVirtualID,
          Cantidad: dto.Cantidad || 1,
          PrecioOriginal: equipoVirtual.TotalCosto || 0,
          PrecioFinal: dto.PrecioFinal,
        },
      });

      // 5. Agregar cada refacción del equipo como detalle de cotización
      for (const detalle of equipoVirtual.detalles) {
        await tx.cotizaciones_compra_detalle.create({
          data: {
            CotizacionCompraID: cotizacionId,
            RefaccionID: detalle.RefaccionID,
            Cantidad: detalle.Cantidad || 1,
            EquipoVirtualID: dto.EquipoVirtualID,
            IsActive: true,
          },
        });
      }

      return {
        message: 'Equipo virtual agregado a la cotización',
        data: {
          EquipoVirtualID: dto.EquipoVirtualID,
          Nombre: equipoVirtual.Nombre,
          Codigo: equipoVirtual.Codigo,
          Cantidad: dto.Cantidad || 1,
          RefaccionesAgregadas: equipoVirtual.detalles.length,
          PrecioOriginal: equipoVirtual.TotalCosto,
          PrecioFinal: dto.PrecioFinal,
        },
      };
    });
  }

  /**
   * Actualiza el precio final de un equipo virtual en la cotización
   */
  async actualizarEquipoVirtual(cotizacionId: number, equipoVirtualId: number, dto: { PrecioFinal?: number; Cantidad?: number }) {
    const registro = await prisma.cotizaciones_compra_equipos_virtuales.findFirst({
      where: {
        CotizacionCompraID: cotizacionId,
        EquipoVirtualID: equipoVirtualId,
      },
    });

    if (!registro) throw new HttpError('Equipo virtual no encontrado en esta cotización', 404);

    const data: any = {};
    if (dto.PrecioFinal !== undefined) data.PrecioFinal = dto.PrecioFinal;
    if (dto.Cantidad !== undefined) data.Cantidad = dto.Cantidad;

    await prisma.cotizaciones_compra_equipos_virtuales.update({
      where: { ID: registro.ID },
      data,
    });

    return { message: 'Equipo virtual actualizado', data: { ...data } };
  }

  async actualizarCantidadDetalle(cotizacionId: number, detalleId: number, cantidad: number) {
    const detalle = await prisma.cotizaciones_compra_detalle.findFirst({
      where: {
        CotizacionDetalleID: detalleId,
        CotizacionCompraID: cotizacionId,
        IsActive: true,
      },
    });

    if (!detalle) throw new HttpError('Detalle no encontrado en esta cotización', 404);

    await prisma.cotizaciones_compra_detalle.update({
      where: { CotizacionDetalleID: detalleId },
      data: { Cantidad: cantidad },
    });

    return { message: 'Cantidad actualizada', data: { CotizacionDetalleID: detalleId, Cantidad: cantidad } };
  }

  /**
   * Elimina un equipo virtual y sus refacciones de la cotización
   */
  async eliminarEquipoVirtual(cotizacionId: number, equipoVirtualId: number) {
    return await prisma.$transaction(async (tx) => {
      // Verificar que la cotización está en estado editable
      const cotizacion = await tx.cotizaciones_compra_encabezado.findUnique({
        where: { CotizacionCompraID: cotizacionId },
      });

      if (!cotizacion) throw new HttpError('Cotización no encontrada', 404);
      if (cotizacion.Estado !== 'PENDIENTE') {
        throw new HttpError('Solo se pueden modificar cotizaciones pendientes', 400);
      }

      // Eliminar detalles de la cotización que pertenecen a este equipo
      await tx.cotizaciones_compra_detalle.deleteMany({
        where: {
          CotizacionCompraID: cotizacionId,
          EquipoVirtualID: equipoVirtualId,
        },
      });

      // Eliminar registro de linking
      await tx.cotizaciones_compra_equipos_virtuales.deleteMany({
        where: {
          CotizacionCompraID: cotizacionId,
          EquipoVirtualID: equipoVirtualId,
        },
      });

      return {
        message: 'Equipo virtual eliminado de la cotización',
        data: { CotizacionCompraID: cotizacionId, EquipoVirtualID: equipoVirtualId },
      };
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MÉTODOS PRIVADOS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Procesa equipos virtuales y ajusta precios proporcionalmente
   */
  private async procesarEquiposVirtuales(
    tx: Prisma.TransactionClient,
    cotizacionId: number,
    usuarioId: number | null
  ): Promise<void> {
    // Obtener equipos virtuales de la cotización
    const equiposCotizacion = await tx.cotizaciones_compra_equipos_virtuales.findMany({
      where: { CotizacionCompraID: cotizacionId },
      include: {
        equipoVirtual: {
          include: { detalles: { where: { IsActive: true } } },
        },
      },
    });

    for (const registro of equiposCotizacion) {
      const precioOriginal = Number(registro.PrecioOriginal);
      const precioNuevo = Number(registro.PrecioFinal);
      const diferencia = precioNuevo - precioOriginal;

      // Solo procesar si hay diferencia significativa
      if (Math.abs(diferencia) < 0.01) continue;

      const equipoVirtual = registro.equipoVirtual;

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
          UsuarioID: usuarioId,
          Observaciones: `Ajuste por cotización de compra #${cotizacionId}`,
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
          FechaActualizacion: localDate(),
        },
      });
    }
  }

  private async generarFolio(tx: Prisma.TransactionClient): Promise<string> {
    const año = localDate().getFullYear();
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
