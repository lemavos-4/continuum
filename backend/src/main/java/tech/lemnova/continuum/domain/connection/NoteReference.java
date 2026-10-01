package tech.lemnova.continuum.domain.connection;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.time.LocalDate;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import tech.lemnova.continuum.domain.entity.EntityType;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class NoteReference {

    private String id;
    private String userId;
    private String noteId;
    private String entityId;
    private EntityType entityType;
    private String entityName;
    private LocalDate date;
    private String context; // ~150 chars ao redor da menção
    private Instant createdAt;
    private Instant updatedAt;
    private Instant archivedAt;
}

// ─────────────────────────────────────────────────────────────────────────────
// [V11-ARCH] NoteIndex: POJO puro — sem @Document.
// Guardado em _notes/index.json no vault B2.
// ─────────────────────────────────────────────────────────────────────────────
