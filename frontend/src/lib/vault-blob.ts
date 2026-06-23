import { vaultApi } from "@/lib/api";
import { idbGet, idbPut, STORES } from "@/lib/offline/db";

const blobCache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();

interface PersistedBlob {
  id: string;
  blob: Blob;
  contentType: string;
  savedAt: number;
}

export async function resolveVaultBlob(fileId: string): Promise<string> {
  const cached = blobCache.get(fileId);
  if (cached) return cached;
  const inFlight = pending.get(fileId);
  if (inFlight) return inFlight;

  const p = (async () => {
    try {
      const res = await vaultApi.download(fileId);
      const blob = res.data as Blob;
      try {
        const persisted: PersistedBlob = {
          id: fileId,
          blob,
          contentType: blob.type || "application/octet-stream",
          savedAt: Date.now(),
        };
        await idbPut(STORES.WALLPAPERS, persisted);
      } catch { /* quota / unavailable */ }
      const url = URL.createObjectURL(blob);
      blobCache.set(fileId, url);
      return url;
    } catch (err) {
      // Offline / network failure — fall back to persisted blob if any.
      try {
        const persisted = await idbGet<PersistedBlob>(STORES.WALLPAPERS, fileId);
        if (persisted?.blob) {
          const url = URL.createObjectURL(persisted.blob);
          blobCache.set(fileId, url);
          return url;
        }
      } catch { /* ignore */ }
      throw err;
    }
  })();
  pending.set(fileId, p);
  try {
    return await p;
  } finally {
    pending.delete(fileId);
  }
}

export function invalidateVaultBlob(fileId: string) {
  const url = blobCache.get(fileId);
  if (url) {
    URL.revokeObjectURL(url);
    blobCache.delete(fileId);
  }
  // Best-effort drop from persistent cache too.
  void (async () => {
    try {
      const { idbDelete } = await import("@/lib/offline/db");
      await idbDelete(STORES.WALLPAPERS, fileId);
    } catch { /* ignore */ }
  })();
}
