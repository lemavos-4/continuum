import { useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/AppLayout";
import api, { plansApi, subscriptionApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { isUnlimited } from "@/lib/plan";
import { type Plan, type PlanLimits } from "@/types";
import { Button } from "@/components/ui/button";
import {
  ArrowPathIcon,
  ArrowRightIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";

interface SubInfo {
  plan?: string;
  effectivePlan?: string;
  status: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
}

export default function Subscription() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [sub, setSub] = useState<SubInfo | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [plans, setPlans] = useState<Array<{ plan: Plan; limits: PlanLimits; priceId?: string }>>([]);
  const [prices, setPrices] = useState<{ monthly?: string }>({});

  // Only VISION benefits — no AI, no yearly mentions
  const VISION_BENEFITS = [
    t("bill_benefit_unlimited_notes_entities"),
    t("bill_benefit_unlimited_history"),
    t("bill_benefit_storage"),
    t("bill_benefit_data_export"),
    t("bill_benefit_priority_support"),
  ];

  useEffect(() => {
    subscriptionApi.me()
      .then(({ data }) => setSub(data))
      .catch(() => {});
  }, []);

  // Returning from Stripe Checkout: force a sync with Stripe instead of trusting
  // the webhook to have already landed (removes the checkout/webhook race).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("status") !== "success") return;

    let cancelled = false;
    setSyncing(true);

    const attempt = async (tries: number): Promise<void> => {
      if (cancelled) return;
      try {
        const { data } = await subscriptionApi.sync();
        if (cancelled) return;
        setSub(data);
        if (data?.effectivePlan && data.effectivePlan !== "FREE") {
          setSyncing(false);
          toast({ title: t("bill_success") || "Plan activated" });
          return;
        }
      } catch {
        /* keep retrying — reconciliation job is the final safety net */
      }
      if (tries <= 1) {
        setSyncing(false);
        return;
      }
      setTimeout(() => attempt(tries - 1), 2500);
    };

    attempt(5);
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    plansApi.list().then(({ data }) => setPlans(data || [])).catch(() => {});
    api.get("/api/plans/prices")
      .then(({ data }) => setPrices({ monthly: data?.vision?.monthly }))
      .catch(() => {});
  }, []);

  const currentPlan = ((sub?.effectivePlan || user?.plan) as Plan | string) || "FREE";
  const normalizedPlan = currentPlan === "PRO" ? ("VISION" as Plan) : (currentPlan as Plan);
  const isPro = normalizedPlan === "VISION";

  const visionLimits = useMemo(
    () => plans.find((p) => p.plan === "VISION")?.limits,
    [plans],
  );

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const { data } = await subscriptionApi.checkout(prices.monthly || "VISION");
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast({
        title: t("bill_error"),
        description: err.response?.data?.message || t("bill_try_again"),
        variant: "destructive",
      });
      setCheckoutLoading(false);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const { data } = await subscriptionApi.portal();
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast({
        title: t("bill_error"),
        description: err.response?.data?.message || t("bill_portal_error"),
        variant: "destructive",
      });
    } finally {
      setPortalLoading(false);
    }
  };

  const formatLimit = (val?: number, suffix = "") =>
    val === undefined ? "—" : isUnlimited(val) ? "∞" : `${val}${suffix}`;

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-lg px-5 py-8 sm:px-8 sm:py-12">
        <div className="continuum-popup-black rounded-2xl border border-[hsl(var(--popup-border))] bg-[hsl(var(--popup-background))] text-[hsl(var(--popup-foreground))] shadow-2xl">
          <div className="px-6 pb-6 pt-8 sm:px-8">
            <header>
              <p className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
                {t("bill_plans_billing")}
              </p>
              <div className="mt-2 flex items-start justify-between gap-4">
                <h1 className="font-serif text-4xl tracking-tight text-foreground">VISION</h1>
                <div className="text-right">
                  <p className="font-serif text-3xl text-foreground">$7.90</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                    {t("bill_per_month")}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {t("bill_vision_tagline")}
              </p>
            </header>

            {syncing && (
              <div className="mt-5 border-t border-border/10 pt-4 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                <span className="mr-2 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-foreground/60 align-middle" />
                Confirming your payment with Stripe…
              </div>
            )}

            <div className="mt-5 flex items-center justify-between gap-3 border-t border-border/10 pt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                  {t("bill_current")}
                </span>
                <span className="text-sm text-foreground">{isPro ? "VISION" : "FREE"}</span>
                {sub?.status && <span className="text-xs text-muted-foreground">· {sub.status.toLowerCase()}</span>}
              </div>
              {isPro && (
                <Button variant="quiet" size="xs" onClick={handlePortal} disabled={portalLoading} className="normal-case">
                  {portalLoading ? t("bill_opening") : t("bill_manage_billing")}
                </Button>
              )}
            </div>

            <ul className="mt-5 space-y-3 border-t border-border/10 pt-5">
              {VISION_BENEFITS.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3 text-sm text-foreground/80">
                  <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>

            {visionLimits && (
              <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-border/10 pt-5 text-xs sm:grid-cols-4">
                {[
                  { k: t("bill_notes"), v: formatLimit(visionLimits.maxNotes ?? -1) },
                  { k: t("bill_entities"), v: formatLimit(visionLimits.maxEntities ?? -1) },
                  { k: t("bill_vault"), v: formatLimit(visionLimits.maxVaultSizeMB ?? -1, " MB") },
                  { k: t("bill_history"), v: formatLimit(((visionLimits as any)?.maxHistoryDays ?? visionLimits?.historyDays) ?? -1, "d") },
                ].map((row) => (
                  <div key={row.k}>
                    <dt className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{row.k}</dt>
                    <dd className="mt-1 font-serif text-lg tabular-nums text-foreground/90">{row.v}</dd>
                  </div>
                ))}
              </dl>
            )}

            <div className="mt-6 space-y-3">
              {isPro ? (
                <div className="flex h-11 items-center justify-center rounded-sm border border-dashed border-border/10 text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                  {t("bill_active")}
                </div>
              ) : (
                <Button type="button" variant="white" size="lg" onClick={handleCheckout} disabled={checkoutLoading} className="group w-full justify-center gap-2">
                  {checkoutLoading ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <>{t("bill_upgrade_to_vision")}<ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></>}
                </Button>
              )}
              <p className="text-center text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                {t("bill_cancel_secure")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
