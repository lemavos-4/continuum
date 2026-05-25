package tech.lemnova.continuum.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import tech.lemnova.continuum.application.exception.BadRequestException;
import tech.lemnova.continuum.application.service.SubscriptionService;
import tech.lemnova.continuum.controller.dto.subscription.CheckoutResponse;
import tech.lemnova.continuum.controller.dto.subscription.SubscriptionDTO;
import tech.lemnova.continuum.infra.security.CustomUserDetails;

import java.util.Map;

@RestController
@RequestMapping("/api/subscriptions")
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    public SubscriptionController(SubscriptionService subscriptionService) {
        this.subscriptionService = subscriptionService;
    }

    @GetMapping("/me")
    public ResponseEntity<SubscriptionDTO> me(@AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(subscriptionService.getSubscription(user.getUserId()));
    }

    @PostMapping("/checkout")
    public ResponseEntity<CheckoutResponse> checkout(
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestBody Map<String, String> body) {
        // Accept either { priceId } (direct Stripe price) or { planId: "VISION" } (plan code).
        String priceOrPlan = body.getOrDefault("priceId", body.get("planId"));
        if (priceOrPlan == null || priceOrPlan.isBlank())
            throw new BadRequestException("priceId or planId is required");
        return ResponseEntity.ok(
                subscriptionService.createCheckout(user.getUserId(), user.getEmail(), priceOrPlan));
    }

    @PostMapping("/cancel")
    public ResponseEntity<SubscriptionDTO> cancel(@AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(subscriptionService.cancel(user.getUserId()));
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// [SEC-1] Stripe webhook — path /api/webhooks/stripe bate com SecurityConfig
// ─────────────────────────────────────────────────────────────────────────────
