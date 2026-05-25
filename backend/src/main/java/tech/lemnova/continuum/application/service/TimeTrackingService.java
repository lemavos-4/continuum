package tech.lemnova.continuum.application.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.lemnova.continuum.controller.dto.timetracking.*;
import tech.lemnova.continuum.domain.timetracking.*;
import tech.lemnova.continuum.infra.repository.TimeEntryRepository;
import tech.lemnova.continuum.infra.repository.TimerSessionRepository;

import tech.lemnova.continuum.domain.plan.PlanConfiguration;
import tech.lemnova.continuum.domain.plan.PlanType;
import tech.lemnova.continuum.domain.user.User;
import tech.lemnova.continuum.domain.user.UserRepository;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Comparator;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TimeTrackingService {

    private final TimeEntryRepository timeEntryRepository;
    private final TimerSessionRepository timerSessionRepository;
    private final PlanConfiguration planConfig;
    private final UserRepository userRepo;

    private LocalDate getDefaultStartDate(String userId) {
        User user = userRepo.findById(userId).orElseThrow();
        if (user.getPlan() == PlanType.FREE) {
            return LocalDate.now().minusMonths(3);
        }
        return null;
    }

    /**
     * Start a new timer for an entity
     */
    @Transactional
    public TimerSessionResponse startTimer(String userId, String vaultId, StartTimerRequest request) {
        // Stop any other active timers for this entity (prevent multiple timers)
        timerSessionRepository.findByUserIdAndEntityIdAndStatus(
                userId, request.getEntityId(), TimerStatus.RUNNING
        ).ifPresent(existing -> {
            existing.setStatus(TimerStatus.ABANDONED);
            existing.setUpdatedAt(Instant.now());
            timerSessionRepository.save(existing);
        });

        // Create new timer session
        TimerSession session = TimerSession.builder()
                .userId(userId)
                .entityId(request.getEntityId())
                .vaultId(vaultId)
                .startedAt(Instant.now())
                .status(TimerStatus.RUNNING)
                .createdAt(Instant.now())
                .build();

        TimerSession saved = timerSessionRepository.save(session);
        return TimerSessionResponse.fromEntity(saved);
    }

    /**
     * Stop an active timer and create a time entry
     */
    @Transactional
    public TimeEntryResponse stopTimer(String userId, StopTimerRequest request) {
        TimerSession session = timerSessionRepository.findById(request.getSessionId())
                .orElseThrow(() -> new IllegalArgumentException("Timer session not found"));

        if (!session.getUserId().equals(userId)) {
            throw new SecurityException("Unauthorized access to timer session");
        }

        if (!session.isRunning()) {
            throw new IllegalArgumentException("Timer is not running");
        }

        // Calculate elapsed time
        long elapsedSeconds = session.getElapsedSeconds();

        // Create time entry
        TimeEntry entry = TimeEntry.builder()
                .userId(userId)
                .entityId(session.getEntityId())
                .vaultId(session.getVaultId())
                .date(LocalDate.now())
                .durationSeconds(elapsedSeconds)
                .note(request.getNote())
                .source(TimeEntrySource.TIMER)
                .createdAt(Instant.now())
                .build();

        TimeEntry savedEntry = timeEntryRepository.save(entry);

        // Update timer session
        session.setStoppedAt(Instant.now());
        session.setStatus(TimerStatus.COMPLETED);
        session.setTimeEntryId(savedEntry.getId());
        session.setUpdatedAt(Instant.now());
        timerSessionRepository.save(session);

        return TimeEntryResponse.fromEntity(savedEntry);
    }

    /**
     * Manually add time to an entity
     */
    @Transactional
    public TimeEntryResponse addTime(String userId, String vaultId, AddTimeRequest request) {
        if (request.getDurationSeconds() <= 0) {
            throw new IllegalArgumentException("Duration must be positive");
        }

        TimeEntry entry = TimeEntry.builder()
                .userId(userId)
                .entityId(request.getEntityId())
                .vaultId(vaultId)
                .date(request.getDate())
                .durationSeconds(request.getDurationSeconds())
                .note(request.getNote())
                .source(TimeEntrySource.MANUAL)
                .createdAt(Instant.now())
                .build();

        TimeEntry saved = timeEntryRepository.save(entry);
        return TimeEntryResponse.fromEntity(saved);
    }

    /**
     * Get total time spent on an entity
     */
    public TimeEntitySummary getTotalTime(String userId, String vaultId, String entityId) {
        List<TimeEntry> entries = timeEntryRepository.findByUserIdAndEntityIdOrderByDateDesc(userId, entityId);

        long totalSeconds = entries.stream()
                .mapToLong(TimeEntry::getDurationSeconds)
                .sum();

        Optional<TimerSession> activeSession = timerSessionRepository
                .findByUserIdAndEntityIdAndStatus(userId, entityId, TimerStatus.RUNNING);

        String formattedTotal = formatSeconds(totalSeconds);
        double totalHours = totalSeconds / 3600.0;

        return TimeEntitySummary.builder()
                .entityId(entityId)
                .totalSeconds(totalSeconds)
                .formattedTotal(formattedTotal)
                .totalHours(totalHours)
                .entriesCount(entries.size())
                .activeSessionDuration(activeSession.map(TimerSession::getElapsedSeconds).orElse(null))
                .hasActiveTimer(activeSession.isPresent())
                .build();
    }

    /**
     * Get daily breakdown of time spent on an entity
     */
    public Map<LocalDate, TimeEntryResponse> getDailyBreakdown(String userId, String entityId) {
        List<TimeEntry> entries = timeEntryRepository.findByUserIdAndEntityIdOrderByDateDesc(userId, entityId);

        return entries.stream()
                .collect(Collectors.toMap(
                        TimeEntry::getDate,
                        TimeEntryResponse::fromEntity,
                        (existing, updated) -> {
                            // If multiple entries on same day, sum them
                            TimeEntry combined = TimeEntry.builder()
                                    .id(existing.getId())
                                    .userId(existing.getUserId())
                                    .entityId(existing.getEntityId())
                                    .vaultId(existing.getVaultId())
                                    .date(existing.getDate())
                                    .durationSeconds(existing.getDurationSeconds() + updated.getDurationSeconds())
                                    .source(TimeEntrySource.MANUAL)
                                    .createdAt(existing.getCreatedAt())
                                    .build();
                            return TimeEntryResponse.fromEntity(combined);
                        }
                ));
    }

    /**
     * Get time spent on an entity in a date range
     */
    public List<TimeEntryResponse> getTimeInRange(String userId, String entityId, LocalDate from, LocalDate to) {
        LocalDate effectiveFrom = from != null ? from : getDefaultStartDate(userId);
        LocalDate effectiveTo = to != null ? to : LocalDate.now();
        List<TimeEntry> entries = timeEntryRepository.findByUserIdAndEntityIdAndDateBetweenOrderByDateDesc(
                userId, entityId, effectiveFrom, effectiveTo
        );

        return entries.stream()
                .map(TimeEntryResponse::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Get summary for all entities in a vault
     */
    public List<TimeEntitySummary> getAllEntitiesSummary(String userId, String vaultId) {
        List<TimeEntry> allEntries = timeEntryRepository.findByVaultIdOrderByCreatedAtDesc(vaultId);

        return allEntries.stream()
                .collect(Collectors.groupingBy(TimeEntry::getEntityId))
                .entrySet()
                .stream()
                .map(entry -> {
                    String entityId = entry.getKey();
                    List<TimeEntry> entityEntries = entry.getValue();

                    long totalSeconds = entityEntries.stream()
                            .mapToLong(TimeEntry::getDurationSeconds)
                            .sum();

                    Optional<TimerSession> activeTimer = timerSessionRepository
                            .findByUserIdAndEntityIdAndStatus(userId, entityId, TimerStatus.RUNNING);

                    return TimeEntitySummary.builder()
                            .entityId(entityId)
                            .totalSeconds(totalSeconds)
                            .formattedTotal(formatSeconds(totalSeconds))
                            .totalHours(totalSeconds / 3600.0)
                            .entriesCount(entityEntries.size())
                            .activeSessionDuration(activeTimer.map(TimerSession::getElapsedSeconds).orElse(null))
                            .hasActiveTimer(activeTimer.isPresent())
                            .build();
                })
                .sorted(Comparator.comparingLong(TimeEntitySummary::getTotalSeconds).reversed())
                .collect(Collectors.toList());
    }

    /**
     * Delete a time entry
     */
    @Transactional
    public void deleteTimeEntry(String userId, String entryId) {
        TimeEntry entry = timeEntryRepository.findById(entryId)
                .orElseThrow(() -> new IllegalArgumentException("Time entry not found"));

        if (!entry.getUserId().equals(userId)) {
            throw new SecurityException("Unauthorized access to time entry");
        }

        timeEntryRepository.deleteById(entryId);
    }

    /**
     * Get active timer for an entity
     */
    public Optional<TimerSessionResponse> getActiveTimer(String userId, String entityId) {
        return timerSessionRepository.findByUserIdAndEntityIdAndStatus(userId, entityId, TimerStatus.RUNNING)
                .map(TimerSessionResponse::fromEntity);
    }

    /**
     * Get all active timers for a user
     */
    public List<TimerSessionResponse> getAllActiveTimers(String userId) {
        return timerSessionRepository.findByUserIdAndStatus(userId, TimerStatus.RUNNING)
                .stream()
                .map(TimerSessionResponse::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Recover interrupted timer session
     */
    @Transactional
    public TimeEntryResponse recoverSession(String userId, String entityId) {
        TimerSession lastSession = timerSessionRepository
                .findFirstByUserIdAndEntityIdOrderByCreatedAtDesc(userId, entityId)
                .orElseThrow(() -> new IllegalArgumentException("No previous session found"));

        if (lastSession.getStatus() == TimerStatus.ABANDONED) {
            // Create entry from abandoned session
            long elapsedSeconds = lastSession.getElapsedSeconds();

            TimeEntry entry = TimeEntry.builder()
                    .userId(userId)
                    .entityId(entityId)
                    .vaultId(lastSession.getVaultId())
                    .date(LocalDate.now())
                    .durationSeconds(elapsedSeconds)
                    .note("Recovered from interrupted session")
                    .source(TimeEntrySource.RECOVERED)
                    .createdAt(Instant.now())
                    .build();

            TimeEntry saved = timeEntryRepository.save(entry);

            lastSession.setStatus(TimerStatus.COMPLETED);
            lastSession.setTimeEntryId(saved.getId());
            timerSessionRepository.save(lastSession);

            return TimeEntryResponse.fromEntity(saved);
        }

        throw new IllegalArgumentException("Previous session is not in abandoned state");
    }

    /**
     * Cleanup: Delete all time entries for an entity when it's deleted
     */
    @Transactional
    public void deleteEntityTimeData(String entityId) {
        timeEntryRepository.deleteByEntityId(entityId);
        timerSessionRepository.deleteByEntityId(entityId);
    }

    /**
     * Helper: Format seconds to HH:MM:SS
     */
    private String formatSeconds(long seconds) {
        long hours = seconds / 3600;
        long minutes = (seconds % 3600) / 60;
        long secs = seconds % 60;
        return String.format("%02d:%02d:%02d", hours, minutes, secs);
    }
}
