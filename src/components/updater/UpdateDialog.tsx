import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAppUpdater } from "@/hooks/useAppUpdater";

/** Server-driven update invitation. Mandatory updates cannot be dismissed. */
export default function UpdateDialog() {
  const { t } = useLanguage();
  const { open, phase, mandatory, progress, installed, latest, notes, startUpdate, openSettings, dismiss } =
    useAppUpdater();

  if (!open) return null;

  const busy = phase === "downloading" || phase === "installing";
  const locked = mandatory || busy;

  return (
    <Dialog open onOpenChange={(next) => !next && !locked && dismiss()}>
      <DialogContent className="max-w-sm" hideClose={locked}>
        <DialogHeader>
          <DialogTitle>{mandatory ? t("upd_requiredTitle") : t("upd_title")}</DialogTitle>
          <DialogDescription>
            {mandatory ? t("upd_requiredDesc", { version: latest }) : t("upd_desc", { version: latest })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>{t("upd_current")}</span>
            <span className="font-mono text-foreground">{installed || "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>{t("upd_new")}</span>
            <span className="font-mono text-foreground">{latest || "—"}</span>
          </div>
          {notes && <p className="pt-1">{notes}</p>}
        </div>

        {phase === "downloading" && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{t("upd_downloading")}</p>
            <div className="h-1 w-full overflow-hidden rounded-full bg-foreground/10">
              <div className="h-full bg-foreground transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {phase === "installing" && <p className="text-sm text-muted-foreground">{t("upd_installing")}</p>}
        {phase === "permission" && <p className="text-sm text-muted-foreground">{t("upd_permission")}</p>}
        {phase === "failed" && <p className="text-sm text-destructive">{t("upd_failed")}</p>}

        <div className="flex justify-end gap-2 pt-2">
          {!locked && (
            <Button variant="ghost" onClick={dismiss}>
              {t("upd_later")}
            </Button>
          )}
          {phase === "permission" ? (
            <Button onClick={openSettings}>{t("upd_openSettings")}</Button>
          ) : (
            <Button onClick={startUpdate} disabled={busy}>
              {t("upd_now")}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
