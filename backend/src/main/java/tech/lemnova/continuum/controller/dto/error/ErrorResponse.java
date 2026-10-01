package tech.lemnova.continuum.controller.dto.error;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;

public record ErrorResponse(
    @JsonProperty("timestamp")
    String timestamp,
    
    @JsonProperty("message")
    String message,
    
    @JsonProperty("code")
    String code,
    
    @JsonProperty("details")
    Object details
) {
    public ErrorResponse(String message, String code) {
        this(Instant.now().toString(), message, code, null);
    }

    public ErrorResponse(String message, String code, Object details) {
        this(Instant.now().toString(), message, code, details);
    }
}
