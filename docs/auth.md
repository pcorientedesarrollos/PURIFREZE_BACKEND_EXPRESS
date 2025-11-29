# API de Autenticación - Purifreeze Backend

## Información General

**Base URL:** `http://localhost:3000`

**Prefijo de ruta:** `/auth`

---

## Configuración de Tokens

| Token | Duración | Descripción |
|-------|----------|-------------|
| **Access Token** | `15 minutos` | Token para autenticar requests a la API |
| **Refresh Token** | `7 días` | Token para renovar el Access Token (almacenado en servidor) |

---

## Flujo de Autenticación

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FLUJO DE AUTENTICACIÓN                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. LOGIN                                                                   │
│     POST /auth                                                              │
│     ├─ Enviar: Usuario + Password                                           │
│     └─ Recibir: Token + Usuario                                             │
│           │                                                                 │
│           ▼                                                                 │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │  GUARDAR EN FRONTEND:                                            │       │
│  │  - Token (Access Token)                                          │       │
│  │  - UsuarioID (decodificar del token)                             │       │
│  │  - SessionID (decodificar del token)                             │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│           │                                                                 │
│           ▼                                                                 │
│  2. USAR API (0-15 min)                                                     │
│     Headers: Authorization: Bearer {Token}                                  │
│           │                                                                 │
│           ▼                                                                 │
│  3. TOKEN EXPIRA (15 min)                                                   │
│     API responde 401 o token inválido                                       │
│           │                                                                 │
│           ▼                                                                 │
│  4. REFRESH TOKEN                                                           │
│     POST /auth/refreshToken                                                 │
│     ├─ Enviar: AcessToken + UsuarioID + SessionID                           │
│     └─ Recibir: Nuevo Token                                                 │
│           │                                                                 │
│           ▼                                                                 │
│  5. CONTINUAR USANDO API (repetir desde paso 2)                             │
│                                                                             │
│  ════════════════════════════════════════════════════════════════════════  │
│                                                                             │
│  6. REFRESH TOKEN EXPIRA (7 días)                                           │
│     POST /auth/refreshToken responde 401                                    │
│           │                                                                 │
│           ▼                                                                 │
│  7. REAUTH (requiere contraseña)                                            │
│     PUT /auth/reauth                                                        │
│     ├─ Enviar: Usuario + Password + SessionID                               │
│     └─ Recibir: Nuevo Token (y nuevo Refresh Token en servidor)             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Endpoints

### 1. Login

**Endpoint:** `POST /auth`

**Descripción:** Inicia sesión y obtiene un token de acceso.

**Payload:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `Usuario` | string | Sí | Nombre de usuario |
| `Password` | string | Sí | Contraseña |

**Ejemplo de Request:**
```json
{
  "Usuario": "admin",
  "Password": "123456"
}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Login exitoso",
  "error": false,
  "data": {
    "Usuario": "admin",
    "Token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Decodificar Token (JWT):**
El token contiene:
```json
{
  "UsuarioID": 1,
  "SessionID": "550e8400-e29b-41d4-a716-446655440000",
  "IpAdress": "192.168.1.100",
  "iat": 1732838400,
  "exp": 1732839300
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 401 | Contraseña incorrecta | Password inválido |
| 404 | El usuario no existe | Usuario no encontrado |

---

### 2. Refresh Token

**Endpoint:** `POST /auth/refreshToken`

**Descripción:** Renueva el Access Token cuando ha expirado (antes de que expire el Refresh Token de 7 días).

**Payload:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `AcessToken` | string | Sí | Token actual (puede estar expirado) |
| `UsuarioID` | number | Sí | ID del usuario |
| `SessionID` | string | Sí | ID de la sesión (max 37 chars) |

**Ejemplo de Request:**
```json
{
  "AcessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "UsuarioID": 1,
  "SessionID": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Token refrescado",
  "error": false,
  "data": {
    "Usuario": "admin",
    "UsuarioID": 1,
    "SessionID": "550e8400-e29b-41d4-a716-446655440000",
    "Token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Si el token aún está activo:**
```json
{
  "status": 200,
  "message": "El token aun está activo",
  "error": false,
  "data": {}
}
```

**Errores Posibles:**

| Código | Mensaje | Acción Frontend |
|--------|---------|-----------------|
| 401 | Lo sentimos, pero tu token de acceso ha caducado, inicia sesión de nuevo | Refresh Token expiró → Mostrar modal de reauth o redirigir a login |
| 401 | Lo sentimos, pero tu sesión ha caducado | Sesión desactivada → Redirigir a login |
| 404 | Usuario o sesión no encontrada | Redirigir a login |

---

### 3. Reautenticar (Renovar Refresh Token)

**Endpoint:** `PUT /auth/reauth`

**Descripción:** Renueva el Refresh Token cuando ha expirado (después de 7 días). Requiere que el usuario ingrese su contraseña nuevamente.

**Payload:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `Usuario` | string | Sí | Nombre de usuario |
| `Password` | string | Sí | Contraseña |
| `SessionID` | string | Sí | ID de la sesión actual |

**Ejemplo de Request:**
```json
{
  "Usuario": "admin",
  "Password": "123456",
  "SessionID": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Reautenticación exitosa",
  "error": false,
  "data": {
    "Usuario": "admin",
    "Token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Errores Posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 300 | El refreshToken aún sigue vivo | No es necesario reautenticar |
| 401 | Contraseña incorrecta | Password inválido |
| 401 | No existe una sesión activa para tu usuario | Sesión fue cerrada |
| 404 | El usuario no existe | Usuario no encontrado |

---

### 4. Logout

**Endpoint:** `POST /auth/logout`

**Descripción:** Cierra la sesión del usuario.

**Payload:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `SessionID` | string | Sí | ID de la sesión |
| `UsuarioID` | number | Sí | ID del usuario |

**Ejemplo de Request:**
```json
{
  "SessionID": "550e8400-e29b-41d4-a716-446655440000",
  "UsuarioID": 1
}
```

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Sesión cerrada",
  "error": false,
  "data": {
    "SessionID": "550e8400-e29b-41d4-a716-446655440000",
    "UsuarioID": 1,
    "IsActive": false
  }
}
```

---

### 5. Logout Admin

**Endpoint:** `POST /auth/logout/admin`

**Descripción:** Cierra la sesión desde el panel de administración (permite forzar cierre de sesiones de otros usuarios).

**Payload:** Igual que logout normal.

---

### 6. Obtener Sesiones

**Endpoint:** `GET /auth/sesiones`

**Descripción:** Obtiene todas las sesiones activas (para panel de administración).

**Response Exitoso (200):**
```json
{
  "status": 200,
  "message": "Sesiones obtenidas",
  "error": false,
  "data": {
    "NoSesiones": 3,
    "sesiones": [
      {
        "RefreshTokenID": 1,
        "SessionID": "550e8400-e29b-41d4-a716-446655440000",
        "IsActive": true,
        "IsActiveAdmin": true,
        "FechaAlta": "2025-11-28 10:30:00",
        "UsuarioID": 1,
        "usuario": {
          "UsuarioID": 1,
          "Usuario": "admin",
          "NombreCompleto": "Administrador"
        }
      }
    ]
  }
}
```

---

## Implementación en Frontend

### 1. Almacenamiento de Datos de Sesión

Al hacer login exitoso, decodificar el JWT y guardar:

```javascript
// Decodificar JWT (usando jwt-decode o similar)
import jwtDecode from 'jwt-decode';

const loginResponse = await api.post('/auth', { Usuario, Password });
const { Token } = loginResponse.data.data;

// Decodificar para obtener datos de sesión
const decoded = jwtDecode(Token);
// decoded = { UsuarioID, SessionID, IpAdress, iat, exp }

// Guardar en localStorage o estado global
localStorage.setItem('token', Token);
localStorage.setItem('usuarioId', decoded.UsuarioID);
localStorage.setItem('sessionId', decoded.SessionID);
```

### 2. Interceptor de Axios para Auto-Refresh

```javascript
import axios from 'axios';
import jwtDecode from 'jwt-decode';

const api = axios.create({
  baseURL: 'http://localhost:3000',
});

// Interceptor de request: agregar token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor de response: manejar token expirado
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si es 401 y no es retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Intentar refresh token
        const token = localStorage.getItem('token');
        const usuarioId = localStorage.getItem('usuarioId');
        const sessionId = localStorage.getItem('sessionId');

        const refreshResponse = await axios.post(
          'http://localhost:3000/auth/refreshToken',
          {
            AcessToken: token,
            UsuarioID: parseInt(usuarioId),
            SessionID: sessionId,
          }
        );

        const { Token: newToken } = refreshResponse.data.data;

        if (newToken) {
          // Guardar nuevo token
          localStorage.setItem('token', newToken);

          // Reintentar request original con nuevo token
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh token expirado - mostrar modal de reauth o redirigir a login
        console.log('Refresh token expirado');

        // Opción 1: Mostrar modal para reautenticar
        showReauthModal();

        // Opción 2: Redirigir a login
        // window.location.href = '/login';

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

### 3. Verificación Proactiva de Token (Opcional)

En lugar de esperar a que falle un request, verificar antes:

```javascript
// Verificar si el token está por expirar (ej: en los próximos 2 minutos)
function isTokenExpiringSoon(token, thresholdMinutes = 2) {
  try {
    const decoded = jwtDecode(token);
    const expirationTime = decoded.exp * 1000; // convertir a milliseconds
    const currentTime = Date.now();
    const timeUntilExpiration = expirationTime - currentTime;
    const thresholdMs = thresholdMinutes * 60 * 1000;

    return timeUntilExpiration < thresholdMs;
  } catch {
    return true; // Si no se puede decodificar, considerarlo expirado
  }
}

// Usar en cada request o con un intervalo
async function ensureValidToken() {
  const token = localStorage.getItem('token');

  if (isTokenExpiringSoon(token)) {
    await refreshToken();
  }
}

// Llamar antes de requests importantes
await ensureValidToken();
await api.get('/compras');
```

### 4. Modal de Reautenticación

Cuando el Refresh Token expira (7 días), mostrar modal:

```jsx
// React ejemplo
function ReauthModal({ isOpen, onSuccess, onCancel }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleReauth = async () => {
    setLoading(true);
    setError('');

    try {
      const usuario = localStorage.getItem('usuario');
      const sessionId = localStorage.getItem('sessionId');

      const response = await axios.put('/auth/reauth', {
        Usuario: usuario,
        Password: password,
        SessionID: sessionId,
      });

      const { Token } = response.data.data;
      localStorage.setItem('token', Token);

      // Actualizar datos del nuevo token
      const decoded = jwtDecode(Token);
      localStorage.setItem('usuarioId', decoded.UsuarioID);
      localStorage.setItem('sessionId', decoded.SessionID);

      onSuccess();
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Contraseña incorrecta');
      } else {
        setError('Error al reautenticar');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen}>
      <h2>Tu sesión ha expirado</h2>
      <p>Por favor ingresa tu contraseña para continuar</p>

      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Contraseña"
      />

      {error && <p className="error">{error}</p>}

      <button onClick={handleReauth} disabled={loading}>
        {loading ? 'Verificando...' : 'Continuar'}
      </button>

      <button onClick={onCancel}>
        Cerrar sesión
      </button>
    </Modal>
  );
}
```

### 5. Intervalo de Verificación (Opcional)

Verificar periódicamente si el token está por expirar:

```javascript
// Verificar cada minuto
useEffect(() => {
  const interval = setInterval(() => {
    const token = localStorage.getItem('token');

    if (isTokenExpiringSoon(token, 1)) {
      // Token expira en menos de 1 minuto
      refreshToken().catch(() => {
        // Si falla el refresh, mostrar modal de reauth
        setShowReauthModal(true);
      });
    }
  }, 60000); // cada 60 segundos

  return () => clearInterval(interval);
}, []);
```

---

## Resumen de Flujo

| Situación | Acción Frontend |
|-----------|-----------------|
| Token válido | Usar normalmente con `Authorization: Bearer {token}` |
| Token expirado (15 min) | Llamar `POST /auth/refreshToken` automáticamente |
| Refresh Token válido | Obtener nuevo Access Token y continuar |
| Refresh Token expirado (7 días) | Mostrar modal de reauth o redirigir a login |
| Usuario cierra sesión | Llamar `POST /auth/logout` y limpiar localStorage |

---

## Datos a Guardar en Frontend

| Dato | Fuente | Uso |
|------|--------|-----|
| `token` | Response de login | Header `Authorization` |
| `usuarioId` | Decodificar JWT | Para refresh y logout |
| `sessionId` | Decodificar JWT | Para refresh, reauth y logout |
| `usuario` | Response de login | Para mostrar en UI y reauth |

---

**Última actualización:** 2025-11-28
