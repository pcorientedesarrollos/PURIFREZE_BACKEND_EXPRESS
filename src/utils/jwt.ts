import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

export interface TokenPayload {
  UsuarioID: number;
  SessionID: string;
  IpAdress: string;
  iat?: number;
  exp?: number;
}

// Tiempos de expiración
export const TOKEN_EXPIRY = '7h';        // 7 horas
export const REFRESH_TOKEN_EXPIRY = '7d'; // 7 días

/**
 * Genera un token JWT
 */
export function generateToken(
  UsuarioID: number,
  SessionID: string,
  IpAdress: string,
  expiresIn: string = TOKEN_EXPIRY,
): string {
  const payload = { UsuarioID, SessionID, IpAdress };
  const options: SignOptions = { expiresIn: expiresIn as jwt.SignOptions['expiresIn'] };
  return jwt.sign(payload, env.SECRET_KEY, options);
}

/**
 * Valida un token JWT
 * @returns El payload si es válido, false si no
 */
export function validateToken(token: string): TokenPayload | false {
  try {
    const payload = jwt.verify(token, env.SECRET_KEY) as TokenPayload;
    return payload;
  } catch {
    return false;
  }
}

/**
 * Decodifica un token sin validar (útil para tokens expirados)
 */
export function decodeToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.decode(token) as TokenPayload;
    return decoded;
  } catch {
    return null;
  }
}
