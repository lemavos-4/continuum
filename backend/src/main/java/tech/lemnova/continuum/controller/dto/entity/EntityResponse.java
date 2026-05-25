package tech.lemnova.continuum.controller.dto.entity;

import tech.lemnova.continuum.domain.entity.Entity;
import tech.lemnova.continuum.domain.entity.EntityType;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

public record EntityResponse(
    String id,
    String userId,
    String vaultId,
    String title,
    EntityType type,
    String description,
    Instant createdAt,
    List<LocalDate> trackingDates
) {
    public static EntityResponse from(Entity entity) {
        return new EntityResponse(
            entity.getId(),
            entity.getUserId(),
            entity.getVaultId(),
            entity.getTitle(),
            entity.getType(),
            entity.getDescription(),
            entity.getCreatedAt(),
            entity.getTrackingDates() != null ? entity.getTrackingDates() : Collections.emptyList()
        );
    }
}
