import { Request, Response } from 'express';
import { facturasService } from './facturas.service';
import { success, HttpError } from '../../utils/response';

export class FacturasController {
  /**
   * POST /facturas/upload
   */
  async upload(req: Request, res: Response) {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      throw new HttpError('No se recibieron archivos', 400);
    }

    const resultados = await facturasService.uploadFacturas(files);
    return success(res, 'Carga procesada', { resultados }, 200);
  }

  /**
   * PATCH /facturas/asignar-numero-pedido
   */
  async asignarNumeroPedido(req: Request, res: Response) {
    const { NumeroPedido, FacturaIDs } = req.body;
    const resultado = await facturasService.asignarNumeroPedido(NumeroPedido, FacturaIDs);
    const msg = resultado.asociadasAPedido > 0
      ? `N° de pedido asignado. ${resultado.asociadasAPedido} factura(s) vinculada(s) al pedido existente`
      : 'N° de pedido asignado';
    return success(res, msg, resultado);
  }

  /**
   * PATCH /facturas/:FacturaID/quitar-numero-pedido
   */
  async quitarNumeroPedido(req: Request, res: Response) {
    const FacturaID = Number(req.params.FacturaID);
    const resultado = await facturasService.quitarNumeroPedido(FacturaID);
    return success(res, 'N° de pedido eliminado', resultado);
  }

  /**
   * GET /facturas/pedidos-agrupados
   */
  async findPedidosAgrupados(_req: Request, res: Response) {
    const grupos = await facturasService.findPedidosAgrupados();
    return success(res, 'Números de pedido obtenidos', grupos);
  }

  /**
   * GET /facturas/por-numero-pedido?numeroPedido=X&rfc=Y
   */
  async findByNumeroPedido(req: Request, res: Response) {
    const numeroPedido = (req.query.numeroPedido as string) || '';
    const rfc = (req.query.rfc as string) || '';
    const facturas = await facturasService.findByNumeroPedido(numeroPedido, rfc);
    return success(res, 'Facturas del pedido obtenidas', facturas);
  }

  /**
   * GET /facturas
   */
  async findAll(req: Request, res: Response) {
    const texto = req.query.texto as string | undefined;
    const fechaDesde = req.query.fechaDesde as string | undefined;
    const fechaHasta = req.query.fechaHasta as string | undefined;
    const page = req.query.page != null ? Number(req.query.page) : undefined;
    const pageSize = req.query.pageSize != null ? Number(req.query.pageSize) : undefined;
    const facturas = await facturasService.findAll(texto, fechaDesde, fechaHasta, page, pageSize);
    return success(res, 'Facturas obtenidas', facturas);
  }

  /**
   * GET /facturas/agrupadas
   */
  async findAllAgrupadas(req: Request, res: Response) {
    const texto = req.query.texto as string | undefined;
    const agrupadas = await facturasService.findAllAgrupadas(texto);
    return success(res, 'Facturas agrupadas obtenidas', agrupadas);
  }

  /**
   * GET /facturas/emisor/:EmisorFacturaID
   */
  async findByEmisor(req: Request, res: Response) {
    const EmisorFacturaID = Number(req.params.EmisorFacturaID);
    const resultado = await facturasService.findByEmisor(EmisorFacturaID);
    return success(res, 'Facturas del emisor obtenidas', resultado);
  }

  /**
   * GET /facturas/:FacturaID
   */
  async findOne(req: Request, res: Response) {
    const FacturaID = Number(req.params.FacturaID);
    const factura = await facturasService.findOne(FacturaID);
    return success(res, 'Factura obtenida', factura);
  }

  /**
   * GET /facturas/:FacturaID/xml
   */
  async getXml(req: Request, res: Response) {
    const FacturaID = Number(req.params.FacturaID);
    const { buffer, uuid } = await facturasService.getXml(FacturaID);

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="factura_${uuid}.xml"`);
    res.send(buffer);
  }
}

// Exportar singleton
export const facturasController = new FacturasController();
