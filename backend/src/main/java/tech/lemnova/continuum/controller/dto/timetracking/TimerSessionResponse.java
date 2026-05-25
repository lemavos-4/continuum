package tech.lemnova.continuum.controller.dto.timetracking;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import tech.lemnova.continuum.domain.timetracking.TimerSession;
import tech.lemnova.continuum.domain.timetracking.TimerStatus;

import java.time.Instant;

/**
 * Response containing timer session information
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimerSessionResponse {

    private String id;
    private String entityId;
    private Instant startedAt;
    private Instant stoppedAt;
    private TimerStatus status;
    private Long elapsedSeconds;
    private String formattedElapsed;
    private Instant createdAt;

    public static TimerSessionResponse fromEntity(TimerSession session) {
        return TimerSessionResponse.builder()
                .id(session.getId())
                .entityId(session.getEntityId())
                .startedAt(session.getStartedAt())
                .stoppedAt(session.getStoppedAt())
                .status(session.getStatus())
                .elapsedSeconds(session.getElapsedSeconds())
                .formattedElapsed(session.getFormattedElapsed())
                .createdAt(session.getCreatedAt())
                .build();
    }
}
