import { preferencesApi } from "@/lib/api";

/**
 * Remembers whether the editor was last left in view (read-only) or edit mode.
 * Stored server-side in the user's preferences blob so it follows the account,
 * with a local mirror for instant first paint.
 */
const LS_KEY = "continuum:editor-readonly";

let cache: boolean = readLocal();
let loaded = false;
let loadPromise: Promise<boolean> | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function readLocal(): boolean {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw === null ? true : raw === "true";
  } catch {
    return true;
  }
}

function writeLocal(value: boolean) {
  try { localStorage.setItem(LS_KEY, String(value)); } catch { /* ignore */ }
}

function safeParse(s: string): any {
  try { return JSON.parse(s); } catch { return {}; }
}

async function fetchPreferences(): Promise<any> {
  const res = await preferencesApi.get();
  return typeof res.data === "string" ? safeParse(res.data) : (res.data ?? {});
}

export function getEditorReadOnlySync(): boolean {
  return cache;
}

export async function loadEditorReadOnly(): Promise<boolean> {
  if (!loaded && !loadPromise) {
    loadPromise = (async () => {
      try {
        const prefs = await fetchPreferences();
        if (typeof prefs?.editorReadOnly === "boolean") {
          cache = prefs.editorReadOnly;
          writeLocal(cache);
        }
      } catch { /* keep local value */ }
      loaded = true;
      loadPromise = null;
      return cache;
    })();
  }
  if (loadPromise) {
    try { await loadPromise; } catch { /* ignore */ }
  }
  return cache;
}

export function saveEditorReadOnly(value: boolean) {
  cache = value;
  writeLocal(value);
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    try {
      let existing: any = {};
      try { existing = await fetchPreferences(); } catch { /* ignore */ }
      await preferencesApi.save({
        ...(existing && typeof existing === "object" ? existing : {}),
        editorReadOnly: cache,
      });
    } catch { /* keep local cache */ }
  }, 500);
}