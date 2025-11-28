import { z } from 'zod';

// Schema para login
export const loginSchema = z.object({
  Usuario: z.string().min(1, 'Usuario es requerido'),
  Password: z.string().min(1, 'Password es requerido'),
});

// Schema para refresh token
export const refreshTokenSchema = z.object({
  AcessToken: z.string().min(1, 'AcessToken es requerido'),
  UsuarioID: z.number({ message: 'UsuarioID debe ser un número' }),
  SessionID: z.string().min(1).max(37, 'SessionID inválido'),
});

// Schema para reauth
export const reauthSchema = z.object({
  Usuario: z.string().min(1, 'Usuario es requerido'),
  Password: z.string().min(1, 'Password es requerido'),
  SessionID: z.string().min(1, 'SessionID es requerido'),
});

// Schema para logout
export const logoutSchema = z.object({
  SessionID: z.string().min(1).max(37, 'SessionID inválido'),
  UsuarioID: z.number({ message: 'UsuarioID debe ser un número' }),
});

// Types
export type LoginDto = z.infer<typeof loginSchema>;
export type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;
export type ReauthDto = z.infer<typeof reauthSchema>;
export type LogoutDto = z.infer<typeof logoutSchema>;
