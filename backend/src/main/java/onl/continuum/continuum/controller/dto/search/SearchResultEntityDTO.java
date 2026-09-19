package onl.continuum.continuum.controller.dto.search;

import onl.continuum.continuum.domain.entity.EntityType;

public record SearchResultEntityDTO(
    String id,
    String title,
    String description,
    EntityType type
) {}
