package tech.lemnova.continuum.domain.subscription;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import tech.lemnova.continuum.domain.plan.PlanType;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "subscriptions")
public class Subscription {

    @Id
    private String id;

    @Indexed
    private String userId;

    @Indexed(unique = true, sparse = true)
    private String stripeSubscriptionId;

    private String stripeCustomerId;

    private String stripePriceId;

    private String billingInterval; // "month" | "year"

    @Builder.Default
    private PlanType planType = PlanType.FREE;

    @Builder.Default
    private SubscriptionStatus status = SubscriptionStatus.ACTIVE;

    private Instant currentPeriodStart;
    private Instant currentPeriodEnd;

    private Instant trialEnd;

    @Builder.Default
    private Boolean cancelAtPeriodEnd = false;

    private Instant cancelAt;
    private Instant canceledAt;

    @Builder.Default
    private Instant createdAt = Instant.now();

    @Builder.Default
    private Instant updatedAt = Instant.now();

    @JsonIgnore
    public PlanType getEffectivePlan() {
        if (currentPeriodEnd == null) return PlanType.FREE;
        if ((status == SubscriptionStatus.ACTIVE || status == SubscriptionStatus.PAST_DUE)
                && currentPeriodEnd.isAfter(Instant.now())) {
            return planType;
        }
        return PlanType.FREE;
    }

    @JsonIgnore
    public boolean isInGracePeriod() {
        return status == SubscriptionStatus.PAST_DUE
                && currentPeriodEnd != null
                && currentPeriodEnd.isAfter(Instant.now());
    }

}

// ─────────────────────────────────────────────────────────────────────────────
