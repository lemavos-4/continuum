package tech.lemnova.continuum.application.service;

import com.stripe.model.Event;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import tech.lemnova.continuum.domain.stripe.StripeEventLog;
import tech.lemnova.continuum.domain.stripe.StripeEventLogRepository;
import tech.lemnova.continuum.domain.stripe.StripeEventStatus;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

/**
 * Safety net for the payment flow. Two independent routines:
 *
 * <ol>
 *   <li><b>Event replay</b> — webhook events left in PROCESSING/FAILED are re-fetched
 *       from Stripe and re-handled (idempotently) until they succeed.</li>
 *   <li><b>State reconciliation</b> — walks Stripe's subscriptions (the source of
 *       truth) and repairs any user whose local plan/status diverges. This catches
 *       webhooks that were never delivered at all.</li>
 * </ol>
 */
@Service
public class StripeReconciliationService {

    private static final Logger log = LoggerFactory.getLogger(StripeReconciliationService.class);
    private static final int MAX_REPLAY_ATTEMPTS = 12;

    private final StripeEventLogRepository eventLog;
    private final SubscriptionService subscriptions;
    private final boolean enabled;

    public StripeReconciliationService(StripeEventLogRepository eventLog,
                                       SubscriptionService subscriptions,
                                       @Value("${stripe.api.key:}") String apiKey) {
        this.eventLog = eventLog;
        this.subscriptions = subscriptions;
        this.enabled = apiKey != null && !apiKey.isBlank();
    }

    /** Replay stuck/failed webhook events every 5 minutes. */
    @Scheduled(fixedDelayString = "${stripe.reconcile.events.delay-ms:300000}", initialDelay = 60_000)
    public void replayFailedEvents() {
        if (!enabled) return;
        Instant cutoff = Instant.now().minus(Duration.ofMinutes(2));
        List<StripeEventLog> pending = eventLog.findByStatusInAndUpdatedAtBefore(
                List.of(StripeEventStatus.FAILED, StripeEventStatus.PROCESSING), cutoff);
        if (pending.isEmpty()) return;

        log.info("[Stripe][replay] {} unfinished event(s) to replay", pending.size());
        for (StripeEventLog entry : pending) {
            if (entry.getAttempts() >= MAX_REPLAY_ATTEMPTS) {
                log.error("[Stripe][replay] event={} type={} gave up after {} attempts — MANUAL REVIEW REQUIRED: {}",
                        entry.getEventId(), entry.getEventType(), entry.getAttempts(), entry.getLastError());
                continue;
            }
            try {
                Event event = Event.retrieve(entry.getEventId());
                subscriptions.handleStripeEvent(event);
                log.info("[Stripe][replay] event={} recovered successfully", entry.getEventId());
            } catch (Exception e) {
                log.error("[Stripe][replay] event={} still failing: {}", entry.getEventId(), e.getMessage());
            }
        }
    }

    /** Full state reconciliation against Stripe every 30 minutes. */
    @Scheduled(fixedDelayString = "${stripe.reconcile.state.delay-ms:1800000}", initialDelay = 120_000)
    public void reconcileSubscriptions() {
        if (!enabled) return;
        int scanned = 0;
        int repaired = 0;
        try {
            for (com.stripe.model.Subscription remote : subscriptions.stripeIterateLiveSubscriptions()) {
                scanned++;
                try {
                    if (subscriptions.reconcileRemoteSubscription(remote)) repaired++;
                } catch (Exception e) {
                    log.error("[Stripe][reconcile] failed to reconcile sub={}: {}", remote.getId(), e.getMessage(), e);
                }
            }
            log.info("[Stripe][reconcile] scanned={} repaired={}", scanned, repaired);
        } catch (Exception e) {
            log.error("[Stripe][reconcile] reconciliation sweep failed after {} subs: {}", scanned, e.getMessage(), e);
        }
    }
}
