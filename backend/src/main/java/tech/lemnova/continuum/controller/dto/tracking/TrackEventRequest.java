package tech.lemnova.continuum.controller.dto.tracking;

import java.time.LocalDate;

public record TrackEventRequest(
    LocalDate date,       // null = today
    Integer value,
    Double decimalValue,
    String note
) {}
