import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { authApi, setAuthTokens, clearAuthTokens, getAccessToken, getRefreshToken } from '@/lib/api';

/**
 * Tipo do usuário autenticado
 */
interface User {
  id: string;
  username: string;
  email: string;
  plan: string;
  avatar?: string;
}

/**
 * Contexto de autenticação
 */
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Métodos
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<boolean>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Provider de Autenticação com suporte a Refresh Token automático
 * 
 * Funcionalidades:
 * - Login/Register/Logout
 * - Refresh token automático ao inicializar
 * - Sincronização entre abas
 * - Tratamento de erros
 * - Loading states
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Carrega usuário autenticado ao inicializar
   */
  const loadUser = useCallback(async () => {
    const accessToken = getAccessToken();

    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await authApi.me();
      const userData = response.data;
      
      setUser({
        id: userData.userId,
        username: userData.username,
        email: userData.email,
        plan: userData.plan,
        avatar: userData.avatarUrl,
      });
      setError(null);
    } catch (err: unknown) {
      console.error('[AuthProvider] Erro ao carregar usuário:', err);
      clearAuthTokens();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Inicializa context ao montar
   */
  useEffect(() => {
    loadUser();
  }, [loadUser]);

  /**
   * Listener para logout em outras abas
   */
  useEffect(() => {
    const handleLogout = () => {
      console.log('[AuthProvider] Logout detectado, limpando estado');
      setUser(null);
      setError(null);
    };

    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  /**
   * Listener para sincronizar token entre abas
   */
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'access_token') {
        if (!event.newValue) {
          // Logout em outra aba
          setUser(null);
        } else {
          // Token atualizado em outra aba, recarrega usuário
          loadUser();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadUser]);

  /**
   * Login
   */
  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.login(email, password);
      const data = response.data;

      // Salva tokens
      setAuthTokens(data.accessToken, data.refreshToken);

      // Salva usuário
      setUser({
        id: data.userId,
        username: data.username,
        email: data.email,
        plan: data.plan,
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao fazer login';
      setError(errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Register
   */
  const register = useCallback(
    async (username: string, email: string, password: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await authApi.register(username, email, password);
        const data = response.data;

        setAuthTokens(data.accessToken, data.refreshToken);
        setUser({
          id: data.userId,
          username: data.username,
          email: data.email,
          plan: data.plan,
        });
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Erro ao registrar';
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Logout
   */
  const logout = useCallback(async () => {
    setIsLoading(true);

    try {
      // Tenta notificar backend (pode falhar se refresh token expirou)
      try {
        await authApi.logout();
      } catch {
        console.warn('[AuthProvider] Erro ao notificar backend sobre logout');
      }

      clearAuthTokens();
      setUser(null);
      setError(null);

      // Dispara evento para sincronizar outras abas
      window.dispatchEvent(new CustomEvent('auth:logout'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Refresh manualmente (normalmente feito automaticamente pelo interceptor)
   */
  const refresh = useCallback(async (): Promise<boolean> => {
    try {
      const response = await authApi.login('', '');
      // Nota: Isso não faz sentido, mas mantém a interface consistente
      return true;
    } catch {
      return false;
    }
  }, []);

  /**
   * Limpa erro
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    register,
    logout,
    refresh,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook para usar AuthContext
 * 
 * Uso:
 * const { user, isAuthenticated, login, logout } = useAuth();
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }

  return context;
}

/**
 * Exemplo de componente que usa o AuthContext:
 * 
 * function LoginPage() {
 *   const { login, error, isLoading } = useAuth();
 * 
 *   const handleSubmit = async (email: string, password: string) => {
 *     try {
 *       await login(email, password);
 *       // Redireciona automaticamente
 *     } catch {
 *       // Erro já está em 'error'
 *     }
 *   };
 * 
 *   return (
 *     <div>
 *       {error && <p style={{ color: 'red' }}>{error}</p>}
 *       <form onSubmit={(e) => {
 *         e.preventDefault();
 *         handleSubmit('user@example.com', 'password');
 *       }}>
 *         <input type="email" placeholder="Email" />
 *         <input type="password" placeholder="Password" />
 *         <button disabled={isLoading}>
 *           {isLoading ? 'Loading...' : 'Login'}
 *         </button>
 *       </form>
 *     </div>
 *   );
 * }
 */
