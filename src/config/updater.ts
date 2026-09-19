/**
 * Single source of truth for the Android auto-updater configuration.
 * Never hardcode the repository or the APK asset name anywhere else.
 */
const rawRepo = (import.meta.env.VITE_GITHUB_REPO ?? "").trim();
const rawAsset = (import.meta.env.VITE_GITHUB_APK_ASSET ?? "").trim();

export const updaterConfig = {
  /** "owner/repo" — configurable through VITE_GITHUB_REPO. */
  repo: rawRepo,
  /** APK file name published on the release — VITE_GITHUB_APK_ASSET. */
  apkAssetName: rawAsset,
  /** Minimum interval between GitHub API checks. */
  checkIntervalMs: 5 * 60 * 1000,
  /** Request timeout for the GitHub API. */
  requestTimeoutMs: 10_000,
  /** How many releases to inspect when looking for the latest stable one. */
  releasesPageSize: 50,
} as const;

export const isUpdaterConfigured = () =>
  /^[^/\s]+\/[^/\s]+$/.test(updaterConfig.repo) && updaterConfig.apkAssetName.length > 0;

export const githubReleasesUrl = () =>
  `https://api.github.com/repos/${updaterConfig.repo}/releases?per_page=${updaterConfig.releasesPageSize}`;
