package tech.lemnova.continuum.controller.dto.folder;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record FolderCreateRequest(
    @NotBlank @Size(max = 80) String name,
    String parentId
) {}
