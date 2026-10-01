package tech.lemnova.continuum.controller.dto.note;

import tech.lemnova.continuum.domain.note.Note;
import tech.lemnova.continuum.domain.note.NoteLink;
import tech.lemnova.continuum.domain.note.LinkType;
import java.time.Instant;
import java.util.Collections;
import java.util.List;

/**
 * DTO enriquecido para retornar backlinks com contexto.
 * Inclui informações sobre o tipo de link e o contexto onde aparece.
 */
public record BacklinkDTO(
    String id,
    String title,
    LinkType linkType,
    String context,
    Instant createdAt,
    Instant updatedAt
) {
    /**
     * Converte uma Nota + NoteLink em BacklinkDTO
     */
    public static BacklinkDTO from(Note note, NoteLink link) {
        return new BacklinkDTO(
            note.getId(),
            note.getTitle(),
            link.getLinkType(),
            link.getContext(),
            link.getCreatedAt(),
            note.getUpdatedAt()
        );
    }
    
    /**
     * Converte uma lista de Notes em BacklinkDTOs (sem contexto de link, apenas notas)
     * Útil para quando não temos informações de NoteLink.
     */
    public static BacklinkDTO fromNote(Note note) {
        return new BacklinkDTO(
            note.getId(),
            note.getTitle(),
            null, // Sem tipo de link
            null, // Sem contexto
            note.getCreatedAt(),
            note.getUpdatedAt()
        );
    }
}
