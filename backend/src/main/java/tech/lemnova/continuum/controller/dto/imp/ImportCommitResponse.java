package tech.lemnova.continuum.controller.dto.imp;

import java.util.List;

public record ImportCommitResponse(
        int notesCreated,
        int entitiesCreated,
        int entitiesReused,
        int linksCreated,
        List<String> errors
) {}
