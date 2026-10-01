import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import { version as webBuildVersion } from "@/lib/version";

export interface AppInfo {
  versionName: string;
  versionCode: number;
  packageName: string;
}

export interface DownloadProgressEvent {
  percent: number;
  downloadedBytes: number;
  totalBytes: number;
}

export interface ApkInstallerPlugin {
  getAppInfo(): Promise<AppInfo>;
  canRequestInstall(): Promise<{ granted: boolean }>;
  openInstallSettings(): Promise<void>;
  downloadAndInstall(options: { url: string; fileName: string; version: string }): Promise<{ started: boolean }>;
  addListener(
    eventName: "apkDownloadProgress",
    listener: (event: DownloadProgressEvent) => void,
  ): Promise<PluginListenerHandle>;
}

const ApkInstaller = registerPlugin<ApkInstallerPlugin>("ApkInstaller");

export const isAndroidApp = () => Capacitor.getPlatform() === "android" && Capacitor.isNativePlatform();

export const isInstallerAvailable = () => isAndroidApp() && Capacitor.isPluginAvailable("ApkInstaller");

/** Real installed APK version. Falls back to the web build version off-Android. */
export async function getInstalledVersionName(): Promise<string> {
  if (isInstallerAvailable()) {
    try {
      const info = await ApkInstaller.getAppInfo();
      if (info?.versionName) return info.versionName;
    } catch {
      // ignore — fall through to the web build version
    }
  }
  return webBuildVersion;
}

export default ApkInstaller;
