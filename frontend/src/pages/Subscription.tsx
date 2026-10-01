import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import AppLayout from "@/components/AppLayout";
import api, { plansApi, subscriptionApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { isUnlimited } from "@/lib/plan";
import { type Plan, type PlanLimits } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  ArrowPathIcon,
  ArrowRightIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";

const MotionCard = motion(Card);

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
  const [loading, setLoading] = useState(true);
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
      .catch(() => {})
      .finally(() => setLoading(false));
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
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-2xl flex-col px-5 py-8 sm:px-8 sm:py-14">
        {/* HEADER */}
        <header className="mb-8 sm:mb-12">
          <p className="text-[10px] uppercase tracking-[0.32em] text-white/30">
            {t("bill_plans_billing")}
          </p>
          <h1 className="mt-3 font-serif text-4xl leading-tight tracking-tight text-white sm:text-5xl">
            {t("bill_subscription")}
          </h1>
          <p className="mt-3 text-sm text-white/50">
            {t("bill_one_tier")}
          </p>
        </header>

        {/* POST-CHECKOUT SYNC */}
        {syncing && (
          <div className="mb-6 border-t border-white/10 pt-5 text-[11px] uppercase tracking-[0.24em] text-white/40">
            <span className="mr-2 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white/60 align-middle" />
            Confirming your payment with Stripe…
          </div>
        )}

        {/* CURRENT STATUS */}
        {!loading && sub && (
          <div className="mb-8 flex items-baseline gap-6 border-t border-white/10 pt-5 sm:mb-10">
            <div className="flex items-baseline gap-2">
              <span className="text-[10px] uppercase tracking-[0.28em] text-white/30">
                {t("bill_current")}
              </span>
              <span className="text-sm text-white/90">
                {isPro ? "VISION" : "FREE"}
              </span>
              <span className="text-xs text-white/30">· {sub.status.toLowerCase()}</span>
            </div>
            
            {isPro && (
              <Button
                variant="link"
                size="sm"
                onClick={handlePortal}
                disabled={portalLoading}
                className="text-white/40 hover:text-white/70"
              >
                {portalLoading ? t("bill_opening") : t("bill_manage_billing")}
              </Button>
            )}
          </div>
        )}

        {/* VISION CARD */}
        <MotionCard
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
          variant="subtle"
          className="relative flex-1 overflow-hidden"
        >
          {/* subtle top gradient */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
          />

          <CardHeader className="pt-8 sm:pt-12">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.32em] text-white/40">
                  Continuum
                </p>
                <h2 className="mt-2 font-serif text-4xl tracking-tight text-white sm:text-5xl">
                  VISION
                </h2>
              </div>
              <div className="text-right">
                <p className="font-serif text-3xl text-white sm:text-4xl">$7.90</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.28em] text-white/40">
                  {t("bill_per_month")}
                </p>
              </div>
            </div>

            <p className="mt-6 max-w-md text-sm leading-relaxed text-white/55">
              {t("bill_vision_tagline")}
            </p>
          </CardHeader>

          <CardContent className="space-y-8">
            <ul className="space-y-3 border-t border-white/10 pt-6">
              {VISION_BENEFITS.map((b, i) => (
                <motion.li
                  key={b}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.15 + i * 0.05, ease: "easeOut" }}
                  className="flex items-start gap-3 text-sm text-white/75"
                >
                  <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/40" />
                  <span>{b}</span>
                </motion.li>
              ))}
            </ul>

            {visionLimits && (
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-white/10 pt-6 text-xs sm:grid-cols-4">
                {[
                  { k: t("bill_notes"), v: formatLimit(visionLimits.maxNotes ?? -1) },
                  { k: t("bill_entities"), v: formatLimit(visionLimits.maxEntities ?? -1) },
                  { k: t("bill_vault"), v: formatLimit(visionLimits.maxVaultSizeMB ?? -1, " MB") },
                  { k: t("bill_history"), v: formatLimit(((visionLimits as any)?.maxHistoryDays ?? visionLimits?.historyDays) ?? -1, "d") },
                ].map((row) => (
                  <div key={row.k}>
                    <dt className="text-[10px] uppercase tracking-[0.22em] text-white/30">
                      {row.k}
                    </dt>
                    <dd className="mt-1 font-serif text-lg tabular-nums text-white/85">
                      {row.v}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </CardContent>

          <CardFooter className="flex-col items-stretch gap-3 pt-0">
            {isPro ? (
              <div className="flex h-11 items-center justify-center rounded-sm border border-dashed border-white/10 text-[11px] uppercase tracking-[0.28em] text-white/40">
                {t("bill_active")}
              </div>
            ) : (
              <Button
                type="button"
                variant="white"
                size="lg"
                onClick={handleCheckout}
                disabled={checkoutLoading}
                className="group w-full justify-center gap-2"
              >
                {checkoutLoading ? (
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {t("bill_upgrade_to_vision")}
                    <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </Button>
            )}

            <p className="text-center text-[10px] uppercase tracking-[0.22em] text-white/30">
              {t("bill_cancel_secure")}
            </p>
          </CardFooter>
        </MotionCard>
      </div>
    </AppLayout>
  );
}
