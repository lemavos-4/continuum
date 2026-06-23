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
        // TrackingService already enforces the plan retention window.
        Map<String, Integer> dailyCompletions = trackingService.getActivityData(userId, 30);
        int totalDays = (int) dailyCompletions.values().stream().filter(v -> v > 0).count();
        return new ActivityStatsDTO(dailyCompletions, totalDays);
    }
}
