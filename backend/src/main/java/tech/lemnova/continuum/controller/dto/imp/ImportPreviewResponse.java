package tech.lemnova.continuum.controller.dto.imp;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;

public record ImportPreviewResponse(
        List<PreviewFile> files,
        List<EntityCandidate> candidates,
        List<String> errors,
        List<String> skipped
) {
    public record PreviewFile(
            String filename,
            String title,
            JsonNode content,
            List<String> candidateKeys,
            int wordCount
    ) {}

    public record EntityCandidate(
            String key,
            String name,
            String suggestedType,
            int occurrences,
            boolean existing,
            String confidence
    ) {}
}
