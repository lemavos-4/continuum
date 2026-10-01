package tech.lemnova.continuum.controller.dto.metrics;

import java.util.List;
import java.time.LocalDate;
import java.util.Map;

public record DashboardMetrics(
    long uniquePeople,
    long uniqueProjects,
    long uniqueHabits,
    long totalMentions,
    long totalNotes,
    long totalEntities,
    List<TopEntity> topMentions,
    List<TopEntity> topPeople,
    List<TopEntity> topProjects,
    List<TopEntity> topHabits,
    List<String> activitiesCompletedToday,
    double weeklyAverageCompletionRate,
    Map<LocalDate, Long> globalHeatmap
) {}
