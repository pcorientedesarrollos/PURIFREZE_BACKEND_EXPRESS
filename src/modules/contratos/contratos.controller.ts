import { Request, Response } from 'express';
import { contratosService } from './contratos.service';
import { success } from '../../utils/response';
import { ContratosQueryDto } from './contratos.schema';

class ContratosController {
  // =============================================
  // CONTRATOS
  // =============================================

  async create(req: Request, res: Response) {
    const result = await contratosService.create(req.body);
    return success(res, result.message, result.data, 201);
  }

  async findAll(req: Request, res: Response) {
    const query = req.query as unknown as ContratosQueryDto;
    const result = await contratosService.findAll(query);
    return success(res, result.message, result.data);
  }

  async findOne(req: Request, res: Response) {
    const { ContratoID } = req.params as unknown as { ContratoID: number };
    const result = await contratosService.findOne(ContratoID);
    return success(res, result.message, result.data);
  }

  async findByCliente(req: Request, res: Response) {
    const { ClienteID } = req.params as unknown as { ClienteID: number };
    const result = await contratosService.findByCliente(ClienteID);
    return success(res, result.message, result.data);
  }

  async update(req: Request, res: Response) {
    const { ContratoID } = req.params as unknown as { ContratoID: number };
    const { UsuarioID, ...data } = req.body;
    const result = await contratosService.update(ContratoID, data, UsuarioID);
    return success(res, result.message, result.data);
  }

  async activar(req: Request, res: Response) {
    const { ContratoID } = req.params as unknown as { ContratoID: number };
    const { UsuarioID } = req.body;
    const result = await contratosService.activar(ContratoID, UsuarioID);
    return success(res, result.message, result.data);
  }

  async cancelar(req: Request, res: Response) {
    const { ContratoID } = req.params as unknown as { ContratoID: number };
    const result = await contratosService.cancelar(ContratoID, req.body);
    return success(res, result.message, result.data);
  }

  async renovar(req: Request, res: Response) {
    const { ContratoID } = req.params as unknown as { ContratoID: number };
    const result = await contratosService.renovar(ContratoID, req.body);
    return success(res, result.message, result.data, 201);
  }

  async actualizarMonto(req: Request, res: Response) {
    const { ContratoID } = req.params as unknown as { ContratoID: number };
    const result = await contratosService.actualizarMonto(ContratoID, req.body);
    return success(res, result.message, result.data);
  }

  async baja(req: Request, res: Response) {
    const { ContratoID } = req.params as unknown as { ContratoID: number };
    const result = await contratosService.baja(ContratoID);
    return success(res, result.message, result.data);
  }

  async activarRegistro(req: Request, res: Response) {
    const { ContratoID } = req.params as unknown as { ContratoID: number };
    const result = await contratosService.activarRegistro(ContratoID);
    return success(res, result.message, result.data);
  }

  // =============================================
  // EQUIPOS DEL CONTRATO (usando clientes_equipos)
  // =============================================

  async asignarEquipo(req: Request, res: Response) {
    const { ClienteEquipoID } = req.params as unknown as { ClienteEquipoID: number };
    const { UsuarioID, ...data } = req.body;
    const result = await contratosService.asignarEquipo(ClienteEquipoID, data, UsuarioID);
    return success(res, result.message, result.data);
  }

  async instalarEquipo(req: Request, res: Response) {
    const { ClienteEquipoID } = req.params as unknown as { ClienteEquipoID: number };
    const { UsuarioID } = req.body;
    const result = await contratosService.instalarEquipo(ClienteEquipoID, UsuarioID);
    return success(res, result.message, result.data);
  }

  async retirarEquipo(req: Request, res: Response) {
    const { ClienteEquipoID } = req.params as unknown as { ClienteEquipoID: number };
    const { UsuarioID, MotivoRetiro } = req.body;
    const result = await contratosService.retirarEquipo(ClienteEquipoID, UsuarioID, MotivoRetiro);
    return success(res, result.message, result.data);
  }

  async getEquiposDisponibles(req: Request, res: Response) {
    const { ClienteEquipoID } = req.params as unknown as { ClienteEquipoID: number };
    const result = await contratosService.getEquiposDisponibles(ClienteEquipoID);
    return success(res, result.message, result.data);
  }

  async getEquiposPendientes(req: Request, res: Response) {
    const { ContratoID } = req.params as unknown as { ContratoID: number };
    const result = await contratosService.getEquiposPendientes(ContratoID);
    return success(res, result.message, result.data);
  }

  // NOTA: Los servicios ahora se manejan en el módulo /servicios
}

export const contratosController = new ContratosController();
