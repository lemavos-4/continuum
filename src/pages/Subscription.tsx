import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { plansApi, subscriptionApi, api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { isUnlimited } from "@/lib/plan";
import { type Plan, type PlanLimits } from "@/types";
import { cn } from "@/lib/utils";
import {
  CommandLineIcon,
  SparklesIcon,
  ArrowPathIcon,
  ArrowRightIcon,
  CheckIcon,
  CreditCardIcon,
} from "@heroicons/react/24/outline";

// Refined commercial text highlights and descriptions emphasizing value props
const planMeta: Record<Plan, { icon: typeof CommandLineIcon; color: string; desc: string; benefits: string[] }> = {
  FREE: {
    icon: CommandLineIcon,
    color: "text-white/40",
    desc: "Build the foundation of your second brain with automated tools and essential knowledge graph mapping.",
    benefits: [
      "Auto-sync across Desktop & Mobile",
      "Advanced note & entity insights",
      "Essential local backup limits",
    ]
  },
  VISION: {
    icon: SparklesIcon,
    color: "text-white",
    desc: "Unlock boundless intelligence. Dedicated AI models to connect your complex ideas without restrictions.",
    benefits: [
      "Everything in Free, completely unmetered",
      "Unlimited Notes & Entities mapping",
      "Infinite Version History retention",
      "Priority infrastructure & larger vault size",
    ]
  },
};

interface SubInfo { 
  plan?: string; 
  effectivePlan?: string; 
  status: string; 
  currentPeriodEnd?: string; 
  cancelAtPeriodEnd?: boolean;
  billingInterval?: string;
}

export default function Subscription() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sub, setSub] = useState<SubInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [plans, setPlans] = useState<Array<{ plan: Plan; limits: PlanLimits; priceId?: string }>>([]);
  const [planLoading, setPlanLoading] = useState(true);
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  const [prices, setPrices] = useState<{ monthly?: string; yearly?: string }>({});
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => { 
    subscriptionApi.me()
      .then(({ data }) => setSub(data))
      .catch(() => {})
      .finally(() => setLoading(false)); 
  }, []);

  useEffect(() => {
    let active = true;
    plansApi.list()
      .then(({ data }) => { 
        if (active) {
          const filtered = (data || []).filter(
            (p: any) => p.plan === "FREE" || p.plan === "VISION"
          );
          setPlans(filtered); 
        } 
      })
      .catch(() => {})
      .finally(() => { if (active) setPlanLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    api.get("/api/plans/prices")
      .then(({ data }) => setPrices(data?.vision || {}))
      .catch(() => {});
  }, []);

  const handleCheckout = async (planId: string) => {
    setCheckoutLoading(planId);
    try {
      const { data } = await subscriptionApi.checkout(planId);
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.message || "Please try again", variant: "destructive" });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleCancel = async () => {
    try {
      await subscriptionApi.cancel(false);
      toast({ title: "Subscription will cancel at period end" });
      const { data } = await subscriptionApi.me();
      setSub(data);
    } catch {
      toast({ title: "Error canceling subscription", variant: "destructive" });
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const { data } = await subscriptionApi.portal();
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast({ title: "Error", description: err.response?.data?.message || "Could not open portal", variant: "destructive" });
    } finally {
      setPortalLoading(false);
    }
  };

  const currentPlan = ((sub?.effectivePlan || user?.plan) as Plan) || "FREE";
  const formatLimit = (val: number, suffix = "") => isUnlimited(val) ? "∞" : `${val}${suffix}`;

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl px-6 py-10 lg:px-12 lg:py-16 space-y-12">
        
        {/* HEADER */}
        <header>
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">Plans & Billing</p>
          <h1 className="mt-2 font-serif text-5xl tracking-tight text-white">Subscription</h1>
          <p className="mt-2 text-sm text-white/50">Manage your subscription and choose the ideal plan for your notes.</p>
        </header>

        {/* CURRENT STATUS CARD */}
        {!loading && sub && (
          <div className="border border-white/10 bg-white/[0.01] p-5 rounded-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3.5">
              {(() => { 
                const Meta = planMeta[currentPlan] || planMeta.FREE; 
                const Icon = Meta.icon; 
                return <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", Meta.color)} />; 
              })()}
              <div>
                <p className="text-sm font-medium text-white/90">
                  You are currently on the: <span className="text-xs uppercase bg-white/[0.08] px-1.5 py-0.5 rounded-sm ml-1 text-white font-medium">{currentPlan} plan</span>
                </p>
                <p className="mt-1 text-xs text-white/30">
                  Status: {sub.status} {sub.currentPeriodEnd && `• Renews on ${new Date(sub.currentPeriodEnd).toLocaleDateString("en-US")}`}
                </p>
              </div>
            </div>
            {currentPlan !== "FREE" && (
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <button
                  onClick={handlePortal}
                  disabled={portalLoading}
                  className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white border border-white/10 hover:border-white/30 rounded-sm px-3 py-1.5 transition-colors"
                >
                  {portalLoading ? <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" /> : <CreditCardIcon className="h-3.5 w-3.5" />}
                  Manage billing
                </button>
                {!sub.cancelAtPeriodEnd && (
                  <button
                    onClick={handleCancel}
                    className="text-left text-xs text-white/40 hover:text-white underline underline-offset-4 transition-colors"
                  >
                    Cancel at period end
                  </button>
                )}
                {sub.cancelAtPeriodEnd && (
                  <span className="text-xs text-white/50">Cancels at period end</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* BILLING INTERVAL TOGGLE */}
        {prices.yearly && (
          <div className="flex items-center justify-center gap-1 border border-white/10 rounded-sm p-1 w-fit mx-auto">
            {(["monthly", "yearly"] as const).map((i) => (
              <button
                key={i}
                onClick={() => setInterval(i)}
                className={cn(
                  "px-4 py-1.5 text-xs uppercase tracking-wider rounded-sm transition-colors",
                  interval === i ? "bg-white text-black" : "text-white/50 hover:text-white"
                )}
              >
                {i}{i === "yearly" && <span className="ml-1 text-[9px] opacity-70">-2mo</span>}
              </button>
            ))}
          </div>
        )}

        {/* PLANS GRID */}
        {planLoading ? (
          <div className="flex justify-center py-24">
            <ArrowPathIcon className="h-5 w-5 animate-spin text-white/20" />
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2">
            {plans.map((p) => {
              const isVision = p.plan === "VISION";
              const isCurrent = currentPlan === p.plan;
              const meta = planMeta[p.plan] || planMeta.FREE;
              const Icon = meta.icon;

              return (
                <div 
                  key={p.plan}
                  className={cn(
                    "flex flex-col justify-between border p-6 rounded-sm transition-colors relative",
                    isVision 
                      ? "border-white/15 bg-white/[0.02]" 
                      : "border-white/5 bg-transparent"
                  )}
                >
                  {isCurrent && (
                    <span className="absolute top-0 right-0 -translate-y-1/2 text-[9px] uppercase tracking-wider bg-white text-black px-1.5 py-0.5 rounded-sm font-medium">
                      Current Tier
                    </span>
                  )}

                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <Icon className={cn("h-4 w-4 shrink-0", meta.color)} />
                      <div>
                        <h3 className="font-serif text-2xl tracking-tight text-white">{p.plan}</h3>
                        <p className="mt-1 text-xs text-white/40 font-medium">
                          {isVision ? "$7.90 / mo" : "Free of charge"}
                        </p>
                      </div>
                    </div>

                    <p className="text-sm text-white/50 leading-relaxed min-h-[48px]">
                      {meta.desc}
                    </p>

                    {/* Feature Benefits List */}
                    <ul className="space-y-2 pt-1">
                      {meta.benefits.map((benefit, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-white/70">
                          <CheckIcon className="h-3.5 w-3.5 text-white/40 mt-0.5 shrink-0" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Feature Details Matrix */}
                    <div className="pt-4 border-t border-white/[0.04] space-y-2.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-white/40 text-xs">Notes Quota</span>
                        <span className="text-white/70 tabular-nums">{formatLimit(p.limits.maxNotes)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-white/40 text-xs">Entities Limit</span>
                        <span className="text-white/70 tabular-nums">{formatLimit(p.limits.maxEntities)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-white/40 text-xs">Vault Storage</span>
                        <span className="text-white/70 tabular-nums">{formatLimit(p.limits.maxVaultSizeMB, " MB")}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-white/40 text-xs">Version History</span>
                        <span className="text-white/70 tabular-nums">{formatLimit(p.limits.historyDays, " days")}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-8 pt-4">
                    {isVision ? (
                      <button
                        onClick={() => handleCheckout(
                          (interval === "yearly" && prices.yearly) ? prices.yearly :
                          (prices.monthly || p.priceId || "VISION")
                        )}
                        disabled={isCurrent || checkoutLoading !== null}
                        className={cn(
                          "flex items-center justify-center gap-2 w-full h-9 rounded-sm text-sm font-medium transition-colors border",
                          isCurrent 
                            ? "border-white/5 bg-transparent text-white/30 cursor-not-allowed" 
                            : "border-white bg-white text-black hover:bg-transparent hover:text-white"
                        )}
                      >
                        {checkoutLoading === p.priceId ? (
                          <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                        ) : isCurrent ? (
                          "Active Plan"
                        ) : (
                          <>
                            Upgrade to Vision
                            <ArrowRightIcon className="h-3.5 w-3.5" />
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="h-9 flex items-center justify-center text-xs text-white/20 border border-dashed border-white/5 rounded-sm">
                        {isCurrent ? "Base Plan Active" : "Default fallback tier"}
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>
    </AppLayout>
  );
}