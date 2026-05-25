package tech.lemnova.continuum.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import tech.lemnova.continuum.application.service.DashboardService;
import tech.lemnova.continuum.controller.dto.dashboard.DashboardSummaryDTO;
import tech.lemnova.continuum.infra.security.CustomUserDetails;

@RestController
@RequestMapping("/api/dashboard")
@Tag(name = "Dashboard", description = "Endpoints for dashboard data")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/summary")
    @Operation(summary = "Get dashboard summary", description = "Retrieves comprehensive dashboard data including stats, storage usage, recent notes, and activity stats")
    public ResponseEntity<DashboardSummaryDTO> getSummary(@AuthenticationPrincipal CustomUserDetails user) {
        DashboardSummaryDTO summary = dashboardService.getSummary(user.getUserId());
        return ResponseEntity.ok(summary);
    }
}