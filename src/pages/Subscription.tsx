import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import api, { subscriptionApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { SubscriptionScreen } from "@/components/ui/subscription-screen";
import backgroundImage from "@/assets/landing-notes.jpg";
import type { Plan } from "@/types";

interface SubInfo {
  plan?: string;
  effectivePlan?: string;
  status: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
}

export function SubscriptionContent({ onClose }: { onClose?: () => void } = {}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [sub, setSub] = useState<SubInfo | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [prices, setPrices] = useState<{ monthly?: string }>({});

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
    api.get("/api/plans/prices")
      .then(({ data }) => setPrices({ monthly: data?.vision?.monthly }))
      .catch(() => {});
  }, []);

  const currentPlan = ((sub?.effectivePlan || user?.plan) as Plan | string) || "FREE";
  const normalizedPlan = currentPlan === "PRO" ? ("VISION" as Plan) : (currentPlan as Plan);
  const isPro = normalizedPlan === "VISION";

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

  return (
      <div className="flex min-h-[calc(100vh-1rem)] w-full items-center justify-center px-3 py-3 sm:px-8 sm:py-8">
        <SubscriptionScreen
          backgroundImageSrc={backgroundImage}
          headerImageSrc={backgroundImage}
          appName="Continuum"
          planType="VISION"
          features={VISION_BENEFITS.map((text) => ({ text }))}
          pricingOptions={[{ id: "monthly", price: "$7.90", period: t("bill_per_month") }]}
          defaultPlanId="monthly"
          subscribeButtonText={isPro ? (portalLoading ? t("bill_opening") : t("bill_manage_billing")) : checkoutLoading ? t("bill_opening") : t("bill_upgrade_to_vision")}
          footerText={syncing ? "Confirming your payment with Stripe…" : t("bill_cancel_secure")}
          currentPlanText={`${t("bill_current")}: ${isPro ? "VISION" : "FREE"}${sub?.status ? ` · ${sub.status.toLowerCase()}` : ""}`}
          onClose={onClose}
          onSubscribe={isPro ? handlePortal : handleCheckout}
        />
      </div>
  );
}

export default function Subscription() {
  return (
    <AppLayout>
      <SubscriptionContent />
    </AppLayout>
  );
}
