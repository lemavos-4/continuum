package tech.lemnova.continuum.domain.plan;

public record PlanLimits(
    int maxEntities,
    int maxNotes,
    int maxHistoryDays,
    int maxMetadataSizeKb,
    int maxVaultSizeMB,
    boolean advancedMetrics,
    boolean dataExport,
    boolean calendarSync
) {
    public static PlanLimits free(int maxVaultSizeMB) {
        return new PlanLimits(20, 50, 30, 10, maxVaultSizeMB, false, false, false);
    }

    public static PlanLimits vision(int maxVaultSizeMB) {
        return new PlanLimits(Integer.MAX_VALUE, Integer.MAX_VALUE, Integer.MAX_VALUE, 2048, maxVaultSizeMB, true, true, true);
    }
}
