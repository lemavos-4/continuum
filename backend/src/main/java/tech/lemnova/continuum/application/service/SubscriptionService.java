package tech.lemnova.continuum.application.service;

import com.stripe.model.Event;
import com.stripe.model.EventDataObjectDeserializer;
import com.stripe.model.Invoice;
import com.stripe.model.StripeObject;
import com.stripe.model.checkout.Session;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
import tech.lemnova.continuum.domain.user.User;
import tech.lemnova.continuum.domain.user.UserRepository;

import java.time.Instant;

/**
 * Business logic around user subscriptions. The Stripe HTTP layer lives in
 * {@link StripeService}; this class owns the persistence + user plan sync.
 * Stripe is the source of truth — webhooks reconcile local state.
 */
@Service
public class SubscriptionService {

    private static final Logger log = LoggerFactory.getLogger(SubscriptionService.class);

    private final SubscriptionRepository subRepo;
    private final UserRepository userRepo;
    private final StripeEventLogRepository eventLog;
    private final PlanConfiguration planConfig;
    private final StripeService stripe;

    public SubscriptionService(SubscriptionRepository subRepo,
                               UserRepository userRepo,
                               StripeEventLogRepository eventLog,
                               PlanConfiguration planConfig,
                               StripeService stripe) {
        this.subRepo = subRepo;
        this.userRepo = userRepo;
        this.eventLog = eventLog;
        this.planConfig = planConfig;
        this.stripe = stripe;
    }

    /* ─────────────────── Queries ─────────────────── */

    public SubscriptionDTO getSubscription(String userId) {
        Subscription sub = subRepo.findByUserId(userId).orElseGet(() -> {
            Subscription s = new Subscription();
            s.setUserId(userId);
            s.setPlanType(PlanType.FREE);
            s.setStatus(SubscriptionStatus.ACTIVE);
            return s;
        });
        return SubscriptionDTO.from(sub, planConfig);
    }

    /* ─────────────────── Checkout / Portal ─────────────────── */

    public CheckoutResponse createCheckout(String userId, String email, String priceOrPlan) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        return stripe.createCheckout(user.getStripeCustomerId(), userId, email, priceOrPlan);
    }

    public String createPortalSession(String userId) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        if (user.getStripeCustomerId() == null) {
            throw new BadRequestException("No Stripe customer found for user");
        }
        return stripe.createPortalSession(user.getStripeCustomerId());
    }

    /* ─────────────────── Cancel / Change plan / Refund ─────────────────── */

    @Transactional
    public SubscriptionDTO cancel(String userId, boolean immediately) {
        Subscription sub = subRepo.findByUserId(userId)
                .orElseThrow(() -> new NotFoundException("No subscription found"));
        if (sub.getStripeSubscriptionId() == null) {
            throw new BadRequestException("No active paid subscription to cancel");
        }
        com.stripe.model.Subscription updated = immediately
                ? stripe.cancelImmediately(sub.getStripeSubscriptionId())
                : stripe.cancelAtPeriodEnd(sub.getStripeSubscriptionId());
        applyStripeSubscription(sub.getUserId(), updated);
        return SubscriptionDTO.from(subRepo.findByUserId(userId).orElse(sub), planConfig);
    }

    @Transactional
    public SubscriptionDTO changePlan(String userId, String newPriceOrPlan) {
        Subscription sub = subRepo.findByUserId(userId)
                .orElseThrow(() -> new NotFoundException("No subscription found"));
        if (sub.getStripeSubscriptionId() == null) {
            throw new BadRequestException("No active subscription to change");
        }
        com.stripe.model.Subscription updated =
                stripe.changePlan(sub.getStripeSubscriptionId(), newPriceOrPlan);
        applyStripeSubscription(userId, updated);
        return SubscriptionDTO.from(subRepo.findByUserId(userId).orElse(sub), planConfig);
    }

    public void refund(String chargeId, Long amountCents) {
        stripe.refundCharge(chargeId, amountCents);
    }

    /* ─────────────────── Webhook entrypoint ─────────────────── */

    @Transactional
    public void handleStripeEvent(Event event) {
        if (event == null || event.getId() == null) return;
        if (isProcessed(event.getId())) {
            log.debug("[Stripe] Duplicate event {} ignored", event.getId());
            return;
        }

        String type = event.getType();
        try {
            switch (type) {
                case "checkout.session.completed" -> handleCheckoutCompleted(event);
                case "customer.subscription.created",
                     "customer.subscription.updated",
                     "customer.subscription.trial_will_end" -> handleSubscriptionUpsert(event);
                case "customer.subscription.deleted" -> handleSubscriptionDeleted(event);
                case "invoice.payment_succeeded" -> handleInvoicePaymentSucceeded(event);
                case "invoice.payment_failed" -> handleInvoicePaymentFailed(event);
                case "charge.refunded" -> log.info("[Stripe] Refund processed: {}", event.getId());
                default -> log.debug("[Stripe] Ignored event type: {}", type);
            }
            markProcessed(event, null, null);
        } catch (Exception e) {
            log.error("[Stripe] Error processing event {} ({}): {}", event.getId(), type, e.getMessage(), e);
            throw new RuntimeException(e);
        }
    }

    /* ─────────────────── Event handlers ─────────────────── */

    private void handleCheckoutCompleted(Event event) {
        Session session = (Session) deserialize(event);
        if (session == null) return;

        String userId = session.getClientReferenceId();
        String customerId = session.getCustomer();
        String subscriptionId = session.getSubscription();

        if (userId != null && customerId != null) {
            userRepo.findById(userId).ifPresent(u -> {
                if (u.getStripeCustomerId() == null) {
                    u.setStripeCustomerId(customerId);
                    userRepo.save(u);
                }
            });
        }

        if (subscriptionId != null) {
            try {
                com.stripe.model.Subscription sub = com.stripe.model.Subscription.retrieve(subscriptionId);
                String uid = userId != null ? userId : resolveUserIdFromCustomer(customerId);
                if (uid != null) applyStripeSubscription(uid, sub);
            } catch (Exception e) {
                log.error("[Stripe] Failed to hydrate subscription after checkout: {}", e.getMessage());
            }
        }
    }

    private void handleSubscriptionUpsert(Event event) {
        com.stripe.model.Subscription sub = (com.stripe.model.Subscription) deserialize(event);
        if (sub == null) return;
        String userId = metadataUserId(sub);
        if (userId == null) userId = resolveUserIdFromCustomer(sub.getCustomer());
        if (userId == null) {
            log.warn("[Stripe] Cannot resolve user for subscription {}", sub.getId());
            return;
        }
        applyStripeSubscription(userId, sub);
    }

    private void handleSubscriptionDeleted(Event event) {
        com.stripe.model.Subscription sub = (com.stripe.model.Subscription) deserialize(event);
        if (sub == null) return;
        Subscription local = subRepo.findByStripeSubscriptionId(sub.getId()).orElse(null);
        if (local == null) return;
        local.setStatus(SubscriptionStatus.CANCELED);
        local.setPlanType(PlanType.FREE);
        local.setCanceledAt(Instant.now());
        local.setCancelAtPeriodEnd(false);
        local.setUpdatedAt(Instant.now());
        subRepo.save(local);
        userRepo.findById(local.getUserId()).ifPresent(u -> {
            u.syncPlan(PlanType.FREE);
            userRepo.save(u);
        });
    }

    private void handleInvoicePaymentSucceeded(Event event) {
        Invoice invoice = (Invoice) deserialize(event);
        if (invoice == null) return;
        String subId = invoice.getSubscription();
        if (subId == null) return;
        try {
            com.stripe.model.Subscription sub = com.stripe.model.Subscription.retrieve(subId);
            String userId = metadataUserId(sub);
            if (userId == null) userId = resolveUserIdFromCustomer(sub.getCustomer());
            if (userId != null) applyStripeSubscription(userId, sub);
        } catch (Exception e) {
            log.error("[Stripe] Failed to refresh subscription after payment: {}", e.getMessage());
        }
    }

    private void handleInvoicePaymentFailed(Event event) {
        Invoice invoice = (Invoice) deserialize(event);
        if (invoice == null) return;
        String subId = invoice.getSubscription();
        if (subId == null) return;
        subRepo.findByStripeSubscriptionId(subId).ifPresent(local -> {
            local.setStatus(SubscriptionStatus.PAST_DUE);
            local.setUpdatedAt(Instant.now());
            subRepo.save(local);
        });
    }

    /* ─────────────────── Reconciliation ─────────────────── */

    private void applyStripeSubscription(String userId, com.stripe.model.Subscription sSub) {
        Subscription local = subRepo.findByStripeSubscriptionId(sSub.getId())
                .or(() -> subRepo.findByUserId(userId))
                .orElseGet(Subscription::new);

        String priceId = null;
        String interval = null;
        if (sSub.getItems() != null && !sSub.getItems().getData().isEmpty()) {
            var item = sSub.getItems().getData().get(0);
            if (item.getPrice() != null) {
                priceId = item.getPrice().getId();
                if (item.getPrice().getRecurring() != null) {
                    interval = item.getPrice().getRecurring().getInterval();
                }
            }
        }

        local.setUserId(userId);
        local.setStripeSubscriptionId(sSub.getId());
        local.setStripeCustomerId(sSub.getCustomer());
        local.setStripePriceId(priceId);
        local.setBillingInterval(interval);
        local.setPlanType(determinePlan(priceId));
        local.setStatus(mapStatus(sSub.getStatus()));
        local.setCancelAtPeriodEnd(Boolean.TRUE.equals(sSub.getCancelAtPeriodEnd()));
        local.setCurrentPeriodStart(toInstant(sSub.getCurrentPeriodStart()));
        local.setCurrentPeriodEnd(toInstant(sSub.getCurrentPeriodEnd()));
        local.setTrialEnd(toInstant(sSub.getTrialEnd()));
        local.setCancelAt(toInstant(sSub.getCancelAt()));
        local.setCanceledAt(toInstant(sSub.getCanceledAt()));
        if (local.getCreatedAt() == null) local.setCreatedAt(Instant.now());
        local.setUpdatedAt(Instant.now());
        subRepo.save(local);

        userRepo.findById(userId).ifPresent(user -> {
            if (sSub.getCustomer() != null && user.getStripeCustomerId() == null) {
                user.setStripeCustomerId(sSub.getCustomer());
            }
            user.syncPlan(local.getEffectivePlan());
            userRepo.save(user);
        });

        log.info("[Stripe] Synced sub={} user={} plan={} status={}",
                sSub.getId(), userId, local.getPlanType(), local.getStatus());
    }

    private PlanType determinePlan(String priceId) {
        if (priceId == null) return PlanType.FREE;
        String monthly = stripe.getPriceVisionMonthly();
        String yearly = stripe.getPriceVisionYearly();
        if (priceId.equals(monthly) || priceId.equals(yearly)) return PlanType.VISION;
        return PlanType.FREE;
    }

    private SubscriptionStatus mapStatus(String s) {
        if (s == null) return SubscriptionStatus.INCOMPLETE;
        return switch (s) {
            case "active" -> SubscriptionStatus.ACTIVE;
            case "trialing" -> SubscriptionStatus.TRIALING;
            case "past_due" -> SubscriptionStatus.PAST_DUE;
            case "canceled", "cancelled" -> SubscriptionStatus.CANCELED;
            case "unpaid" -> SubscriptionStatus.UNPAID;
            default -> SubscriptionStatus.INCOMPLETE;
        };
    }

    private String metadataUserId(com.stripe.model.Subscription sub) {
        if (sub == null || sub.getMetadata() == null) return null;
        String uid = sub.getMetadata().get("user_id");
        return (uid == null || uid.isBlank()) ? null : uid;
    }

    private String resolveUserIdFromCustomer(String customerId) {
        if (customerId == null) return null;
        return userRepo.findByStripeCustomerId(customerId).map(User::getId).orElse(null);
    }

    private static Instant toInstant(Long epochSeconds) {
        return epochSeconds == null ? null : Instant.ofEpochSecond(epochSeconds);
    }

    private static StripeObject deserialize(Event event) {
        EventDataObjectDeserializer d = event.getDataObjectDeserializer();
        return d.getObject().orElseGet(() -> {
            try { return d.deserializeUnsafe(); } catch (Exception e) { return null; }
        });
    }

    /* ─────────────────── Idempotency ─────────────────── */

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
}