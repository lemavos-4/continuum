package tech.lemnova.continuum.controller.dto.dashboard;

import java.util.List;

/**
 * Resposta completa do dashboard com todos os dados necessários
 */
public record DashboardSummaryDTO(
    DashboardStatsDTO stats,
    StorageUsageDTO storageUsage,
    List<RecentNoteDTO> recentNotes,
    ActivityStatsDTO activityStats
) {
}