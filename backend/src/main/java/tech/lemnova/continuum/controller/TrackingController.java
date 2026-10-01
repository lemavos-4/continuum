package tech.lemnova.continuum.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import tech.lemnova.continuum.application.service.TrackingService;
import tech.lemnova.continuum.controller.dto.tracking.TrackEventRequest;
import tech.lemnova.continuum.domain.tracking.TrackingEvent;
import tech.lemnova.continuum.infra.security.CustomUserDetails;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class TrackingController {

    private final TrackingService trackingService;

    public TrackingController(TrackingService trackingService) { this.trackingService = trackingService; }

    @PostMapping("/entities/{entityId}/track")
    public ResponseEntity<TrackingEvent> track(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable String entityId,
            @RequestBody TrackEventRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(trackingService.track(user.getUserId(), entityId, req));
    }

    @DeleteMapping("/entities/{entityId}/track")
    public ResponseEntity<Void> untrack(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable String entityId,
            @RequestParam LocalDate date) {
        trackingService.untrack(user.getUserId(), entityId, date);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/entities/{entityId}/heatmap")
    public ResponseEntity<Map<LocalDate, Double>> heatmap(
            @AuthenticationPrincipal CustomUserDetails user,
            @PathVariable String entityId,
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to) {
        if (from != null && to != null)
            return ResponseEntity.ok(trackingService.getHeatmap(user.getUserId(), entityId, from, to));
        return ResponseEntity.ok(trackingService.getHeatmap(user.getUserId(), entityId));
    }

    @GetMapping("/entities/{entityId}/stats")
    public ResponseEntity<TrackingService.TrackingStats> stats(
            @AuthenticationPrincipal CustomUserDetails user, @PathVariable String entityId) {
        return ResponseEntity.ok(trackingService.getStats(user.getUserId(), entityId));
    }

    @GetMapping("/tracking/today")
    public ResponseEntity<List<TrackingEvent>> today(@AuthenticationPrincipal CustomUserDetails user) {
        return ResponseEntity.ok(trackingService.getTodayEvents(user.getUserId()));
    }
}

// ─────────────────────────────────────────────────────────────────────────────
