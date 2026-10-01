import { preferencesApi } from "@/lib/api";

export interface NoteFontSizeSettings {
  titleScale: number;
  bodyScale: number;
}

export const DEFAULT_NOTE_FONT_SIZE: NoteFontSizeSettings = {
  titleScale: 100,
  bodyScale: 100,
};

const LS_KEY = "continuum:note-font-size";
const listeners = new Set<(s: NoteFontSizeSettings) => void>();

let cache: NoteFontSizeSettings = readLocal();
let loaded = false;
let loadPromise: Promise<NoteFontSizeSettings> | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function clamp(value: number, min: number, max: number): number {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : DEFAULT_NOTE_FONT_SIZE.titleScale;
}

function readLocal(): NoteFontSizeSettings {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch {
    // ignore malformed cache
  }
  return { ...DEFAULT_NOTE_FONT_SIZE };
}

function writeLocal(settings: NoteFontSizeSettings) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(settings)); } catch { /* ignore */ }
}

function safeParse(s: string): any {
  try { return JSON.parse(s); } catch { return {}; }
}

function normalize(raw: any): NoteFontSizeSettings {
  const legacyScale = Number(raw?.scale ?? raw?.noteFontSize ?? raw ?? DEFAULT_NOTE_FONT_SIZE.titleScale);
  const titleValue = Number(raw?.titleScale ?? raw?.title ?? raw?.titleFontSize ?? legacyScale ?? DEFAULT_NOTE_FONT_SIZE.titleScale);
  const bodyValue = Number(raw?.bodyScale ?? raw?.body ?? raw?.bodyFontSize ?? legacyScale ?? DEFAULT_NOTE_FONT_SIZE.bodyScale);

  return {
    titleScale: clamp(titleValue, 80, 180),
    bodyScale: clamp(bodyValue, 80, 180),
  };
}

async function fetchPreferences(): Promise<any> {
  const res = await preferencesApi.get();
  return typeof res.data === "string" ? safeParse(res.data) : (res.data ?? {});
}

export function loadNoteFontSize(): NoteFontSizeSettings {
  if (!loaded && !loadPromise) {
    loadPromise = (async () => {
      try {
        const prefs = await fetchPreferences();
        const merged = {
          ...(prefs && typeof prefs === "object" ? prefs : {}),
          ...(typeof prefs?.noteFontSize === "object" && prefs.noteFontSize ? prefs.noteFontSize : {}),
        };

        cache = normalize(merged);
        writeLocal(cache);
      } catch {
        cache = readLocal();
      } finally {
        loaded = true;
        listeners.forEach((listener) => listener(cache));
        loadPromise = null;
      }
      return cache;
    })();
  }
  return cache;
}

export function saveNoteFontSize(settings: Partial<NoteFontSizeSettings>) {
  const next = normalize({
    ...cache,
    ...settings,
  });

  cache = next;
  writeLocal(next);
  listeners.forEach((listener) => listener(next));

  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    try {
      let existing: any = {};
      try { existing = await fetchPreferences(); } catch { /* ignore */ }
      const payload = {
        ...(existing && typeof existing === "object" ? existing : {}),
        titleScale: next.titleScale,
        bodyScale: next.bodyScale,
        noteFontSize: {
          titleScale: next.titleScale,
          bodyScale: next.bodyScale,
        },
      };
      await preferencesApi.save(payload);
    } catch { /* keep local cache */ }
  }, 500);
}

export function resetNoteFontSize() {
  return saveNoteFontSize(DEFAULT_NOTE_FONT_SIZE);
}

export function subscribeNoteFontSize(fn: (s: NoteFontSizeSettings) => void): () => void {
  listeners.add(fn);
  if (!loaded) loadNoteFontSize();
  return () => {
    listeners.delete(fn);
  };
}

