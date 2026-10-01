package tech.lemnova.continuum.domain.tracking;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import jakarta.validation.constraints.NotBlank;

import java.time.Instant;
import java.time.LocalDate;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "tracking_events")
@JsonIgnoreProperties(ignoreUnknown = true)
public class TrackingEvent {

    @Id
    private String id;

    @NotBlank(message = "userId is required")
    @Indexed
    private String userId;

    @NotBlank(message = "entityId is required")
    @Indexed
    private String entityId;

    @Indexed
    private LocalDate date;

    private Integer value;  // 1=done for activities
    @JsonAlias("numericValue")
    private Double decimalValue;
    private String note;

    @Indexed
    private Instant createdAt;

    @Indexed
    private Instant updatedAt;

    private Instant archivedAt;  // For cleanup

    @JsonIgnore
    public Number getNumericValue() {
        return decimalValue != null ? decimalValue : (value != null ? value : 0);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN — plan
// ─────────────────────────────────────────────────────────────────────────────
