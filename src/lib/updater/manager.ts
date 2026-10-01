import { updaterConfig, isUpdaterConfigured } from "@/config/updater";
import { fetchLatestStableRelease, type StableRelease } from "./github";
import { isNewerVersion, parseSemver } from "./semver";
import { getInstalledVersionName, isInstallerAvailable } from "./native";

export type UpdateDecision =
  | { status: "update"; installed: string; latest: string; release: StableRelease }
  | { status: "up-to-date"; installed: string; latest: string }
  | { status: "downgrade-blocked"; installed: string; latest: string }
  | { status: "unavailable"; reason: "not-configured" | "no-release" | "unknown-installed-version" };

const LAST_CHECK_KEY = "updater:last_check_at";
const DISMISSED_KEY = "updater:dismissed_version";

function readNumber(key: string): number {
  try {
    return Number(localStorage.getItem(key) ?? 0) || 0;
  } catch {
    return 0;
  }
}

export function shouldCheckNow(now = Date.now()): boolean {
  return now - readNumber(LAST_CHECK_KEY) >= updaterConfig.checkIntervalMs;
}

export function markChecked(now = Date.now()): void {
  try {
    localStorage.setItem(LAST_CHECK_KEY, String(now));
  } catch {
    // storage unavailable — checking again later is harmless
  }
}

export function dismissVersion(version: string): void {
  try {
    localStorage.setItem(DISMISSED_KEY, version);
  } catch {
    // ignore
  }
}

export function isDismissed(version: string): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === version;
  } catch {
    return false;
  }
}

/** Pure decision function — the single place where downgrades are blocked. */
export function decide(installedRaw: string, release: StableRelease | null): UpdateDecision {
  if (!release) return { status: "unavailable", reason: "no-release" };

  const installed = parseSemver(installedRaw);
  if (!installed) return { status: "unavailable", reason: "unknown-installed-version" };

  if (isNewerVersion(release.version, installed)) {
    return { status: "update", installed: installed.raw, latest: release.version.raw, release };
  }
  if (release.version.raw === installed.raw) {
    return { status: "up-to-date", installed: installed.raw, latest: release.version.raw };
  }
  return { status: "downgrade-blocked", installed: installed.raw, latest: release.version.raw };
}

/** Full check: installed version + latest stable release + semantic decision. */
export async function checkForUpdate(signal?: AbortSignal): Promise<UpdateDecision> {
  if (!isUpdaterConfigured()) return { status: "unavailable", reason: "not-configured" };
  const installed = await getInstalledVersionName();
  const release = await fetchLatestStableRelease(signal);
  return decide(installed, release);
}

export const canUpdateInApp = () => isInstallerAvailable();
