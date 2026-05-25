package tech.lemnova.continuum.controller.dto.vault;

import java.time.Instant;

public record VaultFileDTO(
    String id,
    String fileName,
    String contentType,
    long size,
    Instant createdAt
) {}
