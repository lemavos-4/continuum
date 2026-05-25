package tech.lemnova.continuum.controller.dto.insights;

import tech.lemnova.continuum.controller.dto.entity.EntityResponse;

public record EntityInsightDTO(
    EntityResponse entity,
    double score,
    String badge,
    long mentionCount,
    long recentMentions,
    double hoursTracked,
    int relationsCount,
    int uniqueDaysMentioned,
    long daysSinceLastMention
) {}
