package tech.lemnova.continuum.controller.dto.timetracking;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.NotBlank;

/**
 * Request to start a timer
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StartTimerRequest {

    @NotBlank(message = "entityId is required")
    private String entityId;
}
