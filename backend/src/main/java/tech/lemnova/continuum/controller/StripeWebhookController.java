package tech.lemnova.continuum.controller;

import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
import com.stripe.net.Webhook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tech.lemnova.continuum.application.service.SubscriptionService;

@RestController
@RequestMapping("/api/webhooks")
public class StripeWebhookController {

    private static final Logger log = LoggerFactory.getLogger(StripeWebhookController.class);

    @Value("${stripe.webhook.secret:}")
    private String webhookSecret;

    private final SubscriptionService subscriptionService;

    public StripeWebhookController(SubscriptionService subscriptionService) {
        this.subscriptionService = subscriptionService;
    }

    @PostMapping("/stripe")
    public ResponseEntity<String> stripe(
            @RequestBody String payload,
            @RequestHeader(value = "Stripe-Signature", required = false) String signature) {
        if (webhookSecret == null || webhookSecret.isBlank()) {
            log.error("[Stripe] STRIPE_WEBHOOK_SECRET not configured");
            return ResponseEntity.status(500).body("webhook not configured");
        }
        if (signature == null || signature.isBlank()) {
            return ResponseEntity.status(400).body("Missing Stripe-Signature header");
        }
        Event event;
        try {
            event = Webhook.constructEvent(payload, signature, webhookSecret);
        } catch (SignatureVerificationException e) {
            log.error("[Stripe] Invalid signature: {}", e.getMessage());
            return ResponseEntity.status(400).body("Invalid signature");
        }
        long started = System.currentTimeMillis();
        try {
            log.info("[Stripe][webhook] received type={} id={} apiVersion={} livemode={}",
                    event.getType(), event.getId(), event.getApiVersion(), event.getLivemode());
            subscriptionService.handleStripeEvent(event);
            log.info("[Stripe][webhook] acknowledged id={} in {}ms", event.getId(),
                    System.currentTimeMillis() - started);
        } catch (Exception e) {
            // 5xx on purpose: Stripe will retry with backoff, and the event stays
            // FAILED in stripe_event_logs so the reconciliation job also replays it.
            log.error("[Stripe][webhook] processing error id={} type={} ({}ms): {}",
                    event.getId(), event.getType(), System.currentTimeMillis() - started, e.getMessage(), e);
            return ResponseEntity.status(500).body("processing error — retry expected");
        }
        return ResponseEntity.ok("ok");
    }
}