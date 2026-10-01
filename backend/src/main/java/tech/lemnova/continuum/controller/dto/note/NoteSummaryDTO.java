package tech.lemnova.continuum.controller.dto.note;

import tech.lemnova.continuum.domain.note.Note;
import java.time.Instant;
import java.util.Collections;
import java.util.List;

public record NoteSummaryDTO(
    String id,
    String userId,
    String title,
    String type,
    List<String> entityIds,
    boolean favorite,
    Instant createdAt,
    Instant updatedAt
) {
    public static NoteSummaryDTO from(Note note) {
        return new NoteSummaryDTO(
            note.getId(),
            note.getUserId(),
            note.getTitle(),
            note.getType(),
            note.getEntityIds() != null ? note.getEntityIds() : Collections.emptyList(),
            note.isFavorite(),
            note.getCreatedAt(),
            note.getUpdatedAt()
        );
    }
}
