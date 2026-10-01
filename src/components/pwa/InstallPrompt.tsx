import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePwaInstall } from "@/hooks/usePwaInstall";

const DISMISS_KEY = "pwa_install_dismissed_at";
const DISMISS_DAYS = 14;

function recentlyDismissed() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    return Date.now() - Number(raw) < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

/** Auto-surfacing install invitation, shown once per two weeks on the landing page. */
export default function InstallPrompt({ delayMs = 4000 }: { delayMs?: number }) {
  const { t } = useLanguage();
  const { available, canInstall, isIos, promptInstall } = usePwaInstall();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!available || recentlyDismissed()) return;
    const id = window.setTimeout(() => setOpen(true), delayMs);
    return () => window.clearTimeout(id);
  }, [available, delayMs]);

  const close = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  if (!available) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : close())}>
      <DialogContent className="w-[calc(100%-1.5rem)] sm:max-w-sm rounded-2xl border-[hsl(var(--popup-border))] bg-[hsl(var(--popup-background))] text-[hsl(var(--popup-foreground))]">
        <DialogHeader className="text-left space-y-2">
          <DialogTitle className="text-xl font-serif tracking-tight">
            {canInstall ? t("pwa_title") : t("pwa_ios_title")}
          </DialogTitle>
          <DialogDescription className="text-sm text-[hsl(var(--popup-muted))]">
            {canInstall ? t("pwa_desc") : t("pwa_ios_desc")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 pt-2">
          <Button variant="ghost" className="flex-1" onClick={close}>
            {t("pwa_later")}
          </Button>
          {canInstall && (
            <Button
              className="flex-1"
              onClick={async () => {
                await promptInstall();
                close();
              }}
            >
              {t("pwa_install")}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
