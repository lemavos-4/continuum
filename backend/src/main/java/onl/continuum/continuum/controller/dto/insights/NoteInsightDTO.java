package onl.continuum.continuum.controller.dto.insights;

import onl.continuum.continuum.controller.dto.note.NoteSummaryDTO;

public record NoteInsightDTO(
    NoteSummaryDTO note,
    double score,
    String badge,
    long mentionCount,
    long recentMentions,
    double hoursTracked,
    int entityConnections,
    int uniqueDaysReferenced,
    long daysSinceLastInteraction
) {}
