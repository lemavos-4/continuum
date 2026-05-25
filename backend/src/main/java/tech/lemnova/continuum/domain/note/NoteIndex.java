package tech.lemnova.continuum.domain.note;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Índice leve das notas — evita carregar o .md inteiro do B2 para listar.
 * O conteúdo real fica em _notes/{id}.md no vault B2.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class NoteIndex {

    private String id;
    private String userId;
    private String folderId; // null = root
    private String title;    // primeiros 80 chars, auto-extraído
    private Instant archivedAt; // null = ativo
    private Instant createdAt;
    private Instant updatedAt;
}

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
