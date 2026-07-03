import { Request, Response } from 'express';
import { cotizacionesProveedorService } from './cotizaciones-proveedor.service';
import { success } from '../../utils/response';

class CotizacionesProveedorController {
  /**
   * Asigna proveedores a una cotización
   * POST /cotizaciones-proveedor/:CotizacionCompraID/asignar
   */
  async asignarProveedores(req: Request, res: Response) {
    const { CotizacionCompraID } = req.params as unknown as { CotizacionCompraID: number };
    const result = await cotizacionesProveedorService.asignarProveedores(CotizacionCompraID, req.body);
    return success(res, result.message, result.data, 201);
  }

  /**
   * Obtiene cotizaciones asignadas a un proveedor
   * GET /cotizaciones-proveedor/proveedor/:ProveedorID
   */
  async getCotizacionesPorProveedor(req: Request, res: Response) {
    const { ProveedorID } = req.params as unknown as { ProveedorID: number };
    const result = await cotizacionesProveedorService.getCotizacionesPorProveedor(ProveedorID);
    return success(res, result.message, result.data);
  }

  /**
   * Obtiene detalle de una respuesta específica
   * GET /cotizaciones-proveedor/respuesta/:RespuestaID
   */
  async getRespuestaDetalle(req: Request, res: Response) {
    const { RespuestaID } = req.params as unknown as { RespuestaID: number };
    const result = await cotizacionesProveedorService.getRespuestaDetalle(RespuestaID);
    return success(res, result.message, result.data);
  }

  /**
   * Proveedor responde a una cotización con precios
   * POST /cotizaciones-proveedor/respuesta/:RespuestaID/responder
   */
  async responderCotizacion(req: Request, res: Response) {
    const { RespuestaID } = req.params as unknown as { RespuestaID: number };
    const result = await cotizacionesProveedorService.responderCotizacion(RespuestaID, req.body);
    return success(res, result.message, result.data);
  }

  /**
   * Compara respuestas de proveedores para una cotización
   * GET /cotizaciones-proveedor/:CotizacionCompraID/comparar
   */
  async compararRespuestas(req: Request, res: Response) {
    const { CotizacionCompraID } = req.params as unknown as { CotizacionCompraID: number };
    const result = await cotizacionesProveedorService.compararRespuestas(CotizacionCompraID);
    return success(res, result.message, result.data);
  }

  /**
   * Obtiene proveedores asignados a una cotización
   * GET /cotizaciones-proveedor/:CotizacionCompraID/proveedores
   */
  async getProveedoresAsignados(req: Request, res: Response) {
    const { CotizacionCompraID } = req.params as unknown as { CotizacionCompraID: number };
    const result = await cotizacionesProveedorService.getProveedoresAsignados(CotizacionCompraID);
    return success(res, result.message, result.data);
  }

  /**
   * Proveedor rechaza una cotización
   * POST /cotizaciones-proveedor/respuesta/:RespuestaID/rechazar
   */
  async rechazarCotizacion(req: Request, res: Response) {
    const { RespuestaID } = req.params as unknown as { RespuestaID: number };
    const { observaciones } = req.body;
    const result = await cotizacionesProveedorService.rechazarCotizacion(RespuestaID, observaciones);
    return success(res, result.message, result.data);
  }

  /**
   * Elimina asignación de proveedor
   * DELETE /cotizaciones-proveedor/respuesta/:RespuestaID
   */
  async eliminarAsignacion(req: Request, res: Response) {
    const { RespuestaID } = req.params as unknown as { RespuestaID: number };
    const result = await cotizacionesProveedorService.eliminarAsignacion(RespuestaID);
    return success(res, result.message, result.data);
  }

  /**
   * Genera múltiples pedidos basado en selecciones
   * POST /cotizaciones-proveedor/:CotizacionCompraID/generar-pedidos
   */
  async generarPedidosMultiples(req: Request, res: Response) {
    const { CotizacionCompraID } = req.params as unknown as { CotizacionCompraID: number };
    const result = await cotizacionesProveedorService.generarPedidosMultiples(CotizacionCompraID, req.body);
    return success(res, result.message, result.data, 201);
  }
}

export const cotizacionesProveedorController = new CotizacionesProveedorController();
