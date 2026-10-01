package tech.lemnova.continuum.controller.dto.entity;

import jakarta.validation.constraints.Size;
import tech.lemnova.continuum.domain.entity.EntityType;

public record EntityUpdateRequest(
    @Size(min = 1, max = 255) String title,
    EntityType type,
    @Size(max = 1000) String description
) {}
