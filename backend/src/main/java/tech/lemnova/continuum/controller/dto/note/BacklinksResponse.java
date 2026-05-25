package tech.lemnova.continuum.controller.dto.note;

import java.util.List;

public record BacklinksResponse(
    List<BacklinkMentionDTO> linkedMentions,
    List<BacklinkMentionDTO> unlinkedMentions
) {}