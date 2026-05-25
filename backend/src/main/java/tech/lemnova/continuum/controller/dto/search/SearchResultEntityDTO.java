package tech.lemnova.continuum.controller.dto.search;

import tech.lemnova.continuum.domain.entity.EntityType;

public record SearchResultEntityDTO(
    String id,
    String title,
    String description,
    EntityType type
) {}
