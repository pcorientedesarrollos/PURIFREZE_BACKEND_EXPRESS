import { Request, Response } from 'express';
import { ventasService } from './ventas.service';
import { success } from '../../utils/response';

class VentasController {
  // Crear venta con detalles
  async create(req: Request, res: Response) {
    const result = await ventasService.create(req.body);
    return success(res, result.message, result.data, 201);
  }

  // Obtener todas las ventas
  async findAll(req: Request, res: Response) {
    const result = await ventasService.findAll(req.query);
    return success(res, result.message, result.data);
  }

  // Obtener ventas por cliente
  async findByCliente(req: Request, res: Response) {
    const { ClienteID } = req.params as any;
    const result = await ventasService.findByCliente(ClienteID, req.query);
    return success(res, result.message, result.data);
  }

  // Obtener una venta por ID
  async findOne(req: Request, res: Response) {
    const { VentaID } = req.params as any;
    const result = await ventasService.findOne(VentaID);
    return success(res, result.message, result.data);
  }

  // Actualizar venta
  async update(req: Request, res: Response) {
    const { VentaID } = req.params as any;
    const result = await ventasService.update(VentaID, req.body);
    return success(res, result.message, result.data);
  }

  // Cambiar estatus
  async updateEstatus(req: Request, res: Response) {
    const { VentaID } = req.params as any;
    const result = await ventasService.updateEstatus(VentaID, req.body);
    return success(res, result.message, result.data);
  }

  // Agregar detalle
  async addDetalle(req: Request, res: Response) {
    const { VentaID } = req.params as any;
    const result = await ventasService.addDetalle(VentaID, req.body);
    return success(res, result.message, result.data, 201);
  }

  // Actualizar detalle
  async updateDetalle(req: Request, res: Response) {
    const { VentaDetalleID } = req.params as any;
    const result = await ventasService.updateDetalle(VentaDetalleID, req.body);
    return success(res, result.message, result.data);
  }

  // Eliminar detalle
  async removeDetalle(req: Request, res: Response) {
    const { VentaDetalleID } = req.params as any;
    const result = await ventasService.removeDetalle(VentaDetalleID);
    return success(res, result.message, result.data);
  }

  // Registrar pago
  async addPago(req: Request, res: Response) {
    const { VentaID } = req.params as any;
    const result = await ventasService.addPago(VentaID, req.body);
    return success(res, result.message, result.data, 201);
  }

  // Eliminar pago
  async removePago(req: Request, res: Response) {
    const { VentaPagoID } = req.params as any;
    const result = await ventasService.removePago(VentaPagoID);
    return success(res, result.message, result.data);
  }

  // Dar de baja
  async baja(req: Request, res: Response) {
    const { VentaID } = req.params as any;
    const result = await ventasService.baja(VentaID);
    return success(res, result.message, result.data);
  }

  // Activar
  async activar(req: Request, res: Response) {
    const { VentaID } = req.params as any;
    const result = await ventasService.activar(VentaID);
    return success(res, result.message, result.data);
  }
}

export const ventasController = new VentasController();
