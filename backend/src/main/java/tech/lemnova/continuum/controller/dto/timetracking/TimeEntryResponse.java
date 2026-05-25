package tech.lemnova.continuum.controller.dto.timetracking;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import tech.lemnova.continuum.domain.timetracking.TimeEntry;
import tech.lemnova.continuum.domain.timetracking.TimeEntrySource;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Response containing time entry information
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimeEntryResponse {

    private String id;
    private String userId;
    private String entityId;
    private String vaultId;
    private LocalDate date;
    private Long durationSeconds;
    private String formattedDuration;
    private String note;
    private TimeEntrySource source;
    private Instant createdAt;
    private Instant updatedAt;

    public static TimeEntryResponse fromEntity(TimeEntry entry) {
        return TimeEntryResponse.builder()
                .id(entry.getId())
                .userId(entry.getUserId())
                .entityId(entry.getEntityId())
                .vaultId(entry.getVaultId())
                .date(entry.getDate())
                .durationSeconds(entry.getDurationSeconds())
                .formattedDuration(entry.getFormattedDuration())
                .note(entry.getNote())
                .source(entry.getSource())
                .createdAt(entry.getCreatedAt())
                .updatedAt(entry.getUpdatedAt())
                .build();
    }
}
