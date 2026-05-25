package tech.lemnova.continuum.domain.timetracking;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import jakarta.validation.constraints.NotBlank;

import java.time.Instant;

/**
 * Represents an active or completed timer session.
 * Used to track running timers and recover from interrupted sessions.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "timer_sessions")
public class TimerSession {

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
    private Instant startedAt;

    private Instant stoppedAt;

    private String timeEntryId;

    @Builder.Default
    private TimerStatus status = TimerStatus.RUNNING;

    @Indexed
    private Instant createdAt;

    private Instant updatedAt;

    /**
     * Calculate elapsed time in seconds
     */
    public long getElapsedSeconds() {
        Instant endTime = stoppedAt != null ? stoppedAt : Instant.now();
        return endTime.getEpochSecond() - startedAt.getEpochSecond();
    }

    /**
     * Check if this timer is currently running
     */
    public boolean isRunning() {
        return status == TimerStatus.RUNNING;
    }

    /**
     * Format elapsed time as HH:MM:SS
     */
    public String getFormattedElapsed() {
        long totalSeconds = getElapsedSeconds();
        long hours = totalSeconds / 3600;
        long minutes = (totalSeconds % 3600) / 60;
        long seconds = totalSeconds % 60;
        return String.format("%02d:%02d:%02d", hours, minutes, seconds);
    }
}
