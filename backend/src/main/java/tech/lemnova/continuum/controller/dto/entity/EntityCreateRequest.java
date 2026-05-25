package tech.lemnova.continuum.controller.dto.entity;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import tech.lemnova.continuum.domain.entity.EntityType;

public record EntityCreateRequest(
    @NotBlank(message = "não deve estar em branco") @Size(min = 1, max = 255) String title,
    @NotNull EntityType type,
    @Size(max = 1000) String description
) {}
