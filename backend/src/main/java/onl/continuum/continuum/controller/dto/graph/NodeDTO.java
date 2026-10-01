package onl.continuum.continuum.controller.dto.graph;

import com.fasterxml.jackson.annotation.JsonProperty;

public record NodeDTO(
    @JsonProperty("id")
    String id,
    
    @JsonProperty("label")
    String label,
    
    @JsonProperty("type")
    String type
) {}
