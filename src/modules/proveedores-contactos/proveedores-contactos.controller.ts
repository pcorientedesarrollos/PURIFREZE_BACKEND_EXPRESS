import { Request, Response } from 'express';
import { proveedoresContactosService } from './proveedores-contactos.service';
import { success } from '../../utils/response';

class ProveedoresContactosController {
  async create(req: Request, res: Response) {
    const result = await proveedoresContactosService.create(req.body);
    return success(res, result.message, result.data, 201);
  }

  async findByProveedor(req: Request, res: Response) {
    const { ProveedorID } = req.params as unknown as { ProveedorID: number };
    const result = await proveedoresContactosService.findByProveedor(ProveedorID);
    return success(res, result.message, result.data);
  }

  async findOne(req: Request, res: Response) {
    const { ContactoID } = req.params as unknown as { ContactoID: number };
    const result = await proveedoresContactosService.findOne(ContactoID);
    return success(res, result.message, result.data);
  }

  async update(req: Request, res: Response) {
    const { ContactoID } = req.params as unknown as { ContactoID: number };
    const result = await proveedoresContactosService.update(ContactoID, req.body);
    return success(res, result.message, result.data);
  }

  async baja(req: Request, res: Response) {
    const { ContactoID } = req.params as unknown as { ContactoID: number };
    const result = await proveedoresContactosService.baja(ContactoID);
    return success(res, result.message, result.data);
  }

  async activar(req: Request, res: Response) {
    const { ContactoID } = req.params as unknown as { ContactoID: number };
    const result = await proveedoresContactosService.activar(ContactoID);
    return success(res, result.message, result.data);
  }
}

export const proveedoresContactosController = new ProveedoresContactosController();
