/**
 * Guarded Service Worker registration for Continuum.
 * Never registers in dev, Lovable preview, iframe, or when ?sw=off.
 */

const PREVIEW_HOST_SUFFIXES = [
  ".lovableproject.com",
  ".lovableproject-dev.com",
  ".lovable.app",
  ".beta.lovable.dev",
];

const PREVIEW_HOST_PREFIXES = ["id-preview--", "preview--"];

function shouldSkipRegistration(): { skip: boolean; reason?: string } {
  if (typeof window === "undefined") return { skip: true, reason: "no-window" };
  if (!("serviceWorker" in navigator)) return { skip: true, reason: "no-sw-api" };
  if (!import.meta.env.PROD) return { skip: true, reason: "dev" };
  if (window.self !== window.top) return { skip: true, reason: "iframe" };
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get("sw") === "off") return { skip: true, reason: "kill-switch" };
    const host = url.hostname;
    if (PREVIEW_HOST_PREFIXES.some((p) => host.startsWith(p))) {
      return { skip: true, reason: "preview-prefix" };
    }
    if (
      host === "lovableproject.com" ||
      host === "lovableproject-dev.com" ||
      host === "beta.lovable.dev" ||
      PREVIEW_HOST_SUFFIXES.some((s) => host.endsWith(s))
    ) {
      return { skip: true, reason: "preview-host" };
    }
  } catch {
    /* ignore */
  }
  return { skip: false };
}

async function unregisterStale() {
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs
        .filter((r) => {
          const url = r.active?.scriptURL ?? r.installing?.scriptURL ?? r.waiting?.scriptURL ?? "";
          // Don't kill the Continuum timer SW used elsewhere.
          if (url.includes("timer-service-worker")) return false;
          if (url.endsWith("/sw.js") || url.endsWith("/service-worker.js")) return true;
          return false;
        })
        .map((r) => r.unregister())
    );
  } catch {
    /* ignore */
  }
}

export async function registerContinuumSW() {
  const { skip, reason } = shouldSkipRegistration();
  if (skip) {
    if (reason && reason !== "no-window" && reason !== "no-sw-api") {
      await unregisterStale();
    }
    return;
  }
  try {
    // vite-plugin-pwa virtual module
    const { registerSW } = await import("virtual:pwa-register");
    registerSW({ immediate: true });
  } catch (err) {
    console.warn("[pwa] registration failed", err);
  }
}
