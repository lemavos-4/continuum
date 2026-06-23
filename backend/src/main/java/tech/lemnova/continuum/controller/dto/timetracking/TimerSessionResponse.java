package tech.lemnova.continuum.controller.dto.timetracking;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import tech.lemnova.continuum.domain.timetracking.TimerSession;
import tech.lemnova.continuum.domain.timetracking.TimerStatus;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimerSessionResponse {

    private String id;
    private String entityId;
    private Instant startedAt;
    private Instant stoppedAt;
    private Instant pausedAt;
    private Long accumulatedPausedSeconds;
    private TimerStatus status;
    private Long elapsedSeconds;
    private String formattedElapsed;
    private Boolean paused;
    private Instant createdAt;

    public static TimerSessionResponse fromEntity(TimerSession session) {
        return TimerSessionResponse.builder()
                .id(session.getId())
                .entityId(session.getEntityId())
                .startedAt(session.getStartedAt())
                .stoppedAt(session.getStoppedAt())
                .pausedAt(session.getPausedAt())
                .accumulatedPausedSeconds(session.getAccumulatedPausedSeconds())
                .status(session.getStatus())
                .elapsedSeconds(session.getElapsedSeconds())
                .formattedElapsed(session.getFormattedElapsed())
                .paused(session.isPaused())
                .createdAt(session.getCreatedAt())
                .build();
    }
}
