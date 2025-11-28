import { Request, Response, NextFunction } from 'express';
import { ZodType } from 'zod';

/**
 * Middleware para validar el body de la request con Zod
 */
export function validateBody(schema: ZodType<unknown>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body);
    next();
  };
}

/**
 * Middleware para validar los params de la request con Zod
 */
export function validateParams(schema: ZodType<unknown>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.params = schema.parse(req.params) as typeof req.params;
    next();
  };
}

/**
 * Middleware para validar query params de la request con Zod
 */
export function validateQuery(schema: ZodType<unknown>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.query = schema.parse(req.query) as typeof req.query;
    next();
  };
}
