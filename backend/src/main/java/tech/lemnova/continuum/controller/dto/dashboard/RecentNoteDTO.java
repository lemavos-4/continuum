package tech.lemnova.continuum.controller.dto.dashboard;

import java.util.List;

/**
 * Sumário de uma nota recente para o dashboard
 */
public record RecentNoteDTO(
    String id,
    String title,
    String type,              // Categoria/tipo da nota
    String preview,           // Primeiros 150 chars do content
    long createdAtTimestamp,  // Milisegundos desde epoch
    long updatedAtTimestamp,  // Milisegundos desde epoch
    List<String> entityIds    // Entidades mencionadas
) {
}
