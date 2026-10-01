import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { subscriptionApi } from "@/lib/api";
import { Loader2 } from "@/lib/heroicons";
import { useLanguage } from "@/contexts/LanguageContext";

interface UpgradeModalProps { open: boolean; onOpenChange: (open: boolean) => void; reason?: string; }

export default function UpgradeModal({ open, onOpenChange, reason }: UpgradeModalProps) {
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();

  const VISION_FEATURES = [
    t("bill_feature_unlimited_entities"),
    t("bill_feature_unlimited_notes"),
    t("bill_feature_unlimited_history"),
    t("bill_feature_vault_storage"),
    t("bill_feature_advanced_metrics"),
    t("bill_feature_export_calendar"),
  ];

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const { data } = await subscriptionApi.checkout("VISION");
      if (data?.url) window.location.href = data.url;
    } catch {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="hidden max-w-md border-white/10 bg-black/95 backdrop-blur-xl">
        <DialogHeader>
          <p className="text-[10px] uppercase tracking-[0.32em] text-white/40">{t("bill_upgrade")}</p>
          <DialogTitle className="font-serif text-3xl tracking-tight text-white">
            {t("bill_unlock_vision")}
          </DialogTitle>
          <DialogDescription className="text-sm text-white/50">
            {reason || t("bill_free_limit_reached")}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-4 rounded-sm border border-white/15 bg-white/[0.02] p-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.32em] text-white/40">Vision</p>
            <p className="mt-1 font-serif text-3xl text-white">
              $49<span className="text-xs text-white/40">/mo</span>
            </p>
          </div>
          <ul className="space-y-1.5 border-t border-white/10 pt-3">
            {VISION_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-xs text-white/60">
                <span aria-hidden className="mt-2 h-px w-2 bg-white/40" /> {f}
              </li>
            ))}
          </ul>
          <button
            disabled={loading}
            onClick={handleCheckout}
            className="flex w-full items-center justify-center gap-2 rounded-sm border border-white bg-white px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-black transition-colors hover:bg-white/90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("bill_upgrade_to_vision")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
