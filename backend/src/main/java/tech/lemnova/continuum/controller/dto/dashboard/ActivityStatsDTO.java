package tech.lemnova.continuum.controller.dto.dashboard;

import java.util.Map;

/**
 * Dados de atividade de hábitos (heatmap de últimos 30 dias)
 * 
 * Formato: {
 *   "2024-04-16": 3,      // 3 hábitos concluídos neste dia
 *   "2024-04-15": 1,
 *   "2024-04-14": 0,      // Nenhum hábito concluído
 * }
 */
public record ActivityStatsDTO(
    Map<String, Integer> dailyCompletions,  // Data (YYYY-MM-DD) → número de completações
    int totalDays,                          // Dias com pelo menos 1 atividade
    int maxStreak,                          // Maior sequência contínua
    int currentStreak,                      // Sequência atual
    int longestInactive                     // Maior gap de dias sem atividades
) {
}
