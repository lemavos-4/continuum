package tech.lemnova.continuum.controller.dto.imp;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;

public record ImportCommitRequest(
        List<CommitFile> files,
        List<EntityDecision> entities,
        List<CustomEntity> customEntities
) {
    public record CommitFile(
            String filename,
            String title,
            JsonNode content,
            List<String> candidateKeys
    ) {}

    public record EntityDecision(
            String key,
            String name,
            String type,
            boolean accept
    ) {}

    /**
     * Entity the user added manually at commit time. The server scans every
     * imported note's content for case-insensitive word-boundary matches and
     * links the entity wherever it appears.
     */
    public record CustomEntity(
            String name,
            String type
    ) {}
}