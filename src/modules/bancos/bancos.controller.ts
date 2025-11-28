import { Request, Response } from 'express';
import { bancosService } from './bancos.service';
import { success } from '../../utils/response';
import { CreateBancoDto, UpdateBancoDto } from './bancos.schema';

export class BancosController {
  /**
   * POST /bancos
   */
  async create(req: Request, res: Response) {
    const data = req.body as CreateBancoDto;
    const banco = await bancosService.create(data);
    return success(res, 'Banco Creado', banco);
  }

  /**
   * GET /bancos
   */
  async findAll(_req: Request, res: Response) {
    const bancos = await bancosService.findAll();
    return success(res, 'Bancos obtenidos', bancos);
  }

  /**
   * GET /bancos/:BancoID
   */
  async findOne(req: Request, res: Response) {
    const BancoID = Number(req.params.BancoID);
    const banco = await bancosService.findOne(BancoID);
    return success(res, 'Banco obtenido', banco);
  }

  /**
   * PUT /bancos/:BancoID
   */
  async update(req: Request, res: Response) {
    const BancoID = Number(req.params.BancoID);
    const data = req.body as UpdateBancoDto;
    const banco = await bancosService.update(BancoID, data);
    return success(res, 'Banco Actualizado', banco);
  }

  /**
   * PATCH /bancos/baja/:BancoID
   */
  async bajaBanco(req: Request, res: Response) {
    const BancoID = Number(req.params.BancoID);
    const banco = await bancosService.bajaBanco(BancoID);
    return success(res, 'Banco dado de baja', banco);
  }

  /**
   * PATCH /bancos/activar/:BancoID
   */
  async activarBanco(req: Request, res: Response) {
    const BancoID = Number(req.params.BancoID);
    const banco = await bancosService.activarBanco(BancoID);
    return success(res, 'Banco activado', banco);
  }
}

// Exportar instancia singleton
export const bancosController = new BancosController();
