import { useCallback } from 'react';
import api from '@/lib/api';
import type { AxiosRequestConfig } from 'axios';

/**
 * Hook customizado para fazer requisições com Axios + gerenciamento de token automático
 * 
 * Recursos:
 * - Adiciona accessToken automaticamente no header
 * - Intercepta 401 e faz refresh automático
 * - Trata fila de requisições simultâneas
 * - TypeScript com genéricos para type-safety
 * 
 * Uso:
 * const { request, loading, error } = useApi();
 * 
 * const fetchNotes = async () => {
 *   const data = await request<NotesResponse>('/api/notes');
 *   console.log(data);
 * };
 */

interface UseApiOptions {
  /** Callback para quando o token refresh falhar e fazer logout */
  onLogoutRequired?: () => void;
  /** Callback para sucesso */
  onSuccess?: (data: unknown) => void;
  /** Callback para erro */
  onError?: (error: unknown) => void;
}

/**
 * Hook useApi - Wrapper robusto do Axios com token management
 */
export function useApi(options?: UseApiOptions) {
  /**
   * Faz requisição com Axios (token é adicionado automaticamente)
   */
  const request = useCallback(
    async <T = unknown>(
      url: string,
      config?: AxiosRequestConfig
    ): Promise<T | null> => {
      try {
        const response = await api.get<T>(url, config);
        options?.onSuccess?.(response.data);
        return response.data;
      } catch (error) {
        console.error('[useApi] Erro na requisição:', error);
        options?.onError?.(error);
        return null;
      }
    },
    [options]
  );

  /**
   * POST request
   */
  const post = useCallback(
    async <T = unknown>(
      url: string,
      data?: unknown,
      config?: AxiosRequestConfig
    ): Promise<T | null> => {
      try {
        const response = await api.post<T>(url, data, config);
        options?.onSuccess?.(response.data);
        return response.data;
      } catch (error) {
        console.error('[useApi] Erro no POST:', error);
        options?.onError?.(error);
        return null;
      }
    },
    [options]
  );

  /**
   * PATCH request
   */
  const patch = useCallback(
    async <T = unknown>(
      url: string,
      data?: unknown,
      config?: AxiosRequestConfig
    ): Promise<T | null> => {
      try {
        const response = await api.patch<T>(url, data, config);
        options?.onSuccess?.(response.data);
        return response.data;
      } catch (error) {
        console.error('[useApi] Erro no PATCH:', error);
        options?.onError?.(error);
        return null;
      }
    },
    [options]
  );

  /**
   * DELETE request
   */
  const remove = useCallback(
    async <T = unknown>(
      url: string,
      config?: AxiosRequestConfig
    ): Promise<T | null> => {
      try {
        const response = await api.delete<T>(url, config);
        options?.onSuccess?.(response.data);
        return response.data;
      } catch (error) {
        console.error('[useApi] Erro no DELETE:', error);
        options?.onError?.(error);
        return null;
      }
    },
    [options]
  );

  return {
    request,
    post,
    patch,
    delete: remove,
    api, // Expõe instância do axios se precisar fazer requisições avançadas
  };
}

/**
 * Exemplo de uso em componente React:
 * 
 * function MyComponent() {
 *   const { post } = useApi({
 *     onSuccess: (data) => console.log('Sucesso:', data),
 *     onError: (error) => console.error('Erro:', error)
 *   });
 * 
 *   const handleCreateNote = async () => {
 *     const newNote = await post('/api/notes', {
 *       title: 'Nova Nota',
 *       content: 'Conteúdo'
 *     });
 *     
 *     if (newNote) {
 *       console.log('Nota criada:', newNote);
 *     }
 *   };
 * 
 *   return <button onClick={handleCreateNote}>Criar Nota</button>;
 * }
 */
