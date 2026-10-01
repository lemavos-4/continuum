package tech.lemnova.continuum.controller.dto.dashboard;

import java.util.Map;

/**
 * Activity heatmap data, scoped to the user's plan retention window.
 *
 * Formato: {
 *   "2024-04-16": 3,
 *   "2024-04-15": 1,
 *   "2024-04-14": 0,
 * }
 */
public record ActivityStatsDTO(
    Map<String, Integer> dailyCompletions,
    int totalDays
) {
}
