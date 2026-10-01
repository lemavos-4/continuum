package tech.lemnova.continuum.controller.dto.metrics;

import java.time.LocalDate;
import java.util.List;

public record ScoreTimelineResponse(
        double currentScore,
        List<ScorePoint> history
) {
    public record ScorePoint(LocalDate date, double score) {}
}