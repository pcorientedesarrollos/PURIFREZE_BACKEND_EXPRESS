import { Request, Response } from 'express';
import { cobrosService } from './cobros.service';
import { success } from '../../utils/response';
import { CobrosQueryDto } from './cobros.schema';

class CobrosController {
  // =============================================
  // CONFIGURACIÓN Y GENERACIÓN
  // =============================================

  async configurarCobros(req: Request, res: Response) {
    const { ContratoID } = req.params as unknown as { ContratoID: number };
    const result = await cobrosService.configurarCobros(ContratoID, req.body);
    return success(res, result.message, result.data, 201);
  }

  async generarCobros(req: Request, res: Response) {
    const { ContratoID } = req.params as unknown as { ContratoID: number };
    const { UsuarioID } = req.body;
    const result = await cobrosService.generarCobros(ContratoID, UsuarioID);
    return success(res, result.message, result.data, 201);
  }

  async getConfiguracion(req: Request, res: Response) {
    const { ContratoID } = req.params as unknown as { ContratoID: number };
    const result = await cobrosService.getConfiguracion(ContratoID);
    return success(res, result.message, result.data);
  }

  // =============================================
  // CONSULTAS
  // =============================================

  async findAll(req: Request, res: Response) {
    const query = req.query as unknown as CobrosQueryDto;
    const result = await cobrosService.findAll(query);
    return success(res, result.message, result.data);
  }

  async findOne(req: Request, res: Response) {
    const { CobroID } = req.params as unknown as { CobroID: number };
    const result = await cobrosService.findOne(CobroID);
    return success(res, result.message, result.data);
  }

  async findByContrato(req: Request, res: Response) {
    const { ContratoID } = req.params as unknown as { ContratoID: number };
    const result = await cobrosService.findByContrato(ContratoID);
    return success(res, result.message, result.data);
  }

  async getVencidos(req: Request, res: Response) {
    const result = await cobrosService.getVencidos();
    return success(res, result.message, result.data);
  }

  async getResumenCliente(req: Request, res: Response) {
    const { ClienteID } = req.params as unknown as { ClienteID: number };
    const result = await cobrosService.getResumenCliente(ClienteID);
    return success(res, result.message, result.data);
  }

  // =============================================
  // ACCIONES
  // =============================================

  async registrarPago(req: Request, res: Response) {
    const { CobroID } = req.params as unknown as { CobroID: number };
    const result = await cobrosService.registrarPago(CobroID, req.body);
    return success(res, result.message, result.data);
  }

  async registrarPagoParcial(req: Request, res: Response) {
    const { CobroID } = req.params as unknown as { CobroID: number };
    const result = await cobrosService.registrarPagoParcial(CobroID, req.body);
    return success(res, result.message, result.data);
  }

  async aplicarRegalo(req: Request, res: Response) {
    const { CobroID } = req.params as unknown as { CobroID: number };
    const result = await cobrosService.aplicarRegalo(CobroID, req.body);
    return success(res, result.message, result.data);
  }

  async aplicarDescuento(req: Request, res: Response) {
    const { CobroID } = req.params as unknown as { CobroID: number };
    const result = await cobrosService.aplicarDescuento(CobroID, req.body);
    return success(res, result.message, result.data);
  }

  async pagarConDescuento(req: Request, res: Response) {
    const { CobroID } = req.params as unknown as { CobroID: number };
    const result = await cobrosService.pagarConDescuento(CobroID, req.body);
    return success(res, result.message, result.data);
  }

  async cancelar(req: Request, res: Response) {
    const { CobroID } = req.params as unknown as { CobroID: number };
    const result = await cobrosService.cancelar(CobroID, req.body);
    return success(res, result.message, result.data);
  }

  async modificarMonto(req: Request, res: Response) {
    const { CobroID } = req.params as unknown as { CobroID: number };
    const result = await cobrosService.modificarMonto(CobroID, req.body);
    return success(res, result.message, result.data);
  }

  async marcarVencidos(req: Request, res: Response) {
    const result = await cobrosService.marcarVencidos();
    return success(res, result.message, result.data);
  }
}

export const cobrosController = new CobrosController();
