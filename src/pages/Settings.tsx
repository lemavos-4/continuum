import { useEffect, useState, type ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import SubscriptionContent from "@/components/subscription/SubscriptionContent";
import { useAuth } from "@/contexts/AuthContext";
import { authApi, importApi } from "@/lib/api";
import { version } from "@/lib/version";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ArrowDownTrayIcon, ArrowPathIcon, ArrowUpTrayIcon, ChatBubbleLeftEllipsisIcon, ChevronRightIcon, CodeBracketIcon, BugAntIcon, LifebuoyIcon, LinkIcon, InformationCircleIcon, CurrencyDollarIcon, DocumentTextIcon, ShieldCheckIcon, ClockIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import MarkdownImportDialog from "@/components/import/MarkdownImportDialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSelector } from "@/components/LanguageSelector";

function SectionTitle({ title }: { eyebrow?: string; title: string }) {
  return <h2 className="font-serif text-xl text-foreground">{title}</h2>;
}

type RowIcon = ComponentType<{ className?: string }>;
function ActionRow({ icon: Icon, label, description, onClick, href, disabled = false }: { icon: RowIcon; label: string; description?: string; onClick?: () => void; href?: string; disabled?: boolean }) {
  const content = <><Icon className="h-5 w-5 shrink-0 text-muted-foreground" /><span className="min-w-0 flex-1 text-left"><span className="block text-sm font-medium text-foreground/80">{label}</span>{description && <span className="mt-0.5 block truncate text-xs text-muted-foreground">{description}</span>}</span><ChevronRightIcon className="h-4 w-4 shrink-0 text-muted-foreground" /></>;
  const className = "flex h-16 w-full items-center gap-4 border-b border-border/10 py-0 transition-colors last:border-b-0 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60";
  return href ? <a href={href} className={className}>{content}</a> : <button type="button" onClick={onClick} disabled={disabled} className={className}>{content}</button>;
}

function VisionIcon({ className }: { className?: string }) {
  return <img src="/vision-symbol.png" alt="" aria-hidden="true" className={`${className ?? ""} rounded-full object-cover`} />;
}

const moreLinks = [
  { href: "/about", icon: InformationCircleIcon, label: "lp_footer_about" }, { href: "/pricing", icon: CurrencyDollarIcon, label: "lp_footer_pricing" }, { href: "/support", icon: LifebuoyIcon, label: "lp_footer_support" }, { href: "/terms", icon: DocumentTextIcon, label: "lp_footer_terms" }, { href: "/privacy", icon: ShieldCheckIcon, label: "lp_footer_privacy" }, { href: "/versions", icon: ClockIcon, label: "versions_title" },
] as const;

export default function SettingsPage() {
  const { user, refreshUser, logout } = useAuth(); const navigate = useNavigate(); const { toast } = useToast(); const { t } = useLanguage();
  const [username, setUsername] = useState(""); const [exporting, setExporting] = useState(false); const [relinking, setRelinking] = useState(false); const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false); const [importOpen, setImportOpen] = useState(false); const [subscriptionOpen, setSubscriptionOpen] = useState(() => new URLSearchParams(window.location.search).has("status"));
  useEffect(() => { setUsername(user?.username ?? ""); }, [user]);
  const handleExportData = async () => { if (exporting) return; setExporting(true); try { const res = await authApi.exportData(); const json = typeof res.data === "string" ? res.data : JSON.stringify(res.data, null, 2); const url = URL.createObjectURL(new Blob([json], { type: "application/json" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "continuum-backup.json"; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url); toast({ title: t("profile_backupOk") }); } catch (error: any) { toast({ title: t("profile_backupFailed"), description: error?.message ?? t("common_tryAgain"), variant: "destructive" }); } finally { setExporting(false); } };
  const handleRelinkEntities = async () => { if (relinking) return; setRelinking(true); try { const res = await importApi.relinkEntities(); const data = res.data as { notesUpdated?: number; connectionsCreated?: number }; toast({ title: t("import_relinkDoneTitle"), description: t("import_relinkDoneDesc", { n: data.connectionsCreated ?? 0, notes: data.notesUpdated ?? 0 }) }); } catch (error: any) { toast({ title: t("profile_relinkFailed"), description: error?.response?.data?.message || error?.message || t("profile_relinkFailedDesc"), variant: "destructive" }); } finally { setRelinking(false); } };
  const handleLogout = async () => { await logout(); navigate("/"); };

  return <AppLayout><div className="mx-auto max-w-5xl space-y-7 px-4 py-6 sm:px-6 lg:px-10 lg:py-12">
    <section className="space-y-4"><SectionTitle title={t("profile_planUsage")} /><div className="divide-y divide-border/10"><ActionRow icon={VisionIcon} label={t("profile_continuumSubscription")} onClick={() => setSubscriptionOpen(true)} /></div></section>
    <section className="space-y-4"><SectionTitle eyebrow={t("profile_eyebrowData")} title={t("profile_dataSync")} /><div className="divide-y divide-border/10"><ActionRow icon={ArrowUpTrayIcon} label={t("profile_importMd")} description={t("profile_importMdDesc")} onClick={() => setImportOpen(true)} /><ActionRow icon={ArrowDownTrayIcon} label={t("profile_exportData")} description={user?.dataExport ? "continuum-backup.json" : t("profile_locked")} onClick={handleExportData} disabled={exporting || !user?.dataExport} /><ActionRow icon={LinkIcon} label={t("import_relinkBtn")} description={t("profile_relinkDesc")} onClick={handleRelinkEntities} disabled={relinking} /></div></section>
    <section className="space-y-4"><SectionTitle eyebrow={t("profile_eyebrowSupport")} title={t("profile_supportCenter")} /><div className="divide-y divide-border/10"><ActionRow icon={LifebuoyIcon} label={t("profile_supportCenter")} description={t("profile_supportCenterDesc")} href="/support" /><ActionRow icon={ChatBubbleLeftEllipsisIcon} label={t("profile_sendFeedback")} description="feedback@continuum.onl" href="mailto:feedback@continuum.onl?subject=Continuum%20%E2%80%94%20Feedback" /><ActionRow icon={BugAntIcon} label={t("profile_reportBug")} description="bugs@continuum.onl" href="mailto:bugs@continuum.onl?subject=Continuum%20%E2%80%94%20Bug%20report" /></div></section>
    <section className="space-y-4"><SectionTitle eyebrow={t("nav_more")} title={t("nav_more")} /><div className="divide-y divide-border/10"><LanguageSelector /><ActionRow href="/editor" icon={PencilSquareIcon} label={t("nav_editorSettings")} />{moreLinks.map(({ href, icon: Icon, label }) => <ActionRow key={href} href={href} icon={Icon} label={label === "versions_title" ? "Versions" : t(label)} />)}<ActionRow href="https://github.com/continuumnodes/continuum" icon={CodeBracketIcon} label="GitHub" /></div></section>
    <Button variant="destructive" onClick={() => setLogoutConfirmOpen(true)} className="w-full normal-case">{t("nav_logout")}</Button><ConfirmDialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen} title={t("auth_signOut")} description={t("auth_signOutDesc")} confirmText={t("nav_logout")} destructive onConfirm={async () => { setLogoutConfirmOpen(false); await handleLogout(); }} /><div className="flex w-full justify-center pb-4 font-mono text-[10px] text-muted-foreground">{version}</div>
  </div><MarkdownImportDialog open={importOpen} onOpenChange={setImportOpen} onImported={() => { refreshUser(); }} />{subscriptionOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/70 p-0 backdrop-blur-md" role="dialog" aria-modal="true" onMouseDown={(event) => { const target = event.target as HTMLElement; if (!target.closest("[data-subscription-panel]")) setSubscriptionOpen(false); }}><div className="w-full"><SubscriptionContent /></div></div>}</AppLayout>;
}
