import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../utils/response';

/**
 * Middleware global de manejo de errores
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): Response {
  console.error(`[Error] ${err.message}`);
  console.error(err.stack);

  // Error de validación Zod
  if (err instanceof ZodError) {
    const issues = err.issues || [];
    const messages = issues.map((issue) => {
      const path = issue.path.map(String).join('.');
      return `${path}: ${issue.message}`;
    });
    return res.status(400).json({
      status: 400,
      message: `Bad Request (${messages.join(', ')})`,
      error: true,
      data: [],
    });
  }

  // Error HTTP personalizado
  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({
      status: err.statusCode,
      message: err.message,
      error: true,
      data: [],
    });
  }

  // Error interno del servidor
  return res.status(500).json({
    status: 500,
    message: `Error ${err.message || 'Ocurrió un error interno'}`,
    error: true,
    data: [],
  });
}
