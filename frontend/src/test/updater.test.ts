import { describe, expect, it } from "vitest";
import { compareSemver, isNewerVersion, parseSemver } from "@/lib/updater/semver";
import { decide } from "@/lib/updater/manager";
import type { StableRelease } from "@/lib/updater/github";

const release = (tag: string): StableRelease => ({
  version: parseSemver(tag)!,
  tag,
  notes: "",
  apkUrl: "https://github.com/owner/repo/releases/download/x/app.apk",
  apkSize: null,
});

describe("semver parsing", () => {
  it("accepts stable tags with or without v", () => {
    expect(parseSemver("v1.2.3")?.raw).toBe("1.2.3");
    expect(parseSemver("1.2.3")?.raw).toBe("1.2.3");
  });

  it("rejects build-* and other non-semver tags", () => {
    for (const tag of ["build-20260907-120000", "test", "dev", "foo", "abc", "v1.2", "v1.2.3-beta.1"]) {
      expect(parseSemver(tag)).toBeNull();
    }
  });
});

describe("semantic comparison", () => {
  it("never compares as strings", () => {
    expect(compareSemver(parseSemver("1.10.0")!, parseSemver("1.9.0")!)).toBeGreaterThan(0);
    expect(compareSemver(parseSemver("1.2.0")!, parseSemver("1.1.9")!)).toBeGreaterThan(0);
    expect(compareSemver(parseSemver("2.0.0")!, parseSemver("1.99.99")!)).toBeGreaterThan(0);
    expect(isNewerVersion(parseSemver("1.1.0")!, parseSemver("1.1.0")!)).toBe(false);
  });
});

describe("update decision", () => {
  const cases: Array<[string, string, string]> = [
    ["1.0.0", "v1.1.0", "update"],
    ["1.1.0", "v1.1.0", "up-to-date"],
    ["1.2.0", "v1.1.0", "downgrade-blocked"],
    ["1.9.0", "v1.10.0", "update"],
    ["1.10.0", "v1.9.0", "downgrade-blocked"],
    ["2.0.0", "v1.99.99", "downgrade-blocked"],
    ["v1.2.0", "v1.3.0", "update"],
  ];

  it.each(cases)("installed %s vs latest %s => %s", (installed, latest, expected) => {
    expect(decide(installed, release(latest)).status).toBe(expected);
  });

  it("treats a missing release as unavailable", () => {
    expect(decide("1.0.0", null).status).toBe("unavailable");
  });
});
