import { vaultApi } from "@/lib/api";
import { invalidateVaultBlob, resolveVaultBlob } from "@/lib/vault-blob";

const STORAGE_KEY = "continuum:note-wallpaper";

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

export function loadWallpaperSettings(): NoteWallpaperSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_WALLPAPER };
    const parsed = JSON.parse(raw);
    return {
      fileId: typeof parsed?.fileId === "string" ? parsed.fileId : null,
      blur: Number.isFinite(parsed?.blur) ? Math.max(0, Math.min(40, parsed.blur)) : 0,
      brightness: Number.isFinite(parsed?.brightness)
        ? Math.max(20, Math.min(150, parsed.brightness))
        : 100,
    };
  } catch {
    return { ...DEFAULT_WALLPAPER };
  }
}

export function saveWallpaperSettings(settings: NoteWallpaperSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l(settings));
}

export function subscribeWallpaper(fn: (s: NoteWallpaperSettings) => void) {
  listeners.add(fn);
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
  const current = loadWallpaperSettings();

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
  saveWallpaperSettings(next);
  return next;
}

export async function removeWallpaper(): Promise<NoteWallpaperSettings> {
  const current = loadWallpaperSettings();
  if (current.fileId) {
    try {
      await vaultApi.delete(current.fileId);
    } catch {
      /* ignore */
    }
    invalidateVaultBlob(current.fileId);
  }
  const next = { ...DEFAULT_WALLPAPER };
  saveWallpaperSettings(next);
  return next;
}

export { resolveVaultBlob };