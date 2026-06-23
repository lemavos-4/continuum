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

    /** Earliest date this user is allowed to receive historical data for. */
    private LocalDate retentionCutoff(User user) {
        int days = planConfig.getHistoryDays(user.getPlan());
        if (days == Integer.MAX_VALUE || days <= 0) return LocalDate.now().minusYears(100);
        return LocalDate.now().minusDays(days);
    }

    public TrackingEvent track(String userId, String entityId, TrackEventRequest req) {
        User user = getUser(userId);
        Entity entity = entityService.get(userId, entityId);
        if (!entity.isTrackable()) throw new BadRequestException("Entity not trackable");

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
        LocalDate end = LocalDate.now();
        LocalDate start = retentionCutoff(user);
        return getHeatmapInternal(userId, entityId, start, end);
    }

    public Map<LocalDate, Double> getHeatmap(String userId, String entityId,
                                               LocalDate start, LocalDate end) {
        User user = getUser(userId);
        LocalDate cutoff = retentionCutoff(user);
        // Backend is the source of truth: clamp the requested window into the
        // user's allowed retention range. Data outside this window is never returned.
        LocalDate effectiveStart = (start == null || start.isBefore(cutoff)) ? cutoff : start;
        LocalDate effectiveEnd = end == null ? LocalDate.now() : end;
        return getHeatmapInternal(userId, entityId, effectiveStart, effectiveEnd);
    }

    private Map<LocalDate, Double> getHeatmapInternal(String userId, String entityId,
                                                      LocalDate start, LocalDate end) {
        return trackingRepo.findByUserIdAndEntityId(userId, entityId).stream()
                .filter(e -> !e.getDate().isBefore(start) && !e.getDate().isAfter(end))
                .collect(Collectors.toMap(TrackingEvent::getDate, e -> e.getNumericValue().doubleValue()));
    }

    public TrackingStats getStats(String userId, String entityId) {
        User user = getUser(userId);
        LocalDate cutoff = retentionCutoff(user);

        List<TrackingEvent> all = trackingRepo.findByUserIdAndEntityId(userId, entityId).stream()
                .filter(e -> !e.getDate().isBefore(cutoff))
                .sorted(Comparator.comparing(TrackingEvent::getDate, Comparator.reverseOrder()))
                .collect(Collectors.toList());

        if (all.isEmpty()) return new TrackingStats(0.0, 0.0, 0);

        double avg = all.stream()
                .mapToDouble(e -> e.getNumericValue().doubleValue()).average().orElse(0.0);

        // weeklyCompletionRate: dias com eventos nesta semana / 7
        LocalDate today = LocalDate.now();
        LocalDate weekStart = today.with(java.time.DayOfWeek.MONDAY);
        Set<LocalDate> datesThisWeek = all.stream()
                .map(TrackingEvent::getDate)
                .filter(d -> !d.isBefore(weekStart) && !d.isAfter(today))
                .collect(Collectors.toSet());
        double weeklyCompletionRate = datesThisWeek.size() / 7.0;

        int totalCompletions = (int) all.stream().map(TrackingEvent::getDate).distinct().count();

        return new TrackingStats(avg, weeklyCompletionRate, totalCompletions);
    }

    public List<TrackingEvent> getTodayEvents(String userId) {
        LocalDate today = LocalDate.now();
        return trackingRepo.findByUserId(userId).stream()
                .filter(e -> today.equals(e.getDate()))
                .collect(Collectors.toList());
    }

    /**
     * Conta activities ativas (que tiveram pelo menos um evento de tracking desde a data especificada).
     * Respeita a janela de retenção do plano do usuário.
     */
    public long countActiveActivities(String userId, LocalDate since) {
        User user = getUser(userId);
        LocalDate cutoff = retentionCutoff(user);
        LocalDate effectiveSince = since == null || since.isBefore(cutoff) ? cutoff : since;
        List<TrackingEvent> events = trackingRepo.findByUserId(userId);
        Set<String> activeEntityIds = events.stream()
                .filter(e -> !e.getDate().isBefore(effectiveSince))
                .map(TrackingEvent::getEntityId)
                .collect(Collectors.toSet());
        return activeEntityIds.size();
    }

    /**
     * Dados de atividade agregados por dia. O parâmetro `days` é truncado para
     * respeitar a janela de retenção do plano — o backend é a única autoridade.
     */
    public Map<String, Integer> getActivityData(String userId, int days) {
        User user = getUser(userId);
        int retention = planConfig.getHistoryDays(user.getPlan());
        int effectiveDays = (retention == Integer.MAX_VALUE) ? days : Math.min(days, retention);
        if (effectiveDays <= 0) effectiveDays = 1;

        LocalDate end = LocalDate.now();
        LocalDate start = end.minusDays(effectiveDays - 1);

        return trackingRepo.findByUserId(userId).stream()
                .filter(e -> !e.getDate().isBefore(start) && !e.getDate().isAfter(end))
                .collect(Collectors.groupingBy(
                        e -> e.getDate().toString(),
                        Collectors.summingInt(e -> 1)
                ));
    }

    public record TrackingStats(
            double averageValue,
            double weeklyCompletionRate,
            int totalCompletions) {}
}
