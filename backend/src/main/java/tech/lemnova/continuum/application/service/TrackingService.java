package tech.lemnova.continuum.application.service;

import org.springframework.stereotype.Service;
import tech.lemnova.continuum.application.exception.BadRequestException;
import tech.lemnova.continuum.application.exception.PlanLimitException;
import tech.lemnova.continuum.controller.dto.tracking.TrackEventRequest;
import tech.lemnova.continuum.domain.entity.Entity;
import tech.lemnova.continuum.domain.plan.PlanConfiguration;
import tech.lemnova.continuum.domain.tracking.TrackingEvent;
import tech.lemnova.continuum.domain.user.User;
import tech.lemnova.continuum.domain.user.UserRepository;
import tech.lemnova.continuum.infra.persistence.TrackingEventRepository;

import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;
import java.time.temporal.ChronoUnit;

@Service
public class TrackingService {

    private final UserRepository userRepo;
    private final TrackingEventRepository trackingRepo;
    private final EntityService entityService;
    private final PlanConfiguration planConfig;

    public TrackingService(UserRepository userRepo,
                           TrackingEventRepository trackingRepo,
                           EntityService entityService,
                           PlanConfiguration planConfig) {
        this.userRepo = userRepo;
        this.trackingRepo = trackingRepo;
        this.entityService = entityService;
        this.planConfig = planConfig;
    }

    private User getUser(String userId) {
        return userRepo.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
    }

    public TrackingEvent track(String userId, String entityId, TrackEventRequest req) {
        User user = getUser(userId);
        Entity entity = entityService.get(userId, entityId);
        if (!entity.isTrackable()) throw new BadRequestException("Entity not trackable");

        // Removed: history days check, since no data deletion

        LocalDate date = req.date() != null ? req.date() : LocalDate.now();
        List<TrackingEvent> events = trackingRepo.findByUserIdAndEntityIdAndDate(userId, entityId, date);

        TrackingEvent event;
        if (!events.isEmpty()) {
            event = events.get(0);  // Update existing
        } else {
            event = TrackingEvent.builder()
                    .id(UUID.randomUUID().toString().replace("-", ""))
                    .userId(userId)
                    .entityId(entityId)
                    .date(date)
                    .createdAt(Instant.now())
                    .build();
        }

        event.setValue(req.value() != null ? req.value() : 1);
        event.setDecimalValue(req.decimalValue());
        event.setNote(req.note());
        event.setUpdatedAt(Instant.now());

        return trackingRepo.save(event);
    }

    public void untrack(String userId, String entityId, LocalDate date) {
        Instant now = Instant.now();
        trackingRepo.findByUserIdAndEntityIdAndDate(userId, entityId, date)
                .forEach(event -> {
                    event.setArchivedAt(now);
                    trackingRepo.save(event);
                });
    }

    public Map<LocalDate, Double> getHeatmap(String userId, String entityId) {
        User user = getUser(userId);
        int days = planConfig.getHistoryDays(user.getPlan());
        LocalDate end = LocalDate.now();
        LocalDate start = days == Integer.MAX_VALUE ? end.minusYears(10) : end.minusDays(days);
        return getHeatmap(userId, entityId, start, end);
    }

    public Map<LocalDate, Double> getHeatmap(String userId, String entityId,
                                               LocalDate start, LocalDate end) {
        return trackingRepo.findByUserIdAndEntityId(userId, entityId).stream()
                .filter(e -> !e.getDate().isBefore(start) && !e.getDate().isAfter(end))
                .collect(Collectors.toMap(TrackingEvent::getDate, e -> e.getNumericValue().doubleValue()));
    }

    public TrackingStats getStats(String userId, String entityId) {
        List<TrackingEvent> all = trackingRepo.findByUserIdAndEntityId(userId, entityId).stream()
                .sorted(Comparator.comparing(TrackingEvent::getDate, Comparator.reverseOrder()))
                .collect(Collectors.toList());

        if (all.isEmpty()) return new TrackingStats(0, 0, 0.0, 0.0);

        int streak        = computeStreak(all);
        int longestStreak = computeLongestStreak(all);
        double avg        = all.stream()
                .mapToDouble(e -> e.getNumericValue().doubleValue()).average().orElse(0.0);

        // weeklyCompletionRate: dias de eventos nesta semana / 7
        LocalDate today = LocalDate.now();
        LocalDate weekStart = today.with(java.time.DayOfWeek.MONDAY);
        Set<LocalDate> datesThisWeek = all.stream()
                .map(TrackingEvent::getDate)
                .filter(d -> !d.isBefore(weekStart) && !d.isAfter(today))
                .collect(Collectors.toSet());
        double weeklyCompletionRate = datesThisWeek.size() / 7.0;

        return new TrackingStats(streak, longestStreak, avg, weeklyCompletionRate);
    }

    public List<TrackingEvent> getTodayEvents(String userId) {
        LocalDate today = LocalDate.now();
        return trackingRepo.findByUserId(userId).stream()
                .filter(e -> today.equals(e.getDate()))
                .collect(Collectors.toList());
    }

    // ── private ───────────────────────────────────────────────────────────────

    private int computeStreak(List<TrackingEvent> events) {
        Set<LocalDate> dates = events.stream().map(TrackingEvent::getDate).collect(Collectors.toSet());
        LocalDate today = LocalDate.now();
        int streak = 0;
        LocalDate check = dates.contains(today) ? today : today.minusDays(1);
        while (dates.contains(check)) { streak++; check = check.minusDays(1); }
        return streak;
    }

    private int computeLongestStreak(List<TrackingEvent> events) {
        if (events.isEmpty()) return 0;
        List<LocalDate> sorted = events.stream()
                .map(TrackingEvent::getDate).distinct().sorted().collect(Collectors.toList());
        int longest = 1, current = 1;
        for (int i = 1; i < sorted.size(); i++) {
            if (ChronoUnit.DAYS.between(sorted.get(i - 1), sorted.get(i)) == 1) {
                current++;
                longest = Math.max(longest, current);
            } else {
                current = 1;
            }
        }
        return longest;
    }

    /**
     * Conta activities ativas (que tiveram pelo menos um evento de tracking desde a data especificada)
     */
    public long countActiveActivities(String userId, LocalDate since) {
        List<TrackingEvent> events = trackingRepo.findByUserId(userId);
        Set<String> activeEntityIds = events.stream()
                .filter(e -> !e.getDate().isBefore(since))
                .map(TrackingEvent::getEntityId)
                .collect(Collectors.toSet());
        return activeEntityIds.size();
    }

    /**
     * Retorna dados de atividade para heatmap (últimos 30 dias)
     */
    public Map<String, Integer> getActivityData(String userId, int days) {
        List<TrackingEvent> events = trackingRepo.findByUserId(userId);
        LocalDate end = LocalDate.now();
        LocalDate start = end.minusDays(days - 1);

        return events.stream()
                .filter(e -> !e.getDate().isBefore(start) && !e.getDate().isAfter(end))
                .collect(Collectors.groupingBy(
                        e -> e.getDate().toString(),
                        Collectors.summingInt(e -> 1)
                ));
    }

    public record TrackingStats(
            int currentStreak, int longestStreak,
            double averageValue, double weeklyCompletionRate) {}
}
