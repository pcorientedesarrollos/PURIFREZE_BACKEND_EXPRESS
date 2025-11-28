import { Request, Response } from 'express';
import { authService } from './auth.service';
import { success } from '../../utils/response';
import { LoginDto, RefreshTokenDto, ReauthDto, LogoutDto } from './auth.schema';

/**
 * Obtiene la IP del cliente desde el request
 */
function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

export class AuthController {
  /**
   * POST /auth - Login
   */
  async login(req: Request, res: Response) {
    const data = req.body as LoginDto;
    const clientIp = getClientIp(req);
    const result = await authService.login(data, clientIp);
    return success(res, result.message || '¡Bienvenido!', result);
  }

  /**
   * POST /auth/refreshToken - Refrescar token
   */
  async refreshToken(req: Request, res: Response) {
    const data = req.body as RefreshTokenDto;
    const result = await authService.refreshToken(data);
    return success(res, 'Token obtenido', result);
  }

  /**
   * GET /auth/sesiones - Obtener sesiones
   */
  async findSesiones(_req: Request, res: Response) {
    const result = await authService.findSesiones();
    return success(res, 'Sesiones obtenidas', result);
  }

  /**
   * PUT /auth/reauth - Reautenticar
   */
  async reauth(req: Request, res: Response) {
    const data = req.body as ReauthDto;
    const clientIp = getClientIp(req);
    const result = await authService.reauth(data, clientIp);
    return success(res, 'Sesión Actualizada', result);
  }

  /**
   * POST /auth/logout - Cerrar sesión
   */
  async logout(req: Request, res: Response) {
    const data = req.body as LogoutDto;
    const result = await authService.logout(data);
    return success(res, 'Sesión cerrada adecuadamente', result);
  }

  /**
   * POST /auth/logout/admin - Cerrar sesión admin
   */
  async logoutAdmin(req: Request, res: Response) {
    const data = req.body as LogoutDto;
    const result = await authService.logoutAdmin(data);
    return success(res, 'Sesión cerrada adecuadamente', result);
  }
}

export const authController = new AuthController();
