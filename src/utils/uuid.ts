import { v4 as uuidv4 } from 'uuid';

/**
 * Genera un ID de sesión único
 */
export function generateSessionId(): string {
  return uuidv4();
}
