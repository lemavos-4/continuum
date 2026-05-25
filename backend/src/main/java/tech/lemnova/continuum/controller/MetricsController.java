package tech.lemnova.continuum.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import tech.lemnova.continuum.application.service.MetricsService;
import tech.lemnova.continuum.controller.dto.metrics.DashboardMetrics;
import tech.lemnova.continuum.controller.dto.metrics.EntityTimeline;
import tech.lemnova.continuum.controller.dto.metrics.UserScoreSnapshotResponse;
import tech.lemnova.continuum.infra.security.CustomUserDetails;

import java.util.List;

@RestController
@RequestMapping("/api/metrics")
public class MetricsController {

    private final MetricsService metricsService;

    public MetricsController(MetricsService metricsService) { this.metricsService = metricsService; }

    @GetMapping("/dashboard")
    public ResponseEntity<DashboardMetrics> dashboard(@AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(metricsService.getDashboard(user.getUserId()));
    }

    @GetMapping("/entities/{entityId}/timeline")
    public ResponseEntity<EntityTimeline> timeline(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable String entityId) {
        return ResponseEntity.ok(metricsService.getEntityTimeline(user.getUserId(), entityId));
    }

    @GetMapping("/score/timeline")
    public ResponseEntity<List<UserScoreSnapshotResponse>> scoreTimeline(
            @AuthenticationPrincipal CustomUserDetails user,
            @RequestParam(defaultValue = "14") int days) {
        return ResponseEntity.ok(metricsService.getUserScoreTimeline(user.getUserId(), days));
    }
}

// ─────────────────────────────────────────────────────────────────────────────
