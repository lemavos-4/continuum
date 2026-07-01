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
        String priceOrPlan = body.getOrDefault("priceId", body.get("planId"));
        if (priceOrPlan == null || priceOrPlan.isBlank())
            throw new BadRequestException("priceId or planId is required");
        return ResponseEntity.ok(
                subscriptionService.createCheckout(user.getUserId(), user.getEmail(), priceOrPlan));
    }

    @PostMapping("/cancel")
    public ResponseEntity<SubscriptionDTO> cancel(
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestBody(required = false) Map<String, Object> body) {
        boolean immediately = body != null && Boolean.TRUE.equals(body.get("immediately"));
        return ResponseEntity.ok(subscriptionService.cancel(user.getUserId(), immediately));
    }

    @PostMapping("/change-plan")
    public ResponseEntity<SubscriptionDTO> changePlan(
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestBody Map<String, String> body) {
        String priceOrPlan = body.getOrDefault("priceId", body.get("planId"));
        if (priceOrPlan == null || priceOrPlan.isBlank())
            throw new BadRequestException("priceId or planId is required");
        return ResponseEntity.ok(subscriptionService.changePlan(user.getUserId(), priceOrPlan));
    }

    @PostMapping("/portal")
    public ResponseEntity<Map<String, String>> portal(@AuthenticationPrincipal CustomUserDetails user) {
        String url = subscriptionService.createPortalSession(user.getUserId());
        return ResponseEntity.ok(Map.of("url", url));
    }

    @PostMapping("/refund")
    public ResponseEntity<Map<String, String>> refund(
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestBody Map<String, Object> body) {
        if (!"ADMIN".equalsIgnoreCase(user.getRole())) {
            throw new BadRequestException("Only admins can issue refunds");
        }
        String chargeId = (String) body.get("chargeId");
        if (chargeId == null || chargeId.isBlank())
            throw new BadRequestException("chargeId is required");
        Long amount = body.get("amountCents") instanceof Number n ? n.longValue() : null;
        subscriptionService.refund(chargeId, amount);
        return ResponseEntity.ok(Map.of("status", "ok"));
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// [SEC-1] Stripe webhook — path /api/webhooks/stripe bate com SecurityConfig
// ─────────────────────────────────────────────────────────────────────────────
