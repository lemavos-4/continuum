import { preferencesApi } from "@/lib/api";

/**
 * Persists which headings are collapsed per note.
 * Stored server-side inside the user's preferences blob so the state follows
 * the user across devices (never local-only).
 */
type FoldMap = Record<string, number[]>;

const LS_KEY = "continuum:note-folds";

let cache: FoldMap = readLocal();
let loaded = false;
let loadPromise: Promise<FoldMap> | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function readLocal(): FoldMap {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return normalize(parsed);
  } catch {
    return {};
  }
}

function writeLocal(map: FoldMap) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(map)); } catch { /* ignore */ }
}

function normalize(raw: any): FoldMap {
  const src = raw?.noteFolds ?? raw ?? {};
  const out: FoldMap = {};
  if (src && typeof src === "object") {
    for (const [id, value] of Object.entries(src)) {
      if (Array.isArray(value)) {
        const nums = value.filter((v) => Number.isInteger(v)).map(Number);
        if (nums.length) out[id] = nums;
      }
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

export async function loadNoteFolds(noteId: string): Promise<number[]> {
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
  return cache[noteId] ?? [];
}

export function getNoteFoldsSync(noteId: string): number[] {
  return cache[noteId] ?? [];
}

export function saveNoteFolds(noteId: string, indices: number[]) {
  if (!noteId) return;
  const next = { ...cache };
  if (indices.length) next[noteId] = [...indices].sort((a, b) => a - b);
  else delete next[noteId];
  cache = next;
  writeLocal(cache);

  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    try {
      let existing: any = {};
      try { existing = await fetchPreferences(); } catch { /* ignore */ }
      await preferencesApi.save({
        ...(existing && typeof existing === "object" ? existing : {}),
        noteFolds: cache,
      });
    } catch { /* keep local cache */ }
  }, 600);
}
