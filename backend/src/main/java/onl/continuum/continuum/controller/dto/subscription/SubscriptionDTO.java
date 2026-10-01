package onl.continuum.continuum.controller.dto.subscription;

import onl.continuum.continuum.domain.plan.PlanConfiguration;
import onl.continuum.continuum.domain.plan.PlanLimits;
import onl.continuum.continuum.domain.plan.PlanType;
import onl.continuum.continuum.domain.subscription.Subscription;
import onl.continuum.continuum.domain.subscription.SubscriptionStatus;
import java.time.Instant;

public record SubscriptionDTO(
    String id, String userId, PlanType effectivePlan, SubscriptionStatus status,
    int maxEntities, int maxNotes, boolean advancedMetrics,
    boolean dataExport, Instant currentPeriodEnd, Boolean cancelAtPeriodEnd, boolean inGracePeriod,
    String stripePriceId, String billingInterval, Instant trialEnd
) {
    public static SubscriptionDTO from(Subscription sub, PlanConfiguration config) {
        PlanType effective = sub.getEffectivePlan();
        PlanLimits limits  = config.getLimits(effective);
        return new SubscriptionDTO(
            sub.getId(), sub.getUserId(), effective, sub.getStatus(),
            limits.maxEntities(), limits.maxNotes(),
            limits.advancedMetrics(), limits.dataExport(),
            sub.getCurrentPeriodEnd(), sub.getCancelAtPeriodEnd(), sub.isInGracePeriod(),
            sub.getStripePriceId(), sub.getBillingInterval(), sub.getTrialEnd());
    }
}

// ─────────────────────────────────────────────────────────────────────────────
