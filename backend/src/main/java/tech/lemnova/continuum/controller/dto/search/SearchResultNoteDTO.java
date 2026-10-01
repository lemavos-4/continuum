package tech.lemnova.continuum.controller.dto.search;

import java.time.Instant;

public record SearchResultNoteDTO(
    String id,
    String title,
    Instant createdAt,
    Instant updatedAt
) {}
