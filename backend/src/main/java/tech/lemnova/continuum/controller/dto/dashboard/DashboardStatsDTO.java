package tech.lemnova.continuum.controller.dto.dashboard;

/**
 * Estatísticas rápidas: totais agregados
 */
public record DashboardStatsDTO(
    long totalNotes,        // Total de notas
    long totalEntities,     // Total de entidades não-activity
    long totalActivities,   // Total de activities (entidades com type = ACTIVITY)
    long activeActivities,  // Activities com atividade nos últimos 7 dias
    long totalTypes         // Número de tipos únicos de notas
) {
}
