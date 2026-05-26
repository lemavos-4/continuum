import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/lib/api";
import { usePlanGate } from "@/hooks/usePlanGate";
import { getCurrentPlan, getPlanLimits } from "@/lib/plan";
import { Button } from "@/components/ui/button";
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
  SunIcon,
  MoonIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "@/contexts/ThemeContext";

const formatLimitValue = (value: number, suffix = "") => (value === -1 ? "Unlimited" : `${value}${suffix}`);

export default function Profile() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const { usage, loading: usageLoading } = usePlanGate();
  const { theme, setTheme } = useTheme();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);

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
      { label: "Vault Limit", value: limits.maxVaultSizeMB === -1 ? "Unlimited" : `${limits.maxVaultSizeMB} MB` },
      { label: "Upload Metadata", value: limits.maxMetadataSizeKb === -1 ? "Unlimited" : `${limits.maxMetadataSizeKb} KB` },
      { label: "Version History", value: limits.historyDays === -1 ? "Unlimited" : `${limits.historyDays} days` },
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

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl px-6 py-10 lg:px-12 lg:py-16 space-y-12">

        {/* HEADER */}
        <header>
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">Settings</p>
          <h1 className="mt-2 font-serif text-5xl tracking-tight text-white">Profile</h1>
          <p className="mt-2 text-sm text-white/50">Manage your account credentials and application preferences.</p>
        </header>

        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">

          {/* ACCOUNT SECTION */}
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-semibold text-white/80">Account Details</h2>
            </div>

            <div className="space-y-5 border border-white/5 bg-white/[0.01] p-6 rounded-sm">
              <div className="space-y-2">
                <Label htmlFor="profile-username" className="text-xs text-white/40">Username</Label>
                <div className="relative">
                  <UserIcon className="absolute left-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                  <Input
                    id="profile-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Your username"
                    className="w-full border-0 border-b border-white/10 bg-transparent pl-6 rounded-none text-sm text-white placeholder:text-white/20 focus:border-white/40 focus:outline-none focus:ring-0 focus-visible:ring-0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-email" className="text-xs text-white/40">Email Address</Label>
                <div className="relative">
                  <EnvelopeIcon className="absolute left-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/20" />
                  <Input
                    id="profile-email"
                    type="email"
                    value={email}
                    readOnly
                    className="w-full border-0 border-b border-white/5 bg-transparent pl-6 pr-16 rounded-none text-sm text-white/45 cursor-not-allowed focus:outline-none focus:ring-0"
                  />
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 text-[10px] text-white/40 bg-white/[0.04] border border-white/5 px-1.5 py-0.5 rounded-sm">
                    Google
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/[0.04]">
                <div className="hidden">
                  <p className="text-xs text-white/30">Current Plan</p>
                  <p className="mt-1 text-sm font-medium text-white/70">{currentPlan}</p>
                </div>
                <div>
                  <p className="text-xs text-white/30">Member Since</p>
                  <p className="mt-1 text-sm font-medium text-white/70">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSaveConfirmOpen(true)}
                disabled={saving || !username.trim()}
                className="flex items-center justify-center gap-2 w-full h-9 border border-white/15 bg-transparent hover:border-white/40 text-white/80 hover:text-white rounded-sm text-sm font-medium transition-colors disabled:opacity-40 mt-4"
              >
                {saving && <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />}
                Save changes
              </button>

              <ConfirmDialog
                open={saveConfirmOpen}
                onOpenChange={setSaveConfirmOpen}
                title="Save profile changes?"
                description="Your username will be updated across your account network."
                confirmText="Save"
                onConfirm={async () => {
                  setSaveConfirmOpen(false);
                  await handleSave();
                }}
              />
            </div>

            <div className="flex items-center gap-3 border border-white/5 bg-white/[0.01] p-4 rounded-sm">
              <ShieldCheckIcon className="h-4 w-4 text-white/40 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-white/70">Secure Authentication</p>
                <p className="text-xs text-white/30 truncate">Verified and connected via Google Sign-In.</p>
              </div>
            </div>
          </div>

          {/* PREFERENCES SECTION */}
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-semibold text-white/80">Preferences & Appearance</h2>
            </div>

            <div className="border-t border-b border-white/5 divide-y divide-white/[0.04] dark:border-white/5 light:border-black/5">
              <div className="flex items-center gap-4 py-4">
                <CalendarIcon className="h-4 w-4 text-foreground/30 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-foreground/70">History Retention</p>
                  <p className="text-xs text-foreground/30">{formatLimitValue(limits.historyDays, " days")}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 py-4">
                <LockClosedIcon className="h-4 w-4 text-foreground/30 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-foreground/70">Security Layer</p>
                  <p className="text-xs text-foreground/30">Active session tokens are isolated and protected.</p>
                </div>
              </div>
            </div>
          </div>

          {/* LIMITS SECTION */}
          <section className="hidden space-y-6 pt-4 border-t border-white/5 lg:col-span-2">
            <div>
              <h2 className="text-sm font-semibold text-white/80">Plan Usage & Limits</h2>
            </div>

            {usageLoading && !usage ? (
              <div className="flex justify-center py-12">
                <ArrowPathIcon className="w-5 h-5 animate-spin text-white/20" />
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-3">
                {usageResources.map((resource) => {
                  const unlimited = resource.max === -1;
                  const percent = unlimited ? 100 : Math.min((resource.current / resource.max) * 100, 100);

                  return (
                    <div key={resource.label} className="border border-white/5 bg-white/[0.01] p-5 rounded-sm space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-white/80">{resource.label}</span>
                        <span className="text-xs text-white/40 tabular-nums">
                          {unlimited ? "∞" : `${resource.current.toFixed(resource.suffix ? 1 : 0)} / ${resource.max}${resource.suffix}`}
                        </span>
                      </div>
                      <Progress value={unlimited ? 0 : percent} className="h-[2px] bg-white/5 rounded-none" />
                    </div>
                  );
                })}
              </div>
            )}

            {/* PLAN DETAILS */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {planDetails.map((detail) => (
                <div key={detail.label} className="border border-white/5 bg-white/[0.01] p-4 flex items-center justify-between gap-3 text-xs rounded-sm">
                  <span className="text-white/40 text-xs">{detail.label}</span>
                  <span className="text-xs text-white/70 tabular-nums">{detail.value}</span>
                </div>
              ))}

              <div className="border border-white/5 bg-white/[0.01] p-4 flex items-center justify-between gap-3 text-xs rounded-sm">
                <span className="text-white/40 text-xs">Export Data</span>
                {user?.dataExport ? (
                  <button
                    type="button"
                    onClick={handleExportData}
                    disabled={exporting}
                    className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white underline underline-offset-4 disabled:opacity-40 transition-colors"
                  >
                    <ArrowDownTrayIcon className="w-3 h-3" />
                    {exporting ? "Exporting…" : "Download Backup"}
                  </button>
                ) : (
                  <span className="text-white/20 text-xs">Locked</span>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppLayout>
  );
}