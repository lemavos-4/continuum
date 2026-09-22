import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import SubscriptionModal from "@/components/subscription/SubscriptionModal";
import { useAuth } from "@/contexts/AuthContext";
import { authApi, importApi } from "@/lib/api";
import { version } from "@/lib/version";
import { usePlanGate } from "@/hooks/usePlanGate";
import { getCurrentPlan, getPlanLimits, isUnlimited } from "@/lib/plan";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  ArrowPathIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  LifebuoyIcon,
  ChatBubbleLeftEllipsisIcon,
  BugAntIcon,
  ChevronRightIcon,
  LinkIcon,
  AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/outline";
import MarkdownImportDialog from "@/components/import/MarkdownImportDialog";
import { useOfflineStatus } from "@/hooks/use-offline-status";
import { flushQueue, getLastSyncAt } from "@/lib/offline/sync";
import { toast as sonnerToast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSelector } from "@/components/LanguageSelector";
import WallpaperSettings from "@/components/profile/WallpaperSettings";
import { DEFAULT_NOTE_FONT_SIZE, loadNoteFontSize, saveNoteFontSize, subscribeNoteFontSize } from "@/lib/note-font-size";
import { loadWallpaperSettings, saveWallpaperSettings, type NoteWallpaperSettings } from "@/lib/note-wallpaper";

/* ── Shared building blocks ──────────────────────────────────────────── */

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">{eyebrow}</p>
      <h2 className="mt-1 font-serif text-xl text-foreground">{title}</h2>
    </div>
  );
}

function OfflineSyncCard() {
  const { status, pending, syncing } = useOfflineStatus();
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [lastSync, setLastSync] = useState<number | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    void getLastSyncAt().then((v) => alive && setLastSync(v));
    return () => { alive = false; };
  }, [pending, syncing]);

  const onSync = async () => {
    if (!navigator.onLine) {
      sonnerToast.error(t("profile_offlineToast"));
      return;
    }
    setBusy(true);
    try {
      const r = await flushQueue();
      if (r.sent === 0 && r.failed === 0) sonnerToast.success(t("profile_upToDate"));
      else if (r.failed === 0) sonnerToast.success(t("profile_syncComplete", { n: r.sent }));
      else sonnerToast.warning(t("profile_syncPartial", { sent: r.sent, failed: r.failed }));
    } finally {
      setBusy(false);
    }
  };

  const active = busy || syncing;

  const subtitle = status === "offline"
    ? `${t("profile_workingOffline")}${pending > 0 ? ` · ${t("profile_pending", { n: pending })}` : ""}`
    : pending > 0
      ? t("profile_pending", { n: pending })
      : lastSync
        ? t("profile_lastSync", { time: new Date(lastSync).toLocaleString() })
        : t("profile_upToDate");

  return (
    <div className="py-5">
      <div className="flex items-start gap-4">
          <ArrowPathIcon className={`mt-0.5 h-4 w-4 shrink-0 text-muted-foreground ${active ? "animate-spin" : ""}`} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-foreground/80">{t("profile_offlineSync")}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
          </div>
      </div>
      <Button type="button" variant="outline" onClick={onSync} disabled={active} className="ml-8 mt-4 w-[calc(100%-2rem)] normal-case sm:w-auto">
        {active ? t("profile_syncing") : t("profile_syncNow")}
      </Button>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────*/

export default function SettingsPage() {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { usage, loading: usageLoading } = usePlanGate();
  const { t } = useLanguage();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [relinking, setRelinking] = useState(false);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);

  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [draftNoteTitleScale, setDraftNoteTitleScale] = useState<number>(() => loadNoteFontSize().titleScale);
  const [draftNoteBodyScale, setDraftNoteBodyScale] = useState<number>(() => loadNoteFontSize().bodyScale);
  const [draftWallpaper, setDraftWallpaper] = useState<NoteWallpaperSettings>(() => loadWallpaperSettings());

  useEffect(() => {
    const unsubscribe = subscribeNoteFontSize((settings) => {
      setDraftNoteTitleScale(settings.titleScale);
      setDraftNoteBodyScale(settings.bodyScale);
    });
    return () => unsubscribe();
  }, []);

  const updateNoteTitleScale = (value: number) => {
    const nextValue = Math.round(value);
    setDraftNoteTitleScale(nextValue);
  };

  const updateNoteBodyScale = (value: number) => {
    const nextValue = Math.round(value);
    setDraftNoteBodyScale(nextValue);
  };

  const resetNoteFontScale = () => {
    setDraftNoteTitleScale(DEFAULT_NOTE_FONT_SIZE.titleScale);
    setDraftNoteBodyScale(DEFAULT_NOTE_FONT_SIZE.bodyScale);
  };

  const updateEditorSettings = () => {
    saveNoteFontSize({ titleScale: draftNoteTitleScale, bodyScale: draftNoteBodyScale });
    saveWallpaperSettings(draftWallpaper);
  };

  const handleExportData = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const res = await authApi.exportData();
      const json = typeof res.data === "string" ? res.data : JSON.stringify(res.data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "continuum-backup.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: t("profile_backupOk") });
    } catch (e: any) {
      toast({ title: t("profile_backupFailed"), description: e?.message ?? t("common_tryAgain"), variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleRelinkEntities = async () => {
    if (relinking) return;
    setRelinking(true);
    try {
      const res = await importApi.relinkEntities();
      const data = res.data as { notesUpdated?: number; connectionsCreated?: number };
      toast({
        title: t("import_relinkDoneTitle"),
        description: t("import_relinkDoneDesc", {
          n: data.connectionsCreated ?? 0,
          notes: data.notesUpdated ?? 0,
        }),
      });
    } catch (e: any) {
      toast({
        title: t("profile_relinkFailed"),
        description: e?.response?.data?.message || e?.message || t("profile_relinkFailedDesc"),
        variant: "destructive",
      });
    } finally {
      setRelinking(false);
    }
  };

  useEffect(() => {
    setUsername(user?.username ?? "");
    setEmail(user?.email ?? "");
  }, [user]);

  const currentPlan = getCurrentPlan(user);
  const limits = getPlanLimits(user);

  const usageResources = useMemo(
    () => [
      { label: t("bill_notes"), current: usage?.notesCount ?? 0, max: limits.maxNotes, suffix: "" },
      { label: t("bill_entities"), current: usage?.entitiesCount ?? 0, max: limits.maxEntities, suffix: "" },
      { label: t("bill_vault"), current: usage?.vaultSizeMB ?? 0, max: limits.maxVaultSizeMB, suffix: " MB" },
    ],
    [usage, limits, t],
  );

  const planDetails = useMemo(
    () => [
      { label: t("profile_vaultLimit"), value: isUnlimited(limits.maxVaultSizeMB) ? t("common_unlimited") : `${limits.maxVaultSizeMB} MB` },
      { label: t("profile_uploadMetadata"), value: isUnlimited(limits.maxMetadataSizeKb ?? -1) ? t("common_unlimited") : `${limits.maxMetadataSizeKb} KB` },
      { label: t("bill_history"), value: isUnlimited(limits.historyDays) ? t("common_unlimited") : t("profile_historyDays", { n: limits.historyDays }) },
    ],
    [limits, t],
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await authApi.updateMe({ username, name: username });
      await refreshUser();
      toast({ title: t("profile_updated") });
    } catch (err: any) {
      toast({
        title: t("profile_updateFailed"),
        description: err.response?.data?.message || t("common_tryAgain"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-7 px-4 py-6 sm:px-6 lg:px-10 lg:py-12">

        <section className="space-y-4">
          <SectionTitle eyebrow={currentPlan} title={t("profile_planUsage")} />
          <Card variant="faint">
            <CardContent className="divide-y divide-border/10 p-0">
              {usageLoading && !usage ? (
                <div className="flex justify-center py-10">
                  <ArrowPathIcon className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : usageResources.map((resource) => {
                const unlimited = resource.max === -1;
                const percent = unlimited ? 0 : Math.min((resource.current / resource.max) * 100, 100);
                return (
                  <div key={resource.label} className="space-y-2.5 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-foreground/80">{resource.label}</span>
                      <span className="font-mono text-xs tabular-nums text-muted-foreground">
                        {unlimited ? "∞" : `${resource.current.toFixed(resource.suffix ? 1 : 0)} / ${resource.max}${resource.suffix}`}
                      </span>
                    </div>
                    <Progress value={percent} className="h-[2px] rounded-none bg-accent" />
                  </div>
                );
              })}
            </CardContent>
          </Card>
          <div className="grid grid-cols-3 gap-2">
            {planDetails.map((detail) => (
              <Card key={detail.label} variant="faint">
                <CardContent className="min-w-0 p-3">
                  <p className="truncate text-[10px] text-muted-foreground">{detail.label}</p>
                  <p className="mt-1 truncate font-mono text-[11px] text-foreground/80">{detail.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="pt-1">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setSubscriptionOpen(true)}
              className="w-full normal-case"
            >
              {t("nav_subscription")}
            </Button>
          </div>
        </section>

        <SubscriptionModal open={subscriptionOpen} onOpenChange={setSubscriptionOpen} />

        {/* PREFERENCES */}
        <section className="space-y-3">
          <SectionTitle eyebrow={t("profile_eyebrowPreferences")} title={t("profile_prefsAppearance")} />

          <div className="divide-y divide-border/10">
            <LanguageSelector />
            <div className="space-y-4 py-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-4">
                      <AdjustmentsHorizontalIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground/80">{t("profile_noteFontSize")}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{t("profile_noteFontSizeDesc")}</p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={resetNoteFontScale}
                      disabled={draftNoteTitleScale === DEFAULT_NOTE_FONT_SIZE.titleScale && draftNoteBodyScale === DEFAULT_NOTE_FONT_SIZE.bodyScale}
                      className="h-7 px-2 text-[10px] normal-case"
                    >
                      {t("common_reset")}
                    </Button>
                  </div>

                  <div className="ml-8 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("profile_fontTitle")}</Label>
                      <span className="font-mono text-[10px] tabular-nums text-muted-foreground">{draftNoteTitleScale}%</span>
                    </div>
                    <input
                      type="range"
                      min={80}
                      max={180}
                      step={5}
                      value={draftNoteTitleScale}
                      onChange={(e) => updateNoteTitleScale(Number(e.target.value))}
                      className="w-full accent-primary"
                      aria-label={t("profile_ariaNoteTitleSize")}
                    />
                  </div>

                  <div className="ml-8 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("profile_fontBody")}</Label>
                      <span className="font-mono text-[10px] tabular-nums text-muted-foreground">{draftNoteBodyScale}%</span>
                    </div>
                    <input
                      type="range"
                      min={80}
                      max={180}
                      step={5}
                      value={draftNoteBodyScale}
                      onChange={(e) => updateNoteBodyScale(Number(e.target.value))}
                      className="w-full accent-primary"
                      aria-label={t("profile_ariaNoteBodySize")}
                    />
                  </div>
            </div>
            <WallpaperSettings value={draftWallpaper} onChange={setDraftWallpaper} />
          </div>
          <Button type="button" variant="outline" onClick={updateEditorSettings} className="w-full normal-case sm:w-auto">
            {t("common_update")}
          </Button>
        </section>

        {/* DATA */}
        <section className="space-y-4">
          <SectionTitle eyebrow={t("profile_eyebrowData")} title={t("profile_dataSync")} />

          <div className="divide-y divide-border/10">
            <OfflineSyncCard />

            <div className="py-5">
                <div className="flex items-start gap-4">
                  <ArrowUpTrayIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground/80">{t("profile_importMd")}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{t("profile_importMdDesc")}</p>
                  </div>
                </div>
                <Button variant="outline" onClick={() => setImportOpen(true)} className="ml-8 mt-4 w-[calc(100%-2rem)] normal-case sm:w-auto">
                  {t("profile_importMdBtn")}
                </Button>
            </div>

            <div className="py-5">
                <div className="flex items-start gap-4">
                  <ArrowDownTrayIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground/80">{t("profile_exportData")}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">continuum-backup.json</p>
                  </div>
                </div>
                {user?.dataExport ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleExportData}
                    disabled={exporting}
                    className="ml-8 mt-4 w-[calc(100%-2rem)] gap-2 normal-case sm:w-auto"
                  >
                    <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                    {exporting ? t("profile_exporting") : t("profile_downloadBackup")}
                  </Button>
                ) : (
                  <p className="ml-8 mt-3 text-xs text-muted-foreground">{t("profile_locked")}</p>
                )}
            </div>

            <div className="py-5">
                <div className="flex items-start gap-4">
                  <LinkIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground/80">{t("import_relinkBtn")}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{t("profile_relinkDesc")}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRelinkEntities}
                  disabled={relinking}
                  className="ml-8 mt-4 w-[calc(100%-2rem)] gap-2 normal-case sm:w-auto"
                >
                  <ArrowPathIcon className={relinking ? "animate-spin" : ""} />
                  {relinking ? t("profile_relinking") : t("import_relinkBtn")}
                </Button>
            </div>
          </div>

        </section>

        {/* HELP & SUPPORT */}
        <section className="space-y-4">
          <SectionTitle eyebrow={t("profile_eyebrowSupport")} title={t("profile_supportCenter")} />

          <div className="divide-y divide-border/10">
              <a href="/support" className="flex w-full items-center gap-4 py-5">
                <LifebuoyIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground/80">{t("profile_supportCenter")}</p>
                  <p className="truncate text-xs text-muted-foreground">{t("profile_supportCenterDesc")}</p>
                </div>
                <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              </a>
              <a
                href="mailto:feedback@continuum.onl?subject=Continuum%20%E2%80%94%20Feedback"
                className="flex w-full items-center gap-4 py-5"
              >
                <ChatBubbleLeftEllipsisIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground/80">{t("profile_sendFeedback")}</p>
                  <p className="truncate text-xs text-muted-foreground">feedback@continuum.onl</p>
                </div>
                <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              </a>
              <a
                href="mailto:bugs@continuum.onl?subject=Continuum%20%E2%80%94%20Bug%20report"
                className="flex w-full items-center gap-4 py-5"
              >
                <BugAntIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground/80">{t("profile_reportBug")}</p>
                  <p className="truncate text-xs text-muted-foreground">bugs@continuum.onl</p>
                </div>
                <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              </a>
          </div>
        </section>

        <footer className="border-t border-border/10 pt-6">
          <div className="flex flex-col gap-3">
            <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
              <a href="/about" className="transition-colors hover:text-foreground">{t("lp_footer_about")}</a>
              <a href="/pricing" className="transition-colors hover:text-foreground">{t("lp_footer_pricing")}</a>
              <a href="/support" className="transition-colors hover:text-foreground">{t("lp_footer_support")}</a>
              <a href="/terms" className="transition-colors hover:text-foreground">{t("lp_footer_terms")}</a>
              <a href="/privacy" className="transition-colors hover:text-foreground">{t("lp_footer_privacy")}</a>
              <a href="/versions" className="transition-colors hover:text-foreground">Versions</a>
              <a
                href="https://github.com/continuumnodes/continuum"
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-foreground"
              >
                GitHub
              </a>
            </nav>
            <div className="flex flex-col gap-1 text-[10px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>© {new Date().getFullYear()} Continuum</span>
              <span className="font-mono">{version}</span>
            </div>
          </div>
        </footer>

        <div>
          <Button
            variant="destructive"
            onClick={() => setLogoutConfirmOpen(true)}
            className="w-full normal-case"
          >
            {t("nav_logout")}
          </Button>
        </div>

        <ConfirmDialog
          open={logoutConfirmOpen}
          onOpenChange={setLogoutConfirmOpen}
          title={t("auth_signOut")}
          description={t("auth_signOutDesc")}
          confirmText={t("nav_logout")}
          destructive={true}
          onConfirm={async () => {
            setLogoutConfirmOpen(false);
            await handleLogout();
          }}
        />
        <div className="flex w-full justify-center pb-4 font-mono text-[10px] text-muted-foreground">{version}</div>
      </div>

      <MarkdownImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => { refreshUser(); }}
      />
    </AppLayout>
  );
}
