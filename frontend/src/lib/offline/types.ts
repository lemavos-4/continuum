export type SyncOp = "POST" | "PUT" | "PATCH" | "DELETE";

export interface QueuedRequest {
  id?: number; // autoincrement
  method: SyncOp;
  url: string;
  data?: unknown;
  /** Authentication and other essential headers */
  headers?: Record<string, string>;
  /** Optional URL pattern hint for cache invalidation, e.g. "/api/notes". */
  resourceKey?: string;
  /** Best-effort entity id (if known). */
  entityId?: string;
  /** Wall-clock ms when the user performed the action — used for LWW. */
  clientUpdatedAt: number;
  createdAt: number;
  status: "pending" | "in-flight" | "failed";
  retryCount: number;
  lastError?: string;
}

export type OfflineStatus = "online" | "offline" | "syncing" | "error";

export interface CachedGetEntry {
  url: string;
  status: number;
  data: unknown;
  savedAt: number;
}
