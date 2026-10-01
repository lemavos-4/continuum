import { preferencesApi } from "@/lib/api";

/**
 * User-defined display names for vault files.
 *
 * Renaming is presentational: the stored file keeps its original id and
 * extension, so note references and content types can never break. Only the
 * base name (without extension) is editable — the extension is preserved and
 * hidden from the user.
 *
 * Stored inside the account preferences blob so names follow the user
 * across devices.
 */
type NameMap = Record<string, string>;

const LS_KEY = "continuum:vault-names";

let cache: NameMap = readLocal();
let loaded = false;
let loadPromise: Promise<NameMap> | null = null;

function readLocal(): NameMap {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return normalize(raw ? JSON.parse(raw) : null);
  } catch {
    return {};
  }
}

function writeLocal(map: NameMap) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(map)); } catch { /* ignore */ }
}

function normalize(raw: any): NameMap {
  const src = raw?.vaultNames ?? raw ?? {};
  const out: NameMap = {};
  if (src && typeof src === "object") {
    for (const [id, value] of Object.entries(src)) {
      if (typeof value === "string" && value.trim()) out[id] = value;
    }
  }
  return out;
}

function safeParse(s: string): any {
  try { return JSON.parse(s); } catch { return {}; }
}

async function fetchPreferences(): Promise<any> {
  const res = await preferencesApi.get();
  return typeof res.data === "string" ? safeParse(res.data) : (res.data ?? {});
}

export async function loadVaultNames(): Promise<NameMap> {
  if (!loaded && !loadPromise) {
    loadPromise = (async () => {
      try {
        cache = normalize(await fetchPreferences());
        writeLocal(cache);
      } catch {
        cache = readLocal();
      } finally {
        loaded = true;
        loadPromise = null;
      }
      return cache;
    })();
  }
  if (loadPromise) {
    try { await loadPromise; } catch { /* ignore */ }
  }
  return cache;
}

export function getVaultNamesSync(): NameMap {
  return cache;
}

export function splitExtension(fileName: string): { base: string; ext: string } {
  const idx = fileName.lastIndexOf(".");
  if (idx <= 0) return { base: fileName, ext: "" };
  return { base: fileName.slice(0, idx), ext: fileName.slice(idx) };
}

/** Applies the user's custom base name while keeping the original extension. */
export function displayName(fileId: string, originalName: string): string {
  const custom = cache[fileId];
  if (!custom) return originalName;
  const { ext } = splitExtension(originalName);
  const cleaned = splitExtension(custom.trim()).base || custom.trim();
  return `${cleaned}${ext}`;
}

export async function renameVaultFile(fileId: string, newBaseName: string): Promise<void> {
  const base = newBaseName.trim();
  await loadVaultNames();
  const next = { ...cache };
  if (base) next[fileId] = base;
  else delete next[fileId];
  cache = next;
  writeLocal(cache);

  let existing: any = {};
  try { existing = await fetchPreferences(); } catch { /* ignore */ }
  await preferencesApi.save({
    ...(existing && typeof existing === "object" ? existing : {}),
    vaultNames: cache,
  });
}
