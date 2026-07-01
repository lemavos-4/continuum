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
        try {
            log.info("[Stripe] Event received: {} [{}]", event.getType(), event.getId());
            subscriptionService.handleStripeEvent(event);
        } catch (Exception e) {
            log.error("[Stripe] Webhook processing error: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body("processing error");
        }
        return ResponseEntity.ok("ok");
    }
}