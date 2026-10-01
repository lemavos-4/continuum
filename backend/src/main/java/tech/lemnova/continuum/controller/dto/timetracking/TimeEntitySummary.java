package tech.lemnova.continuum.controller.dto.timetracking;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Summary of time spent on an entity
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimeEntitySummary {

    private String entityId;
    private String entityTitle;
    private Long totalSeconds;
    private String formattedTotal;
    private Double totalHours;
    private Integer entriesCount;
    private Long activeSessionDuration;
    private Boolean hasActiveTimer;

    /**
     * Format total time as HH:MM:SS
     */
    public String getFormattedTotal() {
        if (totalSeconds == null || totalSeconds == 0) return "00:00:00";
        long hours = totalSeconds / 3600;
        long minutes = (totalSeconds % 3600) / 60;
        long seconds = totalSeconds % 60;
        return String.format("%02d:%02d:%02d", hours, minutes, seconds);
    }
}
