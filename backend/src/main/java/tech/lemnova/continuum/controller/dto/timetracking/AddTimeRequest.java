package tech.lemnova.continuum.controller.dto.timetracking;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

import java.time.LocalDate;

/**
 * Request to manually add time to an entity
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AddTimeRequest {

    @NotBlank(message = "entityId is required")
    private String entityId;

    @NotBlank(message = "date is required")
    private LocalDate date;

    @Positive(message = "durationSeconds must be positive")
    private Long durationSeconds;

    private String note;
}
