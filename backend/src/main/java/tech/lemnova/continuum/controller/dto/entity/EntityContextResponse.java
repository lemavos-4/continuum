package tech.lemnova.continuum.controller.dto.entity;

import tech.lemnova.continuum.domain.entity.Entity;
import java.util.Collections;
import java.util.List;

public record EntityContextResponse(
    EntityResponse entity,
    List<NoteSummary> connectedNotes
) {
    public record NoteSummary(String id, String title) {}

    public static EntityContextResponse from(Entity entityDomain, List<NoteSummary> notes) {
        return new EntityContextResponse(
            EntityResponse.from(entityDomain),
            notes != null ? notes : Collections.emptyList()
        );
    }
}
