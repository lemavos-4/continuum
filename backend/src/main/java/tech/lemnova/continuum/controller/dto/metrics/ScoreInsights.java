package tech.lemnova.continuum.controller.dto.metrics;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Explainable knowledge-gravity score.
 *
 * points            → smoothed daily series + per-day component breakdown
 * todayContributions→ what moved the score today (structured, localized on the client)
 * comparison        → user vs. themselves (30d average, best week, cold-start progress)
 * milestones        → record high, longest streak, thresholds crossed
 */
public record ScoreInsights(
        List<Point> points,
        List<Contribution> todayContributions,
        Comparison comparison,
        List<Milestone> milestones
) {
    /** components keys: notes, entities, connections, freshness, continuity, daily */
    public record Point(
            LocalDate date,
            double score,
            double rawScore,
            double delta,
            Map<String, Double> components
    ) {}

    /** kind: NOTES | ACTIVITIES | TIME | CONNECTIONS | ENTITIES | IDLE */
    public record Contribution(String kind, double value, int count, String subject) {}

    public record Comparison(
            double currentScore,
            double firstScore,
            double average30,
            double percentVsAverage30,
            LocalDate bestWeekStart,
            double bestWeekAverage,
            int daysTracked,
            boolean coldStart
    ) {}

    /** kind: RECORD_HIGH | LONGEST_STREAK | CURRENT_STREAK | THRESHOLD */
    public record Milestone(String kind, double value, LocalDate date, boolean achievedToday) {}
}
