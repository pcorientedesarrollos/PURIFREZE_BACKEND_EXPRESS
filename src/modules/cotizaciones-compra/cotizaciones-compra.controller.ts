import { Request, Response } from 'express';
import { cotizacionesCompraService } from './cotizaciones-compra.service';
import { success } from '../../utils/response';

class CotizacionesCompraController {
  async create(req: Request, res: Response) {
    const result = await cotizacionesCompraService.create(req.body);
    return success(res, result.message, result.data, 201);
  }

  async findAll(_req: Request, res: Response) {
    const result = await cotizacionesCompraService.findAll();
    return success(res, result.message, result.data);
  }

  async findOne(req: Request, res: Response) {
    const { CotizacionCompraID } = req.params as unknown as { CotizacionCompraID: number };
    const result = await cotizacionesCompraService.findOne(CotizacionCompraID);
    return success(res, result.message, result.data);
  }

  async update(req: Request, res: Response) {
    const { CotizacionCompraID } = req.params as unknown as { CotizacionCompraID: number };
    const result = await cotizacionesCompraService.update(CotizacionCompraID, req.body);
    return success(res, result.message, result.data);
  }

  async remove(req: Request, res: Response) {
    const { CotizacionCompraID } = req.params as unknown as { CotizacionCompraID: number };
    const result = await cotizacionesCompraService.remove(CotizacionCompraID);
    return success(res, result.message, result.data);
  }

  async registrarEnvio(req: Request, res: Response) {
    const { CotizacionCompraID } = req.params as unknown as { CotizacionCompraID: number };
    const result = await cotizacionesCompraService.registrarEnvio(CotizacionCompraID, req.body);
    return success(res, result.message, result.data);
  }

  async convertirACompra(req: Request, res: Response) {
    const { CotizacionCompraID } = req.params as unknown as { CotizacionCompraID: number };
    const result = await cotizacionesCompraService.convertirACompra(CotizacionCompraID, req.body);
    return success(res, result.message, result.data, 201);
  }

  async getPdf(req: Request, res: Response) {
    const { CotizacionCompraID } = req.params as unknown as { CotizacionCompraID: number };
    const datos = await cotizacionesCompraService.getDatosParaPdf(CotizacionCompraID);
    return success(res, 'Datos para PDF obtenidos', datos);
  }

  async generarPdfUrl(req: Request, res: Response) {
    const { CotizacionCompraID } = req.params as unknown as { CotizacionCompraID: number };
    // Construir base URL del servidor
    const protocol = req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;
    const result = await cotizacionesCompraService.generarPdfUrl(CotizacionCompraID, baseUrl);
    return success(res, result.message, result.data);
  }

  async generarWhatsappLink(req: Request, res: Response) {
    const { CotizacionCompraID } = req.params as unknown as { CotizacionCompraID: number };
    const { telefono, frontendUrl } = req.body;
    const result = await cotizacionesCompraService.generarWhatsappLink(
      CotizacionCompraID,
      telefono,
      frontendUrl || 'https://purifreeze.com'
    );
    return success(res, result.message, result.data);
  }

  // =============================================
  // EQUIPOS VIRTUALES
  // =============================================

  async agregarEquipoVirtual(req: Request, res: Response) {
    const { CotizacionCompraID } = req.params as unknown as { CotizacionCompraID: number };
    const result = await cotizacionesCompraService.agregarEquipoVirtual(CotizacionCompraID, req.body);
    return success(res, result.message, result.data, 201);
  }

  async actualizarPrecioEquipoVirtual(req: Request, res: Response) {
    const { CotizacionCompraID, EquipoVirtualID } = req.params as unknown as {
      CotizacionCompraID: number;
      EquipoVirtualID: number;
    };
    const result = await cotizacionesCompraService.actualizarEquipoVirtual(
      CotizacionCompraID,
      EquipoVirtualID,
      req.body
    );
    return success(res, result.message, result.data);
  }

  async actualizarCantidadDetalle(req: Request, res: Response) {
    const { CotizacionCompraID, DetalleID } = req.params as unknown as {
      CotizacionCompraID: number;
      DetalleID: number;
    };
    const result = await cotizacionesCompraService.actualizarCantidadDetalle(
      CotizacionCompraID,
      DetalleID,
      req.body.Cantidad
    );
    return success(res, result.message, result.data);
  }

  async eliminarEquipoVirtual(req: Request, res: Response) {
    const { CotizacionCompraID, EquipoVirtualID } = req.params as unknown as {
      CotizacionCompraID: number;
      EquipoVirtualID: number;
    };
    const result = await cotizacionesCompraService.eliminarEquipoVirtual(CotizacionCompraID, EquipoVirtualID);
    return success(res, result.message, result.data);
  }
}

export const cotizacionesCompraController = new CotizacionesCompraController();
