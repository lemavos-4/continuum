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
 * Supports pause/resume — accumulatedPausedSeconds tracks total paused time.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "timer_sessions")
public class TimerSession {

    @Id
    private String id;

    @NotBlank
    @Indexed
    private String userId;

    @NotBlank
    @Indexed
    private String entityId;

    @NotBlank
    @Indexed
    private String vaultId;

    @Indexed
    private Instant startedAt;

    private Instant stoppedAt;

    /** Instant when timer was paused (null when running). */
    private Instant pausedAt;

    /** Total seconds spent in PAUSED state across this session. */
    @Builder.Default
    private Long accumulatedPausedSeconds = 0L;

    private String timeEntryId;

    @Builder.Default
    private TimerStatus status = TimerStatus.RUNNING;

    @Indexed
    private Instant createdAt;

    private Instant updatedAt;

    /**
     * Elapsed seconds excluding any time spent paused.
     */
    public long getElapsedSeconds() {
        Instant endTime = stoppedAt != null ? stoppedAt
                : (pausedAt != null ? pausedAt : Instant.now());
        long raw = endTime.getEpochSecond() - startedAt.getEpochSecond();
        long paused = accumulatedPausedSeconds == null ? 0L : accumulatedPausedSeconds;
        return Math.max(0L, raw - paused);
    }

    public boolean isRunning() {
        return status == TimerStatus.RUNNING;
    }

    public boolean isPaused() {
        return status == TimerStatus.RUNNING && pausedAt != null;
    }

    public String getFormattedElapsed() {
        long totalSeconds = getElapsedSeconds();
        long hours = totalSeconds / 3600;
        long minutes = (totalSeconds % 3600) / 60;
        long seconds = totalSeconds % 60;
        return String.format("%02d:%02d:%02d", hours, minutes, seconds);
    }
}
