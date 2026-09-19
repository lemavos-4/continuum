export interface SemVer {
  major: number;
  minor: number;
  patch: number;
  raw: string;
}

const STABLE_TAG = /^v?(\d+)\.(\d+)\.(\d+)$/;

/**
 * Parses a strict stable semver tag (`v1.2.3` / `1.2.3`).
 * Anything else — `build-20260907-120000`, `dev`, `v1.2.3-beta.1` — returns null.
 */
export function parseSemver(input: string | null | undefined): SemVer | null {
  if (typeof input !== "string") return null;
  const match = STABLE_TAG.exec(input.trim());
  if (!match) return null;
  const [, major, minor, patch] = match;
  const parsed = {
    major: Number(major),
    minor: Number(minor),
    patch: Number(patch),
  };
  if (!Number.isFinite(parsed.major) || !Number.isFinite(parsed.minor) || !Number.isFinite(parsed.patch)) {
    return null;
  }
  return { ...parsed, raw: `${parsed.major}.${parsed.minor}.${parsed.patch}` };
}

/** Semantic comparison. Returns > 0 when a > b, 0 when equal, < 0 when a < b. */
export function compareSemver(a: SemVer, b: SemVer): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

/** True only when `candidate` is strictly newer than `installed`. */
export function isNewerVersion(candidate: SemVer, installed: SemVer): boolean {
  return compareSemver(candidate, installed) > 0;
}

export function formatSemver(v: SemVer): string {
  return v.raw;
}
