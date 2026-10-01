package tech.lemnova.continuum.domain.timetracking;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Represents a time entry for an entity on a specific date.
 * Multiple entries per entity-date combination are allowed and will be summed.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "time_entries")
public class TimeEntry {

    @Id
    private String id;

    @NotBlank(message = "userId is required")
    @Indexed
    private String userId;

    @NotBlank(message = "entityId is required")
    @Indexed
    private String entityId;

    @NotBlank(message = "vaultId is required")
    @Indexed
    private String vaultId;

    @Indexed
    private LocalDate date;

    @Positive(message = "durationSeconds must be positive")
    private Long durationSeconds;

    private String note;

    @Builder.Default
    private TimeEntrySource source = TimeEntrySource.MANUAL;

    @Indexed
    private Instant createdAt;

    @Indexed
    private Instant updatedAt;

    private Instant archivedAt;  // For cleanup

    /**
     * Calculate duration in hours (with decimal precision)
     */
    public double getDurationHours() {
        return durationSeconds / 3600.0;
    }

    /**
     * Calculate duration in minutes
     */
    public long getDurationMinutes() {
        return durationSeconds / 60;
    }

    /**
     * Format duration as HH:MM:SS
     */
    public String getFormattedDuration() {
        long hours = durationSeconds / 3600;
        long minutes = (durationSeconds % 3600) / 60;
        long seconds = durationSeconds % 60;
        return String.format("%02d:%02d:%02d", hours, minutes, seconds);
    }
}
