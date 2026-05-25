package tech.lemnova.continuum.application.service;

import org.springframework.stereotype.Service;
import tech.lemnova.continuum.application.exception.NotFoundException;
import tech.lemnova.continuum.controller.dto.dashboard.*;
import tech.lemnova.continuum.domain.entity.Entity;
import tech.lemnova.continuum.domain.note.Note;
import tech.lemnova.continuum.domain.plan.PlanConfiguration;
import tech.lemnova.continuum.domain.user.User;
import tech.lemnova.continuum.infra.persistence.EntityRepository;
import tech.lemnova.continuum.infra.persistence.NoteRepository;
import tech.lemnova.continuum.infra.vault.VaultStorageService;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class DashboardService {

    private final NoteRepository noteRepo;
    private final EntityRepository entityRepo;
    private final TrackingService trackingService;
    private final VaultStorageService storageService;
    private final UserService userService;
    private final PlanConfiguration planConfig;

    public DashboardService(NoteRepository noteRepo,
                            EntityRepository entityRepo,
                            TrackingService trackingService,
                            VaultStorageService storageService,
                            UserService userService,
                            PlanConfiguration planConfig) {
        this.noteRepo = noteRepo;
        this.entityRepo = entityRepo;
        this.trackingService = trackingService;
        this.storageService = storageService;
        this.userService = userService;
        this.planConfig = planConfig;
    }

    public DashboardSummaryDTO getSummary(String userId) {
        User user = userService.getById(userId);
        String vaultId = user.getVaultId();

        // Stats
        DashboardStatsDTO stats = getStats(userId, vaultId);

        // Storage usage
        StorageUsageDTO storageUsage = getStorageUsage(userId, vaultId);

        // Recent notes
        List<RecentNoteDTO> recentNotes = getRecentNotes(userId, vaultId);

        // Activity stats
        ActivityStatsDTO activityStats = getActivityStats(userId, vaultId);

        return new DashboardSummaryDTO(stats, storageUsage, recentNotes, activityStats);
    }

    private DashboardStatsDTO getStats(String userId, String vaultId) {
        long totalNotes = noteRepo.countByUserIdAndVaultId(userId, vaultId);
        long totalEntities = entityRepo.countByUserIdAndVaultId(userId, vaultId);
        long totalActivities = entityRepo.countByUserIdAndVaultIdAndType(userId, vaultId, "ACTIVITY");
        long activeActivities = trackingService.countActiveActivities(userId, LocalDate.now().minusDays(7));
        Long distinctTypesCount = noteRepo.countDistinctTypes(userId, vaultId);
        long totalTypes = distinctTypesCount != null ? distinctTypesCount : 0;

        return new DashboardStatsDTO(totalNotes, totalEntities, totalActivities, activeActivities, totalTypes);
    }

    private StorageUsageDTO getStorageUsage(String userId, String vaultId) {
        // Estimate storage usage based on content
        // Rough estimates: 2KB per note, 1KB per entity, plus overhead
        long totalNotes = noteRepo.countByUserIdAndVaultId(userId, vaultId);
        long totalEntities = entityRepo.countByUserIdAndVaultId(userId, vaultId);

        // Estimate: 2KB per note (content + metadata), 1KB per entity, 10KB overhead
        long estimatedUsedBytes = (totalNotes * 2048) + (totalEntities * 1024) + 10240;

        long limitBytes = planConfig.getLimits(userService.getById(userId).getPlan()).maxMetadataSizeKb() * 1024L;
        return StorageUsageDTO.from(estimatedUsedBytes, limitBytes);
    }

    private List<RecentNoteDTO> getRecentNotes(String userId, String vaultId) {
        List<Note> notes = noteRepo.findTop10ByUserIdAndVaultIdOrderByUpdatedAtDesc(userId, vaultId);
        return notes.stream()
                .map(note -> new RecentNoteDTO(
                        note.getId(),
                        note.getTitle(),
                        note.getType(),
                        getPreview(note.getContent()),
                        note.getCreatedAt().toEpochMilli(),
                        note.getUpdatedAt().toEpochMilli(),
                        note.getEntityIds()
                ))
                .collect(Collectors.toList());
    }

    private String getPreview(String content) {
        if (content == null || content.isEmpty()) return "";
        // Simple preview: first 150 chars, stripped of HTML
        String plain = content.replaceAll("<[^>]*>", "").trim();
        return plain.length() > 150 ? plain.substring(0, 150) + "..." : plain;
    }

    private ActivityStatsDTO getActivityStats(String userId, String vaultId) {
        Map<String, Integer> dailyCompletions = trackingService.getActivityData(userId, 30);
        int totalDays = (int) dailyCompletions.values().stream().filter(v -> v > 0).count();
        // For simplicity, calculate streaks from the data
        int maxStreak = calculateMaxStreak(dailyCompletions);
        int currentStreak = calculateCurrentStreak(dailyCompletions);
        int longestInactive = calculateLongestInactive(dailyCompletions);
        return new ActivityStatsDTO(dailyCompletions, totalDays, maxStreak, currentStreak, longestInactive);
    }

    private int calculateMaxStreak(Map<String, Integer> data) {
        // Simple implementation: find longest consecutive days with >0
        List<LocalDate> dates = data.entrySet().stream()
                .filter(e -> e.getValue() > 0)
                .map(e -> LocalDate.parse(e.getKey()))
                .sorted()
                .collect(Collectors.toList());
        if (dates.isEmpty()) return 0;
        int max = 1, current = 1;
        for (int i = 1; i < dates.size(); i++) {
            if (ChronoUnit.DAYS.between(dates.get(i-1), dates.get(i)) == 1) {
                current++;
                max = Math.max(max, current);
            } else {
                current = 1;
            }
        }
        return max;
    }

    private int calculateCurrentStreak(Map<String, Integer> data) {
        LocalDate today = LocalDate.now();
        int streak = 0;
        LocalDate check = today;
        while (data.getOrDefault(check.toString(), 0) > 0) {
            streak++;
            check = check.minusDays(1);
        }
        return streak;
    }

    private int calculateLongestInactive(Map<String, Integer> data) {
        List<LocalDate> activeDates = data.entrySet().stream()
                .filter(e -> e.getValue() > 0)
                .map(e -> LocalDate.parse(e.getKey()))
                .sorted()
                .collect(Collectors.toList());
        if (activeDates.isEmpty()) return 30; // all inactive
        int maxGap = 0;
        for (int i = 1; i < activeDates.size(); i++) {
            long gap = ChronoUnit.DAYS.between(activeDates.get(i-1), activeDates.get(i)) - 1;
            maxGap = (int) Math.max(maxGap, gap);
        }
        return maxGap;
    }
}