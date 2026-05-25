package tech.lemnova.continuum.controller.dto.subscription;

import tech.lemnova.continuum.domain.plan.PlanConfiguration;
import tech.lemnova.continuum.domain.plan.PlanLimits;
import tech.lemnova.continuum.domain.plan.PlanType;
import tech.lemnova.continuum.domain.subscription.Subscription;
import tech.lemnova.continuum.domain.subscription.SubscriptionStatus;
import java.time.Instant;

public record SubscriptionDTO(
    String id, String userId, PlanType effectivePlan, SubscriptionStatus status,
    int maxEntities, int maxNotes, boolean advancedMetrics,
    boolean dataExport, Instant currentPeriodEnd, Boolean cancelAtPeriodEnd, boolean inGracePeriod
) {
    public static SubscriptionDTO from(Subscription sub, PlanConfiguration config) {
        PlanType effective = sub.getEffectivePlan();
        PlanLimits limits  = config.getLimits(effective);
        return new SubscriptionDTO(
            sub.getId(), sub.getUserId(), effective, sub.getStatus(),
            limits.maxEntities(), limits.maxNotes(),
            limits.advancedMetrics(), limits.dataExport(),
            sub.getCurrentPeriodEnd(), sub.getCancelAtPeriodEnd(), sub.isInGracePeriod());
    }
}

// ─────────────────────────────────────────────────────────────────────────────
