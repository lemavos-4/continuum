package tech.lemnova.continuum.controller.dto.metrics;

import java.time.LocalDate;

public record UserScoreSnapshotResponse(
        LocalDate date,
        double score
) {}
