package tech.lemnova.continuum.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tech.lemnova.continuum.application.service.StripeService;
import tech.lemnova.continuum.controller.dto.plan.PlanInfo;
import tech.lemnova.continuum.domain.plan.PlanConfiguration;
import tech.lemnova.continuum.domain.plan.PlanType;

import java.util.List;

@RestController
@RequestMapping("/api/plans")
public class PlansController {

    private final PlanConfiguration planConfig;
    private final StripeService stripe;

    public PlansController(PlanConfiguration planConfig, StripeService stripe) {
        this.planConfig = planConfig;
        this.stripe = stripe;
    }

    @GetMapping
    public ResponseEntity<List<PlanInfo>> list() {
        return ResponseEntity.ok(List.of(
                new PlanInfo(PlanType.FREE,   planConfig.getLimits(PlanType.FREE),   ""),
                new PlanInfo(PlanType.VISION, planConfig.getLimits(PlanType.VISION), stripe.getPriceVisionMonthly())
        ));
    }
}
