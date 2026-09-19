import { githubReleasesUrl, isUpdaterConfigured, updaterConfig } from "@/config/updater";
import { compareSemver, parseSemver, type SemVer } from "./semver";

interface GithubAsset {
  name?: string;
  browser_download_url?: string;
  size?: number;
}

interface GithubRelease {
  tag_name?: string;
  name?: string;
  body?: string;
  draft?: boolean;
  prerelease?: boolean;
  assets?: GithubAsset[];
}

export interface StableRelease {
  version: SemVer;
  tag: string;
  notes: string;
  apkUrl: string;
  apkSize: number | null;
}

const ALLOWED_DOWNLOAD_HOSTS = ["github.com", "objects.githubusercontent.com", "release-assets.githubusercontent.com"];

/** The download URL must come from GitHub itself — never from arbitrary JSON. */
function isTrustedDownloadUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    return ALLOWED_DOWNLOAD_HOSTS.some((host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

/**
 * Finds the highest stable semver release that ships the configured APK asset.
 * Drafts, prereleases and non-semver tags (e.g. `build-20260907-120000`) are ignored.
 * Returns null on any failure — the app must keep working offline.
 */
export async function fetchLatestStableRelease(signal?: AbortSignal): Promise<StableRelease | null> {
  if (!isUpdaterConfigured()) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), updaterConfig.requestTimeoutMs);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort);

  try {
    const response = await fetch(githubReleasesUrl(), {
      headers: { Accept: "application/vnd.github+json" },
      signal: controller.signal,
    });
    if (!response.ok) return null;

    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) return null;

    return selectLatestStableRelease(payload as GithubRelease[]);
  } catch {
    // Offline, timeout, 403 rate limit, invalid JSON… never break the app.
    return null;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", onAbort);
  }
}

export function selectLatestStableRelease(releases: GithubRelease[]): StableRelease | null {
  let best: StableRelease | null = null;

  for (const release of releases) {
    if (!release || release.draft || release.prerelease) continue;

    const version = parseSemver(release.tag_name);
    if (!version) continue; // build-*, dev, test, prereleases…

    const asset = (release.assets ?? []).find((item) => item?.name === updaterConfig.apkAssetName);
    const apkUrl = asset?.browser_download_url;
    if (!apkUrl || !isTrustedDownloadUrl(apkUrl)) continue;

    const candidate: StableRelease = {
      version,
      tag: release.tag_name ?? version.raw,
      notes: typeof release.body === "string" ? release.body : "",
      apkUrl,
      apkSize: typeof asset?.size === "number" ? asset.size : null,
    };

    if (!best || compareSemver(candidate.version, best.version) > 0) {
      best = candidate;
    }
  }

  return best;
}
