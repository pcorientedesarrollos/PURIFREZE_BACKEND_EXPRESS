import { Request, Response } from 'express';
import { clientesDatosFiscalesService } from './clientes-datos-fiscales.service';
import { success } from '../../utils/response';
import { parsearConstanciaFiscal } from '../../utils/constancia-fiscal-parser';
import { HttpError } from '../../utils/response';

class ClientesDatosFiscalesController {
  async create(req: Request, res: Response) {
    const result = await clientesDatosFiscalesService.create(req.body);
    return success(res, result.message, result.data, 201);
  }

  async findAll(_req: Request, res: Response) {
    const result = await clientesDatosFiscalesService.findAll();
    return success(res, result.message, result.data);
  }

  async findOne(req: Request, res: Response) {
    const { DatosFiscalesID } = req.params as unknown as { DatosFiscalesID: number };
    const result = await clientesDatosFiscalesService.findOne(DatosFiscalesID);
    return success(res, result.message, result.data);
  }

  async findByClienteID(req: Request, res: Response) {
    const { ClienteID } = req.params as unknown as { ClienteID: number };
    const result = await clientesDatosFiscalesService.findByClienteID(ClienteID);
    return success(res, result.message, result.data);
  }

  async findCatalogoByCliente(req: Request, res: Response) {
    const { ClienteID } = req.params as unknown as { ClienteID: number };
    const result = await clientesDatosFiscalesService.findCatalogoByCliente(ClienteID);
    return success(res, result.message, result.data);
  }

  async update(req: Request, res: Response) {
    const { DatosFiscalesID } = req.params as unknown as { DatosFiscalesID: number };
    const result = await clientesDatosFiscalesService.update(DatosFiscalesID, req.body);
    return success(res, result.message, result.data);
  }

  async baja(req: Request, res: Response) {
    const { DatosFiscalesID } = req.params as unknown as { DatosFiscalesID: number };
    const result = await clientesDatosFiscalesService.baja(DatosFiscalesID);
    return success(res, result.message, result.data);
  }

  async activar(req: Request, res: Response) {
    const { DatosFiscalesID } = req.params as unknown as { DatosFiscalesID: number };
    const result = await clientesDatosFiscalesService.activar(DatosFiscalesID);
    return success(res, result.message, result.data);
  }
  async parsearConstancia(req: Request, res: Response) {
    if (!req.file) {
      throw new HttpError('No se envió ningún archivo', 400);
    }

    const datos = await parsearConstanciaFiscal(req.file.buffer);
    return success(res, 'Constancia fiscal parseada correctamente', datos);
  }

  async uploadYCrear(req: Request, res: Response) {
    if (!req.file) {
      throw new HttpError('No se envió ningún archivo', 400);
    }

    const ClienteID = Number(req.body.ClienteID);
    if (!ClienteID || isNaN(ClienteID)) {
      throw new HttpError('El ClienteID es requerido', 400);
    }

    const datos = await parsearConstanciaFiscal(req.file.buffer);

    const result = await clientesDatosFiscalesService.create({
      ClienteID,
      RazonSocial: datos.RazonSocial || '',
      RFC: datos.RFC || '',
      Regimen: datos.Regimen || '',
      DireccionFiscal: datos.DireccionFiscal || '',
      CodigoPostal: datos.CodigoPostal || '',
    });

    return success(res, 'Datos fiscales extraídos y guardados desde constancia', {
      datosExtraidos: datos,
      datosFiscales: result.data,
    }, 201);
  }
}

export const clientesDatosFiscalesController = new ClientesDatosFiscalesController();
