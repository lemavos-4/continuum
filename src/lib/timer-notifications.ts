/**
 * Browser + PWA notifications for active timers.
 *
 * - One persistent notification per active timer (tag = `timer-<entityId>`).
 * - Silent, non-renotifying updates every ~20s so the elapsed time stays fresh
 *   without spamming the user.
 * - Shows a distinct "Paused" state when the timer is paused.
 * - Notifications are closed automatically when the timer stops.
 *
 * Works both in the regular browser and inside the installed PWA. When a
 * service worker is available (Android / installed PWA), it uses
 * `registration.showNotification`; otherwise it falls back to the classic
 * `new Notification(...)` API.
 */
import { timerManager } from "@/hooks/useTimeTracking";
import { entitiesApi } from "@/lib/api";

type NotificationState = {
  entityId: string;
  lastRenderedLabel: string;
  ref?: Notification;
};

const active = new Map<string, NotificationState>();
const entityNameCache = new Map<string, string>();
let started = false;
let permissionRequested = false;
let tickInterval: ReturnType<typeof setInterval> | null = null;

function isSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function ensureNotificationPermission(): Promise<NotificationPermission> {
  if (!isSupported()) return "denied";
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  if (permissionRequested) return Notification.permission;
  permissionRequested = true;
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

function formatElapsed(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m ${String(sec).padStart(2, "0")}s`;
  return `${m}m ${String(sec).padStart(2, "0")}s`;
}

async function getEntityName(entityId: string): Promise<string> {
  const cached = entityNameCache.get(entityId);
  if (cached) return cached;
  try {
    const res = await entitiesApi.get(entityId);
    const name = (res.data as { title?: string })?.title || "Timer";
    entityNameCache.set(entityId, name);
    return name;
  } catch {
    return "Timer";
  }
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg =
      (await navigator.serviceWorker.getRegistration()) ??
      (await navigator.serviceWorker.ready.catch(() => null));
    return reg ?? null;
  } catch {
    return null;
  }
}

async function showOrUpdate(entityId: string, title: string, body: string) {
  if (!isSupported() || Notification.permission !== "granted") return;
  const tag = `timer-${entityId}`;
  const options: NotificationOptions = {
    body,
    tag,
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    silent: true,
    // @ts-expect-error renotify is supported in SW notifications
    renotify: false,
  };

  const reg = await getRegistration();
  if (reg && typeof reg.showNotification === "function") {
    try {
      await reg.showNotification(title, options);
      return;
    } catch {
      /* fall through */
    }
  }

  const state = active.get(entityId);
  try { state?.ref?.close(); } catch { /* ignore */ }
  try {
    const n = new Notification(title, options);
    active.set(entityId, { entityId, lastRenderedLabel: body, ref: n });
  } catch {
    /* browsers that only allow SW notifications */
  }
}

async function closeFor(entityId: string) {
  const state = active.get(entityId);
  try { state?.ref?.close(); } catch { /* ignore */ }
  active.delete(entityId);

  const reg = await getRegistration();
  if (reg && typeof reg.getNotifications === "function") {
    try {
      const list = await reg.getNotifications({ tag: `timer-${entityId}` });
      list.forEach((n) => n.close());
    } catch {
      /* ignore */
    }
  }
}

async function refreshAll() {
  if (!timerManager || !isSupported()) return;
  if (Notification.permission !== "granted") return;

  const currentIds = new Set(timerManager.getActiveEntityIds());

  for (const id of Array.from(active.keys())) {
    if (!currentIds.has(id)) await closeFor(id);
  }

  for (const entityId of currentIds) {
    const name = await getEntityName(entityId);
    const elapsed = timerManager.getElapsedSeconds(entityId);
    const paused = timerManager.isPaused(entityId);
    const title = paused ? `⏸ ${name}` : `⏱ ${name}`;
    const body = paused
      ? `Paused · ${formatElapsed(elapsed)}`
      : `Running · ${formatElapsed(elapsed)}`;

    const state = active.get(entityId);
    if (state?.lastRenderedLabel === body) continue;

    await showOrUpdate(entityId, title, body);
    const next = active.get(entityId);
    active.set(entityId, { entityId, lastRenderedLabel: body, ref: next?.ref });
  }
}

function ensureTick() {
  if (tickInterval) return;
  tickInterval = setInterval(() => {
    if (!timerManager || timerManager.getActiveEntityIds().length === 0) {
      if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }
      void refreshAll();
      return;
    }
    void refreshAll();
  }, 20000);
}

/** Idempotent. Subscribes to the timer manager and keeps notifications in sync. */
export function initTimerNotifications() {
  if (started || !isSupported() || !timerManager) return;
  started = true;

  timerManager.subscribe(() => {
    void refreshAll();
    if (timerManager.getActiveEntityIds().length > 0) ensureTick();
  });

  void refreshAll();
  if (timerManager.getActiveEntityIds().length > 0) ensureTick();
}

/** Pre-populate the entity name cache so the first notification renders instantly. */
export function primeEntityName(entityId: string, name: string) {
  if (name) entityNameCache.set(entityId, name);
}
