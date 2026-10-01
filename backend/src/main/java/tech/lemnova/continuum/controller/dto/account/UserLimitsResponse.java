package tech.lemnova.continuum.controller.dto.account;

public record UserLimitsResponse(
    int usedEntities,
    int maxEntities,
    int maxHistoryDays
) {}