import { Response } from 'express';

interface ApiResponse<T = unknown> {
  status: number;
  message: string;
  error: boolean;
  data: T;
}

/**
 * Respuesta exitosa estándar
 */
export function success<T>(res: Response, message: string, data: T, status = 200): Response {
  const response: ApiResponse<T> = {
    status,
    message,
    error: false,
    data,
  };
  return res.status(status).json(response);
}

/**
 * Respuesta de error estándar
 */
export function error(res: Response, message: string, status = 400): Response {
  const response: ApiResponse<[]> = {
    status,
    message,
    error: true,
    data: [],
  };
  return res.status(status).json(response);
}

/**
 * Clase para lanzar errores HTTP personalizados
 */
export class HttpError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
