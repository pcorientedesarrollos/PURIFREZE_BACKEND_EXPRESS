import { Request, Response, NextFunction } from 'express';
import { validateToken, TokenPayload } from '../utils/jwt';

// Extender el tipo Request para incluir el usuario autenticado
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Middleware de autenticación JWT
 * Verifica que el token sea válido y no haya expirado
 * Si es válido, añade los datos del usuario a req.user
 */
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;

  // Verificar que exista el header Authorization
  if (!authHeader) {
    res.status(401).json({
      status: 401,
      message: 'No se proporcionó token de autenticación',
      error: true,
      data: [],
    });
    return;
  }

  // Verificar formato "Bearer {token}"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({
      status: 401,
      message: 'Formato de token inválido. Use: Bearer {token}',
      error: true,
      data: [],
    });
    return;
  }

  const token = parts[1];

  // Validar el token
  const payload = validateToken(token);

  if (!payload) {
    res.status(401).json({
      status: 401,
      message: 'Token inválido o expirado',
      error: true,
      data: [],
    });
    return;
  }

  // Añadir datos del usuario a la request
  req.user = payload;

  next();
}

/**
 * Middleware opcional de autenticación
 * No rechaza si no hay token, pero si hay uno válido, lo añade a req.user
 * Útil para rutas que funcionan diferente si el usuario está autenticado
 */
export function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      const token = parts[1];
      const payload = validateToken(token);
      if (payload) {
        req.user = payload;
      }
    }
  }

  next();
}
