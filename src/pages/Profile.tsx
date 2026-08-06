import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import InstallAppButton from "@/components/pwa/InstallAppButton";
import SubscriptionModal from "@/components/subscription/SubscriptionModal";

import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/lib/api";
import { version } from "@/lib/version";
import { usePlanGate } from "@/hooks/usePlanGate";
import { getCurrentPlan, getPlanLimits, isUnlimited } from "@/lib/plan";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  UserIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  CalendarIcon,
  LockClosedIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  LifebuoyIcon,
  ChatBubbleLeftEllipsisIcon,
  BugAntIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import MarkdownImportDialog from "@/components/import/MarkdownImportDialog";
import { useOfflineStatus } from "@/hooks/use-offline-status";
import { flushQueue, getLastSyncAt } from "@/lib/offline/sync";
import { toast as sonnerToast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSelector } from "@/components/LanguageSelector";

/* ── Shared building blocks ──────────────────────────────────────────── */

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">{eyebrow}</p>
      <h2 className="mt-1 font-serif text-xl text-foreground">{title}</h2>
    </div>
  );
}

function SettingRow({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-foreground/80">{title}</p>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function OfflineSyncRow() {
  const { status, pending, syncing } = useOfflineStatus();
  const [busy, setBusy] = useState(false);
  const [lastSync, setLastSync] = useState<number | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    void getLastSyncAt().then((v) => alive && setLastSync(v));
    return () => { alive = false; };
  }, [pending, syncing]);

  const onSync = async () => {
    if (!navigator.onLine) {
      sonnerToast.error("You're offline. Changes will sync when you're back online.");
      return;
    }
    setBusy(true);
    try {
      const r = await flushQueue();
      if (r.sent === 0 && r.failed === 0) sonnerToast.success("Everything is up to date.");
      else if (r.failed === 0) sonnerToast.success(`${r.sent} change${r.sent === 1 ? "" : "s"} synced.`);
      else sonnerToast.warning(`${r.sent} synced, ${r.failed} failed — will retry.`);
    } finally {
      setBusy(false);
    }
  };

  const subtitle = status === "offline"
    ? `Working offline${pending > 0 ? ` · ${pending} pending` : ""}`
    : pending > 0
      ? `${pending} pending change${pending === 1 ? "" : "s"}`
      : lastSync
        ? `Last sync: ${new Date(lastSync).toLocaleString()}`
        : "Up to date";

  return (
    <div className="flex items-center gap-4 px-4 py-3.5">
      <ArrowPathIcon className={`h-4 w-4 shrink-0 text-muted-foreground ${syncing || busy ? "animate-spin" : ""}`} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-foreground/80">Offline & Sync</p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <Button
        type="button"
        variant="quiet"
        size="xs"
        onClick={onSync}
        disabled={busy || syncing}
        className="normal-case"
      >
        {busy || syncing ? "Syncing…" : "Sync now"}
      </Button>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────*/

export default function Profile() {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { usage, loading: usageLoading } = usePlanGate();
  const { t } = useLanguage();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);

  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

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
      toast({ title: "Backup downloaded successfully" });
    } catch (e: any) {
      toast({ title: "Export failed", description: e?.message ?? "Please try again", variant: "destructive" });
    } finally {
      setExporting(false);
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
      { label: "Notes", current: usage?.notesCount ?? 0, max: limits.maxNotes, suffix: "" },
      { label: "Entities", current: usage?.entitiesCount ?? 0, max: limits.maxEntities, suffix: "" },
      { label: "Vault Storage", current: usage?.vaultSizeMB ?? 0, max: limits.maxVaultSizeMB, suffix: " MB" },
    ],
    [usage, limits],
  );

  const planDetails = useMemo(
    () => [
      { label: "Vault Limit", value: isUnlimited(limits.maxVaultSizeMB) ? "Unlimited" : `${limits.maxVaultSizeMB} MB` },
      { label: "Upload Metadata", value: isUnlimited(limits.maxMetadataSizeKb ?? -1) ? "Unlimited" : `${limits.maxMetadataSizeKb} KB` },
      { label: "History", value: isUnlimited(limits.historyDays) ? "Unlimited" : `${limits.historyDays} days` },
    ],
    [limits],
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await authApi.updateMe({ username, name: username });
      await refreshUser();
      toast({ title: "Profile updated" });
    } catch (err: any) {
      toast({
        title: "Error saving profile",
        description: err.response?.data?.message || "Please try again",
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

  const initials = (user?.username || user?.email || "?").slice(0, 1).toUpperCase();

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-6 sm:px-6 lg:px-12 lg:py-14">

        {/* IDENTITY HEADER */}
        <header className="flex items-center gap-4 border-b border-border pb-6">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent font-serif text-xl text-foreground">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-serif text-3xl tracking-tight text-foreground sm:text-4xl">
              {user?.username || t("profile_title")}
            </h1>
            <p className="mt-1 truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <Badge variant="meta" className="shrink-0">{currentPlan}</Badge>
        </header>

        {/* ACCOUNT */}
        <section className="space-y-4">
          <SectionTitle eyebrow={t("profile_settings")} title={t("profile_accountDetails")} />

          <Card variant="faint">
            <CardContent className="space-y-5 p-4 sm:p-6">
              <div className="space-y-2">
                <Label htmlFor="profile-username" className="text-xs text-muted-foreground">{t("profile_username")}</Label>
                <div className="relative">
                  <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="profile-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t("profile_usernamePlaceholder")}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-email" className="text-xs text-muted-foreground">{t("profile_emailAddress")}</Label>
                <div className="relative">
                  <EnvelopeIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="profile-email"
                    type="email"
                    value={email}
                    readOnly
                    className="cursor-not-allowed pl-9 pr-20 text-muted-foreground"
                  />
                  <Badge variant="meta" className="absolute right-2 top-1/2 -translate-y-1/2">Google</Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                <div>
                  <p className="text-xs text-muted-foreground">{t("profile_currentPlan")}</p>
                  <p className="mt-1 text-sm font-medium text-foreground/80">{currentPlan}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("profile_memberSince")}</p>
                  <p className="mt-1 text-sm font-medium text-foreground/80">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—"}
                  </p>
                </div>
              </div>

              <Button
                onClick={() => setSaveConfirmOpen(true)}
                disabled={saving || !username.trim()}
                className="w-full gap-2 normal-case"
              >
                {saving && <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />}
                {t("profile_saveChanges")}
              </Button>

              <Button
                variant="outline"
                onClick={() => setSubscriptionOpen(true)}
                className="w-full gap-2 normal-case"
              >
                {t("nav_subscription")}
              </Button>

              <SubscriptionModal open={subscriptionOpen} onOpenChange={setSubscriptionOpen} />


              <ConfirmDialog
                open={saveConfirmOpen}
                onOpenChange={setSaveConfirmOpen}
                title={t("profile_saveConfirmTitle")}
                description={t("profile_saveConfirmDesc")}
                confirmText={t("common_save")}
                onConfirm={async () => {
                  setSaveConfirmOpen(false);
                  await handleSave();
                }}
              />
            </CardContent>
          </Card>
        </section>

        {/* PREFERENCES */}
        <section className="space-y-4">
          <SectionTitle eyebrow={t("profile_settings")} title={t("profile_prefsAppearance")} />

          <Card variant="faint">
            <CardContent className="divide-y divide-border p-0">
              <div className="px-4">
                <LanguageSelector />
              </div>
              <SettingRow
                icon={CalendarIcon}
                title={t("profile_history")}
                subtitle={limits.historyDays === -1 ? t("common_unlimited") : t("profile_historyDays", { n: limits.historyDays })}
              />
              <SettingRow
                icon={LockClosedIcon}
                title={t("profile_securityLayer")}
                subtitle={t("profile_securityLayerDesc")}
              />
              <SettingRow
                icon={ShieldCheckIcon}
                title={t("profile_secureAuth")}
                subtitle={t("profile_secureAuthDesc")}
              />
              <OfflineSyncRow />
            </CardContent>
          </Card>
        </section>

        {/* DATA */}
        <section className="space-y-4">
          <SectionTitle eyebrow={t("profile_settings")} title={t("profile_exportData")} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Card variant="faint">
              <CardContent className="space-y-3 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <ArrowUpTrayIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-foreground/80">{t("profile_importMd")}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{t("profile_importMdDesc")}</p>
                  </div>
                </div>
                <Button variant="outline" onClick={() => setImportOpen(true)} className="w-full normal-case">
                  {t("profile_importMdBtn")}
                </Button>
              </CardContent>
            </Card>

            <Card variant="faint">
              <CardContent className="space-y-3 p-4 sm:p-5">
                <div className="flex items-start gap-3">
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
                    className="w-full gap-2 normal-case"
                  >
                    <ArrowDownTrayIcon className="h-3.5 w-3.5" />
                    {exporting ? t("profile_exporting") : t("profile_downloadBackup")}
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">{t("profile_locked")}</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card variant="faint">
            <CardContent className="p-4 sm:p-5">
              <InstallAppButton />
            </CardContent>
          </Card>
        </section>

        {/* PLAN & USAGE */}
        <section className="space-y-4">
          <SectionTitle eyebrow={currentPlan} title={t("profile_planUsage")} />

          {usageLoading && !usage ? (
            <div className="flex justify-center py-12">
              <ArrowPathIcon className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              {usageResources.map((resource) => {
                const unlimited = resource.max === -1;
                const percent = unlimited ? 100 : Math.min((resource.current / resource.max) * 100, 100);
                return (
                  <Card key={resource.label} variant="faint">
                    <CardContent className="space-y-3 p-4 sm:p-5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-foreground/80">{resource.label}</span>
                        <span className="font-mono text-xs tabular-nums text-muted-foreground">
                          {unlimited ? "∞" : `${resource.current.toFixed(resource.suffix ? 1 : 0)} / ${resource.max}${resource.suffix}`}
                        </span>
                      </div>
                      <Progress value={unlimited ? 0 : percent} className="h-[2px] rounded-none bg-accent" />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            {planDetails.map((detail) => (
              <Card key={detail.label} variant="faint">
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <span className="text-xs text-muted-foreground">{detail.label}</span>
                  <span className="font-mono text-xs tabular-nums text-foreground/80">{detail.value}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* HELP & SUPPORT */}
        <section className="space-y-4">
          <SectionTitle eyebrow={t("profile_settings")} title={t("profile_supportCenter")} />

          <Card variant="faint" className="w-full">
            <CardContent className="divide-y divide-border p-0">
              <a href="#/support" className="flex items-center gap-4 px-4 py-3.5 w-full">
                <LifebuoyIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground/80">{t("profile_supportCenter")}</p>
                  <p className="truncate text-xs text-muted-foreground">{t("profile_supportCenterDesc")}</p>
                </div>
                <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              </a>
              <a
                href="mailto:feedback@continuum.onl?subject=Continuum%20%E2%80%94%20Feedback"
                className="flex items-center gap-4 px-4 py-3.5 w-full"
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
                className="flex items-center gap-4 px-4 py-3.5 w-full"
              >
                <BugAntIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground/80">{t("profile_reportBug")}</p>
                  <p className="truncate text-xs text-muted-foreground">bugs@continuum.onl</p>
                </div>
                <ChevronRightIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              </a>
            </CardContent>
          </Card>
        </section>

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
