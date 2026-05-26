# 🖥️ Exemplos de Cliente: Refresh Token Integration

## 1️⃣ JavaScript/TypeScript (Fetch API)

### Armazenar Tokens

```typescript
// Após login, guardar tokens
const loginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com', password: 'pass' })
});

const { accessToken, refreshToken } = await loginResponse.json();

// Estratégia 1: LocalStorage (simples, menos seguro)
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('refreshToken', refreshToken);

// Estratégia 2: Cookie HttpOnly (recomendado)
// O servidor define automaticamente via Set-Cookie header
// Cliente não consegue acessar (seguro contra XSS)
```

### Interceptor de Requisições

```typescript
/**
 * Interceptor que:
 * 1. Adiciona accessToken a todas as requisições
 * 2. Se receber 401, faz refresh automaticamente
 * 3. Retenta a requisição original com novo token
 */
class TokenManager {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private isRefreshing = false;
  private refreshQueue: ((token: string) => void)[] = [];

  constructor() {
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  /**
   * Faz requisição com token automático
   */
  async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    // 1. Adiciona token
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${this.accessToken}`
    };

    let response = await fetch(url, { ...options, headers });

    // 2. Se 401, tenta refresh
    if (response.status === 401 && this.refreshToken) {
      const newToken = await this.refreshAccessToken();
      
      if (newToken) {
        // 3. Retenta com novo token
        headers['Authorization'] = `Bearer ${newToken}`;
        response = await fetch(url, { ...options, headers });
      }
    }

    return response;
  }

  /**
   * Faz refresh do access token
   */
  private async refreshAccessToken(): Promise<string | null> {
    // Evita múltiplas requisições simultâneas de refresh
    if (this.isRefreshing) {
      return new Promise(resolve => {
        this.refreshQueue.push((token) => resolve(token));
      });
    }

    this.isRefreshing = true;

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
        credentials: 'include' // Se usar cookies
      });

      if (!response.ok) {
        // Refresh falhou, faz logout
        this.logout();
        return null;
      }

      const { accessToken } = await response.json();
      this.accessToken = accessToken;
      localStorage.setItem('accessToken', accessToken);

      // Processa fila de requisições
      this.refreshQueue.forEach(cb => cb(accessToken));
      this.refreshQueue = [];

      return accessToken;

    } catch (error) {
      console.error('Erro ao fazer refresh:', error);
      this.logout();
      return null;
    } finally {
      this.isRefreshing = false;
    }
  }

  setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  logout() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  }
}

export const tokenManager = new TokenManager();
```

### Uso no Aplicativo

```typescript
// Em vez de usar fetch diretamente, usar tokenManager
const response = await tokenManager.fetch('/api/auth/me');
const userData = await response.json();

// Ou com mais opções
const response = await tokenManager.fetch('/api/notes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title: 'My Note' })
});
```

---

## 2️⃣ React com Hooks

### Hook useAuth

```typescript
// hooks/useAuth.ts
import { useState, useCallback, useEffect } from 'react';

interface AuthContextType {
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<boolean>;
}

export function useAuth(): AuthContextType {
  const [accessToken, setAccessToken] = useState<string | null>(
    localStorage.getItem('accessToken')
  );
  const [refreshToken, setRefreshToken] = useState<string | null>(
    localStorage.getItem('refreshToken')
  );
  const [isLoading, setIsLoading] = useState(false);

  // Login
  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) throw new Error('Login failed');

      const { accessToken, refreshToken } = await response.json();
      setAccessToken(accessToken);
      setRefreshToken(refreshToken);
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
    } finally {
      setAccessToken(null);
      setRefreshToken(null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }, [accessToken]);

  // Refresh
  const refresh = useCallback(async (): Promise<boolean> => {
    if (!refreshToken) return false;

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        credentials: 'include'
      });

      if (!response.ok) {
        logout();
        return false;
      }

      const { accessToken: newToken } = await response.json();
      setAccessToken(newToken);
      localStorage.setItem('accessToken', newToken);
      return true;
    } catch {
      logout();
      return false;
    }
  }, [refreshToken, logout]);

  return { accessToken, isLoading, login, logout, refresh };
}
```

### Hook useApi (com Refresh Automático)

```typescript
// hooks/useApi.ts
import { useCallback } from 'react';
import { useAuth } from './useAuth';

export function useApi() {
  const { accessToken, refresh } = useAuth();

  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`
    };

    let response = await fetch(url, { ...options, headers });

    // Se 401 e temos refresh token, tenta novamente
    if (response.status === 401) {
      const refreshed = await refresh();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${accessToken}`;
        response = await fetch(url, { ...options, headers });
      }
    }

    return response;
  }, [accessToken, refresh]);

  return { fetchWithAuth };
}
```

### Uso em Componente

```typescript
function MyComponent() {
  const { accessToken, login, logout } = useAuth();
  const { fetchWithAuth } = useApi();

  const handleLogin = async () => {
    await login('user@example.com', 'password');
  };

  const handleFetchData = async () => {
    const response = await fetchWithAuth('/api/notes');
    const data = await response.json();
    console.log(data);
  };

  return (
    <div>
      {!accessToken ? (
        <button onClick={handleLogin}>Login</button>
      ) : (
        <>
          <button onClick={handleFetchData}>Fetch Notes</button>
          <button onClick={logout}>Logout</button>
        </>
      )}
    </div>
  );
}
```

---

## 3️⃣ Axios com Interceptor

```typescript
// api/axios.ts
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080'
});

let isRefreshing = false;
let failedQueue: ((token: string) => void)[] = [];

const processQueue = (token: string) => {
  failedQueue.forEach(cb => cb(token));
  failedQueue = [];
};

// Response interceptor
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;

        try {
          const refreshToken = localStorage.getItem('refreshToken');
          const response = await axios.post('/api/auth/refresh', {
            refreshToken
          });

          const { accessToken } = response.data;
          localStorage.setItem('accessToken', accessToken);

          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
          originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;

          processQueue(accessToken);
          return api(originalRequest);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
          return Promise.reject(error);
        } finally {
          isRefreshing = false;
        }
      }

      return new Promise(resolve => {
        failedQueue.push((token) => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          resolve(api(originalRequest));
        });
      });
    }

    return Promise.reject(error);
  }
);

export default api;
```

### Uso

```typescript
import api from '@/api/axios';

const fetchNotes = async () => {
  const response = await api.get('/api/notes');
  return response.data;
};
```

---

## 4️⃣ SvelteKit

```svelte
<!-- src/lib/stores/auth.ts -->
<script context="module" lang="ts">
  import { writable } from 'svelte/store';

  interface AuthState {
    accessToken: string | null;
    refreshToken: string | null;
    user: any | null;
  }

  const createAuthStore = () => {
    const { subscribe, set, update } = writable<AuthState>({
      accessToken: null,
      refreshToken: null,
      user: null
    });

    return {
      subscribe,
      
      login: async (email: string, password: string) => {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        update(state => ({
          ...state,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          user: { id: data.userId, email: data.email }
        }));
      },

      logout: async () => {
        set({ accessToken: null, refreshToken: null, user: null });
      },

      refresh: async () => {
        let token: string | null = null;
        const unsubscribe = subscribe(state => {
          token = state.refreshToken;
        });

        try {
          const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: token })
          });

          const data = await response.json();
          update(state => ({ ...state, accessToken: data.accessToken }));
        } finally {
          unsubscribe();
        }
      }
    };
  };

  export const auth = createAuthStore();
</script>
```

---

## 5️⃣ Angular com HttpInterceptor

```typescript
// auth.interceptor.ts
import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, take, switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.authService.getAccessToken();
    
    if (token) {
      request = this.addToken(request, token);
    }

    return next.handle(request).pipe(
      catchError(error => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          return this.handle401Error(request, next);
        }
        return throwError(() => error);
      })
    );
  }

  private addToken(request: HttpRequest<any>, token: string) {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  private handle401Error(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      const refreshToken = this.authService.getRefreshToken();

      if (refreshToken) {
        return this.authService.refreshToken(refreshToken).pipe(
          switchMap((response: any) => {
            this.isRefreshing = false;
            this.refreshTokenSubject.next(response.accessToken);
            return next.handle(this.addToken(request, response.accessToken));
          }),
          catchError(err => {
            this.isRefreshing = false;
            this.authService.logout();
            return throwError(() => err);
          })
        );
      }
    }

    return this.refreshTokenSubject.pipe(
      filter(token => token != null),
      take(1),
      switchMap(token => {
        return next.handle(this.addToken(request, token));
      })
    );
  }
}
```

---

## 6️⃣ Vue 3 com Composables

```typescript
// composables/useAuth.ts
import { ref, computed } from 'vue';

const accessToken = ref<string | null>(localStorage.getItem('accessToken'));
const refreshToken = ref<string | null>(localStorage.getItem('refreshToken'));

export function useAuth() {
  const isAuthenticated = computed(() => !!accessToken.value);

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    accessToken.value = data.accessToken;
    refreshToken.value = data.refreshToken;
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
  };

  const logout = () => {
    accessToken.value = null;
    refreshToken.value = null;
    localStorage.clear();
  };

  const refresh = async () => {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refreshToken.value })
    });

    const data = await response.json();
    accessToken.value = data.accessToken;
    localStorage.setItem('accessToken', data.accessToken);
  };

  const fetchWithAuth = async (url: string, options: any = {}) => {
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${accessToken.value}`
    };

    let response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      await refresh();
      headers['Authorization'] = `Bearer ${accessToken.value}`;
      response = await fetch(url, { ...options, headers });
    }

    return response;
  };

  return {
    accessToken,
    refreshToken,
    isAuthenticated,
    login,
    logout,
    refresh,
    fetchWithAuth
  };
}
```

---

## ⚠️ Melhores Práticas

### ✅ Faça

```typescript
// 1. Guardar em localStorage com segurança
localStorage.setItem('accessToken', token);

// 2. Enviar Authorization header correto
headers: { 'Authorization': `Bearer ${token}` }

// 3. Implementar retry automático
if (response.status === 401) {
  const newToken = await refreshToken();
  // Retenta requisição
}

// 4. Queue de requisições durante refresh
failedQueue.push(() => retryRequest());

// 5. Logout em caso de erro
if (refreshFailed) {
  logout();
  redirectToLogin();
}
```

### ❌ Não Faça

```typescript
// ❌ Guardar em variável global
let globalToken = token;  // Perde ao recarregar

// ❌ Header inválido
headers: { 'Authorization': token }  // Falta "Bearer"

// ❌ Múltiplas requisições simultâneas de refresh
Promise.all([refresh(), refresh(), refresh()]);

// ❌ Deixar token expirado sem feedback
// Fazer refresh proativamente antes de expirar

// ❌ Enviar refresh token no localStorage sem HTTPS
// Usar HttpOnly cookies ou Secure Storage
```

---

## 🔗 Recursos Úteis

- [MDN: Authorization Header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Authorization)
- [StackOverflow: Access Token Refresh](https://stackoverflow.com/questions/26739167)
- [Auth0: Refresh Tokens](https://auth0.com/learn/refresh-tokens)

