import { Capacitor } from "@capacitor/core";
import { version as webBuildVersion } from "@/lib/version";
import { parseSemver } from "./semver";

/**
 * Version/platform identity sent to the server on every API request.
 * Kept dependency-free (no api import) so it can be used inside the
 * axios interceptor without a circular import.
 */
let cachedVersion = parseSemver(webBuildVersion)?.raw ?? "";

export function setClientVersion(raw: string): void {
  const parsed = parseSemver(raw);
  if (parsed) cachedVersion = parsed.raw;
}

/** Stable semver of the running client, or "" for dev/unknown builds. */
export function getClientVersion(): string {
  return cachedVersion;
}

export function getClientPlatform(): string {
  try {
    return Capacitor.getPlatform();
  } catch {
    return "web";
  }
}

export const isNativeClient = () => getClientPlatform() !== "web";
