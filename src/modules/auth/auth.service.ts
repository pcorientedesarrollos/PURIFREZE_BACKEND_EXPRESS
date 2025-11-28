import bcrypt from 'bcrypt';
import moment from 'moment';
import prisma from '../../config/database';
import { HttpError } from '../../utils/response';
import { generateToken, validateToken, TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY } from '../../utils/jwt';
import { generateSessionId } from '../../utils/uuid';
import { LoginDto, RefreshTokenDto, ReauthDto, LogoutDto } from './auth.schema';

export class AuthService {
  /**
   * Login de usuario
   */
  async login(data: LoginDto, clientIp: string) {
    const { Usuario, Password } = data;

    // Buscar usuario
    const usuario = await prisma.usuarios.findFirst({
      where: { Usuario },
    });

    if (!usuario) {
      throw new HttpError('El usuario no existe', 404);
    }

    // Verificar si ya tiene sesión activa
    const existingSession = await prisma.sesiones.findFirst({
      where: {
        UsuarioID: usuario.UsuarioID,
        IsActive: true,
        IsActiveAdmin: true,
      },
    });

    // Si existe sesión y el refresh token sigue vivo, reutilizarla
    if (existingSession) {
      const validRT = validateToken(existingSession.RefreshToken || '');
      if (validRT) {
        const Token = generateToken(
          usuario.UsuarioID,
          existingSession.SessionID,
          clientIp,
          TOKEN_EXPIRY,
        );

        return {
          message: 'Este usuario ya contaba con una sesión activa',
          Usuario: usuario.Usuario,
          Token,
        };
      }
    }

    // Verificar contraseña
    const validPassword = await bcrypt.compare(Password, usuario.Password || '');
    if (!validPassword) {
      throw new HttpError('Contraseña incorrecta', 401);
    }

    // Generar nuevo SessionID
    const SessionID = generateSessionId();

    // Generar tokens
    const Token = generateToken(usuario.UsuarioID, SessionID, clientIp, TOKEN_EXPIRY);
    const refreshToken = generateToken(usuario.UsuarioID, SessionID, clientIp, REFRESH_TOKEN_EXPIRY);

    // Crear sesión
    await prisma.sesiones.create({
      data: {
        RefreshToken: refreshToken,
        UsuarioID: usuario.UsuarioID,
        SessionID,
        IsActive: true,
        IsActiveAdmin: true,
        IpAdress: clientIp,
        FechaAlta: moment().format('YYYY-MM-DD HH:mm:ss'),
      },
    });

    return {
      Usuario: usuario.Usuario,
      Token,
    };
  }

  /**
   * Refrescar token de acceso
   */
  async refreshToken(data: RefreshTokenDto) {
    const { AcessToken, SessionID, UsuarioID } = data;

    // Verificar que el usuario existe
    const usuario = await prisma.usuarios.findUnique({
      where: { UsuarioID },
    });

    if (!usuario) {
      throw new HttpError('El usuario no existe', 404);
    }

    // Verificar si el token actual sigue vivo
    const validAT = validateToken(AcessToken);

    if (validAT) {
      return { message: 'El token aun está activo' };
    }

    // Buscar sesión
    const session = await prisma.sesiones.findFirst({
      where: { UsuarioID, SessionID },
    });

    if (!session) {
      throw new HttpError('Sesión no encontrada', 404);
    }

    // Validar refresh token
    const validRT = validateToken(session.RefreshToken || '');
    if (!validRT) {
      throw new HttpError('Lo sentimos, pero tu token de acceso ha caducado, inicia sesión de nuevo', 401);
    }

    if (!session.IsActive) {
      throw new HttpError('Lo sentimos, pero tu sesión ha caducado', 401);
    }

    // Generar nuevo access token
    const newToken = generateToken(
      usuario.UsuarioID,
      SessionID,
      session.IpAdress || '',
      TOKEN_EXPIRY,
    );

    return {
      Usuario: usuario.Usuario,
      UsuarioID: usuario.UsuarioID,
      SessionID,
      Token: newToken,
    };
  }

  /**
   * Obtener todas las sesiones
   */
  async findSesiones() {
    const sesiones = await prisma.sesiones.findMany({
      select: {
        RefreshTokenID: true,
        SessionID: true,
        IsActive: true,
        IsActiveAdmin: true,
        FechaAlta: true,
        UsuarioID: true,
      },
    });

    // Obtener info de usuarios
    const usuarioIds = [...new Set(sesiones.map(s => s.UsuarioID).filter(Boolean))] as number[];
    const usuarios = await prisma.usuarios.findMany({
      where: { UsuarioID: { in: usuarioIds } },
      select: { UsuarioID: true, Usuario: true, NombreCompleto: true },
    });

    const usuariosMap = new Map(usuarios.map(u => [u.UsuarioID, u]));

    const sesionesConUsuario = sesiones.map(s => ({
      ...s,
      usuario: s.UsuarioID ? usuariosMap.get(s.UsuarioID) : null,
    }));

    return {
      NoSesiones: sesiones.length,
      sesiones: sesionesConUsuario,
    };
  }

  /**
   * Reautenticar sesión (renovar refresh token)
   */
  async reauth(data: ReauthDto, clientIp: string) {
    const { Usuario, Password, SessionID } = data;

    // Buscar usuario
    const usuario = await prisma.usuarios.findFirst({
      where: { Usuario },
    });

    if (!usuario) {
      throw new HttpError('El usuario no existe', 404);
    }

    // Buscar sesión activa
    const session = await prisma.sesiones.findFirst({
      where: {
        SessionID,
        UsuarioID: usuario.UsuarioID,
        IsActive: true,
        IsActiveAdmin: true,
      },
    });

    if (!session) {
      throw new HttpError('No existe una sesión activa para tu usuario', 401);
    }

    // Verificar si el refresh token aún está vivo
    const validRT = validateToken(session.RefreshToken || '');
    if (validRT) {
      throw new HttpError('El refreshToken aún sigue vivo', 300);
    }

    // Verificar contraseña
    const validPassword = await bcrypt.compare(Password, usuario.Password || '');
    if (!validPassword) {
      throw new HttpError('Contraseña incorrecta', 401);
    }

    // Generar nuevos tokens
    const Token = generateToken(usuario.UsuarioID, SessionID, clientIp, TOKEN_EXPIRY);
    const refreshToken = generateToken(usuario.UsuarioID, SessionID, clientIp, REFRESH_TOKEN_EXPIRY);

    // Actualizar sesión
    await prisma.sesiones.updateMany({
      where: {
        SessionID,
        RefreshTokenID: session.RefreshTokenID,
      },
      data: { RefreshToken: refreshToken },
    });

    return {
      Usuario: usuario.Usuario,
      Token,
    };
  }

  /**
   * Cerrar sesión (usuario)
   */
  async logout(data: LogoutDto) {
    const { SessionID, UsuarioID } = data;

    const session = await prisma.sesiones.findFirst({
      where: {
        SessionID,
        UsuarioID,
        IsActive: true,
        IsActiveAdmin: true,
      },
    });

    if (!session) {
      throw new HttpError('Lo sentimos pero no encontramos una sesión activa', 404);
    }

    await prisma.sesiones.updateMany({
      where: {
        SessionID,
        RefreshTokenID: session.RefreshTokenID,
      },
      data: { IsActive: false },
    });

    return { SessionID, UsuarioID, IsActive: false };
  }

  /**
   * Cerrar sesión (admin)
   */
  async logoutAdmin(data: LogoutDto) {
    const { SessionID, UsuarioID } = data;

    const session = await prisma.sesiones.findFirst({
      where: {
        SessionID,
        UsuarioID,
        IsActive: true,
        IsActiveAdmin: true,
      },
    });

    if (!session) {
      throw new HttpError('Lo sentimos pero no encontramos una sesión activa', 404);
    }

    await prisma.sesiones.updateMany({
      where: {
        SessionID,
        RefreshTokenID: session.RefreshTokenID,
      },
      data: { IsActiveAdmin: false },
    });

    return { SessionID, UsuarioID, IsActiveAdmin: false };
  }
}

export const authService = new AuthService();
