/**
 * Service Worker for background timer functionality
 * Supports multiple concurrent timers (one per entity).
 */

const timers = new Map(); // entityId -> { timerId, startTime, initialElapsed }
let tickInterval = null;

function broadcast(message) {
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => client.postMessage(message));
  });
}

function ensureTick() {
  if (tickInterval || timers.size === 0) return;
  tickInterval = setInterval(() => {
    if (timers.size === 0) {
      clearInterval(tickInterval);
      tickInterval = null;
      return;
    }
    timers.forEach((t, entityId) => {
      const elapsedSeconds =
        Math.floor((Date.now() - t.startTime) / 1000) + (t.initialElapsed || 0);
      broadcast({ type: 'TIMER_UPDATE', data: { entityId, elapsedSeconds } });
    });
  }, 1000);
}

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('message', (event) => {
  const msg = event.data || {};
  const { type, data } = msg;

  if (type === 'START_TIMER' && data?.entityId) {
    timers.set(data.entityId, {
      timerId: data.timerId,
      startTime: data.startTime || Date.now(),
      initialElapsed: data.initialElapsed || 0,
    });
    ensureTick();
  } else if (type === 'STOP_TIMER' && data?.entityId) {
    const t = timers.get(data.entityId);
    const elapsed = t
      ? Math.floor((Date.now() - t.startTime) / 1000) + (t.initialElapsed || 0)
      : 0;
    timers.delete(data.entityId);
    broadcast({ type: 'TIMER_STOPPED', data: { entityId: data.entityId, elapsed } });
  }
});
