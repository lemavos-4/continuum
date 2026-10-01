import { useCallback, useEffect, useRef, useState } from "react";
import ApkInstaller, { isInstallerAvailable, getInstalledVersionName, type DownloadProgressEvent } from "@/lib/updater/native";
import { updaterConfig, isUpdaterConfigured } from "@/config/updater";
import { dismissVersion, isDismissed } from "@/lib/updater/manager";
import { fetchLatestStableRelease, type StableRelease } from "@/lib/updater/github";
import { fetchVersionPolicy, policyFrom426, type VersionPolicy } from "@/lib/updater/policy";
import { getClientPlatform, setClientVersion } from "@/lib/updater/client-version";
import { UPGRADE_REQUIRED_EVENT } from "@/lib/api";

export type UpdaterPhase = "idle" | "available" | "downloading" | "installing" | "permission" | "failed";

/** Optional checks are throttled; mandatory ones always come from the server. */
const RECHECK_INTERVAL_MS = 60_000;

export function useAppUpdater() {
  const [phase, setPhase] = useState<UpdaterPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [installed, setInstalled] = useState("");
  const [policy, setPolicy] = useState<VersionPolicy | null>(null);
  const [mandatory, setMandatory] = useState(false);
  const [release, setRelease] = useState<StableRelease | null>(null);
  const listenerRef = useRef<{ remove: () => void } | null>(null);
  const lastCheckRef = useRef(0);
  const busyRef = useRef(false);

  const applyPolicy = useCallback((next: VersionPolicy | null) => {
    if (!next) return;
    setPolicy(next);
    if (next.clientVersion) setInstalled(next.clientVersion);

    if (next.mandatory) {
      setMandatory(true);
      setPhase((current) => (current === "idle" ? "available" : current));
      return;
    }
    if (next.outdated && !isDismissed(next.latestVersion)) {
      setMandatory(false);
      setPhase((current) => (current === "idle" ? "available" : current));
    }
  }, []);

  const check = useCallback(async (signal?: AbortSignal) => {
    if (busyRef.current) return;
    const now = Date.now();
    if (now - lastCheckRef.current < RECHECK_INTERVAL_MS) return;
    lastCheckRef.current = now;

    const next = await fetchVersionPolicy(signal);
    if (signal?.aborted) return;
    applyPolicy(next);

    // Native clients also need the APK asset to install in place.
    if (next && (next.mandatory || next.outdated) && isInstallerAvailable() && isUpdaterConfigured()) {
      const stable = await fetchLatestStableRelease(signal);
      if (!signal?.aborted) setRelease(stable);
    }
  }, [applyPolicy]);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      // Tell the server which version is actually running.
      const versionName = await getInstalledVersionName();
      setClientVersion(versionName);
      setInstalled((current) => current || versionName);
      await check(controller.signal);
    })();

    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    const onUpgradeRequired = (event: Event) => {
      applyPolicy(policyFrom426((event as CustomEvent).detail));
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener(UPGRADE_REQUIRED_EVENT, onUpgradeRequired);

    return () => {
      controller.abort();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener(UPGRADE_REQUIRED_EVENT, onUpgradeRequired);
      listenerRef.current?.remove();
      listenerRef.current = null;
    };
  }, [check, applyPolicy]);

  const startUpdate = useCallback(async () => {
    // Web (and native without the installer plugin): send people to the download page.
    if (!isInstallerAvailable() || !release) {
      const url = policy?.updateUrl;
      if (getClientPlatform() === "web") {
        window.location.reload();
        return;
      }
      if (url) window.open(url, "_blank", "noopener");
      return;
    }

    try {
      const { granted } = await ApkInstaller.canRequestInstall();
      if (!granted) {
        setPhase("permission");
        return;
      }

      busyRef.current = true;
      setProgress(0);
      setPhase("downloading");
      listenerRef.current?.remove();
      listenerRef.current = await ApkInstaller.addListener("apkDownloadProgress", (event: DownloadProgressEvent) => {
        setProgress(Math.max(0, Math.min(100, Math.round(event.percent))));
        if (event.percent >= 100) setPhase("installing");
      });

      await ApkInstaller.downloadAndInstall({
        url: release.apkUrl,
        fileName: updaterConfig.apkAssetName,
        version: release.version.raw,
      });
      setPhase("installing");
    } catch {
      setPhase("failed");
    } finally {
      busyRef.current = false;
    }
  }, [release, policy]);

  const openSettings = useCallback(async () => {
    try {
      await ApkInstaller.openInstallSettings();
    } catch {
      /* ignore */
    }
  }, []);

  const dismiss = useCallback(() => {
    if (mandatory) return; // mandatory updates cannot be skipped
    if (policy?.latestVersion) dismissVersion(policy.latestVersion);
    listenerRef.current?.remove();
    listenerRef.current = null;
    setPhase("idle");
  }, [mandatory, policy]);

  return {
    open: phase !== "idle",
    phase,
    mandatory,
    progress,
    installed,
    latest: policy?.latestVersion ?? release?.version.raw ?? "",
    notes: policy?.notes ?? release?.notes ?? "",
    startUpdate,
    openSettings,
    dismiss,
  };
}
