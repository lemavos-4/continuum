import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerContinuumSW } from "@/lib/pwa-register";
import { initSyncManager } from "@/lib/offline/sync";

// Apply persisted theme synchronously to avoid flash.
if (typeof document !== "undefined") {
  try {
    const stored = window.localStorage.getItem("continuum.theme");
    const theme = stored === "light" ? "light" : "dark";
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
    document.documentElement.style.colorScheme = theme;
  } catch {
    document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = "dark";
  }
}

createRoot(document.getElementById("root")!).render(<App />);

// Boot offline-first: register service worker and start sync manager.
if (typeof window !== "undefined") {
  const apiBase =
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
    (import.meta.env.DEV
      ? "http://localhost:8080"
      : `${window.location.protocol}//${window.location.host}`);
  try {
    initSyncManager(apiBase);
  } catch (e) {
    console.warn("[continuum] sync manager init failed", e);
  }
  void registerContinuumSW();
}
