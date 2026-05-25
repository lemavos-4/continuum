package tech.lemnova.continuum.domain.folder;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class Folder {

    private String id;
    private String userId;
    private String name;
    private String parentId; // null = root
    private Instant createdAt;
    private Instant updatedAt;
}

// ─────────────────────────────────────────────────────────────────────────────
// [V11-ARCH] TrackingEvent: POJO puro — sem @Document.
// Guardado em _tracking/events.json no vault B2.
// ─────────────────────────────────────────────────────────────────────────────
