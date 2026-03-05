import { Request, Response, NextFunction } from 'express';
import { notasCreditoService } from './notas-credito.service';
import {
  createNotaCreditoSchema,
  updateNotaCreditoSchema,
  aplicarNotaCreditoSchema,
  notaCreditoIdParamSchema,
  proveedorIdParamSchema,
  searchNotasCreditoQuerySchema,
} from './notas-credito.schema';

class NotasCreditoController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = createNotaCreditoSchema.parse(req.body);
      const usuarioId = (req as any).user?.UsuarioID || 1;
      const result = await notasCreditoService.create(dto, usuarioId);
      res.status(201).json({ error: false, status: 201, ...result });
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: Request, res: Response, next: NextFunction) {
    try {
      const query = searchNotasCreditoQuerySchema.parse(req.query);
      const result = await notasCreditoService.findAll(query);
      res.json({ error: false, status: 200, ...result });
    } catch (error) {
      next(error);
    }
  }

  async findOne(req: Request, res: Response, next: NextFunction) {
    try {
      const { NotaCreditoID } = notaCreditoIdParamSchema.parse(req.params);
      const data = await notasCreditoService.findOne(NotaCreditoID);
      res.json({ error: false, status: 200, message: 'Nota de crédito obtenida', data });
    } catch (error) {
      next(error);
    }
  }

  async findByProveedor(req: Request, res: Response, next: NextFunction) {
    try {
      const { ProveedorID } = proveedorIdParamSchema.parse(req.params);
      const soloDisponibles = req.query.soloDisponibles !== 'false';
      const result = await notasCreditoService.findByProveedor(ProveedorID, soloDisponibles);
      res.json({ error: false, status: 200, ...result });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { NotaCreditoID } = notaCreditoIdParamSchema.parse(req.params);
      const dto = updateNotaCreditoSchema.parse(req.body);
      const result = await notasCreditoService.update(NotaCreditoID, dto);
      res.json({ error: false, status: 200, ...result });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { NotaCreditoID } = notaCreditoIdParamSchema.parse(req.params);
      const result = await notasCreditoService.delete(NotaCreditoID);
      res.json({ error: false, status: 200, ...result });
    } catch (error) {
      next(error);
    }
  }

  async aplicar(req: Request, res: Response, next: NextFunction) {
    try {
      const { NotaCreditoID } = notaCreditoIdParamSchema.parse(req.params);
      const dto = aplicarNotaCreditoSchema.parse(req.body);
      const usuarioId = (req as any).user?.UsuarioID || 1;
      const result = await notasCreditoService.aplicar(NotaCreditoID, dto, usuarioId);
      res.json({ error: false, status: 200, ...result });
    } catch (error) {
      next(error);
    }
  }
}

export const notasCreditoController = new NotasCreditoController();
