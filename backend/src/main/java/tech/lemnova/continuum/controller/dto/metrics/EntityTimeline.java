package tech.lemnova.continuum.controller.dto.metrics;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public record EntityTimeline(
    String entityId,
    String entityType,
    String entityName,
    long totalMentions,
    Map<LocalDate, Long> heatmap,
    List<MentionEntry> mentions,
    double mentionFrequency
) {}
