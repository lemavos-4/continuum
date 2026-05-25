package tech.lemnova.continuum.controller.dto.graph;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record GraphDTO(
    @JsonProperty("nodes")
    List<NodeDTO> nodes,
    
    @JsonProperty("links")
    List<LinkDTO> links
) {}
