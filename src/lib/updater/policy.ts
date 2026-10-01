import api from "@/lib/api";
import { getClientVersion } from "./client-version";

export interface VersionPolicy {
  latestVersion: string;
  minimumVersion: string;
  updateUrl: string;
  notes: string;
  clientVersion: string;
  /** Client is below the minimum allowed version — the app must be updated. */
  mandatory: boolean;
  /** A newer version exists, but the current one still works. */
  outdated: boolean;
}

/**
 * Asks the server (single source of truth) which version is current.
 * Called on every app start/resume, so updates surface immediately.
 */
export async function fetchVersionPolicy(signal?: AbortSignal): Promise<VersionPolicy | null> {
  try {
    const { data } = await api.get<VersionPolicy>("/api/app-version", { signal });
    if (!data || typeof data.latestVersion !== "string") return null;
    return data;
  } catch {
    return null;
  }
}

/** Local fallback when a request is rejected with 426 Upgrade Required. */
export function policyFrom426(payload: unknown): VersionPolicy | null {
  if (typeof payload !== "object" || payload === null) return null;
  const p = payload as Record<string, unknown>;
  const latest = typeof p.latestVersion === "string" ? p.latestVersion : "";
  if (!latest) return null;
  return {
    latestVersion: latest,
    minimumVersion: typeof p.minimumVersion === "string" ? p.minimumVersion : "",
    updateUrl: typeof p.updateUrl === "string" ? p.updateUrl : "",
    notes: "",
    clientVersion: getClientVersion(),
    mandatory: true,
    outdated: true,
  };
}
