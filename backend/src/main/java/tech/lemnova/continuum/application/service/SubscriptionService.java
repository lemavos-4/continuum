package tech.lemnova.continuum.application.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stripe.model.Event;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.lemnova.continuum.application.exception.BadRequestException;
import tech.lemnova.continuum.application.exception.NotFoundException;
import tech.lemnova.continuum.controller.dto.subscription.CheckoutResponse;
import tech.lemnova.continuum.controller.dto.subscription.SubscriptionDTO;
import tech.lemnova.continuum.domain.plan.PlanConfiguration;
import tech.lemnova.continuum.domain.plan.PlanType;
import tech.lemnova.continuum.domain.stripe.StripeEventLog;
import tech.lemnova.continuum.domain.stripe.StripeEventLogRepository;
import tech.lemnova.continuum.domain.subscription.Subscription;
import tech.lemnova.continuum.domain.subscription.SubscriptionRepository;
import tech.lemnova.continuum.domain.subscription.SubscriptionStatus;
import tech.lemnova.continuum.domain.user.UserRepository;

import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;

@Service
public class SubscriptionService {

    private static final Logger log = LoggerFactory.getLogger(SubscriptionService.class);
    private static final int GRACE_PERIOD_DAYS = 7;

    private final SubscriptionRepository subRepo;
    private final UserRepository userRepo;
    private final StripeEventLogRepository eventLog;
    private final PlanConfiguration planConfig;
    private final LemonSqueezyService lemonSqueezyService;
    private final ObjectMapper mapper = new ObjectMapper();

    @Value("${lemonsqueezy.variant.vision:}")
    private String variantIdVision;

    public SubscriptionService(SubscriptionRepository subRepo,
                               UserRepository userRepo,
                               StripeEventLogRepository eventLog,
                               PlanConfiguration planConfig,
                               LemonSqueezyService lemonSqueezyService) {
        this.subRepo = subRepo;
        this.userRepo = userRepo;
        this.eventLog = eventLog;
        this.planConfig = planConfig;
        this.lemonSqueezyService = lemonSqueezyService;
    }

    public CheckoutResponse createCheckout(String userId, String email, String priceOrPlan) {
        return lemonSqueezyService.createCheckout(userId, email, priceOrPlan);
    }

    public SubscriptionDTO getSubscription(String userId) {
        Subscription sub = subRepo.findByUserId(userId)
                .orElseThrow(() -> new NotFoundException("No subscription found"));
        return SubscriptionDTO.from(sub, planConfig);
    }

    @Transactional
    public SubscriptionDTO cancel(String userId) {
        Subscription sub = subRepo.findByUserId(userId)
                .orElseThrow(() -> new NotFoundException("No subscription found"));
        if (sub.getLemonSqueezySubscriptionId() == null)
            throw new BadRequestException("No active paid subscription to cancel");
        // TODO: Implement Lemon Squeezy subscription cancellation via API when required.
        sub.setCancelAtPeriodEnd(true);
        sub.setUpdatedAt(Instant.now());
        subRepo.save(sub);
        return SubscriptionDTO.from(sub, planConfig);
    }

    @Transactional
    public void handleCheckoutCompleted(Event event) {
        if (isProcessed(event.getId())) return;
        log.warn("Legacy Stripe checkout event received and ignored: {}", event.getId());
        markProcessed(event, null, null);
    }

    @Transactional
    public void handleSubscriptionUpdated(Event event) {
        if (isProcessed(event.getId())) return;
        log.warn("Legacy Stripe subscription update event received and ignored: {}", event.getId());
        markProcessed(event, null, null);
    }

    @Transactional
    public void handleSubscriptionDeleted(Event event) {
        if (isProcessed(event.getId())) return;
        log.warn("Legacy Stripe subscription deleted event received and ignored: {}", event.getId());
        markProcessed(event, null, null);
    }

    @Transactional
    public void handlePaymentSucceeded(Event event) {
        if (isProcessed(event.getId())) return;
        log.warn("Legacy Stripe payment succeeded event received and ignored: {}", event.getId());
        markProcessed(event, null, null);
    }

    @Transactional
    public void handlePaymentFailed(Event event) {
        if (isProcessed(event.getId())) return;
        log.warn("Legacy Stripe payment failed event received and ignored: {}", event.getId());
        markProcessed(event, null, null);
    }

    @Transactional
    public void handleLemonSqueezyWebhook(JsonNode root) {
        if (root == null) return;
        String eventId = root.path("data").path("id").asText(null);
        if (eventId == null || isProcessed(eventId)) return;

        // Lemon Squeezy real payload shape:
        //   { "meta": { "event_name": "...", "custom_data": { "user_id": "..." } },
        //     "data": { "id": "...", "attributes": {...} } }
        JsonNode meta = root.path("meta");
        String eventType = meta.path("event_name").asText(null);
        JsonNode data = root.path("data");
        JsonNode customData = meta.path("custom_data");

        try {
            switch (eventType == null ? "" : eventType) {
                case "subscription_created" -> handleSubscriptionCreated(data, customData);
                case "subscription_updated" -> handleSubscriptionUpdated(data);
                case "subscription_cancelled" -> handleSubscriptionCancelled(data);
                case "subscription_resumed", "subscription_unpaused" -> handleSubscriptionUpdated(data);
                case "subscription_payment_success", "order_created" -> handlePaymentSucceeded(data);
                default -> log.debug("Ignored Lemon Squeezy event: {}", eventType);
            }
        } catch (Exception e) {
            log.error("Error processing Lemon Squeezy webhook event {}: {}", eventId, e.getMessage(), e);
            throw new RuntimeException(e);
        }

        markProcessed(eventId, eventType, data.path("id").asText(null), data.path("attributes").path("customer_id").asText(null));
    }

    @Transactional
    public void handleSubscriptionCreated(JsonNode data, JsonNode customData) {
        // userId comes from meta.custom_data — accept both "user_id" and "userId"
        String userId = customData.path("user_id").asText(null);
        if (userId == null || userId.isBlank()) userId = customData.path("userId").asText(null);

        String subscriptionId = data.path("id").asText(null);
        String customerId = data.path("attributes").path("customer_id").asText(null);
        String variantId = data.path("attributes").path("variant_id").asText(null);
        String status = data.path("attributes").path("status").asText(null);
        Instant currentPeriodEnd = parseInstant(data.path("attributes").path("renews_at").asText(null));
        if (currentPeriodEnd == null) {
            currentPeriodEnd = parseInstant(data.path("attributes").path("current_period_ends_at").asText(null));
        }

        if (userId == null || subscriptionId == null) {
            log.warn("[LEMONSQUEEZY] Missing userId (custom_data.user_id) or subscriptionId in webhook payload");
            return;
        }

        syncFromLemonSqueezy(userId, customerId, subscriptionId, variantId, status, currentPeriodEnd);
    }


    @Transactional
    public void handleSubscriptionUpdated(JsonNode data) {
        String subscriptionId = data.path("id").asText(null);
        String customerId = data.path("attributes").path("customer_id").asText(null);
        String variantId = data.path("attributes").path("variant_id").asText(null);
        String status = data.path("attributes").path("status").asText(null);
        Instant currentPeriodEnd = parseInstant(data.path("attributes").path("renews_at").asText(null));
        if (currentPeriodEnd == null) {
            currentPeriodEnd = parseInstant(data.path("attributes").path("current_period_ends_at").asText(null));
        }


        Subscription local = subscriptionId == null ? null : subRepo.findByLemonSqueezySubscriptionId(subscriptionId).orElse(null);
        if (local != null) {
            syncFromLemonSqueezy(local.getUserId(), customerId, subscriptionId, variantId, status, currentPeriodEnd);
        }
    }

    @Transactional
    public void handleSubscriptionCancelled(JsonNode data) {
        String subscriptionId = data.path("id").asText(null);
        Subscription local = subscriptionId == null ? null : subRepo.findByLemonSqueezySubscriptionId(subscriptionId).orElse(null);
        if (local == null) return;

        local.setStatus(SubscriptionStatus.CANCELED);
        local.setPlanType(PlanType.FREE);
        local.setUpdatedAt(Instant.now());
        subRepo.save(local);

        userRepo.findById(local.getUserId()).ifPresent(u -> {
            u.syncPlan(PlanType.FREE);
            userRepo.save(u);
        });
    }

    @Transactional
    public void handlePaymentSucceeded(JsonNode data) {
        String subscriptionId = data.path("attributes").path("subscription_id").asText(null);
        if (subscriptionId == null || subscriptionId.isBlank()) {
            subscriptionId = data.path("id").asText(null);
        }
        if (subscriptionId == null) return;

        Subscription local = subRepo.findByLemonSqueezySubscriptionId(subscriptionId).orElse(null);
        if (local == null) return;

        Instant currentPeriodEnd = parseInstant(data.path("attributes").path("current_period_ends_at").asText(null));
        if (currentPeriodEnd != null) {
            local.setCurrentPeriodEnd(currentPeriodEnd);
        }
        local.setStatus(SubscriptionStatus.ACTIVE);
        local.setUpdatedAt(Instant.now());
        subRepo.save(local);

        userRepo.findById(local.getUserId()).ifPresent(u -> {
            u.syncPlan(local.getEffectivePlan());
            userRepo.save(u);
        });
    }

    private void syncFromLemonSqueezy(String userId,
                                      String customerId,
                                      String subscriptionId,
                                      String variantId,
                                      String status,
                                      Instant currentPeriodEnd) {
        String planId = variantId;
        PlanType plan = determinePlan(planId);
        SubscriptionStatus mappedStatus = mapStatus(status);

        Subscription sub = subRepo.findByUserId(userId).orElse(new Subscription());
        sub.setUserId(userId);
        sub.setLemonSqueezySubscriptionId(subscriptionId);
        sub.setLemonSqueezyVariantId(variantId);
        sub.setPlanType(plan);
        sub.setStatus(mappedStatus);
        if (currentPeriodEnd != null) {
            sub.setCurrentPeriodEnd(currentPeriodEnd);
        }
        if (sub.getCreatedAt() == null) sub.setCreatedAt(Instant.now());
        sub.setUpdatedAt(Instant.now());
        subRepo.save(sub);

        userRepo.findById(userId).ifPresent(user -> {
            if (customerId != null && user.getLemonSqueezyCustomerId() == null) {
                user.setLemonSqueezyCustomerId(customerId);
            }
            user.syncPlan(sub.getEffectivePlan());
            userRepo.save(user);
        });

        log.info("[SYNC] user={} plan={} status={}", userId, plan, mappedStatus);
    }

    private Instant parseInstant(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return Instant.parse(value);
        } catch (DateTimeParseException exception) {
            log.warn("Unable to parse ISO instant from Lemon Squeezy payload: {}", value, exception);
            return null;
        }
    }

    private PlanType determinePlan(String variantId) {
        if (variantId != null && variantId.equals(variantIdVision)) return PlanType.VISION;
        return PlanType.FREE;
    }

    private SubscriptionStatus mapStatus(String s) {
        return switch (s) {
            case "active" -> SubscriptionStatus.ACTIVE;
            case "cancelled", "canceled" -> SubscriptionStatus.CANCELED;
            case "past_due" -> SubscriptionStatus.PAST_DUE;
            case "trialing" -> SubscriptionStatus.TRIALING;
            case "unpaid" -> SubscriptionStatus.UNPAID;
            default -> SubscriptionStatus.INCOMPLETE;
        };
    }

    private boolean isProcessed(String eventId) {
        return eventId != null && eventLog.existsByEventId(eventId);
    }

    private void markProcessed(Event event, String subId, String customerId) {
        if (eventLog.existsByEventId(event.getId())) return;
        StripeEventLog entry = new StripeEventLog();
        entry.setEventId(event.getId());
        entry.setEventType(event.getType());
        entry.setSubscriptionId(subId);
        entry.setCustomerId(customerId);
        entry.setProcessedAt(Instant.now());
        eventLog.save(entry);
    }

    private void markProcessed(String eventId, String eventType, String subId, String customerId) {
        if (eventId == null || eventLog.existsByEventId(eventId)) return;
        StripeEventLog entry = new StripeEventLog();
        entry.setEventId(eventId);
        entry.setEventType(eventType);
        entry.setSubscriptionId(subId);
        entry.setCustomerId(customerId);
        entry.setProcessedAt(Instant.now());
        eventLog.save(entry);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLLER DTOs
// ─────────────────────────────────────────────────────────────────────────────
