import axios from "axios";
import { parseTiptapContent } from "@/lib/tiptap-content";

// Lê em tempo de execução, não de build
const getAPIBaseURL = () => {
  // Prefer explicit env var
  if (import.meta.env.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL;

  // In development assume backend runs on localhost:8080
  // This avoids requests being sent to the vite dev server origin
  if (import.meta.env.DEV) return "http://localhost:8080";

  // In production use the same origin
  if (typeof window !== "undefined") return `${window.location.protocol}//${window.location.host}`;

  // Fallback
  return "http://localhost:8080";
};

const API_BASE_URL = getAPIBaseURL();

export const ACCESS_TOKEN_KEY = "access_token";
export const REFRESH_TOKEN_KEY = "refresh_token";

const getStoredToken = (key: string) => {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(key) ?? localStorage.getItem(key);
};

export const setAuthTokens = (accessToken: string, _refreshToken?: string) => {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

export const clearAuthTokens = () => {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

export const getAccessToken = () => getStoredToken(ACCESS_TOKEN_KEY);
export const getRefreshToken = () => getStoredToken(REFRESH_TOKEN_KEY);

export const parseTokensFromUrl = () => {
  if (typeof window === "undefined") return null;

  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  const getValue = (key: string) => searchParams.get(key) ?? hashParams.get(key);
  const accessToken = getValue("access_token") ?? getValue("token") ?? getValue("jwt");
  const refreshToken = getValue("refresh_token");

  if (!accessToken) return null;

  return { accessToken, refreshToken };
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeNoteContent = (content: unknown) => parseTiptapContent(content);

const normalizeSearchResults = (payload: unknown) => {
  if (!isRecord(payload)) {
    return [];
  }

  const notes = Array.isArray(payload.notes) ? payload.notes : [];
  const entities = Array.isArray(payload.entities) ? payload.entities : [];

  return [
    ...notes.flatMap((note) =>
      isRecord(note) && typeof note.id === "string" && typeof note.title === "string"
        ? [{ id: note.id, type: "NOTE" as const, title: note.title }]
        : []
    ),
    ...entities.flatMap((entity) =>
      isRecord(entity) && typeof entity.id === "string" && typeof entity.title === "string"
        ? [{
            id: entity.id,
            type: "ENTITY" as const,
            title: entity.title,
            snippet: typeof entity.description === "string" ? entity.description : undefined,
          }]
        : []
    ),
  ];
};

// Interceptor: attach JWT (skip only login and registration endpoints)
api.interceptors.request.use((config) => {
  const url = config.url ?? "";
  const skipAuth =
    url === "/api/auth/login" ||
    url === "/api/auth/register" ||
    url === "/api/auth/refresh" ||
    url === "/api/auth/google/callback";
  if (!skipAuth) {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

/**
 * Gerenciador de Refresh Token com fila de requisições
 * 
 * Problema: Se múltiplas requisições falham com 401 simultaneamente,
 * todas tentariam fazer refresh ao mesmo tempo.
 * 
 * Solução: Apenas a primeira faz refresh, as outras aguardam na fila.
 */
class RefreshTokenManager {
  private isRefreshing = false;
  private refreshPromise: Promise<string | null> | null = null;
  private failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: unknown) => void;
  }> = [];

  /**
   * Processa a fila de requisições com o novo token
   */
  private processQueue(newAccessToken: string) {
    this.failedQueue.forEach((prom) => {
      prom.resolve(newAccessToken);
    });
    this.failedQueue = [];
  }

  /**
   * Rejeita todas as requisições na fila
   */
  private rejectQueue(error: unknown) {
    this.failedQueue.forEach((prom) => {
      prom.reject(error);
    });
    this.failedQueue = [];
  }

  /**
   * Tenta renovar o access token
   * Usa Promise caching para evitar múltiplas requisições simultâneas
   */
  async refresh(): Promise<string | null> {
    // Se já está fazendo refresh, retorna a promise existente
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;

    try {
      this.refreshPromise = this.doRefresh();
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
      this.isRefreshing = false;
    }
  }

  /**
   * Executa a requisição de refresh propriamente dita
   */
  private async doRefresh(): Promise<string | null> {
    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      console.warn("[RefreshTokenManager] Refresh token não encontrado");
      return null;
    }

    try {
      console.log("[RefreshTokenManager] Iniciando refresh de token");

      // Usa axios diretamente para evitar interceptadores (senão cria loop)
      const { data } = await axios.post<{
        accessToken: string;
        refreshToken?: string;
        expiresIn?: number;
      }>(
        `${API_BASE_URL}/api/auth/refresh`,
        {},
        {
          timeout: 5000,
          withCredentials: true,
          headers: { "Content-Type": "application/json" },
        }
      );

      if (data.accessToken) {
        console.log("[RefreshTokenManager] Token renovado com sucesso");
        
        // Atualiza tokens (pode vir novo refresh token por rotation)
        setAuthTokens(data.accessToken, data.refreshToken);

        // Processa fila de requisições
        this.processQueue(data.accessToken);

        return data.accessToken;
      }

      return null;
    } catch (error) {
      console.error("[RefreshTokenManager] Erro ao fazer refresh:", error);

      // Rejeita todas as requisições na fila
      this.rejectQueue(error);

      // Limpa tokens e dispara logout
      clearAuthTokens();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:logout"));
      }

      return null;
    }
  }

  /**
   * Adiciona requisição à fila enquanto token está sendo renovado
   */
  waitForToken(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.failedQueue.push({ resolve, reject });
    });
  }

  /**
   * Reseta estado (útil para logout manual)
   */
  reset() {
    this.isRefreshing = false;
    this.refreshPromise = null;
    this.failedQueue = [];
  }
}

const refreshTokenManager = new RefreshTokenManager();

// Interceptor: refresh token on 401 only.
// 403 is treated as authorization/business error (e.g., PlanLimitException) and MUST NOT log the user out.
// On refresh failure we just clear tokens and emit an event — the AuthContext reacts without a hard reload.
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const url: string = original?.url ?? "";
    const isAuthEndpoint =
      url.startsWith("/api/auth/login") ||
      url.startsWith("/api/auth/register") ||
      url.startsWith("/api/auth/refresh") ||
      url.startsWith("/api/auth/google");

    if (status === 401 && !original?._retry && !isAuthEndpoint) {
      original._retry = true;

      try {
        // Inicia refresh (múltiplas requisições compartilham a mesma promise)
        const newAccessToken = await refreshTokenManager.refresh();

        if (!newAccessToken) {
          console.error("[API] Refresh falhou, rejeitando requisição");
          return Promise.reject(error);
        }

        // Se estava na fila, aguarda seu turno
        if (refreshTokenManager["failedQueue"].length > 0) {
          console.log("[API] Requisição aguardando na fila de refresh");
          await refreshTokenManager.waitForToken();
        }

        // Atualiza header com novo token
        original.headers.Authorization = `Bearer ${newAccessToken}`;

        // Retenta requisição original com novo token
        console.log("[API] Retentando requisição original com novo token");
        return api(original);
      } catch (refreshError) {
        console.error("[API] Erro durante refresh e retry:", refreshError);
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Event listener para sincronizar logout entre abas/janelas
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === ACCESS_TOKEN_KEY && !event.newValue) {
      console.log("[API] Logout detectado em outra aba, limpando estado local");
      refreshTokenManager.reset();
    }
  });

  // Listener para logout manual
  window.addEventListener("auth:logout", () => {
    refreshTokenManager.reset();
  });
}

// --- AUTH API CORRIGIDA ---
export const authApi = {
  login: (email: string, password: string) =>
    api.post("/api/auth/login", { email, password }),
  register: (username: string, email: string, password: string) =>
    api.post("/api/auth/register", { username, email, password }),
  googleStart: () => api.get("/api/auth/google/url"),
  
  // O backend ignora este redirectUri e usa o que ele mesmo enviou ao Google
  // (assinado dentro do state). Mandamos só para satisfazer a validação @NotBlank.
  googleCallback: (code: string, state?: string) =>
    api.post("/api/auth/google/callback", {
      code,
      state,
      redirectUri: window.location.origin + "/google-callback",
    }),

  logout: () => api.post("/api/auth/logout", {}),
  me: () => api.get("/api/auth/me"),
  updateMe: (data: Record<string, string>) => api.patch("/api/account/me", data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post("/api/account/password/change", { currentPassword, newPassword }),
  forgotPassword: (email: string) =>
    api.post("/api/account/password/forgot", { email }),
  resetPassword: (token: string, password: string) =>
    api.post("/api/account/password/reset", { token, password }),
  verifyEmail: (token: string) =>
    api.get("/api/auth/verify-email", { params: { token } }),
  resendVerification: (email: string) =>
    api.post("/api/auth/resend-verification", { email }),
  exportData: () => api.get("/api/account/export"),
};

// --- RESTANTE DOS ENDPOINTS (Notes, Folders, etc) ---
export const notesApi = {
  list: () => api.get("/api/notes"),
  get: (id: string) => api.get(`/api/notes/${id}`),
  create: (title: string, content: unknown, folderId?: string, _entityIds?: string[], type?: string) =>
    api.post("/api/notes", {
      title,
      content: normalizeNoteContent(content),
      folderId,
      type,
    }),
  update: (id: string, data: { title?: string; content?: unknown; folderId?: string; entityIds?: string[]; type?: string }) => {
    const payload: Record<string, unknown> = {};
    if (typeof data.title === "string") payload.title = data.title;
    if (typeof data.folderId === "string") payload.folderId = data.folderId;
    if (typeof data.type === "string") payload.type = data.type;
    if (Object.prototype.hasOwnProperty.call(data, "content")) {
      payload.content = normalizeNoteContent(data.content);
    }
    return api.put(`/api/notes/${id}`, payload);
  },
  delete: (id: string) => api.delete(`/api/notes/${id}`),
  toggleFavorite: (id: string) => api.patch(`/api/notes/${id}/favorite`),
  getBacklinks: (id: string) => api.get(`/api/notes/${id}/backlinks`),
  getTypes: () => api.get("/api/notes/types"),
};

export const foldersApi = {
  list: () => api.get("/api/folders"),
  create: (name: string, parentId?: string) =>
    api.post("/api/folders", { name, parentId }),
  rename: (id: string, name: string) =>
    api.patch(`/api/folders/${id}/rename`, { name }),
  delete: (id: string) => api.delete(`/api/folders/${id}`),
};

export const entitiesApi = {
  list: (params?: { page?: number; size?: number }) =>
    api.get("/api/entities", { params }).then((response) => {
      if (Array.isArray(response.data)) return response;
      const pageData = response.data as Record<string, unknown> | null;
      if (pageData && Array.isArray(pageData.content)) {
        response.data = pageData.content;
      } else {
        response.data = [];
      }
      return response;
    }),
  get: (id: string) => api.get(`/api/entities/${id}`),
  create: (title: string, type: string, description?: string) =>
    api.post("/api/entities", { title, type, description }),
  update: (id: string, data: { title?: string; type?: string; description?: string }) =>
    api.put(`/api/entities/${id}`, data),
  delete: (id: string) => api.delete(`/api/entities/${id}`),
  getNotes: (id: string) => api.get(`/api/entities/${id}/notes`),
  getConnections: (id: string) => api.get(`/api/entities/${id}/connections`),
  getContext: (id: string) => api.get(`/api/entities/${id}/context`),
  track: (entityId: string) => api.post(`/api/entities/${entityId}/track-activity`),
  untrack: (entityId: string, date: string) =>
    api.delete(`/api/entities/${entityId}/track`, { params: { date } }),
  stats: (entityId: string) => api.get(`/api/entities/${entityId}/stats`),
  heatmap: (entityId: string, from?: string, to?: string) =>
    api.get(`/api/entities/${entityId}/heatmap`, { params: { from, to } }),
};

export const metricsApi = {
  dashboard: () => api.get("/api/metrics/dashboard"),
  timeline: (entityId: string) => api.get(`/api/metrics/entities/${entityId}/timeline`),
  scoreTimeline: () => api.get("/api/metrics/score/timeline", { timeout: 15000 }),
  usage: (month: number, year: number) => api.get("/api/metrics/usage", { params: { month, year } }),
};

export const dashboardApi = {
  summary: () => api.get("/api/dashboard/summary", { timeout: 15000 }),
};

export const searchApi = {
  search: (q: string) =>
    api.get("/api/search", { params: { q } }).then((response) => {
      response.data = normalizeSearchResults(response.data);
      return response;
    }),
};

export const graphApi = {
  data: () => api.get("/api/graph/data"),
};

export const trackingApi = {
  today: () => api.get("/api/tracking/today"),
};

export const subscriptionApi = {
  me: () => api.get("/api/subscriptions/me"),
  // Accepts either a Lemon Squeezy variant id (var_xxx) or a plan code ("VISION").
  checkout: (priceOrPlan: string) =>
    api.post("/api/subscriptions/checkout", { priceId: priceOrPlan, planId: priceOrPlan }),
  cancel: () => api.post("/api/subscriptions/cancel"),
};

export const plansApi = {
  list: () => api.get("/api/plans"),
};

export const vaultApi = {
  list: () => api.get("/api/vault/files"),
  upload: (form: FormData) => api.post("/api/vault/files", form, {
    headers: { "Content-Type": "multipart/form-data" },
    transformRequest: [(data) => data],
  }),
  download: (fileId: string) => api.get(`/api/vault/files/${encodeURIComponent(fileId)}`, { responseType: "blob" }),
  delete: (fileId: string) => api.delete(`/api/vault/files/${encodeURIComponent(fileId)}`),
  entityIndex: () => api.get("/api/vault/entity-index"),
};

export const timeTrackingApi = {
  startTimer: (entityId: string) => api.post("/api/time-tracking/start", { entityId }),
  stopTimer: (sessionId: string, note?: string) => api.post("/api/time-tracking/stop", { sessionId, note: note || null }),
  addTime: (entityId: string, date: string, durationSeconds: number, note?: string) => 
    api.post("/api/time-tracking/add", { entityId, date, durationSeconds, note }),
  getTotalTime: (entityId: string) => api.get(`/api/time-tracking/${entityId}/total`),
  getDailyBreakdown: (entityId: string) => api.get(`/api/time-tracking/${entityId}/daily`),
  getTimeInRange: (entityId: string, from: string, to: string) => 
    api.get(`/api/time-tracking/${entityId}/range`, { params: { from, to } }),
  getAllSummaries: () => api.get("/api/time-tracking/summary/all"),
  getActiveTimer: (entityId: string) => api.get(`/api/time-tracking/${entityId}/active`),
  getAllActiveTimers: () => api.get("/api/time-tracking/active/all"),
  deleteEntry: (entryId: string) => api.delete(`/api/time-tracking/${entryId}`),
  recoverSession: (entityId: string) => api.post(`/api/time-tracking/${entityId}/recover`),
};

export const insightsApi = {
  hotNotes: (limit = 10) => api.get("/api/insights/notes/hot", { params: { limit } }),
  forgottenNotes: (limit = 10) => api.get("/api/insights/notes/forgotten", { params: { limit } }),
  hotEntities: (limit = 10) => api.get("/api/insights/entities/hot", { params: { limit } }),
  forgottenEntities: (limit = 10) => api.get("/api/insights/entities/forgotten", { params: { limit } }),
};

export default api;