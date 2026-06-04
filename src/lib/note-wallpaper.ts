import { preferencesApi, vaultApi } from "@/lib/api";
import { invalidateVaultBlob, resolveVaultBlob } from "@/lib/vault-blob";

export interface NoteWallpaperSettings {
  fileId: string | null;
  blur: number;       // 0 - 40 (px)
  brightness: number; // 20 - 150 (%)
}

export const DEFAULT_WALLPAPER: NoteWallpaperSettings = {
  fileId: null,
  blur: 0,
  brightness: 100,
};

const listeners = new Set<(s: NoteWallpaperSettings) => void>();

let cache: NoteWallpaperSettings = { ...DEFAULT_WALLPAPER };
let loaded = false;
let loadPromise: Promise<NoteWallpaperSettings> | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingPayload: NoteWallpaperSettings | null = null;

function normalize(raw: any): NoteWallpaperSettings {
  const wp = raw?.wallpaper ?? raw ?? {};
  return {
    fileId: typeof wp?.fileId === "string" ? wp.fileId : null,
    blur: Number.isFinite(wp?.blur) ? Math.max(0, Math.min(40, Number(wp.blur))) : 0,
    brightness: Number.isFinite(wp?.brightness)
      ? Math.max(20, Math.min(150, Number(wp.brightness)))
      : 100,
  };
}

/**
 * Synchronously returns the current cached settings.
 * Triggers a background fetch from the server on first call so consumers
 * automatically receive the persisted value via `subscribeWallpaper`.
 */
export function loadWallpaperSettings(): NoteWallpaperSettings {
  if (!loaded && !loadPromise) {
    loadPromise = (async () => {
      try {
        const res = await preferencesApi.get();
        const data: any = typeof res.data === "string" ? safeParse(res.data) : res.data;
        cache = normalize(data);
      } catch {
        cache = { ...DEFAULT_WALLPAPER };
      } finally {
        loaded = true;
        listeners.forEach((l) => l(cache));
      }
      return cache;
    })();
  }
  return cache;
}

/** Ensures the cached value reflects the server value before continuing. */
export async function ensureWallpaperLoaded(): Promise<NoteWallpaperSettings> {
  loadWallpaperSettings();
  if (loadPromise) {
    try { await loadPromise; } catch { /* ignore */ }
  }
  return cache;
}

function safeParse(s: string): any {
  try { return JSON.parse(s); } catch { return {}; }
}

async function flushServerSave(payload: NoteWallpaperSettings): Promise<void> {
  try {
    let existing: any = {};
    try {
      const res = await preferencesApi.get();
      existing = typeof res.data === "string" ? safeParse(res.data) : (res.data ?? {});
    } catch { /* ignore */ }
    const next = {
      ...(existing && typeof existing === "object" ? existing : {}),
      wallpaper: payload,
    };
    await preferencesApi.save(next);
  } catch {
    /* ignore — keep in-memory cache */
  }
}

function scheduleServerSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    const payload = pendingPayload;
    pendingPayload = null;
    if (!payload) return;
    await flushServerSave(payload);
  }, 400);
}

export function saveWallpaperSettings(
  settings: NoteWallpaperSettings,
  options: { immediate?: boolean } = {}
): Promise<void> | void {
  cache = normalize(settings);
  loaded = true;
  listeners.forEach((l) => l(cache));
  if (options.immediate) {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    pendingPayload = null;
    return flushServerSave(cache);
  }
  pendingPayload = cache;
  scheduleServerSave();
}

export function subscribeWallpaper(fn: (s: NoteWallpaperSettings) => void) {
  listeners.add(fn);
  // Kick off initial load so the new subscriber gets the server value.
  if (!loaded) loadWallpaperSettings();
  return () => listeners.delete(fn);
}

const ALLOWED_MIME = new Set(["image/jpeg", "image/png"]);
const ALLOWED_EXT = /\.(jpe?g|png)$/i;

export function isAllowedWallpaperFile(file: File): boolean {
  if (ALLOWED_MIME.has(file.type)) return true;
  return ALLOWED_EXT.test(file.name);
}

export async function uploadWallpaper(file: File): Promise<NoteWallpaperSettings> {
  if (!isAllowedWallpaperFile(file)) {
    throw new Error("Only .jpg and .png images are allowed");
  }
  const current = await ensureWallpaperLoaded();

  const form = new FormData();
  form.append("file", file);
  const res = await vaultApi.upload(form);
  const data: any = res.data;
  const newFileId: string | undefined =
    data?.id || data?.fileId || data?.file?.id || data?.file?.fileId;
  if (!newFileId) throw new Error("Upload failed: missing file id");

  // Remove the previous wallpaper from the vault, if any.
  if (current.fileId && current.fileId !== newFileId) {
    try {
      await vaultApi.delete(current.fileId);
    } catch {
      /* ignore delete failures */
    }
    invalidateVaultBlob(current.fileId);
  }

  const next: NoteWallpaperSettings = {
    fileId: newFileId,
    blur: current.blur,
    brightness: current.brightness,
  };
  await saveWallpaperSettings(next, { immediate: true });
  return next;
}

export async function removeWallpaper(): Promise<NoteWallpaperSettings> {
  const current = await ensureWallpaperLoaded();
  if (current.fileId) {
    try {
      await vaultApi.delete(current.fileId);
    } catch {
      /* ignore */
    }
    invalidateVaultBlob(current.fileId);
  }
  const next = { ...DEFAULT_WALLPAPER };
  await saveWallpaperSettings(next, { immediate: true });
  return next;
}

export { resolveVaultBlob };