package tech.lemnova.continuum.controller.dto.timetracking;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.NotBlank;

/**
 * Request to stop a timer and save the time entry
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StopTimerRequest {

    @NotBlank(message = "sessionId is required")
    private String sessionId;

    private String note;
}
