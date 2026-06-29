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
   * GET /facturas
   */
  async findAll(req: Request, res: Response) {
    const texto = req.query.texto as string | undefined;
    const facturas = await facturasService.findAll(texto);
    return success(res, 'Facturas obtenidas', facturas);
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
