import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import AppLayout from "@/components/AppLayout";
import api, { plansApi, subscriptionApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { isUnlimited } from "@/lib/plan";
import { type Plan, type PlanLimits } from "@/types";
import { cn } from "@/lib/utils";
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

// Only PRO benefits — no AI, no yearly mentions
const VISION_BENEFITS = [
  "Unlimited notes & entities",
  "Unlimited history",
  "4096MB Storage",
  "Data export",
  "Priority email support",
];

export default function Subscription() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sub, setSub] = useState<SubInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [plans, setPlans] = useState<Array<{ plan: Plan; limits: PlanLimits; priceId?: string }>>([]);
  const [prices, setPrices] = useState<{ monthly?: string }>({});

  useEffect(() => {
    subscriptionApi.me()
      .then(({ data }) => setSub(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    plansApi.list().then(({ data }) => setPlans(data || [])).catch(() => {});
    api.get("/api/plans/prices")
      .then(({ data }) => setPrices({ monthly: data?.vision?.monthly }))
      .catch(() => {});
  }, []);

  const currentPlan = ((sub?.effectivePlan || user?.plan) as Plan) || "FREE";
  const isPro = currentPlan === "VISION";

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
        title: "Error",
        description: err.response?.data?.message || "Please try again",
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
        title: "Error",
        description: err.response?.data?.message || "Could not open portal",
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
            Plans & Billing
          </p>
          <h1 className="mt-3 font-serif text-4xl leading-tight tracking-tight text-white sm:text-5xl">
            Subscription
          </h1>
          <p className="mt-3 text-sm text-white/50">
            One tier. Everything unlocked.
          </p>
        </header>

        {/* CURRENT STATUS */}
        {!loading && sub && (
          <div className="mb-8 flex items-baseline gap-6 border-t border-white/10 pt-5 sm:mb-10">
            <div className="flex items-baseline gap-2">
              <span className="text-[10px] uppercase tracking-[0.28em] text-white/30">
                Current
              </span>
              <span className="text-sm text-white/90">
                {isPro ? "PRO" : "FREE"}
              </span>
              <span className="text-xs text-white/30">· {sub.status.toLowerCase()}</span>
            </div>
            
            {isPro && (
              <button
                onClick={handlePortal}
                disabled={portalLoading}
                className="text-[11px] uppercase tracking-[0.22em] text-white/40 underline underline-offset-4 transition-colors hover:text-white/70 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {portalLoading ? "Opening..." : "Manage billing"}
              </button>
            )}
          </div>
        )}

        {/* PRO CARD */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
          className="relative flex-1 overflow-hidden rounded-sm border border-white/15 bg-white/[0.02]"
        >
          {/* subtle top gradient */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
          />

          <div className="px-6 pt-8 pb-6 sm:px-10 sm:pt-12 sm:pb-10">
            {/* Plan header */}
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
                  per month
                </p>
              </div>
            </div>

            <p className="mt-6 max-w-md text-sm leading-relaxed text-white/55">
              Remove every limit. Build your second brain without ceilings.
            </p>

            {/* Benefits */}
            <ul className="mt-8 space-y-3 border-t border-white/10 pt-6">
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

            {/* Limits matrix */}
            {visionLimits && (
              <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-white/10 pt-6 text-xs sm:grid-cols-4">
                {[
                  { k: "Notes", v: formatLimit(visionLimits.maxNotes) },
                  { k: "Entities", v: formatLimit(visionLimits.maxEntities) },
                  { k: "Vault", v: formatLimit(visionLimits.maxVaultSizeMB, " MB") },
                  { k: "History", v: formatLimit(visionLimits.maxHistoryDays, "d") }, // <-- Modificado aqui
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

            {/* CTA */}
            <div className="mt-10">
              {isPro ? (
                <div className="flex h-11 items-center justify-center rounded-sm border border-dashed border-white/10 text-[11px] uppercase tracking-[0.28em] text-white/40">
                  Active
                </div>
              ) : (
                <button
                  onClick={handleCheckout}
                  disabled={checkoutLoading}
                  className={cn(
                    "group flex h-11 w-full items-center justify-center gap-2 rounded-sm border border-white bg-white text-[11px] uppercase tracking-[0.28em] text-black transition-all",
                    "hover:bg-transparent hover:text-white disabled:cursor-not-allowed disabled:opacity-50",
                  )}
                >
                  {checkoutLoading ? (
                    <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      Upgrade to VISION
                      <ArrowRightIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              )}
              <p className="mt-4 text-center text-[10px] uppercase tracking-[0.22em] text-white/30">
                Cancel anytime · Secure checkout
              </p>
            </div>
          </div>
        </motion.section>
      </div>
    </AppLayout>
  );
}
